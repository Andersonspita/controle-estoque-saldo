"""Aditivo percentual sobre o contrato inicial.

Revision ID: b7d4e2c8a013
Revises: a9c3e1f7b204
Create Date: 2026-08-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7d4e2c8a013"
down_revision: Union[str, None] = "a9c3e1f7b204"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "contratos",
        sa.Column("percentual_aditivo", sa.Float(), nullable=False, server_default="0"),
    )
    op.add_column("contratos", sa.Column("valor_total_inicial", sa.Float(), nullable=True))
    op.add_column("itens_contrato", sa.Column("quantidade_inicial", sa.Float(), nullable=True))
    op.add_column("itens_contrato", sa.Column("valor_unitario_inicial", sa.Float(), nullable=True))
    op.execute(
        "UPDATE itens_contrato SET quantidade_inicial = quantidade_contratada, "
        "valor_unitario_inicial = valor_unitario"
    )
    op.execute("UPDATE contratos SET valor_total_inicial = valor_total, percentual_aditivo = 0")
    op.alter_column("itens_contrato", "quantidade_inicial", nullable=False)
    op.alter_column("itens_contrato", "valor_unitario_inicial", nullable=False)
    op.alter_column("contratos", "valor_total_inicial", nullable=False)


def downgrade() -> None:
    op.drop_column("itens_contrato", "valor_unitario_inicial")
    op.drop_column("itens_contrato", "quantidade_inicial")
    op.drop_column("contratos", "valor_total_inicial")
    op.drop_column("contratos", "percentual_aditivo")
