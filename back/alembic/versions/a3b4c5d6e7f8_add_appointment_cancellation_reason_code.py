"""add appointments.cancellation_reason_code (Расширение регистратуры, Этап 1)

Revision ID: a3b4c5d6e7f8
Revises: f2a3b4c5d6e7
Create Date: 2026-10-25

Причина отмены — справочник вместо свободного текста: patient_cancelled,
patient_no_contact, doctor_unavailable, rescheduled, other. Существующий
cancellation_reason остаётся под текст для other. Колонка nullable, потому что
у уже отменённых приёмов кода не было; для них проставляется other (текст,
если он был, сохраняется) — иначе отчёты по причинам отмен потеряли бы их.
Обязательность кода при отмене обеспечивает API.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as PGEnum


revision: str = "a3b4c5d6e7f8"
down_revision: Union[str, Sequence[str], None] = "f2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE cancellation_reason_code AS ENUM (
                'patient_cancelled', 'patient_no_contact', 'doctor_unavailable',
                'rescheduled', 'other'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.add_column(
        "appointments",
        sa.Column(
            "cancellation_reason_code",
            PGEnum(name="cancellation_reason_code", create_type=False),
            nullable=True,
        ),
    )
    op.execute(
        """
        UPDATE appointments
        SET cancellation_reason_code = 'other'
        WHERE status = 'cancelled' AND cancellation_reason_code IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("appointments", "cancellation_reason_code")
    op.execute("DROP TYPE IF EXISTS cancellation_reason_code")
