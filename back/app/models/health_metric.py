from datetime import date

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class HealthMetric(Base):
    __tablename__ = "health_metrics"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)

    label: Mapped[str] = mapped_column(String(100), nullable=False)   # "Рост", "Вес"
    value: Mapped[str] = mapped_column(String(100), nullable=False)   # "168 см", "82 кг"
    date: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(String(200), nullable=True)  # "избыточный"

    patient = relationship("Patient", back_populates="health_metrics")