from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id"), unique=True, nullable=False
    )

    specialty: Mapped[str | None] = mapped_column(String(200), nullable=True)
    qualification_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    office: Mapped[str | None] = mapped_column(String(50), nullable=True)
    workplace: Mapped[str | None] = mapped_column(String(300), nullable=True)
    license_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    license_valid_until: Mapped[str | None] = mapped_column(String(20), nullable=True)
    certificate_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    certificate_valid_until: Mapped[str | None] = mapped_column(String(20), nullable=True)
    about: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    experience_years: Mapped[int | None] = mapped_column(Integer, nullable=True)

    employee = relationship("Employee", back_populates="doctor_profile")
    education_entries = relationship(
        "DoctorEducation",
        back_populates="doctor_profile",
        order_by="DoctorEducation.year",
    )
