import { NextRequest, NextResponse } from 'next/server'
import { fetchHistorical } from '@/lib/api/yahoo'
import {
  computeLogReturns, computeSharpe, computeSortino,
  computeMaxDrawdown, computeBeta,
} from '@/lib/calculations/quant'
import type { BacktestConfig, BacktestResult, TimeSeriesPoint } from '@/types'

type Scores = Map<string, { ticker: string; greenblatt: number; graham: number; fusion: number }>

async function loadScores(): Promise<Scores> {
  const { SEEDED_FUNDAMENTALS } = await import('@/lib/data/seeded-fundamentals')
  const map: Scores = new Map()
  for (const f of SEEDED_FUNDAMENTALS) {
    map.set(f.ticker, {
      ticker: f.ticker,
      greenblatt: f.greenblattScore,
      graham: f.fisherScore,
      fusion: f.greenblattScore * 0.3 + f.fisherScore * 0.3 + f.damodaranScore * 0.4,
    })
  }
  return map
}

function selectTickers(strategy: BacktestConfig['strategy'], scores: Scores, topN: number): string[] {
  const entries = [...scores.values()]
  switch (strategy) {
    case 'magic_formula':
      return entries.sort((a, b) => b.greenblatt - a.greenblatt).slice(0, topN).map((e) => e.ticker)
    case 'graham_defensive':
      return entries.filter((e) => e.graham >= 65).sort((a, b) => b.graham - a.graham).slice(0, topN).map((e) => e.ticker)
    case 'fusion_top_decile':
    default:
      return entries.sort((a, b) => b.fusion - a.fusion).slice(0, topN).map((e) => e.ticker)
  }
}

function rebalanceInterval(period: BacktestConfig['rebalancePeriod'], idx: number): boolean {
  switch (period) {
    case 'monthly': return true
    case 'quarterly': return idx % 3 === 0
    case 'annually': return idx % 12 === 0
  }
}

function runSimulation(
  strategy: BacktestConfig['strategy'],
  scores: Scores,
  priceMap: Map<string, Map<string, number>>,
  dates: string[],
  ibovByDate: Map<string, number>,
  config: BacktestConfig,
): BacktestResult {
  const { rebalancePeriod, topN, initialCapitalBRL, benchmark } = config
  const cdiMonthlyRate = Math.pow(1.105, 1 / 12) - 1

  let capital = initialCapitalBRL
  let benchmarkCapital = initialCapitalBRL
  const portfolioValues: TimeSeriesPoint[] = []
  const benchmarkValues: TimeSeriesPoint[] = []
  let shares: Record<string, number> = {}
  let prevPortfolio: string[] = []

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i]
    const doRebalance = i === 0 || rebalanceInterval(rebalancePeriod, i)

    if (doRebalance) {
      const getPriceAt = (ticker: string): number => {
        const byDate = priceMap.get(ticker)
        for (let k = i; k >= Math.max(0, i - 3); k--) {
          const p = byDate?.get(dates[k])
          if (p && p > 0) return p
        }
        return 0
      }

      if (i > 0) {
        for (const [ticker, qty] of Object.entries(shares)) {
          const price = getPriceAt(ticker)
          if (price > 0 && qty > 0) capital += qty * price
        }
      }

      const newPortfolio = selectTickers(strategy, scores, topN).filter((t) => getPriceAt(t) > 0)
      const alloc = capital / Math.max(1, newPortfolio.length)
      shares = {}
      for (const ticker of newPortfolio) {
        const price = getPriceAt(ticker)
        if (price > 0) shares[ticker] = alloc / price
      }
      capital = 0
      prevPortfolio = newPortfolio
    }

    let portfolioValue = capital
    for (const [ticker, qty] of Object.entries(shares)) {
      const price = priceMap.get(ticker)?.get(date) ?? 0
      if (price > 0) portfolioValue += qty * price
    }
    portfolioValues.push({ date, value: portfolioValue })

    if (benchmark === 'CDI') {
      benchmarkCapital *= (1 + cdiMonthlyRate)
      benchmarkValues.push({ date, value: benchmarkCapital })
    } else {
      if (i === 0) {
        benchmarkValues.push({ date, value: initialCapitalBRL })
      } else {
        const ibovPrice = ibovByDate.get(date)
        const prevIbov = ibovByDate.get(dates[i - 1])
        const ibovRet = ibovPrice && prevIbov ? ibovPrice / prevIbov - 1 : 0
        benchmarkCapital *= (1 + ibovRet)
        benchmarkValues.push({ date, value: benchmarkCapital })
      }
    }
  }

  // Metrics
  const portPrices = portfolioValues.map((p) => p.value)
  const benchPrices = benchmarkValues.map((p) => p.value)
  const years = dates.length / 12
  const finalValue = portPrices[portPrices.length - 1]
  const cagr = years > 0 ? Math.pow(finalValue / initialCapitalBRL, 1 / years) - 1 : 0
  const totalReturn = finalValue / initialCapitalBRL - 1
  const riskFreeMonthly = Math.log(1 + cdiMonthlyRate)
  const portReturns = computeLogReturns(portPrices)
  const benchReturns = computeLogReturns(benchPrices)
  const sharpeRatio = computeSharpe(portReturns, riskFreeMonthly)
  const sortinoRatio = computeSortino(portReturns, riskFreeMonthly)
  const maxDrawdown = computeMaxDrawdown(portPrices)
  const calmarRatio = maxDrawdown > 0 ? cagr / maxDrawdown : 0
  const betaVsBench = computeBeta(portPrices, benchPrices)
  const benchCAGR = years > 0 ? Math.pow(benchPrices[benchPrices.length - 1] / initialCapitalBRL, 1 / years) - 1 : 0
  const benchSharpe = computeSharpe(benchReturns, riskFreeMonthly)
  const benchMaxDD = computeMaxDrawdown(benchPrices)
  const alpha = cagr - betaVsBench * benchCAGR
  const activeReturns = portReturns.map((r, i) => r - (benchReturns[i] ?? 0))
  const trackingError = Math.sqrt(activeReturns.reduce((s, r) => s + r * r, 0) / Math.max(1, activeReturns.length)) * Math.sqrt(12)
  const informationRatio = trackingError > 0 ? alpha / trackingError : 0
  const hitRate = activeReturns.length > 0 ? activeReturns.filter((r) => r > 0).length / activeReturns.length : 0
  const wins = portReturns.filter((r) => r > 0)
  const losses = portReturns.filter((r) => r < 0)
  const avgWin = wins.length ? wins.reduce((s, r) => s + r, 0) / wins.length : 0
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, r) => s + r, 0) / losses.length) : 0
  const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0
  let peak = portPrices[0]
  const drawdownSeries: TimeSeriesPoint[] = portPrices.map((v, i) => {
    if (v > peak) peak = v
    return { date: portfolioValues[i].date, value: peak > 0 ? (v - peak) / peak : 0 }
  })

  return {
    config: { ...config, strategy },
    finalValueBRL: finalValue,
    cagr, totalReturn, sharpeRatio, sortinoRatio, maxDrawdown, calmarRatio,
    hitRate, avgWin, avgLoss, profitFactor,
    benchmarkCAGR: benchCAGR, benchmarkSharpe: benchSharpe, benchmarkMaxDD: benchMaxDD,
    alpha, beta: betaVsBench, informationRatio,
    portfolioValues, benchmarkValues, drawdownSeries,
    trades: [], rebalances: [],
  }
}

export async function POST(req: NextRequest) {
  try {
    const config: Omit<BacktestConfig, 'strategy'> = await req.json()
    const { startDate, endDate } = config

    const scores = await loadScores()
    const allTickers = [...scores.keys()]

    // Fetch prices ONCE for all tickers
    const BATCH = 15
    const historicals = new Map<string, { date: string; close: number }[]>()
    for (let i = 0; i < allTickers.length; i += BATCH) {
      await Promise.all(
        allTickers.slice(i, i + BATCH).map(async (ticker) => {
          const bars = await fetchHistorical(ticker, '5y', '1mo')
          if (bars.length) historicals.set(ticker, bars.map((b) => ({ date: b.date, close: b.adjustedClose || b.close })))
        }),
      )
      await new Promise((r) => setTimeout(r, 250))
    }

    const ibovBars = await fetchHistorical('^BVSP', '5y', '1mo')
    const ibovByDate = new Map(ibovBars.map((b) => [b.date, b.close]))

    const priceMap = new Map<string, Map<string, number>>()
    for (const ticker of allTickers) {
      const hist = historicals.get(ticker) ?? []
      priceMap.set(ticker, new Map(hist.map((b) => [b.date, b.close])))
    }

    const dateSet = new Set<string>()
    for (const byDate of priceMap.values()) {
      for (const d of byDate.keys()) {
        if (d >= startDate && d <= endDate) dateSet.add(d)
      }
    }
    const dates = [...dateSet].sort()

    if (dates.length < 3) {
      return NextResponse.json({ error: 'Insufficient historical data' }, { status: 400 })
    }

    const strategies: BacktestConfig['strategy'][] = ['magic_formula', 'graham_defensive', 'fusion_top_decile']
    const results = strategies.map((strategy) =>
      runSimulation(strategy, scores, priceMap, dates, ibovByDate, { ...config, strategy } as BacktestConfig)
    )

    return NextResponse.json({ results, benchmark: { values: [...ibovByDate.entries()].filter(([d]) => d >= startDate && d <= endDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value })) } })
  } catch (err) {
    console.error('Compare error:', err)
    return NextResponse.json({ error: 'Comparison failed', detail: String(err) }, { status: 500 })
  }
}
