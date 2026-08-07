"""add employees, doctor_profiles, refresh_tokens, audit_log (additive, Этап 0 коммит 1)

Revision ID: b3c4d5e6f7a8
Revises: a7b8c9d0e1f2
Create Date: 2026-08-07

Аддитивная миграция: новые таблицы + nullable employee_id/doctor_profile_id
рядом со старыми doctor_id. Старая таблица doctors и её FK не трогаются —
existующий код продолжает работать как раньше. Данные переносятся в
следующей (data-)миграции коммита 2.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import ENUM as PGEnum


revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, Sequence[str], None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE employee_role AS ENUM
                ('reception', 'doctor', 'nurse', 'accountant', 'head_doctor', 'admin');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE employee_status AS ENUM ('active', 'on_leave', 'fired');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE salary_type AS ENUM ('fixed', 'percent', 'fixed_plus_percent');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    if not inspector.has_table("employees"):
        op.create_table(
            "employees",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("full_name", sa.String(length=200), nullable=False),
            sa.Column("first_name_patronymic", sa.String(length=100), nullable=False),
            sa.Column("short_name", sa.String(length=50), nullable=False),
            sa.Column("initials", sa.String(length=10), nullable=False),
            sa.Column(
                "role", PGEnum(name="employee_role", create_type=False), nullable=False
            ),
            sa.Column("position_title", sa.String(length=100), nullable=True),
            sa.Column("phone", sa.String(length=20), nullable=True),
            sa.Column("email", sa.String(length=100), nullable=True),
            sa.Column("hired_at", sa.Date(), nullable=False),
            sa.Column("fired_at", sa.Date(), nullable=True),
            sa.Column(
                "status",
                PGEnum(name="employee_status", create_type=False),
                nullable=False,
                server_default="active",
            ),
            sa.Column(
                "salary_type",
                PGEnum(name="salary_type", create_type=False),
                nullable=False,
                server_default="fixed",
            ),
            sa.Column("base_salary", sa.BigInteger(), nullable=True),
            sa.Column("revenue_percent", sa.Numeric(5, 2), nullable=True),
            sa.Column("branch_id", sa.Integer(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )

    if not inspector.has_table("doctor_profiles"):
        op.create_table(
            "doctor_profiles",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("employee_id", sa.Integer(), nullable=False),
            sa.Column("specialty", sa.String(length=200), nullable=True),
            sa.Column("qualification_category", sa.String(length=100), nullable=True),
            sa.Column("area", sa.String(length=50), nullable=True),
            sa.Column("office", sa.String(length=50), nullable=True),
            sa.Column("workplace", sa.String(length=300), nullable=True),
            sa.Column("license_number", sa.String(length=50), nullable=True),
            sa.Column("license_valid_until", sa.String(length=20), nullable=True),
            sa.Column("certificate_number", sa.String(length=50), nullable=True),
            sa.Column("certificate_valid_until", sa.String(length=20), nullable=True),
            sa.Column("about", sa.String(length=1000), nullable=True),
            sa.Column("experience_years", sa.Integer(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
            sa.UniqueConstraint("employee_id"),
        )

    if not inspector.has_table("refresh_tokens"):
        op.create_table(
            "refresh_tokens",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("token_hash", sa.String(length=255), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("revoked_at", sa.DateTime(), nullable=True),
            sa.Column("user_agent", sa.String(length=300), nullable=True),
            sa.Column("ip", sa.String(length=64), nullable=True),
            sa.Column(
                "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        )

    if not inspector.has_table("audit_log"):
        op.create_table(
            "audit_log",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("actor_user_id", sa.Integer(), nullable=True),
            sa.Column("entity_type", sa.String(length=50), nullable=False),
            sa.Column("entity_id", sa.Integer(), nullable=True),
            sa.Column("action", sa.String(length=50), nullable=False),
            sa.Column("changes", postgresql.JSONB(), nullable=True),
            sa.Column("ip", sa.String(length=64), nullable=True),
            sa.Column(
                "created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        )

    for table, fk_name in (
        ("appointments", "fk_appointments_employee_id"),
        ("hospitalizations", "fk_hospitalizations_employee_id"),
        ("schedules", "fk_schedules_employee_id"),
    ):
        columns = {col["name"] for col in inspector.get_columns(table)}
        if "employee_id" not in columns:
            op.add_column(table, sa.Column("employee_id", sa.Integer(), nullable=True))
            op.create_foreign_key(fk_name, table, "employees", ["employee_id"], ["id"])

    user_columns = {col["name"] for col in inspector.get_columns("users")}
    if "employee_id" not in user_columns:
        op.add_column("users", sa.Column("employee_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_users_employee_id", "users", "employees", ["employee_id"], ["id"]
        )
        op.create_unique_constraint("uq_users_employee_id", "users", ["employee_id"])

    education_columns = {col["name"] for col in inspector.get_columns("doctor_education")}
    if "doctor_profile_id" not in education_columns:
        op.add_column(
            "doctor_education", sa.Column("doctor_profile_id", sa.Integer(), nullable=True)
        )
        op.create_foreign_key(
            "fk_doctor_education_doctor_profile_id",
            "doctor_education",
            "doctor_profiles",
            ["doctor_profile_id"],
            ["id"],
        )


def downgrade() -> None:
    op.drop_constraint(
        "fk_doctor_education_doctor_profile_id", "doctor_education", type_="foreignkey"
    )
    op.drop_column("doctor_education", "doctor_profile_id")

    op.drop_constraint("uq_users_employee_id", "users", type_="unique")
    op.drop_constraint("fk_users_employee_id", "users", type_="foreignkey")
    op.drop_column("users", "employee_id")

    for table, fk_name in (
        ("schedules", "fk_schedules_employee_id"),
        ("hospitalizations", "fk_hospitalizations_employee_id"),
        ("appointments", "fk_appointments_employee_id"),
    ):
        op.drop_constraint(fk_name, table, type_="foreignkey")
        op.drop_column(table, "employee_id")

    op.drop_table("audit_log")
    op.drop_table("refresh_tokens")
    op.drop_table("doctor_profiles")
    op.drop_table("employees")

    op.execute("DROP TYPE IF EXISTS salary_type")
    op.execute("DROP TYPE IF EXISTS employee_status")
    op.execute("DROP TYPE IF EXISTS employee_role")
