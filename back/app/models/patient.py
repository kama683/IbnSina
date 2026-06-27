from datetime import date

from sqlalchemy import Boolean, Date, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True)

    iin: Mapped[str] = mapped_column(String(12), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(1), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    area: Mapped[str] = mapped_column(String(50), nullable=False)
    short_name: Mapped[str] = mapped_column(String(50), nullable=False)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    blood_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    dispensary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    appointments = relationship("Appointment", back_populates="patient")
    diseases = relationship("PatientDisease", back_populates="patient", cascade="all, delete-orphan")
    allergies = relationship("PatientAllergy", back_populates="patient", cascade="all, delete-orphan")
    vaccinations = relationship("Vaccination", back_populates="patient", cascade="all, delete-orphan")
    hospitalizations = relationship("Hospitalization", back_populates="patient", cascade="all, delete-orphan")
    health_metrics = relationship("HealthMetric", back_populates="patient", cascade="all, delete-orphan")