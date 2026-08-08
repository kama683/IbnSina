"""appointments cancellation/creator fields, patients update audit (Этап 1 коммит 1)

Revision ID: 9f1a2b3c4d5e
Revises: 38e08371eb02
Create Date: 2026-08-08

Аддитивный шаг под reception workspace (docs/PHASE1_ANALYSIS.md §6): все
новые колонки nullable, ничего не удаляется, старые строки остаются с NULL
(эти поля физически не существовали раньше — бэкфиллить нечем).

appointments.created_by_id — кто создал запись (коммит 3 этапа 1 начнёт его
заполнять). cancelled_at/cancelled_by_id/cancellation_reason — коммит 5.
patients.updated_at/updated_by_id — коммит 6 (PATCH /api/patients/{id}).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9f1a2b3c4d5e"
down_revision: Union[str, Sequence[str], None] = "38e08371eb02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "appointments",
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
    )
    op.add_column(
        "appointments", sa.Column("cancelled_at", sa.DateTime(), nullable=True)
    )
    op.add_column(
        "appointments",
        sa.Column("cancelled_by_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
    )
    op.add_column(
        "appointments", sa.Column("cancellation_reason", sa.String(length=300), nullable=True)
    )
    op.add_column("patients", sa.Column("updated_at", sa.DateTime(), nullable=True))
    op.add_column(
        "patients",
        sa.Column("updated_by_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("patients", "updated_by_id")
    op.drop_column("patients", "updated_at")
    op.drop_column("appointments", "cancellation_reason")
    op.drop_column("appointments", "cancelled_by_id")
    op.drop_column("appointments", "cancelled_at")
    op.drop_column("appointments", "created_by_id")
