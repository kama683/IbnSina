"""add cash_shifts table (Этап 2 коммит 2)

Revision ID: b7f8a9c0d1e2
Revises: a1e2c3b4d5f6
Create Date: 2026-08-08

Частичный уникальный индекс — ровно одна открытая смена на кассира
одновременно (решение 3, docs/PHASE2_ANALYSIS.md §4). Несколько ресепшенов
могут работать параллельно, каждый со своей сменой.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PGEnum


revision: str = "b7f8a9c0d1e2"
down_revision: Union[str, Sequence[str], None] = "a1e2c3b4d5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE cash_shift_status AS ENUM ('open', 'closed');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.create_table(
        "cash_shifts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cashier_employee_id", sa.Integer(), nullable=False),
        sa.Column("opened_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("opening_balance", sa.BigInteger(), nullable=False),
        sa.Column("closed_at", sa.DateTime(), nullable=True),
        sa.Column("actual_cash", sa.BigInteger(), nullable=True),
        sa.Column(
            "status",
            PGEnum(name="cash_shift_status", create_type=False),
            nullable=False,
            server_default="open",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["cashier_employee_id"], ["employees.id"]),
    )
    op.create_index(
        "ix_cash_shifts_one_open_per_cashier",
        "cash_shifts",
        ["cashier_employee_id"],
        unique=True,
        postgresql_where=sa.text("status = 'open'"),
    )


def downgrade() -> None:
    op.drop_index("ix_cash_shifts_one_open_per_cashier", table_name="cash_shifts")
    op.drop_table("cash_shifts")
    op.execute("DROP TYPE IF EXISTS cash_shift_status")
