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

    title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    office: Mapped[str | None] = mapped_column(String(50), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    workplace: Mapped[str | None] = mapped_column(String(300), nullable=True)
    specialty: Mapped[str | None] = mapped_column(String(200), nullable=True)
    qualification_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    license_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    license_valid_until: Mapped[str | None] = mapped_column(String(20), nullable=True)
    certificate_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    certificate_valid_until: Mapped[str | None] = mapped_column(String(20), nullable=True)
    about: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    experience_years: Mapped[int | None] = mapped_column(nullable=True)

    # appointments/hospitalizations/schedules/education_entries сняты в этом
    # коммите вместе с переключением роутеров на Employee/DoctorProfile —
    # Appointment/Hospitalization/Schedule/DoctorEducation больше не ссылаются
    # на Doctor. Сама таблица doctors и эта модель ещё существуют (снимаются
    # в следующем коммите), но теперь ничем не используются.
    user = relationship("User", back_populates="doctor", uselist=False)
