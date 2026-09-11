"""Permissão de estorno, exclusão lógica da nota fiscal e chave única só entre notas vivas.

Revision ID: e2b5c9a1f307
Revises: d9f2e5b8c013
Create Date: 2026-09-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e2b5c9a1f307"
down_revision: Union[str, None] = "d9f2e5b8c013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column(
            "pode_estornar",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.add_column("notas_fiscais", sa.Column("excluida_em", sa.DateTime(timezone=True), nullable=True))
    op.add_column("notas_fiscais", sa.Column("excluida_por", sa.Integer(), nullable=True))
    op.add_column("notas_fiscais", sa.Column("motivo_exclusao", sa.Text(), nullable=True))
    op.create_foreign_key(
        "fk_notas_fiscais_excluida_por_usuarios",
        "notas_fiscais",
        "usuarios",
        ["excluida_por"],
        ["id"],
    )

    # A chave de acesso passa a ser única apenas entre as notas não excluídas.
    op.drop_index("ix_notas_fiscais_chave_acesso", table_name="notas_fiscais")
    op.create_index(
        "ix_notas_fiscais_chave_acesso",
        "notas_fiscais",
        ["chave_acesso"],
        unique=False,
    )
    op.create_index(
        "uq_notas_fiscais_chave_acesso_ativa",
        "notas_fiscais",
        ["chave_acesso"],
        unique=True,
        postgresql_where=sa.text("excluida_em IS NULL"),
        sqlite_where=sa.text("excluida_em IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_notas_fiscais_chave_acesso_ativa", table_name="notas_fiscais")
    op.drop_index("ix_notas_fiscais_chave_acesso", table_name="notas_fiscais")
    op.create_index(
        "ix_notas_fiscais_chave_acesso",
        "notas_fiscais",
        ["chave_acesso"],
        unique=True,
    )

    op.drop_constraint(
        "fk_notas_fiscais_excluida_por_usuarios", "notas_fiscais", type_="foreignkey"
    )
    op.drop_column("notas_fiscais", "motivo_exclusao")
    op.drop_column("notas_fiscais", "excluida_por")
    op.drop_column("notas_fiscais", "excluida_em")

    op.drop_column("usuarios", "pode_estornar")
