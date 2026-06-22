'use client'

import { useState } from 'react'
import type { CnpjData } from '@/types'
import { cleanCnpj, formatCnpj, isValidCnpj } from '@/lib/validation/cnpj'

export function CnpjLookup() {
  const [value, setValue] = useState('')
  const [data, setData] = useState<CnpjData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLookup() {
    setError(null)
    setData(null)
    if (!isValidCnpj(value)) {
      setError('CNPJ inválido.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/cnpj/${cleanCnpj(value)}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Falha na consulta.')
        return
      }
      setData(json as CnpjData)
    } catch {
      setError('Falha de rede ao consultar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-4">
      <p className="text-sm text-slate-600">
        Consulta dados cadastrais <strong>públicos de uma empresa</strong> a partir
        do CNPJ (via BrasilAPI), incluindo o quadro de sócios (QSA). A entrada é
        sempre um CNPJ — não há busca reversa de pessoas.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={value}
          onChange={(e) => setValue(formatCnpj(e.target.value))}
          placeholder="00.000.000/0000-00"
          inputMode="numeric"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono"
        />
        <button
          onClick={handleLookup}
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Consultando…' : 'Consultar'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <div>
            <h3 className="text-lg font-semibold">{data.razaoSocial}</h3>
            {data.nomeFantasia && (
              <p className="text-sm text-slate-500">{data.nomeFantasia}</p>
            )}
            <p className="font-mono text-sm text-slate-500">
              {formatCnpj(data.cnpj)}
            </p>
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Field label="Situação cadastral" value={data.situacaoCadastral} />
            <Field label="Data da situação" value={data.dataSituacao} />
            <Field label="Natureza jurídica" value={data.naturezaJuridica} />
            <Field
              label="CNAE principal"
              value={
                data.cnaePrincipal
                  ? `${data.cnaePrincipal.codigo} — ${data.cnaePrincipal.descricao}`
                  : null
              }
            />
            <Field
              label="Município/UF"
              value={
                [data.endereco.municipio, data.endereco.uf]
                  .filter(Boolean)
                  .join(' / ') || null
              }
            />
          </dl>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">
              Quadro de Sócios e Administradores (QSA)
            </h4>
            {data.qsa.length === 0 ? (
              <p className="text-sm text-slate-500">Sem sócios listados.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {data.qsa.map((s, i) => (
                  <li key={i} className="flex justify-between py-1.5">
                    <span>{s.nome}</span>
                    <span className="text-slate-500">{s.qualificacao}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-800">{value ?? '—'}</dd>
    </div>
  )
}
