from sqlalchemy import BigInteger, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class InvoiceItem(Base):
    """Этап 2, коммит 3 (docs/PHASE2_ANALYSIS.md) — строка счёта.
    name_snapshot/price_snapshot замораживаются на момент выставления —
    правка Service.price задним числом не меняет уже выставленные счета
    (сквозной инвариант плана)."""

    __tablename__ = "invoice_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), nullable=False)
    # Решение 1 (§4 плана) — только услуги на Этапе 2, service_id NOT NULL.
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), nullable=False)
    name_snapshot: Mapped[str] = mapped_column(String(300), nullable=False)
    price_snapshot: Mapped[int] = mapped_column(BigInteger, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    discount_amount: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    line_total: Mapped[int] = mapped_column(BigInteger, nullable=False)
    # Задел на Этап 4 (зарплата по проценту) — кто оказал услугу. UI пока не
    # показывает, но поле закладываем сразу.
    performer_employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id"), nullable=True
    )

    invoice = relationship("Invoice", back_populates="items")
    service = relationship("Service")
    performer = relationship("Employee")
