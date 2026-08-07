"""add password_hash to users

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-08-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# bcrypt hash of the seed default password ("doctor123"), used only to backfill
# any pre-existing rows so the column can become NOT NULL. Real users should
# change their password after first login.
_DEFAULT_PASSWORD_HASH = "$2b$12$5FcXyXNQZ9sj3MLcwZ587O3ql3Qd7LRkPxNfb44tptR8P7MHAtX8e"


def upgrade() -> None:
    conn = op.get_bind()
    columns = {col["name"] for col in sa.inspect(conn).get_columns("users")}

    if "password_hash" not in columns:
        op.add_column("users", sa.Column("password_hash", sa.String(length=200), nullable=True))
        op.execute(
            sa.text("UPDATE users SET password_hash = :hash WHERE password_hash IS NULL").bindparams(
                hash=_DEFAULT_PASSWORD_HASH
            )
        )
        op.alter_column("users", "password_hash", nullable=False)


def downgrade() -> None:
    op.drop_column("users", "password_hash")
