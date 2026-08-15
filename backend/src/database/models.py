from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Date, JSON, CheckConstraint, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .session import Base

def utcnow():
    return datetime.now(timezone.utc)

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    senha_hash = Column(String, nullable=False)
    perfil = Column(String, nullable=False)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime(timezone=True), default=utcnow)

class Almoxarifado(Base):
    __tablename__ = "almoxarifados"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    localizacao = Column(String)
    ativo = Column(Boolean, default=True)

class EstoqueAlmoxarifado(Base):
    __tablename__ = "estoque_almoxarifados"

    id = Column(Integer, primary_key=True, index=True)
    item_contrato_id = Column(Integer, ForeignKey("itens_contrato.id"), nullable=False)
    almoxarifado_id = Column(Integer, ForeignKey("almoxarifados.id"), nullable=False)
    quantidade = Column(Float, nullable=False, default=0)
    
    item_contrato = relationship("ItemContrato")
    almoxarifado = relationship("Almoxarifado")

class Fornecedor(Base):
    __tablename__ = "fornecedores"

    id = Column(Integer, primary_key=True, index=True)
    razao_social = Column(String, nullable=False)
    nome_fantasia = Column(String)
    cnpj = Column(String, unique=True, index=True, nullable=False)
    inscricao_estadual = Column(String)
    endereco = Column(String)
    cidade = Column(String)
    estado = Column(String)
    telefone = Column(String)
    email = Column(String)
    ativo = Column(Boolean, default=True)
    
    contratos = relationship("Contrato", back_populates="fornecedor")

class Licitacao(Base):
    __tablename__ = "licitacoes"

    id = Column(Integer, primary_key=True, index=True)
    numero = Column(String, nullable=False)
    ano = Column(Integer, nullable=False)
    modalidade = Column(String, nullable=False)
    processo = Column(String)
    objeto = Column(Text, nullable=False)
    data = Column(Date)
    situacao = Column(String, nullable=False)
    
    contratos = relationship("Contrato", back_populates="licitacao")

class Contrato(Base):
    __tablename__ = "contratos"

    id = Column(Integer, primary_key=True, index=True)
    licitacao_id = Column(Integer, ForeignKey("licitacoes.id"), nullable=True)
    fornecedor_id = Column(Integer, ForeignKey("fornecedores.id"), nullable=False)
    numero = Column(String, nullable=False)
    ano = Column(Integer, nullable=False)
    data_inicio = Column(Date)
    data_fim = Column(Date)
    valor_total = Column(Float, nullable=False)
    valor_total_inicial = Column(Float, nullable=False, default=0)
    percentual_aditivo = Column(Float, nullable=False, default=0)
    situacao = Column(String, nullable=False)
    
    licitacao = relationship("Licitacao", back_populates="contratos")
    fornecedor = relationship("Fornecedor", back_populates="contratos")
    itens = relationship("ItemContrato", back_populates="contrato", cascade="all, delete-orphan")

class ItemContrato(Base):
    __tablename__ = "itens_contrato"
    __table_args__ = (
        CheckConstraint('saldo_atual >= 0', name='check_saldo_positivo'),
    )

    id = Column(Integer, primary_key=True, index=True)
    contrato_id = Column(Integer, ForeignKey("contratos.id"), nullable=False)
    numero_item = Column(Integer, nullable=False)
    codigo = Column(String)
    gtin = Column(String)
    descricao = Column(Text, nullable=False)
    unidade = Column(String, nullable=False)
    marca = Column(String)
    quantidade_contratada = Column(Float, nullable=False)
    quantidade_inicial = Column(Float, nullable=False)
    valor_unitario = Column(Float, nullable=False)
    valor_unitario_inicial = Column(Float, nullable=False)
    saldo_atual = Column(Float, nullable=False)
    
    contrato = relationship("Contrato", back_populates="itens")

class NotaFiscal(Base):
    __tablename__ = "notas_fiscais"

    id = Column(Integer, primary_key=True, index=True)
    contrato_id = Column(Integer, ForeignKey("contratos.id"), nullable=False)
    fornecedor_id = Column(Integer, ForeignKey("fornecedores.id"), nullable=False)
    numero = Column(String, nullable=False)
    serie = Column(String)
    chave_acesso = Column(String, unique=True, index=True)
    data_emissao = Column(Date)
    valor_total = Column(Float)
    arquivo_pdf_path = Column(String)
    status = Column(String, nullable=False)
    criado_por = Column(Integer, ForeignKey("usuarios.id"))
    criado_em = Column(DateTime(timezone=True), default=utcnow)
    
    itens = relationship("ItemNotaFiscal", back_populates="nota_fiscal", cascade="all, delete-orphan")

class ItemNotaFiscal(Base):
    __tablename__ = "itens_nota_fiscal"

    id = Column(Integer, primary_key=True, index=True)
    nota_fiscal_id = Column(Integer, ForeignKey("notas_fiscais.id"), nullable=False)
    item_contrato_id = Column(Integer, ForeignKey("itens_contrato.id"))
    codigo = Column(String)
    descricao = Column(Text, nullable=False)
    quantidade = Column(Float, nullable=False)
    unidade = Column(String, nullable=False)
    valor_unitario = Column(Float, nullable=False)
    percentual_confianca = Column(Float)
    status_identificacao = Column(String)
    
    nota_fiscal = relationship("NotaFiscal", back_populates="itens")

class Movimentacao(Base):
    __tablename__ = "movimentacoes"

    id = Column(Integer, primary_key=True, index=True)
    nota_fiscal_id = Column(Integer, ForeignKey("notas_fiscais.id"))
    item_contrato_id = Column(Integer, ForeignKey("itens_contrato.id"), nullable=False)
    tipo_movimento = Column(String, nullable=False) # 'BAIXA', 'ESTORNO', 'ENTRADA'
    quantidade = Column(Float, nullable=False)
    saldo_anterior = Column(Float, nullable=False)
    saldo_posterior = Column(Float, nullable=False)
    almoxarifado_id = Column(Integer, ForeignKey("almoxarifados.id"), nullable=True) # Pode ser null para estornos ou compatibilidade
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    data_hora = Column(DateTime(timezone=True), default=utcnow)
    justificativa = Column(Text)

class LogAuditoria(Base):
    __tablename__ = "log_auditoria"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    operacao = Column(String, nullable=False) # 'INSERT', 'UPDATE', 'DELETE'
    tabela = Column(String, nullable=False)
    registro_id = Column(String, nullable=False)
    dados_anteriores = Column(JSON)
    dados_novos = Column(JSON)
    data_hora = Column(DateTime(timezone=True), default=utcnow)
    ip = Column(String)
