"""drop legacy doctors table and old doctor_id columns (Этап 0 коммит 5)

Revision ID: f7a8b9c0d1e2
Revises: e6f7a8b9c0d1
Create Date: 2026-08-07

Финальный шаг рефакторинга Doctor → Employee: снос старой таблицы `doctors`,
старых `doctor_id`-колонок и `users.role` (роль теперь только на
Employee.role — единый источник истины, см. docs/PHASE0_ANALYSIS.md).
`employee_id`/`doctor_profile_id` становятся NOT NULL.

ВАЖНО про downgrade: это первая по-настоящему необратимая точка Этапа 0
(она и была так помечена в разделе рисков плана). Данные для отката
восстанавливаются из Employee/DoctorProfile лучшим доступным приближением —
но короткая строковая метка специальности `Doctor.role` (например
"Эндокринолог", отдельно от `title`/`specialty`) была осознанно не перенесена
ещё в коммите 2 (data-migration c4d5e6f7a8b9) и восстановлена быть не может:
downgrade заполнит её тем же значением, что и `position_title`. Схема при
downgrade восстанавливается полностью и точно; данные — с этой одной
известной потерей точности.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f7a8b9c0d1e2"
down_revision: Union[str, Sequence[str], None] = "e6f7a8b9c0d1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Инвариант перед сносом: нигде не осталось NULL в новых FK (данные из
    # коммита 2 + всё, что создано кодом коммита 4).
    for table in ("appointments", "hospitalizations", "schedules"):
        orphaned = conn.execute(
            sa.text(f"SELECT COUNT(*) FROM {table} WHERE employee_id IS NULL")
        ).scalar()
        if orphaned:
            raise RuntimeError(f"{table}: {orphaned} строк без employee_id, снос прерван")
    orphaned_users = conn.execute(
        sa.text("SELECT COUNT(*) FROM users WHERE employee_id IS NULL")
    ).scalar()
    if orphaned_users:
        raise RuntimeError(f"users: {orphaned_users} строк без employee_id, снос прерван")
    orphaned_education = conn.execute(
        sa.text("SELECT COUNT(*) FROM doctor_education WHERE doctor_profile_id IS NULL")
    ).scalar()
    if orphaned_education:
        raise RuntimeError(
            f"doctor_education: {orphaned_education} строк без doctor_profile_id, снос прерван"
        )

    op.drop_column("appointments", "doctor_id")
    op.drop_column("hospitalizations", "doctor_id")
    op.drop_column("schedules", "doctor_id")
    op.drop_column("doctor_education", "doctor_id")
    op.drop_column("users", "doctor_id")
    op.drop_column("users", "role")
    op.execute("DROP TYPE IF EXISTS user_role")

    op.drop_table("doctors")

    op.alter_column("appointments", "employee_id", nullable=False)
    op.alter_column("hospitalizations", "employee_id", nullable=False)
    op.alter_column("schedules", "employee_id", nullable=False)
    op.alter_column("users", "employee_id", nullable=False)
    op.alter_column("doctor_education", "doctor_profile_id", nullable=False)


def downgrade() -> None:
    conn = op.get_bind()

    op.alter_column("appointments", "employee_id", nullable=True)
    op.alter_column("hospitalizations", "employee_id", nullable=True)
    op.alter_column("schedules", "employee_id", nullable=True)
    op.alter_column("users", "employee_id", nullable=True)
    op.alter_column("doctor_education", "doctor_profile_id", nullable=True)

    op.create_table(
        "doctors",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column("first_name_patronymic", sa.String(length=100), nullable=False),
        sa.Column("short_name", sa.String(length=50), nullable=False),
        sa.Column("initials", sa.String(length=10), nullable=False),
        sa.Column("role", sa.String(length=100), nullable=False),
        sa.Column("area", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=100), nullable=True),
        sa.Column("office", sa.String(length=50), nullable=True),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("email", sa.String(length=100), nullable=True),
        sa.Column("workplace", sa.String(length=300), nullable=True),
        sa.Column("specialty", sa.String(length=200), nullable=True),
        sa.Column("qualification_category", sa.String(length=100), nullable=True),
        sa.Column("license_number", sa.String(length=50), nullable=True),
        sa.Column("license_valid_until", sa.String(length=20), nullable=True),
        sa.Column("certificate_number", sa.String(length=50), nullable=True),
        sa.Column("certificate_valid_until", sa.String(length=20), nullable=True),
        sa.Column("about", sa.String(length=1000), nullable=True),
        sa.Column("experience_years", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # Лучшее доступное восстановление данных из Employee/DoctorProfile —
    # см. предупреждение в docstring о потере короткой метки role. area у
    # старой Doctor была NOT NULL, а у DoctorProfile — нет (например у
    # head_doctor участка нет вовсе), поэтому NULL → '' при переносе назад.
    doctors = conn.execute(
        sa.text(
            """
            SELECT e.id AS employee_id, e.full_name, e.first_name_patronymic,
                   e.short_name, e.initials, e.position_title, e.phone, e.email,
                   COALESCE(dp.area, '') AS area, dp.office, dp.workplace, dp.specialty,
                   dp.qualification_category, dp.license_number, dp.license_valid_until,
                   dp.certificate_number, dp.certificate_valid_until, dp.about,
                   dp.experience_years
            FROM employees e
            JOIN doctor_profiles dp ON dp.employee_id = e.id
            """
        )
    ).mappings().all()

    employee_to_doctor: dict[int, int] = {}
    for row in doctors:
        doctor_id = conn.execute(
            sa.text(
                """
                INSERT INTO doctors (
                    full_name, first_name_patronymic, short_name, initials, role, area,
                    title, office, phone, email, workplace, specialty,
                    qualification_category, license_number, license_valid_until,
                    certificate_number, certificate_valid_until, about, experience_years
                ) VALUES (
                    :full_name, :first_name_patronymic, :short_name, :initials,
                    :position_title, :area,
                    :position_title, :office, :phone, :email, :workplace, :specialty,
                    :qualification_category, :license_number, :license_valid_until,
                    :certificate_number, :certificate_valid_until, :about, :experience_years
                )
                RETURNING id
                """
            ),
            dict(row),
        ).scalar_one()
        employee_to_doctor[row["employee_id"]] = doctor_id

    op.add_column("appointments", sa.Column("doctor_id", sa.Integer(), nullable=True))
    op.add_column("hospitalizations", sa.Column("doctor_id", sa.Integer(), nullable=True))
    op.add_column("schedules", sa.Column("doctor_id", sa.Integer(), nullable=True))
    op.add_column("doctor_education", sa.Column("doctor_id", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("doctor_id", sa.Integer(), nullable=True))

    for employee_id, doctor_id in employee_to_doctor.items():
        params = {"eid": employee_id, "did": doctor_id}
        conn.execute(
            sa.text("UPDATE appointments SET doctor_id = :did WHERE employee_id = :eid"),
            params,
        )
        conn.execute(
            sa.text("UPDATE hospitalizations SET doctor_id = :did WHERE employee_id = :eid"),
            params,
        )
        conn.execute(
            sa.text("UPDATE schedules SET doctor_id = :did WHERE employee_id = :eid"), params
        )
        conn.execute(
            sa.text("UPDATE users SET doctor_id = :did WHERE employee_id = :eid"), params
        )
        conn.execute(
            sa.text(
                """
                UPDATE doctor_education SET doctor_id = :did
                WHERE doctor_profile_id = (
                    SELECT id FROM doctor_profiles WHERE employee_id = :eid
                )
                """
            ),
            params,
        )

    op.create_foreign_key(
        "appointments_doctor_id_fkey", "appointments", "doctors", ["doctor_id"], ["id"]
    )
    op.create_foreign_key(
        "hospitalizations_doctor_id_fkey",
        "hospitalizations",
        "doctors",
        ["doctor_id"],
        ["id"],
    )
    op.create_foreign_key(
        "schedules_doctor_id_fkey", "schedules", "doctors", ["doctor_id"], ["id"]
    )
    op.create_foreign_key(
        "doctor_education_doctor_id_fkey",
        "doctor_education",
        "doctors",
        ["doctor_id"],
        ["id"],
    )
    op.create_foreign_key("users_doctor_id_fkey", "users", "doctors", ["doctor_id"], ["id"])
    op.create_unique_constraint("users_doctor_id_key", "users", ["doctor_id"])

    op.alter_column("appointments", "doctor_id", nullable=False)
    op.alter_column("hospitalizations", "doctor_id", nullable=False)
    op.alter_column("schedules", "doctor_id", nullable=False)
    op.alter_column("doctor_education", "doctor_id", nullable=False)

    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE user_role AS ENUM
                ('doctor', 'admin', 'nurse', 'reception', 'accountant', 'head_doctor');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.Enum(
                "doctor",
                "admin",
                "nurse",
                "reception",
                "accountant",
                "head_doctor",
                name="user_role",
            ),
            nullable=True,
        ),
    )
    conn.execute(
        sa.text(
            """
            UPDATE users u SET role = e.role::text::user_role
            FROM employees e WHERE e.id = u.employee_id
            """
        )
    )
    op.alter_column("users", "role", nullable=False)
