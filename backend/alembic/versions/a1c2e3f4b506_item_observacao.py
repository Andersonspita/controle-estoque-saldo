"""Observação nos itens do contrato (alinhado ao modelo de planilha).

Revision ID: a1c2e3f4b506
Revises: f3a7c2e9b401
Create Date: 2026-09-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1c2e3f4b506"
down_revision: Union[str, None] = "f3a7c2e9b401"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("itens_contrato", sa.Column("observacao", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("itens_contrato", "observacao")
