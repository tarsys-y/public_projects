import { NextResponse } from 'next/server'
import { checkBreaches } from '@/lib/api/hibp'

/**
 * POST /api/breaches — checa vazamentos do PRÓPRIO e-mail do titular.
 * Body: { email: string }. A chave da HIBP fica só no servidor.
 */
export async function POST(req: Request) {
  let email: unknown
  try {
    const body = await req.json()
    email = body?.email
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
  }

  const result = await checkBreaches(email)

  if (!result.ok) {
    if (result.reason === 'not_configured') {
      return NextResponse.json(
        { error: 'HIBP_API_KEY não configurada no servidor.' },
        { status: 503 },
      )
    }
    if (result.reason === 'rate_limited') {
      return NextResponse.json(
        { error: 'Limite de requisições atingido. Tente novamente em instantes.' },
        { status: 429 },
      )
    }
    return NextResponse.json(
      { error: 'Falha ao consultar o serviço de vazamentos.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ count: result.breaches.length, breaches: result.breaches })
}
