from datetime import date

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Vaccination(Base):
    __tablename__ = "vaccinations"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)

    name: Mapped[str] = mapped_column(String(200), nullable=False)       # "АКДС"
    date: Mapped[date] = mapped_column(Date, nullable=False)             # дата прививки
    dose: Mapped[str | None] = mapped_column(String(50), nullable=True)  # "1-я доза"
    notes: Mapped[str | None] = mapped_column(String(300), nullable=True)

    patient = relationship("Patient", back_populates="vaccinations")