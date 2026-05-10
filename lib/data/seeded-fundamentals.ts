// Seeded fundamental data for top B3 stocks
// Baseline values — updated by scripts/seed.ts in production
// All monetary values in BRL millions unless noted

export interface SeededFundamental {
  ticker: string
  name: string
  sector: string
  subsector?: string
  // Income
  revenue: number       // BRL millions (trailing 12m)
  ebit: number
  ebitMargin: number    // decimal
  eps: number           // BRL per share
  // Balance Sheet
  bvps: number          // book value per share
  currentRatio: number
  netDebt: number       // BRL millions
  totalDebt: number
  cash: number
  currentAssets: number
  currentLiabilities: number
  netFixedAssets: number
  sharesOutstanding: number // millions
  // Ref prices
  priceRef: number      // BRL
  marketCapRef: number  // BRL millions
  // Ratios
  evEbitda: number
  evEbitdaSectorMedian: number
  // Fisher auto
  revenueCAGR5y: number  // decimal
  revenueCAGR3y?: number
  roeConsistency: number  // std dev of ROE, lower = better
  rdeRatio: number
  operatingMarginTrend: number // slope (positive = improving)
  insiderOwnership?: number
  // DCF inputs
  costOfDebt: number
  debtWeight: number
  revenueGrowthY1to5: number
  revenueGrowthY6to10: number
  ebitMarginTarget: number
  capexPctRevenue: number
  nwcPctRevenue: number
  expectedGrowthRate: number
  // Quant signals
  beta: number
  momentum: number
  volatility: number
  meanReversionZ: number
  volumeAnomaly: number
  // Pre-computed scores
  greenblattScore: number
  fisherScore: number
  damodaranScore: number
  quantScore: number
  dcfMOS: number
  hasDividendHistory20y: boolean
  // History for Graham checks
  history: {
    ticker: string
    years: number[]
    revenue: number[]
    ebit: number[]
    netIncome: number[]
    eps: number[]
    roe: number[]
    operatingMargin: number[]
    dividends: number[]
    bookValuePerShare: number[]
  }
}

const makeHistory = (
  ticker: string,
  baseEPS: number,
  growthRate: number,
  baseROE: number,
): SeededFundamental['history'] => {
  const years = Array.from({ length: 10 }, (_, i) => 2014 + i)
  const eps = years.map((_, i) => +(baseEPS * Math.pow(1 + growthRate, i - 9)).toFixed(2))
  const roe = years.map(() => baseROE + (Math.random() - 0.5) * 0.03)
  return {
    ticker,
    years,
    revenue: eps.map((e) => e * 1000),
    ebit: eps.map((e) => e * 200),
    netIncome: eps.map((e) => e * 150),
    eps,
    roe,
    operatingMargin: roe.map((r) => r * 0.5),
    dividends: eps.map((e) => Math.max(0, e * 0.4)),
    bookValuePerShare: eps.map((e, i) => e * 8 + i * 0.5),
  }
}

export const SEEDED_FUNDAMENTALS: SeededFundamental[] = [
  {
    ticker: 'VALE3',
    name: 'Vale S.A.',
    sector: 'Materiais Básicos',
    subsector: 'Mineração',
    revenue: 198000, ebit: 71000, ebitMargin: 0.358, eps: 4.8, bvps: 32.0,
    currentRatio: 1.8, netDebt: 45000, totalDebt: 78000, cash: 33000,
    currentAssets: 62000, currentLiabilities: 34000, netFixedAssets: 150000,
    sharesOutstanding: 4300, priceRef: 65.0, marketCapRef: 279500,
    evEbitda: 4.6, evEbitdaSectorMedian: 5.2,
    revenueCAGR5y: 0.08, roeConsistency: 0.06, rdeRatio: 0.01,
    operatingMarginTrend: 0.005, insiderOwnership: 0.12,
    costOfDebt: 0.06, debtWeight: 0.22, revenueGrowthY1to5: 0.04,
    revenueGrowthY6to10: 0.03, ebitMarginTarget: 0.33, capexPctRevenue: 0.14,
    nwcPctRevenue: 0.05, expectedGrowthRate: 0.04, beta: 1.2,
    momentum: 0.08, volatility: 0.35, meanReversionZ: -0.3, volumeAnomaly: 1.1,
    greenblattScore: 72, fisherScore: 58, damodaranScore: 65, quantScore: 55, dcfMOS: 28.0,
    hasDividendHistory20y: true,
    history: makeHistory('VALE3', 4.8, 0.05, 0.18),
  },
  {
    ticker: 'PETR4',
    name: 'Petrobras S.A.',
    sector: 'Energia',
    subsector: 'Petróleo & Gás',
    revenue: 520000, ebit: 185000, ebitMargin: 0.356, eps: 6.5, bvps: 38.0,
    currentRatio: 1.3, netDebt: 230000, totalDebt: 310000, cash: 80000,
    currentAssets: 110000, currentLiabilities: 85000, netFixedAssets: 560000,
    sharesOutstanding: 7400, priceRef: 38.0, marketCapRef: 281200,
    evEbitda: 2.8, evEbitdaSectorMedian: 4.5,
    revenueCAGR5y: 0.12, roeConsistency: 0.10, rdeRatio: 0.005,
    operatingMarginTrend: 0.012, insiderOwnership: 0.36,
    costOfDebt: 0.07, debtWeight: 0.45, revenueGrowthY1to5: 0.05,
    revenueGrowthY6to10: 0.02, ebitMarginTarget: 0.34, capexPctRevenue: 0.18,
    nwcPctRevenue: 0.02, expectedGrowthRate: 0.04, beta: 0.95,
    momentum: 0.12, volatility: 0.32, meanReversionZ: 0.5, volumeAnomaly: 1.3,
    greenblattScore: 88, fisherScore: 50, damodaranScore: 78, quantScore: 60, dcfMOS: 42.0,
    hasDividendHistory20y: true,
    history: makeHistory('PETR4', 6.5, 0.06, 0.22),
  },
  {
    ticker: 'ITUB4',
    name: 'Itaú Unibanco Holding S.A.',
    sector: 'Financeiro',
    subsector: 'Bancos',
    revenue: 145000, ebit: 42000, ebitMargin: 0.29, eps: 3.2, bvps: 22.0,
    currentRatio: 1.0, netDebt: -180000, totalDebt: 0, cash: 180000,
    currentAssets: 200000, currentLiabilities: 200000, netFixedAssets: 15000,
    sharesOutstanding: 9500, priceRef: 34.0, marketCapRef: 323000,
    evEbitda: 8.5, evEbitdaSectorMedian: 9.0,
    revenueCAGR5y: 0.09, roeConsistency: 0.02, rdeRatio: 0.002,
    operatingMarginTrend: 0.003, insiderOwnership: 0.25,
    costOfDebt: 0.09, debtWeight: 0.15, revenueGrowthY1to5: 0.08,
    revenueGrowthY6to10: 0.06, ebitMarginTarget: 0.30, capexPctRevenue: 0.04,
    nwcPctRevenue: 0.02, expectedGrowthRate: 0.07, beta: 0.85,
    momentum: 0.15, volatility: 0.22, meanReversionZ: 0.8, volumeAnomaly: 1.0,
    greenblattScore: 60, fisherScore: 72, damodaranScore: 55, quantScore: 68, dcfMOS: 12.0,
    hasDividendHistory20y: true,
    history: makeHistory('ITUB4', 3.2, 0.07, 0.20),
  },
  {
    ticker: 'WEGE3',
    name: 'WEG S.A.',
    sector: 'Industriais',
    subsector: 'Máquinas & Equipamentos',
    revenue: 32000, ebit: 7200, ebitMargin: 0.225, eps: 1.8, bvps: 8.5,
    currentRatio: 2.8, netDebt: -2500, totalDebt: 1200, cash: 3700,
    currentAssets: 18000, currentLiabilities: 6400, netFixedAssets: 5800,
    sharesOutstanding: 3800, priceRef: 48.0, marketCapRef: 182400,
    evEbitda: 25.0, evEbitdaSectorMedian: 15.0,
    revenueCAGR5y: 0.18, roeConsistency: 0.02, rdeRatio: 0.025,
    operatingMarginTrend: 0.008, insiderOwnership: 0.42,
    costOfDebt: 0.09, debtWeight: 0.05, revenueGrowthY1to5: 0.15,
    revenueGrowthY6to10: 0.10, ebitMarginTarget: 0.23, capexPctRevenue: 0.08,
    nwcPctRevenue: 0.06, expectedGrowthRate: 0.12, beta: 0.75,
    momentum: 0.22, volatility: 0.25, meanReversionZ: 1.2, volumeAnomaly: 0.9,
    greenblattScore: 65, fisherScore: 92, damodaranScore: 42, quantScore: 72, dcfMOS: -18.0,
    hasDividendHistory20y: true,
    history: makeHistory('WEGE3', 1.8, 0.15, 0.28),
  },
  {
    ticker: 'BBAS3',
    name: 'Banco do Brasil S.A.',
    sector: 'Financeiro',
    subsector: 'Bancos',
    revenue: 112000, ebit: 38000, ebitMargin: 0.34, eps: 9.5, bvps: 55.0,
    currentRatio: 1.0, netDebt: -150000, totalDebt: 0, cash: 150000,
    currentAssets: 180000, currentLiabilities: 180000, netFixedAssets: 12000,
    sharesOutstanding: 2860, priceRef: 56.0, marketCapRef: 160160,
    evEbitda: 4.8, evEbitdaSectorMedian: 9.0,
    revenueCAGR5y: 0.11, roeConsistency: 0.03, rdeRatio: 0.001,
    operatingMarginTrend: 0.004, insiderOwnership: 0.50,
    costOfDebt: 0.10, debtWeight: 0.10, revenueGrowthY1to5: 0.07,
    revenueGrowthY6to10: 0.05, ebitMarginTarget: 0.32, capexPctRevenue: 0.03,
    nwcPctRevenue: 0.02, expectedGrowthRate: 0.06, beta: 0.90,
    momentum: 0.09, volatility: 0.24, meanReversionZ: -0.2, volumeAnomaly: 1.1,
    greenblattScore: 70, fisherScore: 62, damodaranScore: 72, quantScore: 58, dcfMOS: 32.0,
    hasDividendHistory20y: true,
    history: makeHistory('BBAS3', 9.5, 0.06, 0.19),
  },
  {
    ticker: 'ABEV3',
    name: 'Ambev S.A.',
    sector: 'Consumo Básico',
    subsector: 'Bebidas',
    revenue: 85000, ebit: 19500, ebitMargin: 0.229, eps: 0.78, bvps: 4.8,
    currentRatio: 0.9, netDebt: 5000, totalDebt: 12000, cash: 7000,
    currentAssets: 22000, currentLiabilities: 24000, netFixedAssets: 28000,
    sharesOutstanding: 15700, priceRef: 13.5, marketCapRef: 211950,
    evEbitda: 11.2, evEbitdaSectorMedian: 12.0,
    revenueCAGR5y: 0.06, roeConsistency: 0.03, rdeRatio: 0.008,
    operatingMarginTrend: -0.002, insiderOwnership: 0.62,
    costOfDebt: 0.08, debtWeight: 0.04, revenueGrowthY1to5: 0.05,
    revenueGrowthY6to10: 0.04, ebitMarginTarget: 0.22, capexPctRevenue: 0.09,
    nwcPctRevenue: 0.01, expectedGrowthRate: 0.05, beta: 0.70,
    momentum: -0.05, volatility: 0.18, meanReversionZ: -1.2, volumeAnomaly: 0.9,
    greenblattScore: 55, fisherScore: 68, damodaranScore: 48, quantScore: 42, dcfMOS: 5.0,
    hasDividendHistory20y: true,
    history: makeHistory('ABEV3', 0.78, 0.04, 0.14),
  },
  {
    ticker: 'SUZB3',
    name: 'Suzano S.A.',
    sector: 'Materiais Básicos',
    subsector: 'Papel & Celulose',
    revenue: 46000, ebit: 18500, ebitMargin: 0.402, eps: 8.5, bvps: 42.0,
    currentRatio: 2.2, netDebt: 72000, totalDebt: 82000, cash: 10000,
    currentAssets: 28000, currentLiabilities: 12700, netFixedAssets: 85000,
    sharesOutstanding: 1350, priceRef: 58.0, marketCapRef: 78300,
    evEbitda: 8.2, evEbitdaSectorMedian: 7.5,
    revenueCAGR5y: 0.22, roeConsistency: 0.08, rdeRatio: 0.002,
    operatingMarginTrend: 0.015, insiderOwnership: 0.28,
    costOfDebt: 0.07, debtWeight: 0.48, revenueGrowthY1to5: 0.08,
    revenueGrowthY6to10: 0.05, ebitMarginTarget: 0.38, capexPctRevenue: 0.20,
    nwcPctRevenue: 0.03, expectedGrowthRate: 0.07, beta: 1.0,
    momentum: 0.18, volatility: 0.38, meanReversionZ: 0.9, volumeAnomaly: 1.2,
    greenblattScore: 76, fisherScore: 60, damodaranScore: 58, quantScore: 65, dcfMOS: 22.0,
    hasDividendHistory20y: false,
    history: makeHistory('SUZB3', 8.5, 0.12, 0.25),
  },
  {
    ticker: 'RDOR3',
    name: 'Rede D\'Or São Luiz S.A.',
    sector: 'Saúde',
    subsector: 'Hospitais',
    revenue: 28000, ebit: 4200, ebitMargin: 0.15, eps: 1.2, bvps: 18.0,
    currentRatio: 1.6, netDebt: 18000, totalDebt: 22000, cash: 4000,
    currentAssets: 12000, currentLiabilities: 7500, netFixedAssets: 32000,
    sharesOutstanding: 1080, priceRef: 30.0, marketCapRef: 32400,
    evEbitda: 18.5, evEbitdaSectorMedian: 14.0,
    revenueCAGR5y: 0.20, roeConsistency: 0.04, rdeRatio: 0.015,
    operatingMarginTrend: 0.005, insiderOwnership: 0.55,
    costOfDebt: 0.10, debtWeight: 0.35, revenueGrowthY1to5: 0.15,
    revenueGrowthY6to10: 0.10, ebitMarginTarget: 0.16, capexPctRevenue: 0.12,
    nwcPctRevenue: 0.04, expectedGrowthRate: 0.12, beta: 0.80,
    momentum: 0.06, volatility: 0.28, meanReversionZ: -0.5, volumeAnomaly: 1.0,
    greenblattScore: 48, fisherScore: 75, damodaranScore: 52, quantScore: 55, dcfMOS: 8.0,
    hasDividendHistory20y: false,
    history: makeHistory('RDOR3', 1.2, 0.18, 0.10),
  },
  {
    ticker: 'RENT3',
    name: 'Localiza Rent a Car S.A.',
    sector: 'Transporte & Logística',
    subsector: 'Locação de Veículos',
    revenue: 22000, ebit: 3800, ebitMargin: 0.173, eps: 2.8, bvps: 24.0,
    currentRatio: 1.4, netDebt: 16000, totalDebt: 20000, cash: 4000,
    currentAssets: 10000, currentLiabilities: 7200, netFixedAssets: 26000,
    sharesOutstanding: 900, priceRef: 52.0, marketCapRef: 46800,
    evEbitda: 16.5, evEbitdaSectorMedian: 12.0,
    revenueCAGR5y: 0.18, roeConsistency: 0.03, rdeRatio: 0.002,
    operatingMarginTrend: 0.004, insiderOwnership: 0.22,
    costOfDebt: 0.10, debtWeight: 0.40, revenueGrowthY1to5: 0.12,
    revenueGrowthY6to10: 0.08, ebitMarginTarget: 0.18, capexPctRevenue: 0.35,
    nwcPctRevenue: 0.03, expectedGrowthRate: 0.10, beta: 1.05,
    momentum: 0.10, volatility: 0.30, meanReversionZ: 0.2, volumeAnomaly: 1.1,
    greenblattScore: 52, fisherScore: 70, damodaranScore: 45, quantScore: 58, dcfMOS: 2.0,
    hasDividendHistory20y: false,
    history: makeHistory('RENT3', 2.8, 0.14, 0.18),
  },
  {
    ticker: 'EMBR3',
    name: 'Embraer S.A.',
    sector: 'Industriais',
    subsector: 'Aeronáutica',
    revenue: 22000, ebit: 2400, ebitMargin: 0.109, eps: 3.5, bvps: 28.0,
    currentRatio: 2.5, netDebt: 8000, totalDebt: 14000, cash: 6000,
    currentAssets: 24000, currentLiabilities: 9600, netFixedAssets: 18000,
    sharesOutstanding: 700, priceRef: 42.0, marketCapRef: 29400,
    evEbitda: 15.8, evEbitdaSectorMedian: 12.5,
    revenueCAGR5y: 0.10, roeConsistency: 0.07, rdeRatio: 0.05,
    operatingMarginTrend: 0.010, insiderOwnership: 0.05,
    costOfDebt: 0.07, debtWeight: 0.22, revenueGrowthY1to5: 0.12,
    revenueGrowthY6to10: 0.08, ebitMarginTarget: 0.12, capexPctRevenue: 0.10,
    nwcPctRevenue: 0.05, expectedGrowthRate: 0.09, beta: 1.30,
    momentum: 0.25, volatility: 0.40, meanReversionZ: 1.5, volumeAnomaly: 1.5,
    greenblattScore: 58, fisherScore: 65, damodaranScore: 55, quantScore: 70, dcfMOS: 15.0,
    hasDividendHistory20y: false,
    history: makeHistory('EMBR3', 3.5, 0.06, 0.12),
  },
  {
    ticker: 'TOTS3',
    name: 'TOTVS S.A.',
    sector: 'Tecnologia',
    subsector: 'Software',
    revenue: 5200, ebit: 900, ebitMargin: 0.173, eps: 1.0, bvps: 7.5,
    currentRatio: 2.2, netDebt: 2200, totalDebt: 3500, cash: 1300,
    currentAssets: 5500, currentLiabilities: 2500, netFixedAssets: 2800,
    sharesOutstanding: 830, priceRef: 32.0, marketCapRef: 26560,
    evEbitda: 32.0, evEbitdaSectorMedian: 22.0,
    revenueCAGR5y: 0.14, roeConsistency: 0.03, rdeRatio: 0.12,
    operatingMarginTrend: 0.008, insiderOwnership: 0.15,
    costOfDebt: 0.09, debtWeight: 0.12, revenueGrowthY1to5: 0.14,
    revenueGrowthY6to10: 0.10, ebitMarginTarget: 0.18, capexPctRevenue: 0.06,
    nwcPctRevenue: 0.04, expectedGrowthRate: 0.12, beta: 0.85,
    momentum: 0.08, volatility: 0.26, meanReversionZ: 0.3, volumeAnomaly: 0.95,
    greenblattScore: 50, fisherScore: 78, damodaranScore: 40, quantScore: 60, dcfMOS: -8.0,
    hasDividendHistory20y: false,
    history: makeHistory('TOTS3', 1.0, 0.12, 0.16),
  },
  {
    ticker: 'JBSS3',
    name: 'JBS S.A.',
    sector: 'Consumo Básico',
    subsector: 'Alimentos',
    revenue: 380000, ebit: 22000, ebitMargin: 0.058, eps: 3.8, bvps: 18.0,
    currentRatio: 1.5, netDebt: 55000, totalDebt: 75000, cash: 20000,
    currentAssets: 60000, currentLiabilities: 40000, netFixedAssets: 55000,
    sharesOutstanding: 2900, priceRef: 28.0, marketCapRef: 81200,
    evEbitda: 6.2, evEbitdaSectorMedian: 7.5,
    revenueCAGR5y: 0.12, roeConsistency: 0.08, rdeRatio: 0.003,
    operatingMarginTrend: 0.002, insiderOwnership: 0.40,
    costOfDebt: 0.07, debtWeight: 0.40, revenueGrowthY1to5: 0.07,
    revenueGrowthY6to10: 0.04, ebitMarginTarget: 0.06, capexPctRevenue: 0.06,
    nwcPctRevenue: 0.02, expectedGrowthRate: 0.05, beta: 1.10,
    momentum: 0.05, volatility: 0.32, meanReversionZ: -0.8, volumeAnomaly: 1.2,
    greenblattScore: 80, fisherScore: 45, damodaranScore: 62, quantScore: 48, dcfMOS: 25.0,
    hasDividendHistory20y: false,
    history: makeHistory('JBSS3', 3.8, 0.08, 0.22),
  },
  {
    ticker: 'BBDC4',
    name: 'Banco Bradesco S.A.',
    sector: 'Financeiro',
    subsector: 'Bancos',
    revenue: 98000, ebit: 28000, ebitMargin: 0.286, eps: 1.85, bvps: 20.5,
    currentRatio: 1.0, netDebt: -120000, totalDebt: 0, cash: 120000,
    currentAssets: 150000, currentLiabilities: 150000, netFixedAssets: 10000,
    sharesOutstanding: 7900, priceRef: 15.0, marketCapRef: 118500,
    evEbitda: 5.5, evEbitdaSectorMedian: 9.0,
    revenueCAGR5y: 0.06, roeConsistency: 0.03, rdeRatio: 0.001,
    operatingMarginTrend: -0.005, insiderOwnership: 0.28,
    costOfDebt: 0.10, debtWeight: 0.12, revenueGrowthY1to5: 0.06,
    revenueGrowthY6to10: 0.05, ebitMarginTarget: 0.27, capexPctRevenue: 0.03,
    nwcPctRevenue: 0.02, expectedGrowthRate: 0.05, beta: 0.92,
    momentum: -0.08, volatility: 0.25, meanReversionZ: -1.8, volumeAnomaly: 1.1,
    greenblattScore: 65, fisherScore: 55, damodaranScore: 68, quantScore: 38, dcfMOS: 38.0,
    hasDividendHistory20y: true,
    history: makeHistory('BBDC4', 1.85, 0.04, 0.16),
  },
  {
    ticker: 'PRIO3',
    name: 'PetroRecôncavo S.A.',
    sector: 'Energia',
    subsector: 'Petróleo & Gás',
    revenue: 7500, ebit: 3800, ebitMargin: 0.507, eps: 5.2, bvps: 28.0,
    currentRatio: 2.0, netDebt: 8000, totalDebt: 10000, cash: 2000,
    currentAssets: 5000, currentLiabilities: 2500, netFixedAssets: 22000,
    sharesOutstanding: 300, priceRef: 55.0, marketCapRef: 16500,
    evEbitda: 6.5, evEbitdaSectorMedian: 4.5,
    revenueCAGR5y: 0.45, roeConsistency: 0.12, rdeRatio: 0.005,
    operatingMarginTrend: 0.025, insiderOwnership: 0.18,
    costOfDebt: 0.08, debtWeight: 0.32, revenueGrowthY1to5: 0.20,
    revenueGrowthY6to10: 0.10, ebitMarginTarget: 0.45, capexPctRevenue: 0.22,
    nwcPctRevenue: 0.03, expectedGrowthRate: 0.15, beta: 1.40,
    momentum: 0.30, volatility: 0.45, meanReversionZ: 2.0, volumeAnomaly: 1.8,
    greenblattScore: 85, fisherScore: 55, damodaranScore: 75, quantScore: 62, dcfMOS: 38.0,
    hasDividendHistory20y: false,
    history: makeHistory('PRIO3', 5.2, 0.35, 0.30),
  },
  {
    ticker: 'RADL3',
    name: 'Raia Drogasil S.A.',
    sector: 'Saúde',
    subsector: 'Farmácias',
    revenue: 34000, ebit: 2800, ebitMargin: 0.082, eps: 1.5, bvps: 10.0,
    currentRatio: 1.8, netDebt: 2500, totalDebt: 4500, cash: 2000,
    currentAssets: 15000, currentLiabilities: 8200, netFixedAssets: 8000,
    sharesOutstanding: 1800, priceRef: 28.0, marketCapRef: 50400,
    evEbitda: 19.0, evEbitdaSectorMedian: 14.0,
    revenueCAGR5y: 0.16, roeConsistency: 0.02, rdeRatio: 0.004,
    operatingMarginTrend: 0.003, insiderOwnership: 0.22,
    costOfDebt: 0.09, debtWeight: 0.08, revenueGrowthY1to5: 0.14,
    revenueGrowthY6to10: 0.10, ebitMarginTarget: 0.09, capexPctRevenue: 0.06,
    nwcPctRevenue: 0.03, expectedGrowthRate: 0.12, beta: 0.65,
    momentum: 0.12, volatility: 0.20, meanReversionZ: 0.5, volumeAnomaly: 0.9,
    greenblattScore: 55, fisherScore: 80, damodaranScore: 48, quantScore: 65, dcfMOS: -5.0,
    hasDividendHistory20y: false,
    history: makeHistory('RADL3', 1.5, 0.14, 0.22),
  },
  {
    ticker: 'VIVT3',
    name: 'Telefônica Brasil S.A.',
    sector: 'Telecomunicações',
    subsector: 'Telefonia',
    revenue: 52000, ebit: 10800, ebitMargin: 0.208, eps: 4.2, bvps: 30.0,
    currentRatio: 0.9, netDebt: 20000, totalDebt: 28000, cash: 8000,
    currentAssets: 18000, currentLiabilities: 20000, netFixedAssets: 45000,
    sharesOutstanding: 1400, priceRef: 48.0, marketCapRef: 67200,
    evEbitda: 8.2, evEbitdaSectorMedian: 8.5,
    revenueCAGR5y: 0.06, roeConsistency: 0.03, rdeRatio: 0.02,
    operatingMarginTrend: 0.003, insiderOwnership: 0.35,
    costOfDebt: 0.07, debtWeight: 0.23, revenueGrowthY1to5: 0.05,
    revenueGrowthY6to10: 0.03, ebitMarginTarget: 0.21, capexPctRevenue: 0.14,
    nwcPctRevenue: 0.02, expectedGrowthRate: 0.04, beta: 0.60,
    momentum: 0.04, volatility: 0.18, meanReversionZ: -0.3, volumeAnomaly: 0.8,
    greenblattScore: 62, fisherScore: 58, damodaranScore: 60, quantScore: 52, dcfMOS: 18.0,
    hasDividendHistory20y: true,
    history: makeHistory('VIVT3', 4.2, 0.05, 0.16),
  },
  {
    ticker: 'EQTL3',
    name: 'Equatorial Energia S.A.',
    sector: 'Utilidades',
    subsector: 'Energia Elétrica',
    revenue: 38000, ebit: 9500, ebitMargin: 0.250, eps: 5.5, bvps: 32.0,
    currentRatio: 1.5, netDebt: 28000, totalDebt: 35000, cash: 7000,
    currentAssets: 22000, currentLiabilities: 14500, netFixedAssets: 48000,
    sharesOutstanding: 750, priceRef: 38.0, marketCapRef: 28500,
    evEbitda: 6.0, evEbitdaSectorMedian: 7.0,
    revenueCAGR5y: 0.22, roeConsistency: 0.04, rdeRatio: 0.001,
    operatingMarginTrend: 0.008, insiderOwnership: 0.32,
    costOfDebt: 0.08, debtWeight: 0.50, revenueGrowthY1to5: 0.12,
    revenueGrowthY6to10: 0.06, ebitMarginTarget: 0.25, capexPctRevenue: 0.18,
    nwcPctRevenue: 0.02, expectedGrowthRate: 0.08, beta: 0.55,
    momentum: 0.08, volatility: 0.22, meanReversionZ: 0.1, volumeAnomaly: 0.9,
    greenblattScore: 68, fisherScore: 60, damodaranScore: 65, quantScore: 55, dcfMOS: 25.0,
    hasDividendHistory20y: false,
    history: makeHistory('EQTL3', 5.5, 0.14, 0.20),
  },
  {
    ticker: 'KLBN11',
    name: 'Klabin S.A.',
    sector: 'Materiais Básicos',
    subsector: 'Papel & Embalagens',
    revenue: 18500, ebit: 5400, ebitMargin: 0.292, eps: 1.8, bvps: 14.0,
    currentRatio: 2.0, netDebt: 22000, totalDebt: 27000, cash: 5000,
    currentAssets: 14000, currentLiabilities: 7000, netFixedAssets: 32000,
    sharesOutstanding: 1750, priceRef: 22.0, marketCapRef: 38500,
    evEbitda: 11.0, evEbitdaSectorMedian: 7.5,
    revenueCAGR5y: 0.12, roeConsistency: 0.05, rdeRatio: 0.002,
    operatingMarginTrend: 0.006, insiderOwnership: 0.35,
    costOfDebt: 0.07, debtWeight: 0.42, revenueGrowthY1to5: 0.08,
    revenueGrowthY6to10: 0.05, ebitMarginTarget: 0.28, capexPctRevenue: 0.16,
    nwcPctRevenue: 0.03, expectedGrowthRate: 0.06, beta: 0.95,
    momentum: 0.06, volatility: 0.28, meanReversionZ: -0.4, volumeAnomaly: 1.0,
    greenblattScore: 65, fisherScore: 55, damodaranScore: 55, quantScore: 52, dcfMOS: 15.0,
    hasDividendHistory20y: false,
    history: makeHistory('KLBN11', 1.8, 0.10, 0.15),
  },
  {
    ticker: 'HYPE3',
    name: 'Hypera S.A.',
    sector: 'Saúde',
    subsector: 'Farmacêutica',
    revenue: 9800, ebit: 2800, ebitMargin: 0.286, eps: 2.8, bvps: 22.0,
    currentRatio: 1.5, netDebt: 6000, totalDebt: 8000, cash: 2000,
    currentAssets: 12000, currentLiabilities: 8000, netFixedAssets: 6000,
    sharesOutstanding: 700, priceRef: 22.0, marketCapRef: 15400,
    evEbitda: 8.5, evEbitdaSectorMedian: 14.0,
    revenueCAGR5y: 0.10, roeConsistency: 0.04, rdeRatio: 0.04,
    operatingMarginTrend: 0.004, insiderOwnership: 0.20,
    costOfDebt: 0.10, debtWeight: 0.28, revenueGrowthY1to5: 0.09,
    revenueGrowthY6to10: 0.07, ebitMarginTarget: 0.28, capexPctRevenue: 0.05,
    nwcPctRevenue: 0.06, expectedGrowthRate: 0.08, beta: 0.75,
    momentum: -0.05, volatility: 0.25, meanReversionZ: -1.5, volumeAnomaly: 0.85,
    greenblattScore: 72, fisherScore: 65, damodaranScore: 70, quantScore: 42, dcfMOS: 35.0,
    hasDividendHistory20y: false,
    history: makeHistory('HYPE3', 2.8, 0.08, 0.18),
  },
  {
    ticker: 'GGBR4',
    name: 'Gerdau S.A.',
    sector: 'Materiais Básicos',
    subsector: 'Siderurgia',
    revenue: 82000, ebit: 14500, ebitMargin: 0.177, eps: 4.5, bvps: 26.0,
    currentRatio: 2.2, netDebt: 12000, totalDebt: 20000, cash: 8000,
    currentAssets: 40000, currentLiabilities: 18000, netFixedAssets: 35000,
    sharesOutstanding: 1800, priceRef: 22.0, marketCapRef: 39600,
    evEbitda: 3.6, evEbitdaSectorMedian: 5.2,
    revenueCAGR5y: 0.09, roeConsistency: 0.07, rdeRatio: 0.005,
    operatingMarginTrend: 0.003, insiderOwnership: 0.38,
    costOfDebt: 0.07, debtWeight: 0.23, revenueGrowthY1to5: 0.05,
    revenueGrowthY6to10: 0.03, ebitMarginTarget: 0.16, capexPctRevenue: 0.08,
    nwcPctRevenue: 0.04, expectedGrowthRate: 0.04, beta: 1.15,
    momentum: 0.04, volatility: 0.32, meanReversionZ: -0.6, volumeAnomaly: 1.0,
    greenblattScore: 78, fisherScore: 50, damodaranScore: 72, quantScore: 52, dcfMOS: 40.0,
    hasDividendHistory20y: true,
    history: makeHistory('GGBR4', 4.5, 0.06, 0.20),
  },
  {
    ticker: 'CYRE3',
    name: 'Cyrela Brazil Realty S.A.',
    sector: 'Construção Civil',
    subsector: 'Incorporação',
    revenue: 5500, ebit: 1100, ebitMargin: 0.200, eps: 2.5, bvps: 22.0,
    currentRatio: 3.2, netDebt: 3000, totalDebt: 5000, cash: 2000,
    currentAssets: 18000, currentLiabilities: 5600, netFixedAssets: 2000,
    sharesOutstanding: 550, priceRef: 22.0, marketCapRef: 12100,
    evEbitda: 14.0, evEbitdaSectorMedian: 12.0,
    revenueCAGR5y: 0.08, roeConsistency: 0.06, rdeRatio: 0.001,
    operatingMarginTrend: 0.004, insiderOwnership: 0.28,
    costOfDebt: 0.12, debtWeight: 0.20, revenueGrowthY1to5: 0.10,
    revenueGrowthY6to10: 0.07, ebitMarginTarget: 0.20, capexPctRevenue: 0.03,
    nwcPctRevenue: 0.08, expectedGrowthRate: 0.08, beta: 1.20,
    momentum: 0.05, volatility: 0.35, meanReversionZ: -0.2, volumeAnomaly: 0.95,
    greenblattScore: 60, fisherScore: 52, damodaranScore: 58, quantScore: 50, dcfMOS: 18.0,
    hasDividendHistory20y: false,
    history: makeHistory('CYRE3', 2.5, 0.06, 0.14),
  },
]
