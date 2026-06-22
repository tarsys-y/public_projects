/**
 * Validação de CNPJ — funções puras, sem qualquer acesso à rede.
 * Verifica apenas a estrutura (dígitos verificadores), não consulta dados.
 */

/** Remove tudo que não for dígito. */
export function cleanCnpj(value: string): string {
  return (value ?? '').replace(/\D/g, '')
}

/** Formata um CNPJ como 00.000.000/0000-00 (aceita entrada já suja). */
export function formatCnpj(value: string): string {
  const d = cleanCnpj(value).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5')
}

/** Calcula um dígito verificador de CNPJ (módulo 11 com pesos cíclicos 2..9). */
function checkDigit(digits: string): number {
  let sum = 0
  let weight = 2
  // Percorre da direita para a esquerda, peso vai de 2 a 9 e reinicia.
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += Number(digits[i]) * weight
    weight = weight === 9 ? 2 : weight + 1
  }
  const rest = sum % 11
  return rest < 2 ? 0 : 11 - rest
}

/**
 * Retorna true se o CNPJ for estruturalmente válido.
 * Rejeita comprimento != 14 e sequências repetidas.
 */
export function isValidCnpj(cnpj: string): boolean {
  const d = cleanCnpj(cnpj)
  if (d.length !== 14) return false
  if (/^(\d)\1{13}$/.test(d)) return false

  const dv1 = checkDigit(d.slice(0, 12))
  if (dv1 !== Number(d[12])) return false

  const dv2 = checkDigit(d.slice(0, 13))
  if (dv2 !== Number(d[13])) return false

  return true
}
