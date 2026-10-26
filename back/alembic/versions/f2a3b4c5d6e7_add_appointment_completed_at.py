"""add appointments.completed_at (Расширение регистратуры, Этап 1)

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-10-25

Момент, когда приём завершён. Нужен блоку «Вышли от врача» на стойке
регистратуры (завершённые за последние 2 часа): по времени начала приёма это
не посчитать — врач может закончить раньше или позже. Проставляется при
переходе в completed. Для уже завершённых приёмов заполняется как «дата +
время начала + длительность (18 минут, если не задана)».
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, Sequence[str], None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("appointments", sa.Column("completed_at", sa.DateTime(), nullable=True))
    op.execute(
        """
        UPDATE appointments
        SET completed_at = (date + time::time)
            + (COALESCE(duration_minutes, 18) * interval '1 minute')
        WHERE status = 'completed' AND completed_at IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("appointments", "completed_at")
