"""Número, tipo e percentual do aditivo; vigência só nos aditivos de prazo.

Revision ID: a7c3e5f9b210
Revises: e1a3f6c9d024
Create Date: 2026-10-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7c3e5f9b210"
down_revision: Union[str, None] = "e1a3f6c9d024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("contrato_aditivos", sa.Column("numero", sa.String(), nullable=True))
    # Os aditivos já gravados mexiam em itens e vigência: valor e prazo.
    op.add_column(
        "contrato_aditivos",
        sa.Column("tipo", sa.String(), nullable=False, server_default="VALOR_PRAZO"),
    )
    op.add_column("contrato_aditivos", sa.Column("percentual", sa.Float(), nullable=True))
    op.alter_column("contrato_aditivos", "data_inicio", existing_type=sa.Date(), nullable=True)
    op.alter_column("contrato_aditivos", "data_fim", existing_type=sa.Date(), nullable=True)


def downgrade() -> None:
    op.alter_column("contrato_aditivos", "data_fim", existing_type=sa.Date(), nullable=False)
    op.alter_column("contrato_aditivos", "data_inicio", existing_type=sa.Date(), nullable=False)
    op.drop_column("contrato_aditivos", "percentual")
    op.drop_column("contrato_aditivos", "tipo")
    op.drop_column("contrato_aditivos", "numero")
