"""add payments table (Этап 2 коммит 4)

Revision ID: d9e0f1a2b3c4
Revises: c3d4e5f6a7b8
Create Date: 2026-08-08

Payment (docs/PHASE2_ANALYSIS.md) — append-only на уровне API (нет
PATCH/DELETE-маршрута физически, не только по правам). Самоссылка
reversal_of_payment_id — под возвраты (коммит 6).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PGEnum


revision: str = "d9e0f1a2b3c4"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invoice_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column(
            "method", PGEnum(name="payment_method", create_type=False), nullable=False
        ),
        sa.Column("cash_shift_id", sa.Integer(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("reversal_of_payment_id", sa.Integer(), nullable=True),
        sa.Column("refund_reason", sa.String(length=300), nullable=True),
        sa.Column("approved_by_id", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"]),
        sa.ForeignKeyConstraint(["cash_shift_id"], ["cash_shifts.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["reversal_of_payment_id"], ["payments.id"]),
        sa.ForeignKeyConstraint(["approved_by_id"], ["employees.id"]),
    )


def downgrade() -> None:
    op.drop_table("payments")
    op.execute("DROP TYPE IF EXISTS payment_method")
