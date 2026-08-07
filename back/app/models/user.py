from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), unique=True, nullable=False)

    employee = relationship("Employee", back_populates="user", uselist=False)
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
