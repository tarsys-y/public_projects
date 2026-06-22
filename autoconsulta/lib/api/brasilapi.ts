/**
 * Cliente da BrasilAPI — consulta dados cadastrais PÚBLICOS de uma EMPRESA a
 * partir de um CNPJ. A entrada é sempre um CNPJ (a empresa), nunca um CPF.
 *
 * Não existe — e não será adicionado — reverse-lookup de CPF para empresas.
 */
import type { CnpjData, QsaMember } from '@/types'
import { cleanCnpj, isValidCnpj } from '@/lib/validation/cnpj'

const BRASILAPI_BASE = 'https://brasilapi.com.br/api'

/** Resposta crua da BrasilAPI (campos relevantes). */
interface BrasilApiCnpjResponse {
  cnpj?: string
  razao_social?: string
  nome_fantasia?: string
  descricao_situacao_cadastral?: string
  data_situacao_cadastral?: string
  natureza_juridica?: string
  cnae_fiscal?: number
  cnae_fiscal_descricao?: string
  logradouro?: string
  numero?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string
  qsa?: Array<{ nome_socio?: string; qualificacao_socio?: string }>
}

function mapResponse(raw: BrasilApiCnpjResponse, cnpj: string): CnpjData {
  const qsa: QsaMember[] = (raw.qsa ?? []).map((s) => ({
    nome: s.nome_socio ?? '',
    qualificacao: s.qualificacao_socio ?? '',
  }))

  return {
    cnpj,
    razaoSocial: raw.razao_social ?? '',
    nomeFantasia: raw.nome_fantasia || null,
    situacaoCadastral: raw.descricao_situacao_cadastral ?? 'DESCONHECIDA',
    dataSituacao: raw.data_situacao_cadastral || null,
    naturezaJuridica: raw.natureza_juridica || null,
    cnaePrincipal:
      raw.cnae_fiscal != null
        ? { codigo: String(raw.cnae_fiscal), descricao: raw.cnae_fiscal_descricao ?? '' }
        : null,
    endereco: {
      logradouro: raw.logradouro || null,
      numero: raw.numero || null,
      bairro: raw.bairro || null,
      municipio: raw.municipio || null,
      uf: raw.uf || null,
      cep: raw.cep || null,
    },
    qsa,
  }
}

/**
 * Busca os dados públicos de uma empresa pelo CNPJ.
 * Retorna null se o CNPJ for inválido ou se a consulta falhar.
 */
export async function fetchCnpj(cnpj: string): Promise<CnpjData | null> {
  const digits = cleanCnpj(cnpj)
  if (!isValidCnpj(digits)) return null

  try {
    const res = await fetch(`${BRASILAPI_BASE}/cnpj/v1/${digits}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const json = (await res.json()) as BrasilApiCnpjResponse
    return mapResponse(json, digits)
  } catch {
    return null
  }
}
