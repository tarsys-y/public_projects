import type { GrahamAnalysis, FundamentalsHistory } from '@/types'

export function grahamNumber(eps: number, bvps: number): number {
  if (eps <= 0 || bvps <= 0) return 0
  return Math.sqrt(22.5 * eps * bvps)
}

export function grahamIntrinsicValue(
  eps: number,
  growthRate: number,
  aaBondYield: number,
): number {
  if (eps <= 0 || aaBondYield <= 0) return 0
  // Graham formula: V = EPS × (8.5 + 2g) × 4.4 / Y
  return (eps * (8.5 + 2 * growthRate * 100) * 4.4) / (aaBondYield * 100)
}

export function computeGrahamAnalysis(params: {
  ticker: string
  eps: number
  bvps: number
  pe: number
  pb: number
  currentRatio: number
  currentPrice: number
  history: FundamentalsHistory
  hasDividendHistory20y: boolean
  aaBondYield: number
  expectedGrowthRate: number
}): GrahamAnalysis {
  const {
    ticker,
    eps,
    bvps,
    pe,
    pb,
    currentRatio,
    currentPrice,
    history,
    hasDividendHistory20y,
    aaBondYield,
    expectedGrowthRate,
  } = params

  const gn = grahamNumber(eps, bvps)
  const iv = grahamIntrinsicValue(eps, expectedGrowthRate, aaBondYield)
  const mos = iv > 0 ? ((iv - currentPrice) / iv) * 100 : -100

  // Positive earnings 10 years: check last 10 years of EPS
  const eps10y = history.eps.slice(-10)
  const positiveEarnings10y = eps10y.length >= 10 && eps10y.every((e) => e > 0)

  // Earnings growth ≥ 33% over 10 years
  let earningsGrowth33p = false
  if (eps10y.length >= 10) {
    const oldest = eps10y[0]
    const newest = eps10y[eps10y.length - 1]
    earningsGrowth33p = oldest > 0 && (newest - oldest) / oldest >= 0.33
  }

  const peLessThan15 = pe > 0 && pe < 15
  const pbLessThan15 = pb > 0 && pb < 1.5
  const pePbProduct = pe > 0 && pb > 0 && pe * pb < 22.5
  const currentRatioAbove2 = currentRatio >= 2

  const criteria = [
    peLessThan15,
    pbLessThan15,
    pePbProduct,
    currentRatioAbove2,
    positiveEarnings10y,
    hasDividendHistory20y,
    earningsGrowth33p,
  ]
  const passedCriteria = criteria.filter(Boolean).length

  return {
    ticker,
    grahamNumber: gn,
    intrinsicValue: iv,
    marginOfSafety: mos,
    peLessThan15,
    pbLessThan15,
    pePbProduct,
    currentRatioAbove2,
    positiveEarnings10y,
    dividendHistory20y: hasDividendHistory20y,
    earningsGrowth33p,
    passedCriteria,
    totalCriteria: 7,
    grahamScore: (passedCriteria / 7) * 100,
  }
}
