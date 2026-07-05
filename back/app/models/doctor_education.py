from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DoctorEducation(Base):
    __tablename__ = "doctor_education"

    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id"), index=True)
    year: Mapped[str] = mapped_column(String(4))
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(String(500))

    doctor = relationship("Doctor", back_populates="education_entries")
