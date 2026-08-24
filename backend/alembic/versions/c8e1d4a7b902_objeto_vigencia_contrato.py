"""Objeto do contrato e coluna de texto para o objeto contratual.

Revision ID: c8e1d4a7b902
Revises: b7d4e2c8a013
Create Date: 2026-08-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c8e1d4a7b902"
down_revision: Union[str, None] = "b7d4e2c8a013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "contratos",
        sa.Column("objeto", sa.Text(), nullable=False, server_default=""),
    )
    op.alter_column("contratos", "objeto", server_default=None)


def downgrade() -> None:
    op.drop_column("contratos", "objeto")
