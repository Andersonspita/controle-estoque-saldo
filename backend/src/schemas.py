from pydantic import BaseModel, EmailStr, ConfigDict, computed_field, field_validator
from typing import Optional, List
from datetime import date, datetime

from .services.documento import formatar_cpf_cnpj

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

class ContratoBase(BaseModel):
    licitacao_id: Optional[int] = None
    fornecedor_id: int
    numero: str
    ano: int
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    valor_total: float
    percentual_aditivo: float = 0
    situacao: str

class ItemContratoCreate(BaseModel):
    codigo: Optional[str] = None
    descricao: str
    unidade: str = "UN"
    quantidade_contratada: float
    valor_unitario: float
    numero_item: Optional[int] = None

class ContratoCreate(ContratoBase):
    itens: List[ItemContratoCreate] = []

class ItemContratoUpdate(BaseModel):
    id: Optional[int] = None
    codigo: Optional[str] = None
    descricao: str
    unidade: str = "UN"
    quantidade_contratada: float
    valor_unitario: float

class ContratoUpdate(BaseModel):
    fornecedor_id: Optional[int] = None
    numero: Optional[str] = None
    ano: Optional[int] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    situacao: Optional[str] = None
    percentual_aditivo: Optional[float] = None
    itens: Optional[List[ItemContratoUpdate]] = None

class ContratoOut(ContratoBase):
    id: int
    valor_total_inicial: Optional[float] = None

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

class NotaFiscalOut(NotaFiscalCreate):
    id: int
    arquivo_pdf_path: Optional[str] = None
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
