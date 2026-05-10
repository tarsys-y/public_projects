import { NextRequest, NextResponse } from 'next/server'
import { TOP_100_TICKERS } from '@/lib/data/tickers'
import { fetchQuotes } from '@/lib/api/brapi'
import { computeGrahamAnalysis } from '@/lib/calculations/graham'
import { rankMagicFormula } from '@/lib/calculations/greenblatt'
import { computeFusionScore, fusionToDecision } from '@/lib/calculations/fusion'
import type { ScreenerRow, ScreenerFilters } from '@/types'

export const revalidate = 300 // 5 minutes

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filters: ScreenerFilters = {
      maxPE: searchParams.get('maxPE') ? Number(searchParams.get('maxPE')) : undefined,
      maxPB: searchParams.get('maxPB') ? Number(searchParams.get('maxPB')) : undefined,
      minFusionScore: searchParams.get('minFusionScore')
        ? Number(searchParams.get('minFusionScore'))
        : undefined,
      minDCFMOS: searchParams.get('minDCFMOS') ? Number(searchParams.get('minDCFMOS')) : undefined,
      decision: searchParams.get('decision')
        ? (searchParams.get('decision')!.split(',') as ('Buy' | 'Hold' | 'Avoid')[])
        : undefined,
      minAvgDailyVolumeBRL: 1_000_000,
      excludeFinancials: searchParams.get('excludeFinancials') !== 'false',
    }

    // Fetch quotes for all tickers
    const quotes = await fetchQuotes(TOP_100_TICKERS)
    const quoteMap = new Map(quotes.map((q) => [q.ticker, q]))

    // Build screener rows using seeded fundamental data
    const { SEEDED_FUNDAMENTALS } = await import('@/lib/data/seeded-fundamentals')

    // Compute Greenblatt rankings across universe
    const gblUniverse = SEEDED_FUNDAMENTALS
      .filter((f) => f.ebit > 0)
      .map((f) => ({
        ticker: f.ticker,
        ebit: f.ebit,
        currentAssets: f.currentAssets,
        currentLiabilities: f.currentLiabilities,
        cash: f.cash,
        netFixedAssets: f.netFixedAssets,
        marketCap: quoteMap.get(f.ticker)?.marketCap ?? f.marketCapRef,
        totalDebt: f.totalDebt,
        minorityInterest: 0,
      }))

    const gblRanked = rankMagicFormula(gblUniverse)
    const gblMap = new Map(gblRanked.map((g) => [g.ticker, g]))

    const rows: ScreenerRow[] = SEEDED_FUNDAMENTALS
      .map((f) => {
        const quote = quoteMap.get(f.ticker)
        const price = quote?.price ?? f.priceRef
        const marketCap = quote?.marketCap ?? f.marketCapRef
        const gbl = gblMap.get(f.ticker)

        // Graham analysis
        const graham = computeGrahamAnalysis({
          ticker: f.ticker,
          eps: f.eps,
          bvps: f.bvps,
          pe: price > 0 && f.eps > 0 ? price / f.eps : 0,
          pb: f.bvps > 0 ? price / f.bvps : 0,
          currentRatio: f.currentRatio,
          currentPrice: price,
          history: f.history,
          hasDividendHistory20y: f.hasDividendHistory20y,
          aaBondYield: 0.12, // ~IPCA + 6%
          expectedGrowthRate: f.expectedGrowthRate,
        })

        const greenblattScore = gbl?.greenblattScore ?? 50
        const fisherScore = f.fisherScore ?? 50
        const damodaranScore = f.damodaranScore ?? 50
        const quantScore = f.quantScore ?? 50

        const fusionScore = computeFusionScore(
          graham.grahamScore,
          fisherScore,
          greenblattScore,
          damodaranScore,
          quantScore,
        )

        const { decision, confidence } = fusionToDecision(fusionScore, graham.marginOfSafety)
        const avgDailyVolumeBRL = (quote?.volume ?? 0) * price

        const row: ScreenerRow = {
          ticker: f.ticker,
          name: f.name,
          sector: f.sector,
          price,
          marketCap,
          change1d: quote?.changePercent ?? 0,
          pe: graham.peLessThan15 ? price / f.eps : price > 0 && f.eps > 0 ? price / f.eps : 0,
          pb: f.bvps > 0 ? price / f.bvps : 0,
          pePbProduct: (price / f.eps) * (price / f.bvps),
          currentRatio: f.currentRatio,
          grahamNumber: graham.grahamNumber,
          grahamMOS: graham.marginOfSafety,
          grahamScore: graham.grahamScore,
          roc: gbl?.returnOnCapital ?? 0,
          earningsYield: gbl?.earningsYield ?? 0,
          greenblattScore,
          revenueCAGR5y: f.revenueCAGR5y,
          roeConsistency: f.roeConsistency,
          operatingMarginTrend: f.operatingMarginTrend,
          fisherScore,
          dcfMOS: f.dcfMOS,
          evEbitda: f.evEbitda,
          evEbitdaSectorMedian: f.evEbitdaSectorMedian,
          damodaranScore,
          momentum12_1: f.momentum,
          volatility90d: f.volatility,
          beta: f.beta,
          meanReversionZ: f.meanReversionZ,
          volumeAnomaly: f.volumeAnomaly,
          quantScore,
          fusionScore: Math.round(fusionScore * 10) / 10,
          decision,
          confidence,
          avgDailyVolumeBRL,
          meetsLiquidityFilter: avgDailyVolumeBRL >= 1_000_000,
        }
        return row
      })
      .filter((r) => applyFilters(r, filters))

    return NextResponse.json({ data: rows, cached: false, total: rows.length })
  } catch (err) {
    console.error('Screener error:', err)
    return NextResponse.json({ error: 'Failed to build screener' }, { status: 500 })
  }
}

function applyFilters(row: ScreenerRow, filters: ScreenerFilters): boolean {
  if (filters.minAvgDailyVolumeBRL && row.avgDailyVolumeBRL < filters.minAvgDailyVolumeBRL) {
    return false
  }
  if (filters.maxPE && row.pe > 0 && row.pe > filters.maxPE) return false
  if (filters.maxPB && row.pb > 0 && row.pb > filters.maxPB) return false
  if (filters.minFusionScore && row.fusionScore < filters.minFusionScore) return false
  if (filters.minDCFMOS && row.dcfMOS < filters.minDCFMOS) return false
  if (filters.decision && !filters.decision.includes(row.decision)) return false
  if (filters.sectors && filters.sectors.length > 0 && !filters.sectors.includes(row.sector)) {
    return false
  }
  if (filters.excludeFinancials && ['Financeiro', 'Bancos', 'Seguros'].includes(row.sector)) {
    return false
  }
  return true
}
