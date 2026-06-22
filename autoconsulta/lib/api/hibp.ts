/**
 * Cliente do Have I Been Pwned — verifica se um e-mail aparece em vazamentos
 * conhecidos. Destinado a que o titular cheque o PRÓPRIO e-mail.
 *
 * A chave da API (HIBP_API_KEY) fica somente no servidor.
 */
import type { Breach } from '@/types'

const HIBP_BASE = 'https://haveibeenpwned.com/api/v3'

/** Resultado da checagem, diferenciando "não configurado" de "sem vazamentos". */
export type BreachCheckResult =
  | { ok: true; breaches: Breach[] }
  | { ok: false; reason: 'not_configured' | 'rate_limited' | 'error' }

interface HibpBreachResponse {
  Name?: string
  Title?: string
  Domain?: string
  BreachDate?: string
  Description?: string
  DataClasses?: string[]
}

function mapBreach(raw: HibpBreachResponse): Breach {
  return {
    name: raw.Name ?? '',
    title: raw.Title ?? raw.Name ?? '',
    domain: raw.Domain ?? '',
    breachDate: raw.BreachDate ?? '',
    description: raw.Description ?? '',
    dataClasses: raw.DataClasses ?? [],
  }
}

/**
 * Consulta os vazamentos associados a um e-mail.
 * 404 na HIBP significa "nenhum vazamento" → retorna lista vazia.
 */
export async function checkBreaches(email: string): Promise<BreachCheckResult> {
  const apiKey = process.env.HIBP_API_KEY
  if (!apiKey) return { ok: false, reason: 'not_configured' }

  try {
    const url = `${HIBP_BASE}/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`
    const res = await fetch(url, {
      headers: {
        'hibp-api-key': apiKey,
        'user-agent': 'autoconsulta-self-check',
      },
      cache: 'no-store',
    })

    if (res.status === 404) return { ok: true, breaches: [] }
    if (res.status === 429) return { ok: false, reason: 'rate_limited' }
    if (!res.ok) return { ok: false, reason: 'error' }

    const json = (await res.json()) as HibpBreachResponse[]
    return { ok: true, breaches: json.map(mapBreach) }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
