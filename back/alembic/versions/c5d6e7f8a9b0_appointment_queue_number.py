"""appointments: номер в очереди вместо времени (queue_number, started_at)

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9
Create Date: 2026-10-26

Время записи не назначается: регистратор не знает, сколько врач будет
принимать пациента. Вместо слота — порядковый номер пациента у врача на день.
Время появляется только фактическое: started_at («Начать») и completed_at.

Старые приёмы нумеруются по прежнему времени слота (внутри врача и дня, отменённые
тоже — номер не переиспользуется). Для начатых/завершённых started_at берётся из
прежнего слота, а недостающий completed_at — started_at + длительность. Колонка
time остаётся (nullable) и больше не используется.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c5d6e7f8a9b0"
down_revision: Union[str, Sequence[str], None] = "b4c5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("appointments", sa.Column("queue_number", sa.Integer(), nullable=True))
    op.add_column("appointments", sa.Column("started_at", sa.DateTime(), nullable=True))
    op.alter_column("appointments", "time", existing_type=sa.String(length=5), nullable=True)

    op.execute(
        """
        UPDATE appointments a SET queue_number = n.rn
        FROM (
            SELECT id, ROW_NUMBER() OVER (
                PARTITION BY employee_id, date ORDER BY time, id
            ) AS rn
            FROM appointments
        ) n
        WHERE a.id = n.id
        """
    )
    op.alter_column("appointments", "queue_number", nullable=False)
    op.create_unique_constraint(
        "uq_appointment_queue_number", "appointments", ["employee_id", "date", "queue_number"]
    )

    op.execute(
        """
        UPDATE appointments
        SET started_at = date + time::time
        WHERE status IN ('completed', 'in_progress') AND time IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE appointments
        SET completed_at = started_at + make_interval(mins => COALESCE(duration_minutes, 18))
        WHERE status = 'completed' AND completed_at IS NULL AND started_at IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_constraint("uq_appointment_queue_number", "appointments", type_="unique")
    # у приёмов, созданных после перехода, времени нет — ставим 00:00
    op.execute("UPDATE appointments SET time = '00:00' WHERE time IS NULL")
    op.alter_column("appointments", "time", existing_type=sa.String(length=5), nullable=False)
    op.drop_column("appointments", "started_at")
    op.drop_column("appointments", "queue_number")
