"""employees: avatar_filename (аватарка сотрудника)

Revision ID: d6e7f8a9b0c1
Revises: c5d6e7f8a9b0
Create Date: 2026-10-29

Сам файл лежит на диске (uploads/avatars), в БД — только его имя.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d6e7f8a9b0c1"
down_revision: Union[str, Sequence[str], None] = "c5d6e7f8a9b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("avatar_filename", sa.String(length=80), nullable=True))


def downgrade() -> None:
    op.drop_column("employees", "avatar_filename")
