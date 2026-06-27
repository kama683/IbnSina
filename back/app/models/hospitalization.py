from datetime import date

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Hospitalization(Base):
    __tablename__ = "hospitalizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), index=True)

    department: Mapped[str] = mapped_column(String(200), nullable=False)   # "Терапевтическое отделение"
    ward: Mapped[str | None] = mapped_column(String(100), nullable=True)   # "Палата 214"
    bed: Mapped[str | None] = mapped_column(String(50), nullable=True)     # "Койка 3"
    admitted_at: Mapped[date] = mapped_column(Date, nullable=False)
    primary_diagnosis: Mapped[str | None] = mapped_column(String(300), nullable=True)

    patient = relationship("Patient", back_populates="hospitalizations")
    doctor = relationship("Doctor", back_populates="hospitalizations")