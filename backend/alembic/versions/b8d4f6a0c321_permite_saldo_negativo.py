"""Permite saldo negativo nos itens do contrato (a tela avisa antes da baixa).

Revision ID: b8d4f6a0c321
Revises: a7c3e5f9b210
Create Date: 2026-10-18

"""
from typing import Sequence, Union

from alembic import op


revision: str = "b8d4f6a0c321"
down_revision: Union[str, None] = "a7c3e5f9b210"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE itens_contrato DROP CONSTRAINT IF EXISTS check_saldo_positivo")


def downgrade() -> None:
    # NOT VALID: não falha por itens que já ficaram negativos; vale para as gravações novas.
    op.execute(
        "ALTER TABLE itens_contrato ADD CONSTRAINT check_saldo_positivo "
        "CHECK (saldo_atual >= 0) NOT VALID"
    )
