import type { Quote, HistoricalBar } from '@/types'

const BRAPI_BASE = 'https://brapi.dev/api'
const TOKEN = process.env.BRAPI_TOKEN

function brapiUrl(path: string, params: Record<string, string> = {}): string {
  const url = new URL(`${BRAPI_BASE}${path}`)
  if (TOKEN) url.searchParams.set('token', TOKEN)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return url.toString()
}

export async function fetchQuote(ticker: string): Promise<Quote | null> {
  try {
    const res = await fetch(brapiUrl(`/quote/${ticker}`), { next: { revalidate: 60 } })
    if (!res.ok) return null
    const json = await res.json()
    const r = json.results?.[0]
    if (!r) return null
    return {
      ticker: r.symbol,
      price: r.regularMarketPrice,
      change: r.regularMarketChange,
      changePercent: r.regularMarketChangePercent,
      volume: r.regularMarketVolume,
      marketCap: r.marketCap,
      high52w: r.fiftyTwoWeekHigh,
      low52w: r.fiftyTwoWeekLow,
      openPrice: r.regularMarketOpen,
      previousClose: r.regularMarketPreviousClose,
      timestamp: new Date(r.regularMarketTime * 1000).toISOString(),
    }
  } catch {
    return null
  }
}

export async function fetchQuotes(tickers: string[]): Promise<Quote[]> {
  if (tickers.length === 0) return []
  try {
    const joined = tickers.join(',')
    const res = await fetch(brapiUrl(`/quote/${joined}`), { next: { revalidate: 60 } })
    if (!res.ok) return []
    const json = await res.json()
    return (json.results ?? []).map((r: Record<string, unknown>) => ({
      ticker: r.symbol as string,
      price: r.regularMarketPrice as number,
      change: r.regularMarketChange as number,
      changePercent: r.regularMarketChangePercent as number,
      volume: r.regularMarketVolume as number,
      marketCap: r.marketCap as number,
      high52w: r.fiftyTwoWeekHigh as number,
      low52w: r.fiftyTwoWeekLow as number,
      openPrice: r.regularMarketOpen as number,
      previousClose: r.regularMarketPreviousClose as number,
      timestamp: new Date((r.regularMarketTime as number) * 1000).toISOString(),
    }))
  } catch {
    return []
  }
}

export async function fetchHistorical(
  ticker: string,
  range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' = '1y',
  interval: '1d' | '1wk' | '1mo' = '1d',
): Promise<HistoricalBar[]> {
  try {
    const res = await fetch(
      brapiUrl(`/quote/${ticker}`, { range, interval, fundamental: 'false' }),
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return []
    const json = await res.json()
    const prices = json.results?.[0]?.historicalDataPrice ?? []
    return prices.map((p: Record<string, number>) => ({
      date: new Date(p.date * 1000).toISOString().split('T')[0],
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
      volume: p.volume,
      adjustedClose: p.adjustedClose ?? p.close,
    }))
  } catch {
    return []
  }
}

export async function fetchB3List(): Promise<string[]> {
  try {
    const res = await fetch(brapiUrl('/available'), { next: { revalidate: 86400 } })
    if (!res.ok) return []
    const json = await res.json()
    return json.stocks ?? []
  } catch {
    return []
  }
}
