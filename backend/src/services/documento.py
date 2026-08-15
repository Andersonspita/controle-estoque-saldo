def apenas_digitos(valor: str | None) -> str:
    return "".join(ch for ch in (valor or "") if ch.isdigit())


def _todos_iguais(digitos: str) -> bool:
    return len(digitos) > 0 and all(d == digitos[0] for d in digitos)


def _digito_verificador(numeros: str, pesos: list[int]) -> int:
    soma = sum(int(n) * p for n, p in zip(numeros, pesos))
    resto = soma % 11
    return 0 if resto < 2 else 11 - resto


def cpf_valido(digitos: str) -> bool:
    if len(digitos) != 11 or _todos_iguais(digitos):
        return False
    d1 = _digito_verificador(digitos[:9], list(range(10, 1, -1)))
    d2 = _digito_verificador(digitos[:9] + str(d1), list(range(11, 1, -1)))
    return digitos[-2:] == f"{d1}{d2}"


def cnpj_valido(digitos: str) -> bool:
    if len(digitos) != 14 or _todos_iguais(digitos):
        return False
    d1 = _digito_verificador(digitos[:12], [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    d2 = _digito_verificador(digitos[:12] + str(d1), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    return digitos[-2:] == f"{d1}{d2}"


def formatar_cpf_cnpj(valor: str) -> str:
    digitos = apenas_digitos(valor)
    if cpf_valido(digitos):
        return f"{digitos[:3]}.{digitos[3:6]}.{digitos[6:9]}-{digitos[9:]}"
    if cnpj_valido(digitos):
        return f"{digitos[:2]}.{digitos[2:5]}.{digitos[5:8]}/{digitos[8:12]}-{digitos[12:]}"
    raise ValueError("CPF ou CNPJ inválido")
