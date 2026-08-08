import enum

from sqlalchemy import BigInteger, Boolean, Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ServiceCategory(str, enum.Enum):
    consultation = "consultation"
    procedure = "procedure"
    analysis = "analysis"
    other = "other"


class Service(Base):
    """Этап 2, коммит 1 (docs/PHASE2_ANALYSIS.md) — прейскурант. Не
    удаляется, только is_active=false — иначе рассыпались бы старые
    InvoiceItem, которые ссылаются на service_id."""

    __tablename__ = "services"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    category: Mapped[ServiceCategory] = mapped_column(
        Enum(ServiceCategory, name="service_category"), nullable=False
    )
    # Тиыны, BigInteger — деньги никогда не float (сквозной инвариант плана).
    price: Mapped[int] = mapped_column(BigInteger, nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
