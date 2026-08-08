import enum
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RefundRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class RefundRequest(Base):
    """Этап 2, коммит 6 (docs/PHASE2_ANALYSIS.md, решение 6) — заявка на
    возврат. Неодобренного возврата как Payment в БД не существует —
    отрицательная Payment-запись создаётся только при approve. Сама
    таблица нужна ради следа отклонённых заявок (аудит злоупотреблений)."""

    __tablename__ = "refund_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), nullable=False)
    payment_id: Mapped[int] = mapped_column(ForeignKey("payments.id"), nullable=False)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reason: Mapped[str] = mapped_column(String(300), nullable=False)
    requested_by_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    status: Mapped[RefundRequestStatus] = mapped_column(
        Enum(RefundRequestStatus, name="refund_request_status"),
        nullable=False,
        default=RefundRequestStatus.pending,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    decided_by_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # Заполняется только при approved — ссылка на созданную отрицательную
    # Payment-запись (сам возврат).
    resulting_payment_id: Mapped[int | None] = mapped_column(
        ForeignKey("payments.id"), nullable=True
    )

    invoice = relationship("Invoice")
    payment = relationship("Payment", foreign_keys=[payment_id])
    requested_by = relationship("Employee", foreign_keys=[requested_by_id])
    decided_by = relationship("Employee", foreign_keys=[decided_by_id])
    resulting_payment = relationship("Payment", foreign_keys=[resulting_payment_id])
