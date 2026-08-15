import xmltodict
from datetime import datetime

def parse_nfe_xml(xml_content: str) -> dict:
    """
    Realiza o parse de um arquivo XML de NF-e (padrão SEFAZ)
    e extrai os dados relevantes para o sistema.
    """
    data = xmltodict.parse(xml_content)
    
    # A raiz pode ser nfeProc (quando tem protocolo) ou direto NFe
    if 'nfeProc' in data:
        nfe = data['nfeProc']['NFe']['infNFe']
    elif 'NFe' in data:
        nfe = data['NFe']['infNFe']
    else:
        raise ValueError("XML não parece ser uma NF-e válida (falta tag NFe ou nfeProc)")
        
    ide = nfe.get('ide', {})
    emit = nfe.get('emit', {})
    
    chave_attr = nfe.get('@Id', '')
    chave_acesso = chave_attr[3:] if chave_attr.startswith('NFe') else chave_attr or None
    
    numero = ide.get('nNF')
    serie = ide.get('serie')
    data_emissao = ide.get('dhEmi', ide.get('dEmi')) # Notas mais novas usam dhEmi
    
    if data_emissao:
        try:
            # Tenta converter para ISO "2024-03-21T14:30:00-03:00" -> datetime
            data_emissao_dt = datetime.fromisoformat(data_emissao).strftime("%Y-%m-%d")
        except ValueError:
            data_emissao_dt = data_emissao.split('T')[0]
    else:
        data_emissao_dt = None
        
    emitente_cnpj = emit.get('CNPJ', emit.get('CPF'))
    emitente_nome = emit.get('xNome')
    
    # Itens da NF
    det_list = nfe.get('det', [])
    if not isinstance(det_list, list):
        det_list = [det_list]
        
    itens_extraidos = []
    for det in det_list:
        prod = det.get('prod', {})
        itens_extraidos.append({
            "codigo_produto": prod.get('cProd'),
            "descricao": prod.get('xProd'),
            "gtin": prod.get('cEAN'),
            "ncm": prod.get('NCM'),
            "cfop": prod.get('CFOP'),
            "unidade": prod.get('uCom'),
            "quantidade": float(prod.get('qCom', 0)),
            "valor_unitario": float(prod.get('vUnCom', 0)),
            "valor_total": float(prod.get('vProd', 0)),
        })
        
    # Valor Total
    total = nfe.get('total', {}).get('ICMSTot', {})
    valor_total_nf = float(total.get('vNF', 0))
    
    return {
        "numero": numero,
        "serie": serie,
        "chave_acesso": chave_acesso,
        "data_emissao": data_emissao_dt,
        "fornecedor": {
            "cnpj": emitente_cnpj,
            "nome": emitente_nome
        },
        "valor_total": valor_total_nf,
        "itens": itens_extraidos
    }
