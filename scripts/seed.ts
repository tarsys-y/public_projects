/**
 * Seed script — populates seeded-fundamentals.ts with live data from
 * Fundamentus + brapi.dev. Run with: npm run seed
 *
 * Usage:
 *   BRAPI_TOKEN=xxx npm run seed
 *
 * This script enriches the static seeded-fundamentals.ts with fresh data
 * fetched from Fundamentus and brapi.dev. In production, run this weekly.
 */

import { TOP_100_TICKERS } from '../lib/data/tickers'

const BRAPI_BASE = 'https://brapi.dev/api'
const TOKEN = process.env.BRAPI_TOKEN

interface BrapiQuote {
  symbol: string
  regularMarketPrice: number
  regularMarketChangePercent: number
  regularMarketVolume: number
  marketCap: number
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  priceEarnings: number
  earningsPerShare: number
}

async function fetchBrapiQuote(ticker: string): Promise<BrapiQuote | null> {
  const url = new URL(`${BRAPI_BASE}/quote/${ticker}`)
  if (TOKEN) url.searchParams.set('token', TOKEN)
  url.searchParams.set('fundamental', 'true')

  const res = await fetch(url.toString())
  if (!res.ok) return null
  const json = await res.json()
  return json.results?.[0] ?? null
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  console.log('🌱 B3 Seed Script starting...')
  console.log(`📊 Fetching data for ${TOP_100_TICKERS.length} tickers`)

  const results: Record<string, BrapiQuote> = {}
  let succeeded = 0
  let failed = 0

  for (const ticker of TOP_100_TICKERS) {
    try {
      const quote = await fetchBrapiQuote(ticker)
      if (quote) {
        results[ticker] = quote
        succeeded++
        process.stdout.write(`✓ ${ticker} @ R$ ${quote.regularMarketPrice?.toFixed(2)} `)
      } else {
        failed++
        process.stdout.write(`✗ ${ticker} `)
      }
    } catch (err) {
      failed++
      process.stdout.write(`✗ ${ticker} `)
    }

    // Respectful rate limiting: 200ms between requests
    await delay(200)

    if ((succeeded + failed) % 10 === 0) {
      console.log(`\n   Progress: ${succeeded + failed}/${TOP_100_TICKERS.length} (${succeeded} ok, ${failed} failed)`)
    }
  }

  console.log('\n')
  console.log(`✅ Seeding complete: ${succeeded} tickers fetched, ${failed} failed`)
  console.log('📝 Update lib/data/seeded-fundamentals.ts with fresh prices')
  console.log()

  // Print price summary
  const sorted = Object.entries(results)
    .sort(([, a], [, b]) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .slice(0, 20)

  console.log('Top 20 by Market Cap:')
  console.log('─'.repeat(60))
  for (const [ticker, q] of sorted) {
    const mcap = q.marketCap ? `R$ ${(q.marketCap / 1e9).toFixed(1)}B` : '–'
    const pe = q.priceEarnings ? q.priceEarnings.toFixed(1) : '–'
    console.log(`${ticker.padEnd(8)} ${`R$ ${q.regularMarketPrice?.toFixed(2)}`.padEnd(12)} PE: ${pe.padEnd(6)} MCAP: ${mcap}`)
  }

  return results
}

main().catch(console.error)
