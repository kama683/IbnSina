"""expand appointments table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    columns = {col["name"] for col in sa.inspect(conn).get_columns("appointments")}

    if "diagnosis_code" not in columns:
        op.add_column("appointments", sa.Column("diagnosis_code", sa.String(length=20), nullable=True))
    if "diagnosis_name" not in columns:
        op.add_column("appointments", sa.Column("diagnosis_name", sa.String(length=200), nullable=True))
    if "objective_status" not in columns:
        op.add_column("appointments", sa.Column("objective_status", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("appointments", "objective_status")
    op.drop_column("appointments", "diagnosis_name")
    op.drop_column("appointments", "diagnosis_code")
