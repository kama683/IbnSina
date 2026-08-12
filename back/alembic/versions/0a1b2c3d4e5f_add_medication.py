"""add medications table

Revision ID: 0a1b2c3d4e5f
Revises: f7a8b9c0d1e2
Create Date: 2026-08-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0a1b2c3d4e5f'
down_revision: Union[str, Sequence[str], None] = '38e08371eb02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'medications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=100), nullable=True),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('unit', sa.String(length=50), nullable=True),
        sa.Column('manufacturer', sa.String(length=200), nullable=True),
        sa.Column('min_stock_level', sa.Integer(), nullable=True),
        sa.Column('is_controlled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_medications_code'), 'medications', ['code'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_medications_code'), table_name='medications')
    op.drop_table('medications')
