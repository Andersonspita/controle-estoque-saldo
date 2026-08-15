export function apenasDigitos(valor: string): string {
  return (valor || "").replace(/\D/g, "")
}

function todosIguais(digitos: string): boolean {
  return digitos.length > 0 && [...digitos].every((d) => d === digitos[0])
}

function digitoVerificador(numeros: string, pesos: number[]): number {
  const soma = [...numeros].reduce((acc, n, i) => acc + Number(n) * pesos[i], 0)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function cpfValido(digitos: string): boolean {
  if (digitos.length !== 11 || todosIguais(digitos)) return false
  const d1 = digitoVerificador(digitos.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = digitoVerificador(digitos.slice(0, 9) + String(d1), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return digitos.slice(-2) === `${d1}${d2}`
}

export function cnpjValido(digitos: string): boolean {
  if (digitos.length !== 14 || todosIguais(digitos)) return false
  const d1 = digitoVerificador(digitos.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = digitoVerificador(
    digitos.slice(0, 12) + String(d1),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  )
  return digitos.slice(-2) === `${d1}${d2}`
}

export function formatarCpfCnpj(valor: string): string {
  const digitos = apenasDigitos(valor).slice(0, 14)
  if (digitos.length <= 11) {
    return digitos
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2")
  }
  return digitos
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18)
}

export function cpfOuCnpjValido(valor: string): boolean {
  const digitos = apenasDigitos(valor)
  return cpfValido(digitos) || cnpjValido(digitos)
}
