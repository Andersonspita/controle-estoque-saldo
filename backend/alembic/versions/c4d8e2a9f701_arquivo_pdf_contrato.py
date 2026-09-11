"""PDF do contrato e auditoria de operações.

Revision ID: c4d8e2a9f701
Revises: a1c2e3f4b506
Create Date: 2026-09-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4d8e2a9f701"
down_revision: Union[str, None] = "a1c2e3f4b506"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("contratos", sa.Column("arquivo_pdf_path", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("contratos", "arquivo_pdf_path")
