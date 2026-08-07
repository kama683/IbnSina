"""extend user_role enum to 6 values (Этап 0 коммит 3)

Revision ID: d5e6f7a8b9c0
Revises: c4d5e6f7a8b9
Create Date: 2026-08-07

Временный шаг: старое поле users.role дополняется тремя новыми значениями,
чтобы seed.py мог создать пользователей для всех шести ролей ещё до того,
как код переключится на чтение роли из Employee.role (коммит 4) и колонка
users.role будет окончательно удалена (см. решение по User в
docs/PHASE0_ANALYSIS.md — единый источник истины роли это Employee).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, Sequence[str], None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_NEW_VALUES = ("reception", "accountant", "head_doctor")


def upgrade() -> None:
    for value in _NEW_VALUES:
        op.execute(f"ALTER TYPE user_role ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    conn = op.get_bind()
    blocking = conn.execute(
        sa.text(
            "SELECT COUNT(*) FROM users WHERE role IN ('reception', 'accountant', 'head_doctor')"
        )
    ).scalar()
    if blocking:
        raise RuntimeError(
            "Нельзя откатить расширение user_role: есть пользователи с новыми ролями "
            "(reception/accountant/head_doctor). Удалите или смените им роль перед downgrade."
        )

    op.execute(
        """
        ALTER TYPE user_role RENAME TO user_role_old;
        CREATE TYPE user_role AS ENUM ('doctor', 'admin', 'nurse');
        ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role;
        DROP TYPE user_role_old;
        """
    )
