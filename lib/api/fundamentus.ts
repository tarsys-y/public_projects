// Fundamentus.com.br scraper — respectful rate limiting
// Falls back to cached/seeded data if scraping fails

import type { Fundamentals } from '@/types'

const FUNDAMENTUS_BASE = 'https://www.fundamentus.com.br'

export async function fetchFundamentus(ticker: string): Promise<Partial<Fundamentals> | null> {
  try {
    const res = await fetch(`${FUNDAMENTUS_BASE}/detalhes.php?papel=${ticker}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InvestmentDashboard/1.0)',
        Accept: 'text/html',
      },
      next: { revalidate: 86400 }, // Cache 24h
    })
    if (!res.ok) return null
    const html = await res.text()
    return parseFundamentusHtml(html, ticker)
  } catch {
    return null
  }
}

function parseFundamentusHtml(html: string, ticker: string): Partial<Fundamentals> {
  // Extract key tables from Fundamentus HTML
  // This is a simplified parser — a full implementation would use a proper HTML parser
  const extractNumber = (pattern: RegExp): number => {
    const match = html.match(pattern)
    if (!match) return 0
    return parseBrNumber(match[1])
  }

  const parseBrNumber = (s: string): number => {
    if (!s) return 0
    // Brazilian number format: 1.234,56 → 1234.56
    const cleaned = s.replace(/\./g, '').replace(',', '.')
    const val = parseFloat(cleaned)
    return isNaN(val) ? 0 : val
  }

  return {
    ticker,
    pe: extractNumber(/P\/L[^>]*>([0-9.,\-]+)/),
    pb: extractNumber(/P\/VP[^>]*>([0-9.,\-]+)/),
    roe: extractNumber(/ROE[^>]*>([0-9.,\-]+%)/i),
    ebitdaMargin: extractNumber(/Margem EBITDA[^>]*>([0-9.,\-]+%)/i),
    ebitMargin: extractNumber(/Margem EBIT[^>]*>([0-9.,\-]+%)/i),
    netMargin: extractNumber(/Margem Líquida[^>]*>([0-9.,\-]+%)/i),
    currentRatio: extractNumber(/Liquidez Corrente[^>]*>([0-9.,\-]+)/i),
    debtToEquity: extractNumber(/Dív\. Líquida\/PL[^>]*>([0-9.,\-]+)/i),
    evEbitda: extractNumber(/EV\/EBITDA[^>]*>([0-9.,\-]+)/i),
  }
}

// Fetch all fundamentals from Fundamentus list page
export async function fetchFundamentusList(): Promise<Array<{ ticker: string; pe: number; pb: number; roe: number }>> {
  try {
    const res = await fetch(`${FUNDAMENTUS_BASE}/resultado.php`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InvestmentDashboard/1.0)',
        Accept: 'text/html',
      },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const html = await res.text()
    return parseFundamentusListHtml(html)
  } catch {
    return []
  }
}

function parseFundamentusListHtml(
  html: string,
): Array<{ ticker: string; pe: number; pb: number; roe: number }> {
  const rows: Array<{ ticker: string; pe: number; pb: number; roe: number }> = []
  // Match table rows with ticker and key metrics
  const rowPattern = /<tr[^>]*>.*?<td[^>]*><a[^>]*>([A-Z0-9]{4,6})<\/a>.*?<\/tr>/g
  const matches = html.matchAll(rowPattern)
  for (const match of matches) {
    const row = match[0]
    const ticker = match[1]
    const numbers = row.match(/[\d.,\-]+/g) ?? []
    rows.push({
      ticker,
      pe: parseFloat(numbers[3] ?? '0'),
      pb: parseFloat(numbers[4] ?? '0'),
      roe: parseFloat(numbers[8] ?? '0'),
    })
  }
  return rows
}
