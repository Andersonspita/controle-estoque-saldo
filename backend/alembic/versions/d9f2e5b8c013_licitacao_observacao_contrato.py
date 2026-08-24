"""Número, modalidade e objeto da licitação e observação no contrato.

Revision ID: d9f2e5b8c013
Revises: c8e1d4a7b902
Create Date: 2026-08-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d9f2e5b8c013"
down_revision: Union[str, None] = "c8e1d4a7b902"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("contratos", sa.Column("licitacao_numero", sa.String(), nullable=True))
    op.add_column("contratos", sa.Column("modalidade", sa.String(), nullable=True))
    op.add_column("contratos", sa.Column("objeto_licitacao", sa.Text(), nullable=True))
    op.add_column("contratos", sa.Column("observacao", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("contratos", "observacao")
    op.drop_column("contratos", "objeto_licitacao")
    op.drop_column("contratos", "modalidade")
    op.drop_column("contratos", "licitacao_numero")
