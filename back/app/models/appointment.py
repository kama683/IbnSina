import enum
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AppointmentStatus(str, enum.Enum):
    completed = "completed"
    in_progress = "in_progress"
    scheduled = "scheduled"
    cancelled = "cancelled"


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    time: Mapped[str] = mapped_column(String(5))
    complaint: Mapped[str] = mapped_column(Text)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, name="appointment_status"),
        default=AppointmentStatus.scheduled,
    )

    diagnosis_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    diagnosis_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    objective_status: Mapped[str | None] = mapped_column(Text, nullable=True)

    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"))

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    prescriptions = relationship("Prescription", back_populates="appointment", cascade="all, delete-orphan")

    @property
    def diagnosis(self) -> str | None:
        if self.diagnosis_code and self.diagnosis_name:
            return f"{self.diagnosis_code} {self.diagnosis_name}"
        return self.diagnosis_code
