"""add refund_requests table (Этап 2 коммит 6)

Revision ID: e1f2a3b4c5d6
Revises: d9e0f1a2b3c4
Create Date: 2026-08-08

RefundRequest (docs/PHASE2_ANALYSIS.md, решение 6) — заявка на возврат.
Неодобренного возврата как Payment в БД не существует; approve создаёт
отрицательную Payment-запись, reject — нет.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PGEnum


revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, Sequence[str], None] = "d9e0f1a2b3c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE refund_request_status AS ENUM ('pending', 'approved', 'rejected');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.create_table(
        "refund_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invoice_id", sa.Integer(), nullable=False),
        sa.Column("payment_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("reason", sa.String(length=300), nullable=False),
        sa.Column("requested_by_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            PGEnum(name="refund_request_status", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("decided_by_id", sa.Integer(), nullable=True),
        sa.Column("decided_at", sa.DateTime(), nullable=True),
        sa.Column("resulting_payment_id", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"]),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"]),
        sa.ForeignKeyConstraint(["requested_by_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["decided_by_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["resulting_payment_id"], ["payments.id"]),
    )


def downgrade() -> None:
    op.drop_table("refund_requests")
    op.execute("DROP TYPE IF EXISTS refund_request_status")
