"""drop unused departments table and doctors.department_id

Revision ID: a7b8c9d0e1f2
Revises: f1a2b3c4d5e6
Create Date: 2026-08-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    columns = {col["name"] for col in sa.inspect(conn).get_columns("doctors")}

    if "department_id" in columns:
        op.drop_constraint("fk_doctors_department_id", "doctors", type_="foreignkey")
        op.drop_column("doctors", "department_id")

    if sa.inspect(conn).has_table("departments"):
        op.drop_table("departments")


def downgrade() -> None:
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.add_column("doctors", sa.Column("department_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_doctors_department_id",
        "doctors",
        "departments",
        ["department_id"],
        ["id"],
    )
