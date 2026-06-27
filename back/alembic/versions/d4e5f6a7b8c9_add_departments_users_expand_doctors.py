"""add departments users expand doctors

Revision ID: d4e5f6a7b8c9
Revises: 3529d996965e
Create Date: 2026-06-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "3529d996965e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE user_role AS ENUM ('doctor', 'admin', 'nurse');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    if not sa.inspect(conn).has_table("departments"):
        op.create_table(
            "departments",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("name"),
        )

    if not sa.inspect(conn).has_table("users"):
        op.execute(
            """
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(200) NOT NULL UNIQUE,
                full_name VARCHAR(200) NOT NULL,
                role user_role NOT NULL,
                doctor_id INTEGER REFERENCES doctors(id) UNIQUE
            )
            """
        )

    columns = {col["name"] for col in sa.inspect(conn).get_columns("doctors")}
    if "title" not in columns:
        op.add_column("doctors", sa.Column("title", sa.String(length=100), nullable=True))
    if "office" not in columns:
        op.add_column("doctors", sa.Column("office", sa.String(length=50), nullable=True))
    if "phone" not in columns:
        op.add_column("doctors", sa.Column("phone", sa.String(length=20), nullable=True))
    if "email" not in columns:
        op.add_column("doctors", sa.Column("email", sa.String(length=100), nullable=True))
    if "workplace" not in columns:
        op.add_column("doctors", sa.Column("workplace", sa.String(length=300), nullable=True))
    if "specialty" not in columns:
        op.add_column("doctors", sa.Column("specialty", sa.String(length=200), nullable=True))
    if "qualification_category" not in columns:
        op.add_column("doctors", sa.Column("qualification_category", sa.String(length=100), nullable=True))
    if "license_number" not in columns:
        op.add_column("doctors", sa.Column("license_number", sa.String(length=50), nullable=True))
    if "license_valid_until" not in columns:
        op.add_column("doctors", sa.Column("license_valid_until", sa.String(length=20), nullable=True))
    if "about" not in columns:
        op.add_column("doctors", sa.Column("about", sa.String(length=1000), nullable=True))
    if "experience_years" not in columns:
        op.add_column("doctors", sa.Column("experience_years", sa.Integer(), nullable=True))
    if "department_id" not in columns:
        op.add_column("doctors", sa.Column("department_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_doctors_department_id",
            "doctors",
            "departments",
            ["department_id"],
            ["id"],
        )


def downgrade() -> None:
    op.drop_constraint("fk_doctors_department_id", "doctors", type_="foreignkey")
    op.drop_column("doctors", "department_id")
    op.drop_column("doctors", "experience_years")
    op.drop_column("doctors", "about")
    op.drop_column("doctors", "license_valid_until")
    op.drop_column("doctors", "license_number")
    op.drop_column("doctors", "qualification_category")
    op.drop_column("doctors", "specialty")
    op.drop_column("doctors", "workplace")
    op.drop_column("doctors", "email")
    op.drop_column("doctors", "phone")
    op.drop_column("doctors", "office")
    op.drop_column("doctors", "title")
    op.drop_table("users")
    op.drop_table("departments")
    sa.Enum(name="user_role").drop(op.get_bind(), checkfirst=True)
