from src.services.arquivos import caminho_upload_seguro, nome_arquivo_seguro


def test_nome_arquivo_remove_caminho():
    assert ".." not in nome_arquivo_seguro("../../etc/passwd")
    assert nome_arquivo_seguro("nota.pdf") == "nota.pdf"


def test_caminho_upload_fica_dentro_da_pasta(tmp_path):
    destino = caminho_upload_seguro(str(tmp_path), "../escape.pdf")
    assert destino.startswith(str(tmp_path.resolve()))
    assert destino.endswith("escape.pdf")
