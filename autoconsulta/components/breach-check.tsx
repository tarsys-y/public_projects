'use client'

import { useState } from 'react'
import type { Breach } from '@/types'

export function BreachCheck() {
  const [email, setEmail] = useState('')
  const [breaches, setBreaches] = useState<Breach[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCheck() {
    setError(null)
    setBreaches(null)
    setLoading(true)
    try {
      const res = await fetch('/api/breaches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Falha na consulta.')
        return
      }
      setBreaches(json.breaches as Breach[])
    } catch {
      setError('Falha de rede ao consultar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-4">
      <p className="text-sm text-slate-600">
        Verifica se o <strong>seu próprio e-mail</strong> apareceu em vazamentos
        conhecidos (via Have I Been Pwned). Use apenas com endereços que são seus.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <button
          onClick={handleCheck}
          disabled={loading || !email}
          className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Verificando…' : 'Verificar'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {error}
        </div>
      )}

      {breaches !== null && (
        <div className="space-y-3">
          {breaches.length === 0 ? (
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Nenhum vazamento conhecido para este e-mail. 🎉
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                Encontrado em {breaches.length} vazamento(s). Considere trocar
                senhas e ativar 2FA.
              </div>
              <ul className="space-y-2">
                {breaches.map((b) => (
                  <li
                    key={b.name}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold">{b.title}</span>
                      <span className="text-xs text-slate-400">{b.breachDate}</span>
                    </div>
                    {b.dataClasses.length > 0 && (
                      <p className="mt-1 text-xs text-slate-500">
                        Dados expostos: {b.dataClasses.join(', ')}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  )
}
