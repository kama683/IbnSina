from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DoctorEducation(Base):
    __tablename__ = "doctor_education"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Не employee_id — см. решение по вопросу 3 в docs/PHASE0_ANALYSIS.md:
    # медобразование принадлежит профилю врача, а не любому сотруднику.
    doctor_profile_id: Mapped[int] = mapped_column(
        ForeignKey("doctor_profiles.id"), index=True
    )
    year: Mapped[str] = mapped_column(String(4))
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(String(500))

    doctor_profile = relationship("DoctorProfile", back_populates="education_entries")
