"""expand doctor certificate education and appointment duration

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "doctors",
        sa.Column("certificate_number", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "doctors",
        sa.Column("certificate_valid_until", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "appointments",
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
    )
    op.create_table(
        "doctor_education",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=False),
        sa.Column("year", sa.String(length=4), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_doctor_education_doctor_id"),
        "doctor_education",
        ["doctor_id"],
        unique=False,
    )


def downgrade() -> None:
    # f7a8b9c0d1e2 (позже в цепочке) удаляет doctor_education.doctor_id при
    # upgrade — Postgres при этом каскадно сносит и этот индекс; при
    # downgrade f7a8b9c0d1e2 восстанавливает колонку, но не индекс (найдено
    # проверкой полной цепочки миграций с нуля, Этап 2, коммит 14). Проверка
    # на существование — тот же паттерн, что и в соседних миграциях этого
    # периода (b3c4d5e6f7a8, d4e5f6a7b8c9).
    conn = op.get_bind()
    existing_indexes = {idx["name"] for idx in sa.inspect(conn).get_indexes("doctor_education")}
    if op.f("ix_doctor_education_doctor_id") in existing_indexes:
        op.drop_index(op.f("ix_doctor_education_doctor_id"), table_name="doctor_education")
    op.drop_table("doctor_education")
    op.drop_column("appointments", "duration_minutes")
    op.drop_column("doctors", "certificate_valid_until")
    op.drop_column("doctors", "certificate_number")
