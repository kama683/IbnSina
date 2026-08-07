"""add users.must_change_password, unique index on refresh_tokens.token_hash (Этап 0, коммит 7)

Revision ID: 38e08371eb02
Revises: f7a8b9c0d1e2
Create Date: 2026-08-08

must_change_password — задел под принудительную смену пароля новых
сотрудников (не используется UI/API ещё, только колонка + сериализация в
/auth/me). Индекс на token_hash — refresh-токен ищется по хешу на каждый
/auth/refresh, без индекса это full scan.
"""
from alembic import op
import sqlalchemy as sa

revision = "38e08371eb02"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    user_columns = {col["name"] for col in inspector.get_columns("users")}
    if "must_change_password" not in user_columns:
        op.add_column(
            "users",
            sa.Column(
                "must_change_password",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )

    existing_indexes = {idx["name"] for idx in inspector.get_indexes("refresh_tokens")}
    if "ix_refresh_tokens_token_hash" not in existing_indexes:
        op.create_index(
            "ix_refresh_tokens_token_hash",
            "refresh_tokens",
            ["token_hash"],
            unique=True,
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    existing_indexes = {idx["name"] for idx in inspector.get_indexes("refresh_tokens")}
    if "ix_refresh_tokens_token_hash" in existing_indexes:
        op.drop_index("ix_refresh_tokens_token_hash", table_name="refresh_tokens")

    user_columns = {col["name"] for col in inspector.get_columns("users")}
    if "must_change_password" in user_columns:
        op.drop_column("users", "must_change_password")
