"""add services table (Этап 2 коммит 1)

Revision ID: a1e2c3b4d5f6
Revises: 9f1a2b3c4d5e
Create Date: 2026-08-08

Первая таблица кассы/финансов (docs/PHASE2_ANALYSIS.md) — прейскурант.
Полностью новая, ничего существующего не трогает. Не удаляется в принципе
(только is_active=false на уровне приложения) — downgrade поэтому просто
дропает таблицу целиком, без разбора данных.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PGEnum


revision: str = "a1e2c3b4d5f6"
down_revision: Union[str, Sequence[str], None] = "9f1a2b3c4d5e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE service_category AS ENUM
                ('consultation', 'procedure', 'analysis', 'other');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.create_table(
        "services",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=300), nullable=False),
        sa.Column(
            "category", PGEnum(name="service_category", create_type=False), nullable=False
        ),
        sa.Column("price", sa.BigInteger(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )


def downgrade() -> None:
    op.drop_table("services")
    op.execute("DROP TYPE IF EXISTS service_category")
