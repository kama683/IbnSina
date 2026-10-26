"""drop patients.area and doctor_profiles.area (участок больше не ведётся)

Revision ID: b4c5d6e7f8a9
Revises: a3b4c5d6e7f8
Create Date: 2026-10-26

Участок (территориальное прикрепление) убран из продукта целиком: из карточки
пациента, профиля врача, фильтра списка пациентов и подбора врача при записи.
Данные участков удаляются безвозвратно; downgrade возвращает пустые колонки.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b4c5d6e7f8a9"
down_revision: Union[str, Sequence[str], None] = "a3b4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("patients", "area")
    op.drop_column("doctor_profiles", "area")


def downgrade() -> None:
    op.add_column("doctor_profiles", sa.Column("area", sa.String(length=50), nullable=True))
    op.add_column(
        "patients",
        sa.Column("area", sa.String(length=50), nullable=False, server_default=""),
    )
    op.alter_column("patients", "area", server_default=None)
