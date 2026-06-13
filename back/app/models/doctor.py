from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200))
    first_name_patronymic: Mapped[str] = mapped_column(String(100))
    short_name: Mapped[str] = mapped_column(String(50))
    initials: Mapped[str] = mapped_column(String(10))
    role: Mapped[str] = mapped_column(String(100))
    area: Mapped[str] = mapped_column(String(50))

    appointments = relationship("Appointment", back_populates="doctor")
