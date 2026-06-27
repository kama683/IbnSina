from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Schedule(Base):
    __tablename__ = "schedules"

    id: Mapped[int] = mapped_column(primary_key = True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), index=True)

    day_id: Mapped[str] = mapped_column(String(10), nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False)
    start: Mapped[str] = mapped_column(String(10), nullable=False)
    end: Mapped[str] = mapped_column(String(10), nullable=False)

    doctor = relationship("Doctor", back_populates="schedules")