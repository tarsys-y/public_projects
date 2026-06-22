/**
 * Tipos compartilhados do subprojeto autoconsulta.
 */

/** Um sócio do Quadro de Sócios e Administradores (QSA) — dado público da empresa. */
export interface QsaMember {
  nome: string
  qualificacao: string
}

/** Dados cadastrais públicos de uma empresa (a partir de um CNPJ). */
export interface CnpjData {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string | null
  situacaoCadastral: string
  dataSituacao: string | null
  naturezaJuridica: string | null
  cnaePrincipal: { codigo: string; descricao: string } | null
  endereco: {
    logradouro: string | null
    numero: string | null
    bairro: string | null
    municipio: string | null
    uf: string | null
    cep: string | null
  }
  qsa: QsaMember[]
}

/** Um vazamento conhecido retornado pela API do Have I Been Pwned. */
export interface Breach {
  name: string
  title: string
  domain: string
  breachDate: string
  description: string
  dataClasses: string[]
}

/** Situação cadastral do CPF do próprio titular (auto-relato ou fluxo oficial). */
export interface CpfStatus {
  cpf: string
  nome: string | null
  situacao: string
  dataInscricao: string | null
  /** Origem do dado: 'oficial' (gov.br) ou 'auto-relato' (informado pelo titular). */
  fonte: 'oficial' | 'auto-relato'
}
