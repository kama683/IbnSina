import enum
from datetime import date

from sqlalchemy import Date, Enum, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EmployeeRole(str, enum.Enum):
    reception = "reception"
    doctor = "doctor"
    nurse = "nurse"
    accountant = "accountant"
    head_doctor = "head_doctor"
    admin = "admin"


class EmployeeStatus(str, enum.Enum):
    active = "active"
    on_leave = "on_leave"
    fired = "fired"


class SalaryType(str, enum.Enum):
    fixed = "fixed"
    percent = "percent"
    fixed_plus_percent = "fixed_plus_percent"


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    # Не из плана — сохранено из Doctor, используется в приветствии на дашборде
    # ("Добрый день, {firstNamePatronymic}"). См. отчёт по коммиту 1/2 в PHASE0_ANALYSIS.md.
    first_name_patronymic: Mapped[str] = mapped_column(String(100), nullable=False)
    short_name: Mapped[str] = mapped_column(String(50), nullable=False)
    initials: Mapped[str] = mapped_column(String(10), nullable=False)
    role: Mapped[EmployeeRole] = mapped_column(
        Enum(EmployeeRole, name="employee_role"), nullable=False
    )
    position_title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hired_at: Mapped[date] = mapped_column(Date, nullable=False)
    fired_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[EmployeeStatus] = mapped_column(
        Enum(EmployeeStatus, name="employee_status"),
        nullable=False,
        default=EmployeeStatus.active,
    )
    salary_type: Mapped[SalaryType] = mapped_column(
        Enum(SalaryType, name="salary_type"), nullable=False, default=SalaryType.fixed
    )
    base_salary: Mapped[int | None] = mapped_column(nullable=True)
    revenue_percent: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    # Задел на филиал — таблицы Branch пока нет (мультифилиальность вне Этапа 0), FK намеренно нет.
    branch_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    doctor_profile = relationship("DoctorProfile", back_populates="employee", uselist=False)
