from src.services.relatorio_saldo import (
    SEM_ORGAO,
    consumo_por_orgao,
    linha_item,
    totalizar,
)


class _Registro:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def _item(**kwargs):
    base = dict(
        id=1,
        numero_item=1,
        codigo="001",
        descricao="Recarga de toner",
        unidade="SRV",
        quantidade_inicial=504,
        quantidade_contratada=504,
        valor_unitario=25.98,
        valor_unitario_inicial=25.98,
        saldo_atual=171,
    )
    base.update(kwargs)
    return _Registro(**base)


def test_linha_abre_contratado_utilizado_e_saldo():
    linha = linha_item(_item())
    assert linha["quantidade_contratada"] == 504
    assert linha["valor_contratado"] == 13093.92
    assert linha["quantidade_utilizada"] == 333
    assert linha["valor_utilizado"] == 8651.34
    assert linha["quantidade_saldo"] == 171
    assert linha["valor_saldo"] == 4442.58
    assert linha["quantidade_aditivada"] == 0
    assert linha["valor_aditivado"] == 0


def test_contratado_mais_aditivado_fecha_com_utilizado_mais_saldo():
    linha = linha_item(
        _item(quantidade_inicial=100, quantidade_contratada=130, saldo_atual=50)
    )
    assert linha["quantidade_aditivada"] == 30
    assert linha["valor_aditivado"] == 779.4
    assert linha["valor_contratado"] + linha["valor_aditivado"] == linha["valor_vigente"]
    assert linha["valor_utilizado"] + linha["valor_saldo"] == linha["valor_vigente"]


def test_aditivo_que_muda_o_preco_entra_no_valor_aditivado():
    linha = linha_item(
        _item(
            quantidade_inicial=100,
            quantidade_contratada=120,
            valor_unitario_inicial=10,
            valor_unitario=12,
            saldo_atual=120,
        )
    )
    assert linha["valor_contratado"] == 1000.0
    assert linha["valor_vigente"] == 1440.0
    assert linha["valor_aditivado"] == 440.0


def test_item_sem_quantidade_inicial_usa_a_contratada():
    linha = linha_item(_item(quantidade_inicial=None, quantidade_contratada=80, saldo_atual=80))
    assert linha["quantidade_contratada"] == 80
    assert linha["quantidade_aditivada"] == 0
    assert linha["percentual_utilizado"] == 0


def test_percentual_utilizado_por_item():
    linha = linha_item(_item(quantidade_contratada=200, quantidade_inicial=200, saldo_atual=50))
    assert linha["percentual_utilizado"] == 75.0


def test_totais_somam_as_colunas_e_o_percentual_vem_do_valor():
    linhas = [
        linha_item(_item(id=1, quantidade_inicial=504, quantidade_contratada=504, saldo_atual=171)),
        linha_item(
            _item(
                id=2,
                quantidade_inicial=396,
                quantidade_contratada=396,
                valor_unitario=40.75,
                valor_unitario_inicial=40.75,
                saldo_atual=87,
            )
        ),
    ]
    totais = totalizar(linhas)
    assert totais["quantidade_contratada"] == 900
    assert totais["quantidade_utilizada"] == 642
    assert totais["quantidade_saldo"] == 258
    assert totais["valor_vigente"] == 29230.92
    assert totais["valor_utilizado"] + totais["valor_saldo"] == totais["valor_vigente"]
    assert totais["percentual_utilizado"] == 72.67


def test_totalizar_sem_linhas_zera_tudo():
    totais = totalizar([])
    assert totais["valor_vigente"] == 0
    assert totais["percentual_utilizado"] == 0


def test_consumo_por_orgao_agrupa_baixas_e_desconta_estorno():
    movimentacoes = [
        _Registro(tipo_movimento="BAIXA", item_contrato_id=1, almoxarifado_id=10, quantidade=100),
        _Registro(tipo_movimento="BAIXA", item_contrato_id=1, almoxarifado_id=10, quantidade=40),
        _Registro(tipo_movimento="ESTORNO", item_contrato_id=1, almoxarifado_id=10, quantidade=15),
        _Registro(tipo_movimento="BAIXA", item_contrato_id=2, almoxarifado_id=20, quantidade=10),
    ]
    grupos = consumo_por_orgao(
        movimentacoes,
        {1: 2.0, 2: 5.0},
        {10: "Fundo Municipal de Educação", 20: "Fundo Municipal de Saúde"},
    )
    assert [g["nome"] for g in grupos] == [
        "Fundo Municipal de Educação",
        "Fundo Municipal de Saúde",
    ]
    assert grupos[0]["quantidade_utilizada"] == 125
    assert grupos[0]["valor_utilizado"] == 250.0
    assert grupos[1]["valor_utilizado"] == 50.0


def test_consumo_por_orgao_rotula_baixa_sem_orgao():
    grupos = consumo_por_orgao(
        [_Registro(tipo_movimento="BAIXA", item_contrato_id=1, almoxarifado_id=None, quantidade=3)],
        {1: 7.0},
        {},
    )
    assert grupos[0]["nome"] == SEM_ORGAO
    assert grupos[0]["valor_utilizado"] == 21.0


def test_consumo_por_orgao_ignora_movimento_que_nao_e_consumo():
    grupos = consumo_por_orgao(
        [_Registro(tipo_movimento="ENTRADA", item_contrato_id=1, almoxarifado_id=10, quantidade=5)],
        {1: 7.0},
        {10: "Órgão"},
    )
    assert grupos == []
