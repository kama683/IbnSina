"""add invoices, invoice_items, invoice_number_counters (Этап 2 коммит 3)

Revision ID: c3d4e5f6a7b8
Revises: b7f8a9c0d1e2
Create Date: 2026-08-08

Счёт и его позиции (docs/PHASE2_ANALYSIS.md). invoice_number_counters —
атомарный погодовой счётчик номеров счетов (решение B, §6 плана) —
инкрементируется в той же транзакции, что INSERT в invoices.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PGEnum


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b7f8a9c0d1e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE invoice_status AS ENUM
                ('draft', 'unpaid', 'partial', 'paid', 'refunded', 'cancelled');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    op.create_table(
        "invoice_number_counters",
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("last_number", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("year"),
    )

    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invoice_number", sa.String(length=20), nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("appointment_id", sa.Integer(), nullable=True),
        sa.Column(
            "status",
            PGEnum(name="invoice_status", create_type=False),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("subtotal", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("discount_total", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("total", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("discount_approved_by_id", sa.Integer(), nullable=True),
        sa.Column("discount_approved_at", sa.DateTime(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("cancelled_at", sa.DateTime(), nullable=True),
        sa.Column("cancelled_by_id", sa.Integer(), nullable=True),
        sa.Column("cancellation_reason", sa.String(length=300), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("invoice_number"),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"]),
        sa.ForeignKeyConstraint(["discount_approved_by_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["cancelled_by_id"], ["employees.id"]),
    )

    op.create_table(
        "invoice_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invoice_id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column("name_snapshot", sa.String(length=300), nullable=False),
        sa.Column("price_snapshot", sa.BigInteger(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("discount_amount", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("line_total", sa.BigInteger(), nullable=False),
        sa.Column("performer_employee_id", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"]),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"]),
        sa.ForeignKeyConstraint(["performer_employee_id"], ["employees.id"]),
    )


def downgrade() -> None:
    op.drop_table("invoice_items")
    op.drop_table("invoices")
    op.drop_table("invoice_number_counters")
    op.execute("DROP TYPE IF EXISTS invoice_status")
