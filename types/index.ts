// ─── Core Stock Types ───────────────────────────────────────────────────────

export interface Stock {
  ticker: string
  name: string
  sector: string
  subsector: string
  segment: string
  exchange: 'B3'
  currency: 'BRL'
  listingType: 'ON' | 'PN' | 'UNT' | 'DR3' | string
}

export interface Quote {
  ticker: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  high52w: number
  low52w: number
  openPrice: number
  previousClose: number
  timestamp: string
}

export interface HistoricalBar {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  adjustedClose: number
}

// ─── Fundamentals ───────────────────────────────────────────────────────────

export interface Fundamentals {
  ticker: string
  // Income Statement
  revenue: number
  revenueGrowthYoY: number
  grossProfit: number
  grossMargin: number
  ebit: number
  ebitMargin: number
  ebitda: number
  ebitdaMargin: number
  netIncome: number
  netMargin: number
  eps: number
  epsDiluted: number
  // Balance Sheet
  totalAssets: number
  currentAssets: number
  cash: number
  totalLiabilities: number
  currentLiabilities: number
  totalDebt: number
  netDebt: number
  equity: number
  bookValuePerShare: number
  // Cash Flow
  operatingCashFlow: number
  capex: number
  freeCashFlow: number
  // Per Share
  dividendPerShare: number
  jcpPerShare: number
  // Ratios
  pe: number
  pb: number
  ps: number
  ev: number
  evEbitda: number
  roe: number
  roa: number
  roic: number
  debtToEquity: number
  currentRatio: number
  // Time
  fiscalYear: number
  reportDate: string
}

export interface FundamentalsHistory {
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

// ─── Graham Analysis ─────────────────────────────────────────────────────────

export interface GrahamAnalysis {
  ticker: string
  grahamNumber: number
  intrinsicValue: number
  marginOfSafety: number
  // Checklist
  peLessThan15: boolean
  pbLessThan15: boolean
  pePbProduct: boolean
  currentRatioAbove2: boolean
  positiveEarnings10y: boolean
  dividendHistory20y: boolean
  earningsGrowth33p: boolean
  passedCriteria: number
  totalCriteria: number
  grahamScore: number // 0-100
}

// ─── Greenblatt Magic Formula ────────────────────────────────────────────────

export interface GreenblattAnalysis {
  ticker: string
  ebit: number
  netWorkingCapital: number
  netFixedAssets: number
  enterpriseValue: number
  returnOnCapital: number
  earningsYield: number
  rocRank: number
  eyRank: number
  combinedRank: number
  greenblattScore: number // 0-100 percentile
}

// ─── Fisher Quality ──────────────────────────────────────────────────────────

export interface FisherChecklist {
  ticker: string
  // Auto-populated from data
  revenueCAGR5y: number
  revenueCAGR3y: number
  roeConsistency: number // lower StdDev = better
  rdeRatio: number
  operatingMarginTrend: number // slope
  insiderOwnership: number
  grossMarginTrend: number
  // User-filled qualitative (null = not yet answered)
  marketPotential: boolean | null
  productPipelineStrength: boolean | null
  rdeEffectiveness: boolean | null
  salesOrganization: boolean | null
  worthwhileProfitMargin: boolean | null
  marginImprovementPlan: boolean | null
  laborRelations: boolean | null
  executiveRelations: boolean | null
  managementDepth: boolean | null
  costControls: boolean | null
  industryPosition: boolean | null
  longRangeOutlook: boolean | null
  noDilutionRisk: boolean | null
  managementTransparency: boolean | null
  managementIntegrity: boolean | null
  // Scores
  autoScore: number
  qualitativeScore: number | null
  fisherScore: number // 0-100
  scuttlebuttNotes: string
}

// ─── Damodaran DCF ───────────────────────────────────────────────────────────

export interface DamodaranInputs {
  ticker: string
  // WACC inputs
  riskFreeRate: number    // SELIC
  beta: number
  erp: number             // Equity Risk Premium (US)
  countryRiskPremium: number // EMBI+
  costOfDebt: number
  taxRate: number         // 34% Brazil
  debtWeight: number
  equityWeight: number
  // DCF inputs
  revenueGrowthY1to5: number
  revenueGrowthY6to10: number
  terminalGrowthRate: number
  ebitMarginTarget: number
  capexPctRevenue: number
  nwcPctRevenue: number
  projectionYears: number
  // Computed
  wacc: number
  costOfEquity: number
}

export interface DamodaranAnalysis {
  ticker: string
  inputs: DamodaranInputs
  projections: DCFProjection[]
  terminalValue: number
  pvProjections: number
  pvTerminalValue: number
  enterpriseValue: number
  netDebt: number
  intrinsicValue: number
  sharesOutstanding: number
  intrinsicValuePerShare: number
  currentPrice: number
  marginOfSafety: number
  damodaranScore: number // 0-100
  sensitivityTable: SensitivityTable
}

export interface DCFProjection {
  year: number
  revenue: number
  ebit: number
  nopat: number
  reinvestment: number
  fcff: number
  discountFactor: number
  pvFCFF: number
}

export interface SensitivityTable {
  waccValues: number[]
  terminalGrowthValues: number[]
  intrinsicValues: number[][]
}

// ─── Quantitative Signals ────────────────────────────────────────────────────

export interface QuantAnalysis {
  ticker: string
  // Momentum
  momentum12_1: number
  momentumZScore: number
  // Mean reversion
  ma200d: number
  meanReversionZScore: number
  priceVsMa200pct: number
  // Volatility
  volatility90d: number
  volatilityRegime: 'low' | 'normal' | 'high'
  // Beta
  beta: number
  rollingBeta63d: number
  // Volume
  volumeAnomaly: number
  relativeVolume: number
  // Composite
  quantScore: number // 0-100
}

// ─── Fusion Score ─────────────────────────────────────────────────────────────

export interface FusionWeights {
  graham: number
  fisher: number
  greenblatt: number
  damodaran: number
  quant: number
}

export const DEFAULT_FUSION_WEIGHTS: FusionWeights = {
  graham: 0.20,
  fisher: 0.20,
  greenblatt: 0.20,
  damodaran: 0.25,
  quant: 0.15,
}

export interface FusionAnalysis {
  ticker: string
  grahamScore: number
  fisherScore: number
  greenblattScore: number
  damodaranScore: number
  quantScore: number
  fusionScore: number
  decision: 'Buy' | 'Hold' | 'Avoid'
  confidence: number // 0-100
  weights: FusionWeights
  // Decision Card
  bullCase: ScenarioCase
  baseCase: ScenarioCase
  bearCase: ScenarioCase
  expectedValue: number
}

export interface ScenarioCase {
  label: 'Bull' | 'Base' | 'Bear'
  probability: number
  targetPrice: number
  returnPct: number
  rationale: string
}

// ─── Screener Row ─────────────────────────────────────────────────────────────

export interface ScreenerRow {
  ticker: string
  name: string
  sector: string
  price: number
  marketCap: number
  change1d: number
  // Graham
  pe: number
  pb: number
  pePbProduct: number
  currentRatio: number
  grahamNumber: number
  grahamMOS: number
  grahamScore: number
  // Greenblatt
  roc: number
  earningsYield: number
  greenblattScore: number
  // Fisher
  revenueCAGR5y: number
  roeConsistency: number
  operatingMarginTrend: number
  fisherScore: number
  // Damodaran
  dcfMOS: number
  evEbitda: number
  evEbitdaSectorMedian: number
  damodaranScore: number
  // Quant
  momentum12_1: number
  volatility90d: number
  beta: number
  meanReversionZ: number
  volumeAnomaly: number
  quantScore: number
  // Fusion
  fusionScore: number
  decision: 'Buy' | 'Hold' | 'Avoid'
  confidence: number
  // Liquidity
  avgDailyVolumeBRL: number
  meetsLiquidityFilter: boolean
}

// ─── Macro Data ───────────────────────────────────────────────────────────────

export interface MacroData {
  selic: number
  selicChange30d: number
  ipca: number
  ipcaChange30d: number
  usdBrl: number
  usdBrlChange30d: number
  ibov: number
  ibovChange30d: number
  ibovChangeYTD: number
  smallCaps: number
  smallCapsChange30d: number
  brBond10y: number
  embiPlus: number
  timestamp: string
  // Sparkline data (last 30 values)
  selicHistory: number[]
  ipcaHistory: number[]
  usdBrlHistory: number[]
  ibovHistory: number[]
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

export interface Position {
  id: string
  ticker: string
  shares: number
  avgCostBRL: number
  entryDate: string
  notes: string
}

export interface PortfolioSnapshot {
  positions: PositionWithMetrics[]
  totalValueBRL: number
  totalCostBRL: number
  totalGainLossBRL: number
  totalGainLossPct: number
  weightedFusionScore: number
  portfolioBeta: number
  sharpeRatio: number
  maxDrawdown: number
  sortinoRatio: number
  sectorExposure: Record<string, number>
  factorExposure: FactorExposure
}

export interface PositionWithMetrics extends Position {
  currentPrice: number
  marketValueBRL: number
  gainLossBRL: number
  gainLossPct: number
  weight: number
  fusionScore: number
  beta: number
  sector: string
}

export interface FactorExposure {
  value: number
  quality: number
  momentum: number
  lowVolatility: number
  size: number
}

// ─── Decision Journal ─────────────────────────────────────────────────────────

export interface DecisionEntry {
  id: string
  timestamp: string
  ticker: string
  action: 'Buy' | 'Sell' | 'Hold' | 'Watch'
  priceAtDecision: number
  rationale: string
  confidence: number // 1-10
  expectedOutcome: string
  targetPrice: number
  targetDate: string
  keyAssumptions: string[]
  killSwitchConditions: string[]
  fusionScoreAtDecision: number
  // Filled in retrospectively
  reviewed: boolean
  reviewDate?: string
  actualOutcome?: string
  actualPrice?: number
  decisionQualityRating?: number // 1-10
  lessonLearned?: string
  wasResultingGood?: boolean
}

// ─── Watchlist & Alerts ───────────────────────────────────────────────────────

export interface WatchlistItem {
  id: string
  ticker: string
  addedAt: string
  notes: string
  alerts: Alert[]
}

export interface Alert {
  id: string
  ticker: string
  type: 'price_below' | 'price_above' | 'fusion_change' | 'mf_rank_improve' | 'dcf_mos'
  threshold: number
  message: string
  triggered: boolean
  triggeredAt?: string
  active: boolean
}

// ─── Backtester ───────────────────────────────────────────────────────────────

export interface BacktestConfig {
  strategy: 'magic_formula' | 'graham_defensive' | 'fusion_top_decile' | 'custom'
  startDate: string
  endDate: string
  rebalancePeriod: 'monthly' | 'quarterly' | 'annually'
  topN: number
  initialCapitalBRL: number
  benchmark: 'IBOV' | 'CDI' | 'IBVX'
}

export interface BacktestResult {
  config: BacktestConfig
  // Performance
  finalValueBRL: number
  cagr: number
  totalReturn: number
  sharpeRatio: number
  sortinoRatio: number
  maxDrawdown: number
  calmarRatio: number
  hitRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  // Benchmark comparison
  benchmarkCAGR: number
  benchmarkSharpe: number
  benchmarkMaxDD: number
  alpha: number
  beta: number
  informationRatio: number
  // Time series
  portfolioValues: TimeSeriesPoint[]
  benchmarkValues: TimeSeriesPoint[]
  drawdownSeries: TimeSeriesPoint[]
  // Trades
  trades: BacktestTrade[]
  rebalances: BacktestRebalance[]
}

export interface TimeSeriesPoint {
  date: string
  value: number
}

export interface BacktestTrade {
  date: string
  ticker: string
  action: 'Buy' | 'Sell'
  price: number
  shares: number
  valueBRL: number
  reason: string
}

export interface BacktestRebalance {
  date: string
  portfolio: string[]
  removed: string[]
  added: string[]
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  cached: boolean
  cachedAt?: string
  error?: string
}

export type ApiError = {
  message: string
  code: string
  statusCode: number
}

// ─── Filter / Sort ────────────────────────────────────────────────────────────

export interface ScreenerFilters {
  // Graham filters
  maxPE?: number
  maxPB?: number
  minCurrentRatio?: number
  minGrahamScore?: number
  // Greenblatt
  minGreenblattScore?: number
  // Fisher
  minFisherScore?: number
  minRevenueCAGR?: number
  // Damodaran
  minDCFMOS?: number
  // Quant
  minMomentum?: number
  maxVolatility?: number
  // Fusion
  minFusionScore?: number
  decision?: ('Buy' | 'Hold' | 'Avoid')[]
  // Liquidity
  minAvgDailyVolumeBRL?: number
  // Sector
  sectors?: string[]
  // Custom
  excludeFinancials?: boolean
  excludeUtilities?: boolean
}

export type SortField = keyof ScreenerRow
export type SortDirection = 'asc' | 'desc'

export interface ScreenerSort {
  field: SortField
  direction: SortDirection
}
