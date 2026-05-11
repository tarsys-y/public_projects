// Portfolio optimizer API — Markowitz Mean-Variance Optimization
// POST /api/optimizer
// Body: { tickers: string[] }
// Returns: OptimizationResult with efficient frontier, Monte Carlo cloud, optimal portfolios

import { NextRequest, NextResponse } from 'next/server'
import { fetchHistorical } from '@/lib/api/yahoo'
import { runOptimization } from '@/lib/calculations/optimizer'
import { fetchCurrentSELIC } from '@/lib/api/bcb'

const BATCH = 10
const DELAY_MS = 200

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const tickers: string[] = body.tickers ?? []

    if (tickers.length < 2) {
      return NextResponse.json({ error: 'Mínimo 2 ativos para otimização' }, { status: 400 })
    }
    if (tickers.length > 25) {
      return NextResponse.json({ error: 'Máximo 25 ativos por otimização' }, { status: 400 })
    }

    // Fetch risk-free rate (SELIC)
    const selicPct = await fetchCurrentSELIC()
    const rf = (selicPct ?? 10.5) / 100  // annualized decimal

    // Fetch 5-year monthly historical data for all tickers
    const historicals: Map<string, Awaited<ReturnType<typeof fetchHistorical>>> = new Map()

    const batches: string[][] = []
    for (let i = 0; i < tickers.length; i += BATCH) {
      batches.push(tickers.slice(i, i + BATCH))
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (ticker) => {
          const bars = await fetchHistorical(ticker, '5y', '1mo')
          if (bars.length >= 12) {  // require at least 1 year of data
            historicals.set(ticker, bars)
          }
        }),
      )
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise((r) => setTimeout(r, DELAY_MS))
      }
    }

    // Filter to tickers with sufficient data
    const validTickers = tickers.filter((t) => historicals.has(t))
    if (validTickers.length < 2) {
      return NextResponse.json({ error: 'Dados históricos insuficientes para os ativos selecionados' }, { status: 400 })
    }

    const historicalArrays = validTickers.map((t) => historicals.get(t)!)

    const result = runOptimization(validTickers, historicalArrays, rf)

    return NextResponse.json({
      data: result,
      riskFreeRate: rf,
      tickersWithData: validTickers,
      tickersWithoutData: tickers.filter((t) => !validTickers.includes(t)),
    })
  } catch (err) {
    console.error('Optimizer error:', err)
    return NextResponse.json({ error: 'Otimização falhou', detail: String(err) }, { status: 500 })
  }
}
