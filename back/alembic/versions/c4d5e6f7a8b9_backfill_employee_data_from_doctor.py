"""data-migration: backfill Employee/DoctorProfile из Doctor (Этап 0 коммит 2)

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-08-07

Для каждой существующей строки `doctors` создаёт `Employee`(role=doctor) и
`DoctorProfile`, затем проставляет employee_id/doctor_profile_id во всех
зависимых таблицах. Таблица `doctors` и старые doctor_id-колонки не трогаются
и не удаляются — это отдельная миграция коммита 5, после того как код
переключится на Employee (коммит 4) и будет проверено, что ничего не сломалось.

Примечание по полям: у Doctor есть три похожих текстовых поля — `role`
(короткая метка специальности, например "Эндокринолог"), `title` (полная
должность, "Врач-эндокринолог") и `specialty` (формальный код специальности,
"Эндокринолог (04.02.001)"). В плане у Employee/DoctorProfile есть слоты только
под два из них: `title` → `Employee.position_title`, `specialty` →
`DoctorProfile.specialty`. Короткая метка `role` не переносится отдельным
полем — её содержание избыточно относительно `specialty`/`position_title`
вместе взятых (см. docs/PHASE0_ANALYSIS.md, отчёт по коммиту 2).

`hired_at` у Doctor не было вовсе — для перенесённых записей проставляется
текущая дата на момент миграции как заглушка (реальной даты найма в старых
данных не существовало).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, Sequence[str], None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    already_migrated = conn.execute(sa.text("SELECT COUNT(*) FROM employees")).scalar()
    if already_migrated:
        return

    doctors = (
        conn.execute(
            sa.text(
                """
                SELECT id, full_name, first_name_patronymic, short_name, initials,
                       area, title, office, phone, email, workplace, specialty,
                       qualification_category, license_number, license_valid_until,
                       certificate_number, certificate_valid_until, about, experience_years
                FROM doctors
                """
            )
        )
        .mappings()
        .all()
    )

    for doctor in doctors:
        employee_id = conn.execute(
            sa.text(
                """
                INSERT INTO employees (
                    full_name, first_name_patronymic, short_name, initials, role,
                    position_title, phone, email, hired_at, status, salary_type
                ) VALUES (
                    :full_name, :first_name_patronymic, :short_name, :initials, 'doctor',
                    :position_title, :phone, :email, CURRENT_DATE, 'active', 'fixed'
                )
                RETURNING id
                """
            ),
            {
                "full_name": doctor["full_name"],
                "first_name_patronymic": doctor["first_name_patronymic"],
                "short_name": doctor["short_name"],
                "initials": doctor["initials"],
                "position_title": doctor["title"],
                "phone": doctor["phone"],
                "email": doctor["email"],
            },
        ).scalar_one()

        doctor_profile_id = conn.execute(
            sa.text(
                """
                INSERT INTO doctor_profiles (
                    employee_id, specialty, qualification_category, area, office,
                    workplace, license_number, license_valid_until, certificate_number,
                    certificate_valid_until, about, experience_years
                ) VALUES (
                    :employee_id, :specialty, :qualification_category, :area, :office,
                    :workplace, :license_number, :license_valid_until, :certificate_number,
                    :certificate_valid_until, :about, :experience_years
                )
                RETURNING id
                """
            ),
            {
                "employee_id": employee_id,
                "specialty": doctor["specialty"],
                "qualification_category": doctor["qualification_category"],
                "area": doctor["area"],
                "office": doctor["office"],
                "workplace": doctor["workplace"],
                "license_number": doctor["license_number"],
                "license_valid_until": doctor["license_valid_until"],
                "certificate_number": doctor["certificate_number"],
                "certificate_valid_until": doctor["certificate_valid_until"],
                "about": doctor["about"],
                "experience_years": doctor["experience_years"],
            },
        ).scalar_one()

        params = {"eid": employee_id, "did": doctor["id"]}
        conn.execute(
            sa.text("UPDATE appointments SET employee_id = :eid WHERE doctor_id = :did"),
            params,
        )
        conn.execute(
            sa.text("UPDATE hospitalizations SET employee_id = :eid WHERE doctor_id = :did"),
            params,
        )
        conn.execute(
            sa.text("UPDATE schedules SET employee_id = :eid WHERE doctor_id = :did"), params
        )
        conn.execute(
            sa.text("UPDATE users SET employee_id = :eid WHERE doctor_id = :did"), params
        )
        conn.execute(
            sa.text(
                "UPDATE doctor_education SET doctor_profile_id = :dpid WHERE doctor_id = :did"
            ),
            {"dpid": doctor_profile_id, "did": doctor["id"]},
        )

    # Инвариант: ни одна строка, у которой был doctor_id, не осталась без нового FK.
    for table in ("appointments", "hospitalizations", "schedules"):
        orphaned = conn.execute(
            sa.text(f"SELECT COUNT(*) FROM {table} WHERE employee_id IS NULL")
        ).scalar()
        if orphaned:
            raise RuntimeError(
                f"Data-миграция не заполнила employee_id в {orphaned} строках {table}"
            )

    orphaned_education = conn.execute(
        sa.text(
            "SELECT COUNT(*) FROM doctor_education WHERE doctor_profile_id IS NULL"
        )
    ).scalar()
    if orphaned_education:
        raise RuntimeError(
            f"Data-миграция не заполнила doctor_profile_id в {orphaned_education} "
            "строках doctor_education"
        )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE doctor_education SET doctor_profile_id = NULL"))
    conn.execute(sa.text("UPDATE users SET employee_id = NULL"))
    conn.execute(sa.text("UPDATE schedules SET employee_id = NULL"))
    conn.execute(sa.text("UPDATE hospitalizations SET employee_id = NULL"))
    conn.execute(sa.text("UPDATE appointments SET employee_id = NULL"))
    conn.execute(sa.text("DELETE FROM doctor_profiles"))
    conn.execute(sa.text("DELETE FROM employees"))
