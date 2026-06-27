"""add patient allergies

Revision ID: 290f3b051835
Revises: 501cf0cf9151
Create Date: 2026-06-27 19:51:17.740061

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '290f3b051835'
down_revision: Union[str, Sequence[str], None] = '501cf0cf9151'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "patient_allergies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_patient_allergies_patient_id"),
        "patient_allergies",
        ["patient_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_patient_allergies_patient_id"), table_name="patient_allergies")
    op.drop_table("patient_allergies")
