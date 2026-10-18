"""Descrição do fornecedor (como aparece na NF) nos itens do contrato.

Revision ID: e1a3f6c9d024
Revises: d5e9f1a2b803
Create Date: 2026-10-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e1a3f6c9d024"
down_revision: Union[str, None] = "d5e9f1a2b803"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("itens_contrato", sa.Column("descricao_fornecedor", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("itens_contrato", "descricao_fornecedor")
