from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    # Пример полей под фронт
    iin: Mapped[str] = mapped_column(String(12), unique=True)
    birth_date: Mapped[date] = mapped_column(Date)
    gender: Mapped[str] = mapped_column(String(1))          # "М" / "Ж"
    blood_type: Mapped[str | None] = mapped_column(String(20))
    phone: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(String(300))
    area: Mapped[str] = mapped_column(String(50))
    last_appointment: Mapped[date | None] = mapped_column(Date, nullable=True)
    dispensary: Mapped[bool] = mapped_column(default=False)
    care_type: Mapped[str] = mapped_column(String(20), default="ambulatory")
    short_name: Mapped[str] = mapped_column(String(50))

    appointments = relationship("Appointment", back_populates="patient")
