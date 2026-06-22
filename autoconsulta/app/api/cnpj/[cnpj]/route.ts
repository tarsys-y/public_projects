import { NextResponse } from 'next/server'
import { fetchCnpj } from '@/lib/api/brasilapi'
import { isValidCnpj } from '@/lib/validation/cnpj'

/** GET /api/cnpj/[cnpj] — dados públicos da empresa + QSA. Entrada = CNPJ. */
export async function GET(
  _req: Request,
  { params }: { params: { cnpj: string } },
) {
  const { cnpj } = params

  if (!isValidCnpj(cnpj)) {
    return NextResponse.json({ error: 'CNPJ inválido' }, { status: 400 })
  }

  const data = await fetchCnpj(cnpj)
  if (!data) {
    return NextResponse.json(
      { error: 'Empresa não encontrada ou serviço indisponível' },
      { status: 404 },
    )
  }

  return NextResponse.json(data)
}
