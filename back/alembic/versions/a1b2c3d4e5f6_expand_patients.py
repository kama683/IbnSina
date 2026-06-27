"""expand patients table

Revision ID: a1b2c3d4e5f6
Revises: 19c64c905e4d
Create Date: 2026-06-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "19c64c905e4d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем новые колонки (если их ещё нет — для чистой БД)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = {col["name"] for col in inspector.get_columns("patients")}

    if "iin" not in columns:
        op.add_column("patients", sa.Column("iin", sa.String(length=12), nullable=True))
    if "birth_date" not in columns:
        op.add_column("patients", sa.Column("birth_date", sa.Date(), nullable=True))
    if "gender" not in columns:
        op.add_column("patients", sa.Column("gender", sa.String(length=1), nullable=True))
    if "phone" not in columns:
        op.add_column("patients", sa.Column("phone", sa.String(length=20), nullable=True))
    if "area" not in columns and "district" not in columns:
        op.add_column("patients", sa.Column("area", sa.String(length=50), nullable=True))
    if "short_name" not in columns:
        op.add_column("patients", sa.Column("short_name", sa.String(length=50), nullable=True))
    if "address" not in columns:
        op.add_column("patients", sa.Column("address", sa.String(length=300), nullable=True))
    if "blood_type" not in columns:
        op.add_column("patients", sa.Column("blood_type", sa.String(length=20), nullable=True))
    if "dispensary" not in columns:
        op.add_column(
            "patients",
            sa.Column("dispensary", sa.Boolean(), nullable=False, server_default="false"),
        )

    # Переименовываем district → area (если было старое имя из черновика)
    columns = {col["name"] for col in sa.inspect(conn).get_columns("patients")}
    if "district" in columns and "area" not in columns:
        op.alter_column("patients", "district", new_column_name="area")

    # Заполняем пустые строки перед NOT NULL
    op.execute(
        """
        UPDATE patients SET
            iin = LPAD(id::text, 12, '0'),
            birth_date = COALESCE(birth_date, '1985-04-12'),
            gender = COALESCE(gender, 'М'),
            area = COALESCE(area, 'Участок №3'),
            short_name = COALESCE(short_name, full_name)
        WHERE iin IS NULL OR birth_date IS NULL OR gender IS NULL
           OR area IS NULL OR short_name IS NULL
        """
    )

    op.alter_column("patients", "iin", nullable=False)
    op.alter_column("patients", "birth_date", nullable=False)
    op.alter_column("patients", "gender", nullable=False)
    op.alter_column("patients", "area", nullable=False)
    op.alter_column("patients", "short_name", nullable=False)

    # Уникальный индекс на ИИН
    indexes = {idx["name"] for idx in sa.inspect(conn).get_indexes("patients")}
    if "ix_patients_iin" not in indexes and "patients_iin_key" not in indexes:
        op.create_unique_constraint("uq_patients_iin", "patients", ["iin"])


def downgrade() -> None:
    op.drop_constraint("uq_patients_iin", "patients", type_="unique")
    op.alter_column("patients", "short_name", nullable=True)
    op.alter_column("patients", "area", nullable=True)
    op.alter_column("patients", "gender", nullable=True)
    op.alter_column("patients", "birth_date", nullable=True)
    op.alter_column("patients", "iin", nullable=True)
