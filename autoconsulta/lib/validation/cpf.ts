/**
 * Validação de CPF — funções puras, sem qualquer acesso à rede.
 *
 * Apenas verifica se a string é um CPF estruturalmente válido (dígitos
 * verificadores corretos). NÃO consulta nenhum dado de nenhuma pessoa.
 */

/** Remove tudo que não for dígito. */
export function cleanCpf(value: string): string {
  return (value ?? '').replace(/\D/g, '')
}

/** Formata um CPF como 000.000.000-00 (aceita entrada já suja). */
export function formatCpf(value: string): string {
  const d = cleanCpf(value).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

/** Calcula um dígito verificador de CPF pelo algoritmo módulo 11. */
function checkDigit(digits: string): number {
  const len = digits.length
  let sum = 0
  // Pesos decrescentes começando em (len + 1): 10..2 para o 1º DV, 11..2 para o 2º.
  for (let i = 0; i < len; i++) {
    sum += Number(digits[i]) * (len + 1 - i)
  }
  const rest = (sum * 10) % 11
  return rest === 10 ? 0 : rest
}

/**
 * Retorna true se o CPF for estruturalmente válido.
 * Rejeita comprimento != 11 e sequências repetidas (ex.: 111.111.111-11).
 */
export function isValidCpf(cpf: string): boolean {
  const d = cleanCpf(cpf)
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false

  const dv1 = checkDigit(d.slice(0, 9))
  if (dv1 !== Number(d[9])) return false

  const dv2 = checkDigit(d.slice(0, 10))
  if (dv2 !== Number(d[10])) return false

  return true
}
