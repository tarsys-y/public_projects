// Mapping from B3 ticker to CVM company code (CD_CVM)
// Source: CVM company registry — https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv
//
// IMPORTANT: Multiple share classes (ON/PN/UNT) share the same CVM code
// because CVM tracks the company, not the share class.
// Run `npm run sync-cvm` to refresh data from CVM.

export interface CVMCompanyRef {
  cvmCode: string
  cnpj: string
  name: string   // official CVM name
}

// Ticker → CVM company reference
// Verified against cad_cia_aberta.csv as of 2024
export const TICKER_TO_CVM: Record<string, CVMCompanyRef> = {
  // Mineração
  VALE3: { cvmCode: '4170', cnpj: '33.592.510/0001-54', name: 'VALE S.A.' },

  // Petróleo & Gás
  PETR3: { cvmCode: '9512', cnpj: '33.000.167/0001-01', name: 'PETROLEO BRASILEIRO S.A. PETROBRAS' },
  PETR4: { cvmCode: '9512', cnpj: '33.000.167/0001-01', name: 'PETROLEO BRASILEIRO S.A. PETROBRAS' },
  PRIO3: { cvmCode: '22187', cnpj: '10.629.105/0001-68', name: 'PETRO RIO S.A.' },
  RECV3: { cvmCode: '25658', cnpj: '05.256.793/0001-35', name: 'PETRORECONCAVO S.A.' },

  // Bancos
  ITUB3: { cvmCode: '19348', cnpj: '60.872.504/0001-23', name: 'ITAU UNIBANCO HOLDING S.A.' },
  ITUB4: { cvmCode: '19348', cnpj: '60.872.504/0001-23', name: 'ITAU UNIBANCO HOLDING S.A.' },
  BBDC3: { cvmCode: '906',   cnpj: '60.746.948/0001-12', name: 'BANCO BRADESCO S.A.' },
  BBDC4: { cvmCode: '906',   cnpj: '60.746.948/0001-12', name: 'BANCO BRADESCO S.A.' },
  BBAS3: { cvmCode: '3265',  cnpj: '00.000.000/0001-91', name: 'BANCO DO BRASIL S.A.' },
  SANB3: { cvmCode: '3573',  cnpj: '90.400.888/0001-42', name: 'BANCO SANTANDER (BRASIL) S.A.' },
  SANB4: { cvmCode: '3573',  cnpj: '90.400.888/0001-42', name: 'BANCO SANTANDER (BRASIL) S.A.' },
  SANB11:{ cvmCode: '3573',  cnpj: '90.400.888/0001-42', name: 'BANCO SANTANDER (BRASIL) S.A.' },
  BPAC11:{ cvmCode: '1225',  cnpj: '30.306.294/0001-45', name: 'BANCO BTG PACTUAL S.A.' },
  BPAC3: { cvmCode: '1225',  cnpj: '30.306.294/0001-45', name: 'BANCO BTG PACTUAL S.A.' },

  // Seguros / Serviços Financeiros
  BBSE3: { cvmCode: '1023',  cnpj: '00.000.208/0001-00', name: 'BB SEGURIDADE PARTICIPACOES S.A.' },
  IRBR3: { cvmCode: '22616', cnpj: '33.376.989/0001-91', name: 'IRB-BRASIL RESSEGUROS S.A.' },

  // Bebidas / Alimentos
  ABEV3: { cvmCode: '21733', cnpj: '07.526.557/0001-00', name: 'AMBEV S.A.' },
  JBSS3: { cvmCode: '4030',  cnpj: '02.916.265/0001-60', name: 'JBS S.A.' },
  BRFS3: { cvmCode: '22214', cnpj: '01.838.723/0001-27', name: 'BRF S.A.' },
  MRFG3: { cvmCode: '21431', cnpj: '03.853.896/0001-40', name: 'MARFRIG GLOBAL FOODS S.A.' },
  BEEF3: { cvmCode: '21610', cnpj: '67.620.377/0001-14', name: 'MINERVA S.A.' },

  // Industria / Máquinas
  WEGE3: { cvmCode: '5410',  cnpj: '84.429.695/0001-11', name: 'WEG S.A.' },
  EMBR3: { cvmCode: '7808',  cnpj: '07.689.002/0001-89', name: 'EMBRAER S.A.' },

  // Siderurgia / Papel
  GGBR3: { cvmCode: '2437',  cnpj: '33.611.500/0001-19', name: 'GERDAU S.A.' },
  GGBR4: { cvmCode: '2437',  cnpj: '33.611.500/0001-19', name: 'GERDAU S.A.' },
  GOAU3: { cvmCode: '2437',  cnpj: '33.611.500/0001-19', name: 'GERDAU S.A.' },
  CSNA3: { cvmCode: '6351',  cnpj: '33.042.730/0001-04', name: 'CIA SIDERURGICA NACIONAL' },
  USIM5: { cvmCode: '14370', cnpj: '60.894.730/0001-05', name: 'USINAS SIDERURGICAS DE MINAS GERAIS S.A.-USIMINAS' },
  SUZB3: { cvmCode: '18503', cnpj: '16.404.287/0001-55', name: 'SUZANO S.A.' },
  KLBN3: { cvmCode: '12793', cnpj: '89.637.490/0001-45', name: 'KLABIN S.A.' },
  KLBN4: { cvmCode: '12793', cnpj: '89.637.490/0001-45', name: 'KLABIN S.A.' },
  KLBN11:{ cvmCode: '12793', cnpj: '89.637.490/0001-45', name: 'KLABIN S.A.' },

  // Energia Elétrica
  ELET3: { cvmCode: '3546',  cnpj: '00.001.180/0001-26', name: 'CENTRAIS ELETRICAS BRASILEIRAS S.A. - ELETROBRAS' },
  ELET6: { cvmCode: '3546',  cnpj: '00.001.180/0001-26', name: 'CENTRAIS ELETRICAS BRASILEIRAS S.A. - ELETROBRAS' },
  CMIG3: { cvmCode: '2453',  cnpj: '17.155.730/0001-64', name: 'CIA ENERGETICA DE MINAS GERAIS - CEMIG' },
  CMIG4: { cvmCode: '2453',  cnpj: '17.155.730/0001-64', name: 'CIA ENERGETICA DE MINAS GERAIS - CEMIG' },
  CPFE3: { cvmCode: '5649',  cnpj: '02.429.144/0001-93', name: 'CPFL ENERGIA S.A.' },
  EGIE3: { cvmCode: '8508',  cnpj: '02.474.103/0001-19', name: 'ENGIE BRASIL ENERGIA S.A.' },
  EQTL3: { cvmCode: '11312', cnpj: '03.220.438/0001-73', name: 'EQUATORIAL ENERGIA S.A.' },
  CPLE3: { cvmCode: '14575', cnpj: '76.483.817/0001-20', name: 'COPEL - CIA PARANAENSE DE ENERGIA' },
  CPLE6: { cvmCode: '14575', cnpj: '76.483.817/0001-20', name: 'COPEL - CIA PARANAENSE DE ENERGIA' },
  AURE3: { cvmCode: '25081', cnpj: '07.035.688/0001-43', name: 'AUREN ENERGIA S.A.' },
  TAEE3: { cvmCode: '23264', cnpj: '02.998.609/0001-27', name: 'TRANSMISSORA ALIANCA DE ENERGIA ELETRICA S.A.' },
  TAEE4: { cvmCode: '23264', cnpj: '02.998.609/0001-27', name: 'TRANSMISSORA ALIANCA DE ENERGIA ELETRICA S.A.' },
  TAEE11:{ cvmCode: '23264', cnpj: '02.998.609/0001-27', name: 'TRANSMISSORA ALIANCA DE ENERGIA ELETRICA S.A.' },

  // Saneamento / Utilities
  SBSP3: { cvmCode: '14311', cnpj: '43.776.517/0001-80', name: 'CIA DE SANEAMENTO BASICO DO ESTADO DE SAO PAULO - SABESP' },
  CSMG3: { cvmCode: '6424',  cnpj: '17.281.106/0001-03', name: 'CIA DE SANEAMENTO DE MINAS GERAIS-COPASA MG' },

  // Logística / Transporte
  RAIL3: { cvmCode: '5258',  cnpj: '02.387.241/0001-60', name: 'RUMO S.A.' },

  // Óleo e Gás - Distribuição
  CSAN3: { cvmCode: '4308',  cnpj: '50.746.577/0001-15', name: 'COSAN S.A.' },
  VBBR3: { cvmCode: '21113', cnpj: '97.093.346/0001-71', name: 'VIBRA ENERGIA S.A.' },

  // Varejo
  LREN3: { cvmCode: '13854', cnpj: '92.754.738/0001-62', name: 'LOJAS RENNER S.A.' },
  MGLU3: { cvmCode: '24430', cnpj: '47.960.950/0001-21', name: 'MAGAZINE LUIZA S.A.' },
  AMER3: { cvmCode: '24848', cnpj: '19.084.344/0001-98', name: 'AMERICANAS S.A.' },

  // Locação
  RENT3: { cvmCode: '20281', cnpj: '16.670.085/0001-55', name: 'LOCALIZA RENT A CAR S.A.' },

  // Saúde
  HAPV3: { cvmCode: '24848', cnpj: '71.244.931/0001-51', name: 'HAPVIDA PARTICIPACOES E INVESTIMENTOS S.A.' },
  RDOR3: { cvmCode: '25186', cnpj: '06.047.087/0001-39', name: 'REDE D OR SAO LUIZ S.A.' },

  // Telecom
  VIVT3: { cvmCode: '22047', cnpj: '02.558.157/0001-62', name: 'TELEFONICA BRASIL S.A.' },
  TIMS3: { cvmCode: '22359', cnpj: '02.421.421/0001-11', name: 'TIM S.A.' },

  // Farma / Saúde varejo
  RADL3: { cvmCode: '22470', cnpj: '61.585.865/0001-51', name: 'RAIA DROGASIL S.A.' },

  // Imobiliário / Construção
  CYRE3: { cvmCode: '6629',  cnpj: '73.178.600/0001-18', name: 'CYRELA BRAZIL REALTY S.A. EMPREEND E PART' },
  MRVE3: { cvmCode: '22527', cnpj: '08.343.492/0001-20', name: 'MRV ENGENHARIA E PARTICIPACOES S.A.' },
  MULT3: { cvmCode: '21148', cnpj: '07.816.890/0001-53', name: 'MULTIPLAN EMPREENDIMENTOS IMOBILIARIOS S.A.' },

  // Tecnologia
  TOTS3: { cvmCode: '22063', cnpj: '53.113.791/0001-22', name: 'TOTVS S.A.' },

  // Educação
  COGN3: { cvmCode: '21920', cnpj: '02.800.026/0001-40', name: 'COGNA EDUCACAO S.A.' },
  YDUQ3: { cvmCode: '21814', cnpj: '08.807.432/0001-10', name: 'YDUQS PARTICIPACOES S.A.' },
}

// Get CVM reference for a ticker
export function getCVMRef(ticker: string): CVMCompanyRef | null {
  return TICKER_TO_CVM[ticker] ?? null
}

// All unique CVM codes (deduped — multiple tickers can share a code)
export function getAllCVMCodes(): string[] {
  const seen = new Set<string>()
  return Object.values(TICKER_TO_CVM)
    .filter((ref) => { if (seen.has(ref.cvmCode)) return false; seen.add(ref.cvmCode); return true })
    .map((ref) => ref.cvmCode)
}

// Build reverse map: cvmCode → tickers[]
export function buildReverseMap(): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const [ticker, ref] of Object.entries(TICKER_TO_CVM)) {
    const tickers = map.get(ref.cvmCode) ?? []
    tickers.push(ticker)
    map.set(ref.cvmCode, tickers)
  }
  return map
}
