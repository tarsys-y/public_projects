// Brazilian Central Bank (BCB) public API — no auth required

const BCB_SGS_BASE = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs'
const BCB_PTAX_BASE = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata'

// BCB SGS series codes
export const BCB_SERIES = {
  SELIC_META: 432,          // SELIC target rate (% a.a.)
  SELIC_DIARIA: 11,         // SELIC daily rate
  IPCA: 433,                // IPCA monthly (%)
  IPCA_ACUMULADO_12M: 13522,
  CDI: 12,                  // CDI daily
  IGP_M: 189,               // IGP-M monthly
  EMBI_PLUS: 17626,         // EMBI+ Brasil (bps)
  BR_BOND_10Y: 17636,       // NTN-B 2045 yield proxy
  USD_BRL: 1,               // USD/BRL selling rate (PTAX)
  IBOV: 7845,               // IBOVESPA (close)
  SMALL_CAPS: 34657,        // SMLL index
} as const

interface BCGSDataPoint {
  data: string  // "DD/MM/YYYY"
  valor: string // numeric string
}

export async function fetchBCBSeries(
  seriesCode: number,
  lastN = 30,
): Promise<{ date: string; value: number }[]> {
  try {
    const url = `${BCB_SGS_BASE}.${seriesCode}/dados/ultimos/${lastN}?formato=json`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const data: BCGSDataPoint[] = await res.json()
    return data.map((d) => ({
      date: parseBCBDate(d.data),
      value: parseFloat(d.valor),
    }))
  } catch {
    return []
  }
}

export async function fetchCurrentSELIC(): Promise<number> {
  const data = await fetchBCBSeries(BCB_SERIES.SELIC_META, 1)
  return data[0]?.value ?? 10.5
}

export async function fetchCurrentIPCA(): Promise<number> {
  const data = await fetchBCBSeries(BCB_SERIES.IPCA_ACUMULADO_12M, 1)
  return data[0]?.value ?? 4.5
}

export async function fetchCurrentEMBI(): Promise<number> {
  const data = await fetchBCBSeries(BCB_SERIES.EMBI_PLUS, 1)
  return data[0]?.value ?? 200
}

export async function fetchPTAX(): Promise<number> {
  try {
    const today = formatDate(new Date())
    const yesterday = formatDate(new Date(Date.now() - 86400000))
    const url = `${BCB_PTAX_BASE}/CotacaoDolarDia(dataCotacao='${today}',tipoBoletim='Fechamento')?$format=json`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (res.ok) {
      const json = await res.json()
      const value = json.value?.[0]?.cotacaoVenda
      if (value) return value
    }
    // Try yesterday if today not available
    const url2 = `${BCB_PTAX_BASE}/CotacaoDolarDia(dataCotacao='${yesterday}',tipoBoletim='Fechamento')?$format=json`
    const res2 = await fetch(url2, { next: { revalidate: 3600 } })
    if (res2.ok) {
      const json2 = await res2.json()
      return json2.value?.[0]?.cotacaoVenda ?? 5.0
    }
    return 5.0
  } catch {
    return 5.0
  }
}

function parseBCBDate(d: string): string {
  // "DD/MM/YYYY" → "YYYY-MM-DD"
  const [day, month, year] = d.split('/')
  return `${year}-${month}-${day}`
}

function formatDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}-${dd}-${yyyy}`
}
