// TypeScript backtester — replaces the non-existent Python/FastAPI service.
// Fetches monthly historical prices from Yahoo Finance and runs strategy simulations.

import { NextRequest, NextResponse } from 'next/server'
import { fetchHistorical } from '@/lib/api/yahoo'
import {
  computeLogReturns, computeSharpe, computeSortino,
  computeMaxDrawdown, computePortfolioReturns, computeBeta,
} from '@/lib/calculations/quant'
import type {
  BacktestConfig, BacktestResult, BacktestTrade, BacktestRebalance,
  TimeSeriesPoint,
} from '@/types'

// ─── Strategy scoring (from seeded fundamentals — static snapshot) ────────────

async function loadScores(): Promise<Map<string, { greenblatt: number; graham: number; fusion: number; ticker: string }>> {
  const { SEEDED_FUNDAMENTALS } = await import('@/lib/data/seeded-fundamentals')
  const map = new Map<string, { ticker: string; greenblatt: number; graham: number; fusion: number }>()
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

function selectTickers(
  strategy: BacktestConfig['strategy'],
  scores: Map<string, { ticker: string; greenblatt: number; graham: number; fusion: number }>,
  topN: number,
): string[] {
  const entries = [...scores.values()]
  switch (strategy) {
    case 'magic_formula':
      return entries
        .sort((a, b) => b.greenblatt - a.greenblatt)
        .slice(0, topN)
        .map((e) => e.ticker)
    case 'graham_defensive':
      return entries
        .filter((e) => e.graham >= 65)
        .sort((a, b) => b.graham - a.graham)
        .slice(0, topN)
        .map((e) => e.ticker)
    case 'fusion_top_decile':
    default:
      return entries
        .sort((a, b) => b.fusion - a.fusion)
        .slice(0, topN)
        .map((e) => e.ticker)
  }
}

// ─── Price matrix helpers ─────────────────────────────────────────────────────

function buildPriceMap(
  tickers: string[],
  historicals: Map<string, { date: string; close: number }[]>,
): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>()
  for (const ticker of tickers) {
    const hist = historicals.get(ticker) ?? []
    const byDate = new Map(hist.map((b) => [b.date, b.close]))
    map.set(ticker, byDate)
  }
  return map
}

function getAllDates(priceMap: Map<string, Map<string, number>>, start: string, end: string): string[] {
  const dateSet = new Set<string>()
  for (const byDate of priceMap.values()) {
    for (const d of byDate.keys()) {
      if (d >= start && d <= end) dateSet.add(d)
    }
  }
  return [...dateSet].sort()
}

function rebalanceInterval(period: BacktestConfig['rebalancePeriod'], dateIdx: number): boolean {
  switch (period) {
    case 'monthly': return true
    case 'quarterly': return dateIdx % 3 === 0
    case 'annually': return dateIdx % 12 === 0
  }
}

// ─── CDI benchmark (monthly rate from SELIC approximation) ───────────────────

function monthlyReturnFromCAGR(cagr: number): number {
  return Math.pow(1 + cagr, 1 / 12) - 1
}

// ─── Main backtest engine ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const config: BacktestConfig = await req.json()
    const { strategy, startDate, endDate, rebalancePeriod, topN, initialCapitalBRL, benchmark } = config

    const scores = await loadScores()
    const allTickers = [...scores.keys()]

    // Fetch historical monthly prices in batches (respect Yahoo rate limits)
    const BATCH = 15
    const DELAY_MS = 250
    const historicals = new Map<string, { date: string; close: number }[]>()

    const batches: string[][] = []
    for (let i = 0; i < allTickers.length; i += BATCH) {
      batches.push(allTickers.slice(i, i + BATCH))
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (ticker) => {
          const bars = await fetchHistorical(ticker, '5y', '1mo')
          if (bars.length) {
            historicals.set(ticker, bars.map((b) => ({ date: b.date, close: b.adjustedClose || b.close })))
          }
        }),
      )
      await new Promise((r) => setTimeout(r, DELAY_MS))
    }

    // Fetch benchmark
    const ibovBars = await fetchHistorical('^BVSP', '5y', '1mo')
    const ibovByDate = new Map(ibovBars.map((b) => [b.date, b.close]))

    const priceMap = buildPriceMap(allTickers, historicals)
    const dates = getAllDates(priceMap, startDate, endDate)

    if (dates.length < 3) {
      return NextResponse.json({ error: 'Insufficient historical data for the selected period' }, { status: 400 })
    }

    // ── Simulation ──────────────────────────────────────────────────────────

    let portfolio: string[] = selectTickers(strategy, scores, topN)
    let capital = initialCapitalBRL
    const trades: BacktestTrade[] = []
    const rebalances: BacktestRebalance[] = []
    const portfolioValues: TimeSeriesPoint[] = []
    const benchmarkValues: TimeSeriesPoint[] = []
    let benchmarkCapital = initialCapitalBRL
    const cdiMonthlyRate = monthlyReturnFromCAGR(0.105)  // approx CDI

    // Track shares for each holding (equal-weight allocation)
    let shares: Record<string, number> = {}
    let prevPortfolio: string[] = []

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i]
      const doRebalance = i === 0 || rebalanceInterval(rebalancePeriod, i)

      if (doRebalance) {
        // Get price snapshot on this date
        const getPriceAt = (ticker: string): number => {
          const byDate = priceMap.get(ticker)
          // Look back up to 3 months for the closest price
          for (let k = i; k >= Math.max(0, i - 3); k--) {
            const p = byDate?.get(dates[k])
            if (p && p > 0) return p
          }
          return 0
        }

        // Liquidate existing positions
        if (i > 0) {
          for (const [ticker, qty] of Object.entries(shares)) {
            const price = getPriceAt(ticker)
            if (price > 0 && qty > 0) {
              capital += qty * price
              trades.push({ date, ticker, action: 'Sell', price, shares: qty, valueBRL: qty * price, reason: 'Rebalance' })
            }
          }
        }

        // Select new portfolio
        const newPortfolio = selectTickers(strategy, scores, topN).filter((t) => {
          const p = getPriceAt(t)
          return p > 0
        })

        const alloc = capital / Math.max(1, newPortfolio.length)
        shares = {}
        for (const ticker of newPortfolio) {
          const price = getPriceAt(ticker)
          if (price > 0) {
            const qty = alloc / price
            shares[ticker] = qty
            trades.push({ date, ticker, action: 'Buy', price, shares: qty, valueBRL: qty * price, reason: i === 0 ? 'Initial' : 'Rebalance' })
          }
        }
        capital = 0  // fully invested

        const added = newPortfolio.filter((t) => !prevPortfolio.includes(t))
        const removed = prevPortfolio.filter((t) => !newPortfolio.includes(t))
        rebalances.push({ date, portfolio: newPortfolio, added, removed })
        prevPortfolio = newPortfolio
        portfolio = newPortfolio
      }

      // Mark-to-market portfolio value
      let portfolioValue = capital
      for (const [ticker, qty] of Object.entries(shares)) {
        const byDate = priceMap.get(ticker)
        const price = byDate?.get(date) ?? 0
        if (price > 0) portfolioValue += qty * price
      }
      portfolioValues.push({ date, value: portfolioValue })

      // Benchmark value
      if (benchmark === 'CDI') {
        benchmarkCapital *= (1 + cdiMonthlyRate)
        benchmarkValues.push({ date, value: benchmarkCapital })
      } else {
        const ibovPrice = ibovByDate.get(date)
        if (i === 0) {
          benchmarkValues.push({ date, value: initialCapitalBRL })
        } else {
          const prevIbov = ibovByDate.get(dates[i - 1])
          const ibovRet = ibovPrice && prevIbov ? ibovPrice / prevIbov - 1 : 0
          benchmarkCapital *= (1 + ibovRet)
          benchmarkValues.push({ date, value: benchmarkCapital })
        }
      }
    }

    // ── Performance metrics ──────────────────────────────────────────────────

    const portPrices = portfolioValues.map((p) => p.value)
    const benchPrices = benchmarkValues.map((p) => p.value)

    const years = dates.length / 12
    const finalValue = portPrices[portPrices.length - 1]
    const cagr = years > 0 ? Math.pow(finalValue / initialCapitalBRL, 1 / years) - 1 : 0
    const totalReturn = finalValue / initialCapitalBRL - 1

    const portReturns = computeLogReturns(portPrices)
    const benchReturns = computeLogReturns(benchPrices)
    const riskFreeMonthly = Math.log(1 + cdiMonthlyRate)

    const sharpeRatio = computeSharpe(portReturns, riskFreeMonthly)
    const sortinoRatio = computeSortino(portReturns, riskFreeMonthly)
    const maxDrawdown = computeMaxDrawdown(portPrices)
    const calmarRatio = maxDrawdown > 0 ? cagr / maxDrawdown : 0

    const betaVsBench = computeBeta(portPrices, benchPrices)
    const benchCAGR = years > 0 ? Math.pow(benchPrices[benchPrices.length - 1] / initialCapitalBRL, 1 / years) - 1 : 0
    const benchSharpe = computeSharpe(benchReturns, riskFreeMonthly)
    const benchMaxDD = computeMaxDrawdown(benchPrices)
    const alpha = cagr - (betaVsBench * benchCAGR)

    // Tracking error and information ratio
    const activeReturns = portReturns.map((r, i) => r - (benchReturns[i] ?? 0))
    const trackingError = Math.sqrt(activeReturns.reduce((s, r) => s + r * r, 0) / Math.max(1, activeReturns.length)) * Math.sqrt(12)
    const informationRatio = trackingError > 0 ? alpha / trackingError : 0

    // Hit rate (% of monthly periods with positive active return)
    const hitRate = activeReturns.length > 0
      ? activeReturns.filter((r) => r > 0).length / activeReturns.length
      : 0

    const wins = portReturns.filter((r) => r > 0)
    const losses = portReturns.filter((r) => r < 0)
    const avgWin = wins.length ? wins.reduce((s, r) => s + r, 0) / wins.length : 0
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, r) => s + r, 0) / losses.length) : 0
    const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0

    // Drawdown series
    let peak = portPrices[0]
    const drawdownSeries: TimeSeriesPoint[] = portPrices.map((v, i) => {
      if (v > peak) peak = v
      return { date: portfolioValues[i].date, value: peak > 0 ? (v - peak) / peak : 0 }
    })

    const result: BacktestResult = {
      config,
      finalValueBRL: finalValue,
      cagr,
      totalReturn,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      calmarRatio,
      hitRate,
      avgWin,
      avgLoss,
      profitFactor,
      benchmarkCAGR: benchCAGR,
      benchmarkSharpe: benchSharpe,
      benchmarkMaxDD: benchMaxDD,
      alpha,
      beta: betaVsBench,
      informationRatio,
      portfolioValues,
      benchmarkValues,
      drawdownSeries,
      trades,
      rebalances,
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Backtest error:', err)
    return NextResponse.json({ error: 'Backtest failed', detail: String(err) }, { status: 500 })
  }
}
