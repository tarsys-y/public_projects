// Yahoo Finance integration for B3 quotes and historical data
// Free, no token required. B3 symbols use the .SA suffix (e.g. VALE3.SA)

import type { Quote, HistoricalBar } from '@/types'

const BASE_V7 = 'https://query1.finance.yahoo.com/v7/finance'
const BASE_V8 = 'https://query1.finance.yahoo.com/v8/finance'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
  'Referer': 'https://finance.yahoo.com/',
}

// Convert B3 ticker to Yahoo Finance symbol
function toYF(ticker: string): string {
  if (ticker.startsWith('^')) return ticker   // indices like ^BVSP
  if (ticker.endsWith('.SA')) return ticker
  return `${ticker}.SA`
}

function fromYF(symbol: string): string {
  return symbol.endsWith('.SA') ? symbol.slice(0, -3) : symbol
}

function mapQuote(ticker: string, r: Record<string, unknown>): Quote {
  return {
    ticker,
    price: (r.regularMarketPrice as number) ?? 0,
    change: (r.regularMarketChange as number) ?? 0,
    changePercent: (r.regularMarketChangePercent as number) ?? 0,
    volume: (r.regularMarketVolume as number) ?? 0,
    marketCap: (r.marketCap as number) ?? 0,
    high52w: (r.fiftyTwoWeekHigh as number) ?? 0,
    low52w: (r.fiftyTwoWeekLow as number) ?? 0,
    openPrice: (r.regularMarketOpen as number) ?? 0,
    previousClose: (r.regularMarketPreviousClose as number) ?? 0,
    timestamp: new Date(((r.regularMarketTime as number) ?? 0) * 1000).toISOString(),
  }
}

export async function fetchQuote(ticker: string): Promise<Quote | null> {
  try {
    const symbol = toYF(ticker)
    const url = `${BASE_V7}/quote?symbols=${symbol}`
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 60 } })
    if (!res.ok) return null
    const json = await res.json()
    const r = json.quoteResponse?.result?.[0]
    if (!r || !r.regularMarketPrice) return null
    return mapQuote(ticker, r)
  } catch {
    return null
  }
}

export async function fetchQuotes(tickers: string[]): Promise<Quote[]> {
  if (!tickers.length) return []
  try {
    // Yahoo supports batching (up to ~1000 symbols per request)
    const symbols = tickers.map(toYF).join(',')
    const url = `${BASE_V7}/quote?symbols=${symbols}`
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 60 } })
    if (!res.ok) return []
    const json = await res.json()
    const results: Record<string, unknown>[] = json.quoteResponse?.result ?? []
    return results
      .filter((r) => r.regularMarketPrice)
      .map((r) => mapQuote(fromYF(r.symbol as string), r))
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
    const symbol = toYF(ticker)
    const url = `${BASE_V8}/chart/${symbol}?interval=${interval}&range=${range}&includeAdjustedClose=true`
    const res = await fetch(url, { headers: HEADERS, next: { revalidate: 3600 } })
    if (!res.ok) return []
    const json = await res.json()
    const result = json.chart?.result?.[0]
    if (!result) return []

    const timestamps: number[] = result.timestamp ?? []
    const q = result.indicators?.quote?.[0] ?? {}
    const adjclose: number[] = result.indicators?.adjclose?.[0]?.adjclose ?? []

    return timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        open: q.open?.[i] ?? 0,
        high: q.high?.[i] ?? 0,
        low: q.low?.[i] ?? 0,
        close: q.close?.[i] ?? 0,
        volume: q.volume?.[i] ?? 0,
        adjustedClose: adjclose[i] ?? q.close?.[i] ?? 0,
      }))
      .filter((b) => b.close > 0)
  } catch {
    return []
  }
}
