"""Vigência de aditivos e permissão de gestão de contratos.

Revision ID: d5e9f1a2b803
Revises: c4d8e2a9f701
Create Date: 2026-09-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d5e9f1a2b803"
down_revision: Union[str, None] = "c4d8e2a9f701"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column(
            "pode_gerir_contratos",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_table(
        "contrato_aditivos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("contrato_id", sa.Integer(), nullable=False),
        sa.Column("data_inicio", sa.Date(), nullable=False),
        sa.Column("data_fim", sa.Date(), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["contrato_id"], ["contratos.id"]),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_contrato_aditivos_id"), "contrato_aditivos", ["id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_contrato_aditivos_id"), table_name="contrato_aditivos")
    op.drop_table("contrato_aditivos")
    op.drop_column("usuarios", "pode_gerir_contratos")
