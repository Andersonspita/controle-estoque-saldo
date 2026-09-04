from pydantic import BaseModel, EmailStr, ConfigDict, Field, computed_field, field_validator, model_validator
from typing import Optional, List
from datetime import date, datetime

from .services.documento import formatar_cpf_cnpj
from .services.unidades_medida import normalizar_unidade
from .services.modalidades_licitacao import normalizar_modalidade

class AlmoxarifadoBase(BaseModel):
    nome: str
    localizacao: Optional[str] = None
    ativo: bool = True

class AlmoxarifadoCreate(AlmoxarifadoBase):
    pass

class AlmoxarifadoUpdate(BaseModel):
    nome: Optional[str] = None
    localizacao: Optional[str] = None
    ativo: Optional[bool] = None

class AlmoxarifadoOut(AlmoxarifadoBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class DestinacaoItemOut(BaseModel):
    item_contrato_id: int
    codigo: Optional[str] = None
    descricao: str
    unidade: str
    contrato_id: int
    contrato_numero: str
    contrato_ano: int
    quantidade_destinada: float
    saldo_contrato: float

class AlmoxarifadoDetalhadoOut(AlmoxarifadoOut):
    destinos: List[DestinacaoItemOut] = []

class FornecedorBase(BaseModel):
    razao_social: str
    nome_fantasia: Optional[str] = None
    cnpj: str
    inscricao_estadual: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None
    ativo: bool = True

class FornecedorCreate(FornecedorBase):
    @field_validator("cnpj")
    @classmethod
    def validar_cpf_cnpj(cls, valor: str) -> str:
        try:
            return formatar_cpf_cnpj(valor)
        except ValueError as exc:
            raise ValueError("CPF ou CNPJ inválido") from exc

    @field_validator("estado")
    @classmethod
    def normalizar_uf(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None or valor.strip() == "":
            return None
        return valor.strip().upper()[:2]

class FornecedorUpdate(BaseModel):
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None
    cnpj: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None
    ativo: Optional[bool] = None

    @field_validator("cnpj")
    @classmethod
    def validar_cpf_cnpj_opcional(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None or valor.strip() == "":
            return valor
        try:
            return formatar_cpf_cnpj(valor)
        except ValueError as exc:
            raise ValueError("CPF ou CNPJ inválido") from exc

    @field_validator("estado")
    @classmethod
    def normalizar_uf(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None or valor.strip() == "":
            return None
        return valor.strip().upper()[:2]

class FornecedorOut(FornecedorBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class LicitacaoBase(BaseModel):
    numero: str
    ano: int
    modalidade: str
    processo: Optional[str] = None
    objeto: str
    data: Optional[date] = None
    situacao: str

class LicitacaoCreate(LicitacaoBase):
    pass

class LicitacaoUpdate(LicitacaoBase):
    pass

class LicitacaoOut(LicitacaoBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

class UnidadeMedidaOut(BaseModel):
    sigla: str
    nome: str
    grupo: str
    inteira: bool

class ContratoBase(BaseModel):
    licitacao_id: Optional[int] = None
    fornecedor_id: int
    numero: str
    ano: int
    objeto: str = ""
    licitacao_numero: Optional[str] = None
    modalidade: Optional[str] = None
    objeto_licitacao: Optional[str] = None
    observacao: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    valor_total: float
    situacao: str

    @field_validator("licitacao_numero", "objeto_licitacao", "observacao", mode="before")
    @classmethod
    def _texto_opcional(cls, valor):
        if valor is None:
            return None
        texto = str(valor).strip()
        return texto or None

    @field_validator("modalidade")
    @classmethod
    def _validar_modalidade(cls, valor):
        return normalizar_modalidade(valor)

class ItemContratoCreate(BaseModel):
    codigo: Optional[str] = None
    descricao: str
    unidade: str = "UN"
    quantidade_contratada: float
    valor_unitario: float
    numero_item: Optional[int] = None

    @field_validator("unidade")
    @classmethod
    def _validar_unidade(cls, valor: str) -> str:
        return normalizar_unidade(valor)

class ContratoCreate(ContratoBase):
    objeto: str = Field(..., min_length=1)
    data_inicio: date
    data_fim: date
    ano: Optional[int] = None
    itens: List[ItemContratoCreate] = []

    @model_validator(mode="after")
    def _vigencia_e_ano(self):
        if self.data_fim < self.data_inicio:
            raise ValueError("A data de vigência final deve ser igual ou posterior à inicial")
        if self.ano is None:
            self.ano = self.data_inicio.year
        return self

class ItemContratoUpdate(BaseModel):
    id: Optional[int] = None
    codigo: Optional[str] = None
    descricao: str
    unidade: str = "UN"
    quantidade_contratada: float
    valor_unitario: float

    @field_validator("unidade")
    @classmethod
    def _validar_unidade(cls, valor: str) -> str:
        return normalizar_unidade(valor)

class ContratoUpdate(BaseModel):
    fornecedor_id: Optional[int] = None
    numero: Optional[str] = None
    ano: Optional[int] = None
    objeto: Optional[str] = Field(default=None, min_length=1)
    licitacao_numero: Optional[str] = None
    modalidade: Optional[str] = None
    objeto_licitacao: Optional[str] = None
    observacao: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    situacao: Optional[str] = None
    itens: Optional[List[ItemContratoUpdate]] = None

    @field_validator("licitacao_numero", "objeto_licitacao", "observacao", mode="before")
    @classmethod
    def _texto_opcional(cls, valor):
        if valor is None:
            return None
        texto = str(valor).strip()
        return texto or None

    @field_validator("modalidade")
    @classmethod
    def _validar_modalidade(cls, valor):
        return normalizar_modalidade(valor)

    @model_validator(mode="after")
    def _vigencia(self):
        if self.data_inicio and self.data_fim and self.data_fim < self.data_inicio:
            raise ValueError("A data de vigência final deve ser igual ou posterior à inicial")
        return self

class ItemAditivoIn(BaseModel):
    item_id: int
    quantidade_aditivada: float
    valor_unitario: Optional[float] = None

class ContratoAditivoIn(BaseModel):
    itens: List[ItemAditivoIn]

class ContratoOut(ContratoBase):
    id: int
    valor_total_inicial: Optional[float] = None
    percentual_aditivo: float = 0

    model_config = ConfigDict(from_attributes=True)

class ItemContratoOut(BaseModel):
    id: int
    contrato_id: int
    numero_item: int
    codigo: Optional[str] = None
    descricao: str
    unidade: str
    quantidade_contratada: float
    quantidade_inicial: Optional[float] = None
    valor_unitario: float
    valor_unitario_inicial: Optional[float] = None
    saldo_atual: float

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def valor_contratado(self) -> float:
        return round((self.quantidade_contratada or 0) * (self.valor_unitario or 0), 2)

    @computed_field
    @property
    def saldo_monetario(self) -> float:
        return round((self.saldo_atual or 0) * (self.valor_unitario or 0), 2)

class ContratoDetalhadoOut(ContratoOut):
    fornecedor: Optional[FornecedorOut] = None
    itens: List[ItemContratoOut] = []

    @computed_field
    @property
    def saldo_atual(self) -> float:
        return round(sum(item.saldo_monetario for item in self.itens), 2)

class ItemNFEntrada(BaseModel):
    codigo: Optional[str] = None
    codigo_produto: Optional[str] = None
    descricao: str
    quantidade: float
    unidade: str
    valor_unitario: float
    gtin: Optional[str] = None

class ItemVinculoSugerido(BaseModel):
    indice_nf: int
    codigo_nf: Optional[str] = None
    descricao_nf: str
    quantidade: float
    unidade: str
    valor_unitario: float
    item_contrato_id: Optional[int] = None
    item_contrato_codigo: Optional[str] = None
    item_contrato_descricao: Optional[str] = None
    percentual_confianca: float
    status_identificacao: str

class VincularItensRequest(BaseModel):
    itens: List[ItemNFEntrada]

class VincularItensResponse(BaseModel):
    vinculos: List[ItemVinculoSugerido]
    todos_vinculados: bool

class ItemNotaFiscalCreate(BaseModel):
    codigo: Optional[str] = None
    descricao: str
    quantidade: float
    unidade: str
    valor_unitario: float
    item_contrato_id: Optional[int] = None
    percentual_confianca: Optional[float] = None
    status_identificacao: Optional[str] = None

class ItemNotaFiscalOut(ItemNotaFiscalCreate):
    id: int
    nota_fiscal_id: int
    percentual_confianca: Optional[float] = None
    status_identificacao: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class NotaFiscalCreate(BaseModel):
    contrato_id: int
    fornecedor_id: int
    numero: str
    serie: Optional[str] = None
    chave_acesso: Optional[str] = None
    data_emissao: Optional[date] = None
    valor_total: Optional[float] = None

    @field_validator("chave_acesso", mode="before")
    @classmethod
    def chave_acesso_vazia_vira_none(cls, valor):
        if valor is None:
            return None
        texto = str(valor).strip()
        return texto or None

    @field_validator("numero")
    @classmethod
    def numero_obrigatorio(cls, valor: str):
        texto = (valor or "").strip()
        if not texto:
            raise ValueError("Informe o número da nota fiscal")
        return texto


class NotaFiscalManualCreate(NotaFiscalCreate):
    itens: List[ItemNotaFiscalCreate] = Field(min_length=1)

    @field_validator("chave_acesso", mode="before")
    @classmethod
    def chave_manual_44_digitos(cls, valor):
        if valor is None:
            return None
        texto = str(valor).strip()
        if not texto:
            return None
        digitos = "".join(ch for ch in texto if ch.isdigit())
        if not digitos:
            return None
        if len(digitos) != 44:
            raise ValueError("A chave de acesso deve ter 44 dígitos")
        return digitos

class NotaFiscalOut(NotaFiscalCreate):
    id: int
    arquivo_pdf_path: Optional[str] = Field(default=None, exclude=True)
    status: str
    criado_em: datetime
    itens: List[ItemNotaFiscalOut] = []

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def tem_arquivo(self) -> bool:
        return bool(self.arquivo_pdf_path)

class ItemVinculoUpdate(BaseModel):
    id: int
    item_contrato_id: int

class AtualizarVinculosRequest(BaseModel):
    itens: List[ItemVinculoUpdate]

class BaixaRequest(BaseModel):
    justificativa: Optional[str] = None
    almoxarifado_id: Optional[int] = None


class EstornoRequest(BaseModel):
    justificativa: str = Field(min_length=5, max_length=500)


class ExclusaoRequest(BaseModel):
    motivo: str = Field(min_length=5, max_length=500)


class NotaFiscalHistoricoOut(BaseModel):
    """Uma nota estornada ou excluída, com quem fez e por quê."""

    id: int
    numero: str
    serie: Optional[str] = None
    chave_acesso: Optional[str] = None
    data_emissao: Optional[date] = None
    valor_total: Optional[float] = None
    contrato_id: int
    fornecedor_id: int
    status: str
    situacao: str
    excluida_em: Optional[datetime] = None
    excluida_por_nome: Optional[str] = None
    motivo_exclusao: Optional[str] = None
    estornada_em: Optional[datetime] = None
    estornada_por_nome: Optional[str] = None
    justificativa_estorno: Optional[str] = None


class MovimentacaoOut(BaseModel):
    id: int
    nota_fiscal_id: Optional[int] = None
    item_contrato_id: int
    tipo_movimento: str
    quantidade: float
    saldo_anterior: float
    saldo_posterior: float
    almoxarifado_id: Optional[int] = None
    usuario_id: int
    data_hora: datetime
    justificativa: str

    model_config = ConfigDict(from_attributes=True)

class PrevisaoConsumoOut(BaseModel):
    contrato_id: int
    contrato_numero: str
    fornecedor_id: int
    item_id: int
    item_descricao: str
    saldo_atual: float
    valor_unitario: float = 0
    saldo_monetario: float = 0
    total_baixado: float
    taxa_diaria: float
    dias_restantes: Optional[int] = None


class RelatorioItemSaldoOut(BaseModel):
    item_id: int
    numero_item: int
    codigo: Optional[str] = None
    descricao: str
    unidade: str
    valor_unitario: float
    valor_unitario_inicial: float
    quantidade_contratada: float
    valor_contratado: float
    quantidade_aditivada: float
    valor_aditivado: float
    quantidade_vigente: float
    valor_vigente: float
    quantidade_utilizada: float
    valor_utilizado: float
    quantidade_saldo: float
    valor_saldo: float
    percentual_utilizado: float


class RelatorioTotaisOut(BaseModel):
    quantidade_contratada: float = 0
    valor_contratado: float = 0
    quantidade_aditivada: float = 0
    valor_aditivado: float = 0
    quantidade_vigente: float = 0
    valor_vigente: float = 0
    quantidade_utilizada: float = 0
    valor_utilizado: float = 0
    quantidade_saldo: float = 0
    valor_saldo: float = 0
    percentual_utilizado: float = 0


class RelatorioOrgaoConsumoOut(BaseModel):
    almoxarifado_id: Optional[int] = None
    nome: str
    quantidade_utilizada: float
    valor_utilizado: float


class RelatorioContratoSaldoOut(BaseModel):
    contrato_id: int
    numero: str
    ano: int
    objeto: str = ""
    situacao: str
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    licitacao_numero: Optional[str] = None
    modalidade: Optional[str] = None
    objeto_licitacao: Optional[str] = None
    observacao: Optional[str] = None
    fornecedor_id: int
    fornecedor_razao_social: str = ""
    fornecedor_nome_fantasia: Optional[str] = None
    fornecedor_cnpj: Optional[str] = None
    fornecedor_cidade: Optional[str] = None
    fornecedor_estado: Optional[str] = None
    fornecedor_telefone: Optional[str] = None
    fornecedor_email: Optional[str] = None
    itens: List[RelatorioItemSaldoOut] = []
    orgaos: List[RelatorioOrgaoConsumoOut] = []
    totais: RelatorioTotaisOut


class RelatorioEmitenteOut(BaseModel):
    nome: str
    estado: Optional[str] = None
    setor: Optional[str] = None


class RelatorioSaldoOut(BaseModel):
    emitente: RelatorioEmitenteOut
    gerado_em: datetime
    contratos: List[RelatorioContratoSaldoOut] = []
    totais: RelatorioTotaisOut
