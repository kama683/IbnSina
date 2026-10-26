import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AppointmentStatus(str, enum.Enum):
    completed = "completed"
    in_progress = "in_progress"
    scheduled = "scheduled"
    cancelled = "cancelled"


class CancellationReasonCode(str, enum.Enum):
    """Причина отмены приёма — справочник вместо свободного текста. Текст
    (Appointment.cancellation_reason) хранится только для `other`."""

    patient_cancelled = "patient_cancelled"      # пациент отменил
    patient_no_contact = "patient_no_contact"    # не дозвонились
    doctor_unavailable = "doctor_unavailable"    # врач не принимает
    rescheduled = "rescheduled"                  # перенос
    other = "other"                              # другое (с текстом)


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        UniqueConstraint("employee_id", "date", "queue_number", name="uq_appointment_queue_number"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    # Порядковый номер пациента у врача на день (1, 2, 3…): время записи не
    # назначается — врач принимает столько, сколько нужно. Номер не
    # переиспользуется: у отменённого приёма он остаётся за ним.
    queue_number: Mapped[int] = mapped_column(Integer)
    # Устарело: время слота. Новые приёмы его не получают; колонка осталась
    # у старых записей и ни на что не влияет.
    time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    complaint: Mapped[str] = mapped_column(Text)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, name="appointment_status"),
        default=AppointmentStatus.scheduled,
    )

    diagnosis_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    diagnosis_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    objective_status: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"))

    # Этап 1, коммит 1 (docs/PHASE1_ANALYSIS.md §6) — все nullable, старые
    # записи так и останутся с NULL, бэкфиллить нечем (полей не было).
    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancelled_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )
    cancellation_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    # nullable: у приёмов, отменённых до появления справочника, кода не было
    # (миграция проставила other); при новой отмене API требует код.
    cancellation_reason_code: Mapped[CancellationReasonCode | None] = mapped_column(
        Enum(CancellationReasonCode, name="cancellation_reason_code"), nullable=True
    )
    # Момент завершения приёма — для блока «Вышли от врача» на стойке.
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # Момент, когда врач нажал «Начать»: вместе с completed_at даёт фактическое
    # время приёма, которое видно в карточке пациента.
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="appointments")
    # foreign_keys обязателен на всех трёх — с этого коммита у Appointment
    # три FK на employees.id, без явного указания SQLAlchemy не сможет
    # определить, какую колонку использовать для каждой связи.
    employee = relationship(
        "Employee", back_populates="appointments", foreign_keys=[employee_id]
    )
    # back_populates намеренно нет — Employee не обязан перечислять "приёмы,
    # которые я создал/отменил", это read-only контекст поверх основной связи
    # employee_id/employee (та back_populates'ится как обычно, см. выше).
    created_by = relationship("Employee", foreign_keys=[created_by_id])
    cancelled_by = relationship("Employee", foreign_keys=[cancelled_by_id])
    prescriptions = relationship("Prescription", back_populates="appointment", cascade="all, delete-orphan")

    @property
    def diagnosis(self) -> str | None:
        if self.diagnosis_code and self.diagnosis_name:
            return f"{self.diagnosis_code} {self.diagnosis_name}"
        return self.diagnosis_code
