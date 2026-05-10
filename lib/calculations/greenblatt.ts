import type { GreenblattAnalysis } from '@/types'

export function computeROC(
  ebit: number,
  currentAssets: number,
  currentLiabilities: number,
  cash: number,
  netFixedAssets: number,
): number {
  // Net Working Capital = Current Assets - Current Liabilities - Excess Cash
  const excessCash = Math.max(0, cash - Math.max(0, currentLiabilities - (currentAssets - cash)))
  const nwc = currentAssets - currentLiabilities - excessCash
  const invested = nwc + netFixedAssets
  if (invested <= 0) return 0
  return ebit / invested
}

export function computeEarningsYield(ebit: number, enterpriseValue: number): number {
  if (enterpriseValue <= 0) return 0
  return ebit / enterpriseValue
}

export function computeEnterpriseValue(
  marketCap: number,
  totalDebt: number,
  minorityInterest: number,
  cash: number,
): number {
  return marketCap + totalDebt + (minorityInterest ?? 0) - cash
}

// Rank and score a universe of stocks using Magic Formula
export function rankMagicFormula(
  stocks: Array<{
    ticker: string
    ebit: number
    currentAssets: number
    currentLiabilities: number
    cash: number
    netFixedAssets: number
    marketCap: number
    totalDebt: number
    minorityInterest: number
  }>,
): GreenblattAnalysis[] {
  const computed = stocks
    .filter((s) => s.ebit > 0 && s.marketCap > 0)
    .map((s) => {
      const ev = computeEnterpriseValue(s.marketCap, s.totalDebt, s.minorityInterest, s.cash)
      const roc = computeROC(s.ebit, s.currentAssets, s.currentLiabilities, s.cash, s.netFixedAssets)
      const ey = computeEarningsYield(s.ebit, ev)
      return { ticker: s.ticker, ebit: s.ebit, ev, roc, ey }
    })

  if (computed.length === 0) return []

  // Sort by ROC descending, assign rank 1..n
  const rocSorted = [...computed].sort((a, b) => b.roc - a.roc)
  const rocRanks = new Map(rocSorted.map((s, i) => [s.ticker, i + 1]))

  // Sort by EY descending, assign rank 1..n
  const eySorted = [...computed].sort((a, b) => b.ey - a.ey)
  const eyRanks = new Map(eySorted.map((s, i) => [s.ticker, i + 1]))

  const n = computed.length

  return computed
    .map((s) => {
      const rocRank = rocRanks.get(s.ticker)!
      const eyRank = eyRanks.get(s.ticker)!
      const combinedRank = rocRank + eyRank
      return {
        ticker: s.ticker,
        ebit: s.ebit,
        netWorkingCapital: 0, // simplified
        netFixedAssets: 0,
        enterpriseValue: s.ev,
        returnOnCapital: s.roc,
        earningsYield: s.ey,
        rocRank,
        eyRank,
        combinedRank,
        greenblattScore: 0, // filled below
      }
    })
    .sort((a, b) => a.combinedRank - b.combinedRank)
    .map((s, i) => ({
      ...s,
      // Percentile score: best combined rank = 100
      greenblattScore: Math.round(((n - i - 1) / (n - 1)) * 100),
    }))
}
