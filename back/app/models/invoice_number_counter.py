from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class InvoiceNumberCounter(Base):
    """Этап 2, коммит 3 (docs/PHASE2_ANALYSIS.md §5/§6, решение B) — счётчик
    номеров счетов по году. Инкрементируется атомарно (INSERT...ON
    CONFLICT...RETURNING) в ТОЙ ЖЕ транзакции, что создание Invoice — если
    создание счёта откатится, откатится и инкремент, номер не "сгорит"
    впустую. Обычная Postgres SEQUENCE для этого не годится (не
    откатывается вместе с транзакцией), поэтому обычная таблица+UPDATE."""

    __tablename__ = "invoice_number_counters"

    year: Mapped[int] = mapped_column(primary_key=True)
    last_number: Mapped[int] = mapped_column(nullable=False, default=0)
