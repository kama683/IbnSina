import enum
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Index, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CashShiftStatus(str, enum.Enum):
    open = "open"
    closed = "closed"


class CashShift(Base):
    """Этап 2, коммит 2 (docs/PHASE2_ANALYSIS.md) — кассовая смена.
    expected_cash/discrepancy НЕ колонки — вычисляются в сериализаторе
    отчёта (коммит 5) из суммы Payment по этой смене, чтобы никогда не
    могли разойтись с фактическими платежами."""

    __tablename__ = "cash_shifts"
    __table_args__ = (
        # Дублирует partial index из миграции (op.create_index) — здесь он
        # нужен, чтобы Base.metadata.create_all() (conftest.py тестов) тоже
        # его создавал, иначе уникальность "одна открытая смена на кассира"
        # тихо не проверяется в тестовой БД (там нет alembic, только ORM-схема).
        Index(
            "ix_cash_shifts_one_open_per_cashier",
            "cashier_employee_id",
            unique=True,
            postgresql_where=text("status = 'open'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    cashier_employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    opened_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    opening_balance: Mapped[int] = mapped_column(BigInteger, nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    actual_cash: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    status: Mapped[CashShiftStatus] = mapped_column(
        Enum(CashShiftStatus, name="cash_shift_status"),
        nullable=False,
        default=CashShiftStatus.open,
    )

    cashier = relationship("Employee")
