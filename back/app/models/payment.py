import enum
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    card = "card"
    transfer = "transfer"


class Payment(Base):
    """Этап 2, коммит 4 (docs/PHASE2_ANALYSIS.md) — факт получения денег.
    Append-only в буквальном смысле: маршрутов PATCH/DELETE для этой
    сущности не существует физически ни в одном роутере — исправление
    только новой записью со ссылкой на reversal_of_payment_id (возврат,
    коммит 6). amount отрицательный = возврат."""

    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), nullable=False)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method"), nullable=False
    )
    cash_shift_id: Mapped[int | None] = mapped_column(
        ForeignKey("cash_shifts.id"), nullable=True
    )
    created_by_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    reversal_of_payment_id: Mapped[int | None] = mapped_column(
        ForeignKey("payments.id"), nullable=True
    )
    refund_reason: Mapped[str | None] = mapped_column(String(300), nullable=True)
    approved_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )

    invoice = relationship("Invoice")
    cash_shift = relationship("CashShift")
    # Две FK на employees.id + самоссылка на payments.id — foreign_keys
    # обязателен на каждой, тот же паттерн, что Invoice/Appointment выше.
    created_by = relationship("Employee", foreign_keys=[created_by_id])
    approved_by = relationship("Employee", foreign_keys=[approved_by_id])
    reversal_of = relationship("Payment", remote_side=[id])
