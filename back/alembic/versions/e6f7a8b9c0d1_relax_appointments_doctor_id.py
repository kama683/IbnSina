"""appointments.doctor_id becomes nullable (Этап 0 коммит 4)

Revision ID: e6f7a8b9c0d1
Revises: d5e6f7a8b9c0
Create Date: 2026-08-07

Код с этого коммита больше не пишет в doctors/doctor_id — только в
employees/employee_id. Колонка appointments.doctor_id физически остаётся до
коммита 5 (снос старой схемы), но перестаёт быть обязательной, иначе INSERT
через POST /api/appointments начнёт падать по NOT NULL. hospitalizations.*,
schedules.*, doctor_education.doctor_id не трогаем — туда через API ничего не
пишется (только seed.py, который продолжает поддерживать обе колонки).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e6f7a8b9c0d1"
down_revision: Union[str, Sequence[str], None] = "d5e6f7a8b9c0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("appointments", "doctor_id", nullable=True)


def downgrade() -> None:
    conn = op.get_bind()
    blocking = conn.execute(
        sa.text("SELECT COUNT(*) FROM appointments WHERE doctor_id IS NULL")
    ).scalar()
    if blocking:
        raise RuntimeError(
            f"Нельзя откатить: {blocking} приёмов создано без doctor_id после коммита 4"
        )
    op.alter_column("appointments", "doctor_id", nullable=False)
