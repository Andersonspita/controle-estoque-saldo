"""Remove órgão de destino (almoxarifados e estoque físico).

Revision ID: f3a7c2e9b401
Revises: e2b5c9a1f307
Create Date: 2026-09-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f3a7c2e9b401"
down_revision: Union[str, None] = "e2b5c9a1f307"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nome padrão do Postgres quando a FK foi criada sem nome explícito.
    op.execute(
        "ALTER TABLE movimentacoes DROP CONSTRAINT IF EXISTS movimentacoes_almoxarifado_id_fkey"
    )
    op.drop_column("movimentacoes", "almoxarifado_id")

    op.drop_index(
        op.f("ix_estoque_almoxarifados_id"),
        table_name="estoque_almoxarifados",
    )
    op.drop_table("estoque_almoxarifados")

    op.drop_index(op.f("ix_almoxarifados_id"), table_name="almoxarifados")
    op.drop_table("almoxarifados")


def downgrade() -> None:
    op.create_table(
        "almoxarifados",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("localizacao", sa.String(), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_almoxarifados_id"), "almoxarifados", ["id"], unique=False)

    op.create_table(
        "estoque_almoxarifados",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("item_contrato_id", sa.Integer(), nullable=False),
        sa.Column("almoxarifado_id", sa.Integer(), nullable=False),
        sa.Column("quantidade", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["almoxarifado_id"], ["almoxarifados.id"]),
        sa.ForeignKeyConstraint(["item_contrato_id"], ["itens_contrato.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_estoque_almoxarifados_id"),
        "estoque_almoxarifados",
        ["id"],
        unique=False,
    )

    op.add_column(
        "movimentacoes",
        sa.Column("almoxarifado_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "movimentacoes_almoxarifado_id_fkey",
        "movimentacoes",
        "almoxarifados",
        ["almoxarifado_id"],
        ["id"],
    )
