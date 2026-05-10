// Top 100 most liquid B3 stocks (IBOV + SMLL constituents)
// Updated 2024 — refresh via scripts/seed.ts

export const TOP_100_TICKERS: string[] = [
  // IBOV blue chips
  'VALE3', 'PETR4', 'PETR3', 'ITUB4', 'BBDC4', 'BBAS3', 'ABEV3', 'WEGE3',
  'RENT3', 'BPAC11', 'RDOR3', 'ELET3', 'ELET6', 'SUZB3', 'LREN3', 'HAPV3',
  'CPLE6', 'EMBR3', 'JBSS3', 'VIVT3', 'TOTS3', 'CSNA3', 'GOAU4', 'USIM5',
  'GGBR4', 'CYRE3', 'MRFG3', 'BEEF3', 'SMFT3', 'PRIO3', 'CSAN3', 'ENEV3',
  'TAEE11', 'TIMS3', 'EQTL3', 'CPFE3', 'SBSP3', 'EGIE3', 'CMIG4', 'ENBR3',
  'IRBR3', 'BRKM5', 'RAIZ4', 'NTCO3', 'SOMA3', 'CMIN3', 'KLBN11', 'DXCO3',
  'IGTI11', 'BRFS3', 'SLCE3', 'AGRO3', 'MGLU3', 'BHIA3', 'RAIL3', 'AZUL4',
  'GOLL4', 'CVCB3', 'HYPE3', 'FLRY3', 'RADL3', 'PARD3', 'MYPK3', 'RECV3',
  // SMLL / mid caps
  'LWSA3', 'CASH3', 'MOVI3', 'DESK3', 'SEQL3', 'INTB3', 'ZAMP3', 'SRNA3',
  'AERI3', 'ESPA3', 'LOGG3', 'MULT3', 'BRPR3', 'MILS3', 'MTRE3', 'LAVV3',
  'EVEN3', 'EZTC3', 'JHSF3', 'MRVE3', 'TEND3', 'DIRR3', 'CALI3', 'PLPL3',
  'PSSA3', 'BBSE3', 'SULA11', 'IRBR3', 'WIZC3', 'QUAL3', 'HAPV3', 'GNDI3',
  'RRRP3', 'RECV3', 'TTEN3', 'CEAB3',
]

export const FINANCIAL_TICKERS = new Set([
  'ITUB4', 'BBDC4', 'BBAS3', 'BPAC11', 'IRBR3', 'PSSA3', 'BBSE3', 'SULA11',
  'WIZC3', 'BRSR6', 'SANB11', 'ABCB4',
])

export const UTILITY_TICKERS = new Set([
  'ELET3', 'ELET6', 'CPFE3', 'SBSP3', 'EGIE3', 'CMIG4', 'ENBR3', 'EQTL3',
  'CPLE6', 'TAEE11', 'ENEV3',
])

export const SECTOR_MAP: Record<string, string[]> = {
  'Materiais Básicos': ['VALE3', 'CSNA3', 'GOAU4', 'USIM5', 'GGBR4', 'BRKM5', 'KLBN11', 'DXCO3', 'SUZB3', 'CMIN3'],
  'Energia': ['PETR4', 'PETR3', 'PRIO3', 'CSAN3', 'ENEV3', 'RAIZ4', 'RECV3', 'RRRP3'],
  'Financeiro': ['ITUB4', 'BBDC4', 'BBAS3', 'BPAC11', 'IRBR3', 'PSSA3', 'BBSE3'],
  'Consumo Discricionário': ['MGLU3', 'LREN3', 'SOMA3', 'BHIA3', 'CVCB3'],
  'Consumo Básico': ['ABEV3', 'BRFS3', 'JBSS3', 'MRFG3', 'BEEF3', 'NTCO3'],
  'Saúde': ['RDOR3', 'HAPV3', 'HYPE3', 'FLRY3', 'RADL3', 'PARD3', 'QUAL3'],
  'Tecnologia': ['TOTS3', 'LWSA3', 'CASH3', 'INTB3'],
  'Telecomunicações': ['VIVT3', 'TIMS3'],
  'Utilidades': ['ELET3', 'ELET6', 'CPFE3', 'SBSP3', 'EGIE3', 'CMIG4', 'EQTL3', 'TAEE11'],
  'Imobiliário': ['IGTI11', 'MULT3', 'BRPR3', 'MILS3', 'JHSF3', 'EZTC3'],
  'Construção Civil': ['CYRE3', 'MRVE3', 'EVEN3', 'TEND3', 'DIRR3', 'MTRE3'],
  'Transporte & Logística': ['RENT3', 'RAIL3', 'AZUL4', 'GOLL4', 'MOVI3'],
  'Agronegócio': ['SLCE3', 'AGRO3'],
  'Industriais': ['WEGE3', 'EMBR3', 'MYPK3'],
}
