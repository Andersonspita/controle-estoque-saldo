"""Tornar licitacao_id opcional nos contratos.

Revision ID: a9c3e1f7b204
Revises: 10fc08d3c4cc
Create Date: 2026-08-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a9c3e1f7b204"
down_revision: Union[str, None] = "10fc08d3c4cc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "contratos",
        "licitacao_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "contratos",
        "licitacao_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
