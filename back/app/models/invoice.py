import enum
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    unpaid = "unpaid"
    partial = "partial"
    paid = "paid"
    refunded = "refunded"
    cancelled = "cancelled"


class Invoice(Base):
    """Этап 2, коммит 3 (docs/PHASE2_ANALYSIS.md) — счёт. Итоги (subtotal/
    discount_total/total) пересчитываются сервером при любом изменении
    позиций — с клиента не принимаются (сквозной инвариант плана)."""

    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), nullable=False)
    appointment_id: Mapped[int | None] = mapped_column(
        ForeignKey("appointments.id"), nullable=True
    )
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, name="invoice_status"), nullable=False, default=InvoiceStatus.draft
    )
    subtotal: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    discount_total: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    total: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    discount_approved_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )
    discount_approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancelled_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )
    cancellation_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)

    patient = relationship("Patient")
    appointment = relationship("Appointment")
    # Три FK на employees.id — foreign_keys обязателен на каждой связи,
    # иначе SQLAlchemy не может определить, какую колонку использовать
    # (тот же паттерн, что Appointment.created_by/cancelled_by в Этапе 1).
    created_by = relationship("Employee", foreign_keys=[created_by_id])
    discount_approved_by = relationship("Employee", foreign_keys=[discount_approved_by_id])
    cancelled_by = relationship("Employee", foreign_keys=[cancelled_by_id])
    items = relationship(
        "InvoiceItem",
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="InvoiceItem.id",
    )
