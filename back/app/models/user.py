import enum

from sqlalchemy import String, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

class UserRole(str, enum.Enum):
    doctor = "doctor"
    admin = "admin"
    nurse = "nurse"
    # Добавлено в Этапе 0 (коммит 3) вслед за расширением Postgres-enum'а
    # user_role — готовим Python-сторону под роли из Employee, окончательно
    # role/UserRole снимаются в коммите 5.
    reception = "reception"
    accountant = "accountant"
    head_doctor = "head_doctor"

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), nullable=False)
    # Связь с врачом (для role=doctor)
    doctor_id: Mapped[int | None] = mapped_column(ForeignKey("doctors.id"), unique=True, nullable=True)

    doctor = relationship("Doctor", back_populates="user")
