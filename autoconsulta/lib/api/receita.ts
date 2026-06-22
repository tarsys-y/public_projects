/**
 * Situação cadastral do CPF — APENAS o próprio titular.
 *
 * Realidade técnica: não há API REST pública e gratuita para situação de CPF.
 * O caminho oficial é gov.br OAuth + API Conecta da Receita, que exige
 * CREDENCIAMENTO do serviço junto ao governo. Este módulo NÃO faz scraping do
 * endpoint protegido nem bypass de captcha.
 *
 * - Se as credenciais oficiais estiverem configuradas, `getCpfStatus` seria o
 *   ponto de integração com o fluxo autenticado do titular.
 * - Sem credenciais, a aplicação usa o modo de AUTO-RELATO: o próprio titular
 *   informa os dados que obteve no portal gov.br (ver buildSelfReportedStatus).
 */
import type { CpfStatus } from '@/types'
import { cleanCpf, isValidCpf } from '@/lib/validation/cpf'

/** Indica se as credenciais do fluxo oficial gov.br estão configuradas. */
export function isOfficialFlowConfigured(): boolean {
  return Boolean(
    process.env.GOVBR_CLIENT_ID &&
      process.env.GOVBR_CLIENT_SECRET &&
      process.env.RECEITA_API_BASE,
  )
}

/**
 * Ponto de integração com o fluxo oficial (gov.br/Conecta), que só funciona com
 * o titular autenticado e o serviço credenciado. Sem credenciais, retorna null
 * e a UI recorre ao auto-relato.
 *
 * @param accessToken token OAuth obtido pelo próprio titular via gov.br.
 */
export async function getCpfStatus(
  cpf: string,
  accessToken: string,
): Promise<CpfStatus | null> {
  if (!isValidCpf(cpf)) return null
  if (!isOfficialFlowConfigured()) return null

  const base = process.env.RECEITA_API_BASE!
  try {
    const res = await fetch(`${base}/situacao-cadastral/${cleanCpf(cpf)}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      nome?: string
      situacao?: string
      data_inscricao?: string
    }
    return {
      cpf: cleanCpf(cpf),
      nome: json.nome ?? null,
      situacao: json.situacao ?? 'DESCONHECIDA',
      dataInscricao: json.data_inscricao ?? null,
      fonte: 'oficial',
    }
  } catch {
    return null
  }
}

/**
 * Monta um CpfStatus a partir de dados que o PRÓPRIO titular informou (modo de
 * auto-relato). Não há consulta de rede — apenas estrutura o que o titular já
 * obteve no gov.br. Retorna null se o CPF informado for estruturalmente inválido.
 */
export function buildSelfReportedStatus(input: {
  cpf: string
  nome?: string
  situacao: string
  dataInscricao?: string
}): CpfStatus | null {
  if (!isValidCpf(input.cpf)) return null
  return {
    cpf: cleanCpf(input.cpf),
    nome: input.nome?.trim() || null,
    situacao: input.situacao,
    dataInscricao: input.dataInscricao || null,
    fonte: 'auto-relato',
  }
}
