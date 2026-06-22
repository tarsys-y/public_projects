'use client'

import { useState } from 'react'
import type { CpfStatus } from '@/types'
import { formatCpf, isValidCpf } from '@/lib/validation/cpf'
import { buildSelfReportedStatus } from '@/lib/api/receita'

const SITUACOES = [
  'Regular',
  'Pendente de Regularização',
  'Suspensa',
  'Cancelada',
  'Nula',
  'Titular Falecido',
]

export function CpfStatusTool() {
  const [cpf, setCpf] = useState('')
  const [nome, setNome] = useState('')
  const [situacao, setSituacao] = useState(SITUACOES[0])
  const [dataInscricao, setDataInscricao] = useState('')
  const [result, setResult] = useState<CpfStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    setError(null)
    setResult(null)
    if (!isValidCpf(cpf)) {
      setError('CPF estruturalmente inválido.')
      return
    }
    const status = buildSelfReportedStatus({ cpf, nome, situacao, dataInscricao })
    if (!status) {
      setError('Não foi possível registrar os dados.')
      return
    }
    setResult(status)
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <p className="font-medium">Por que isto é um auto-relato?</p>
        <p className="mt-1">
          Não existe API pública gratuita para a situação cadastral de um CPF. A
          consulta oficial deve ser feita por você, autenticado, no portal{' '}
          <a
            href="https://www.gov.br/receitafederal/pt-br/assuntos/meu-cpf"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            gov.br / Receita Federal
          </a>
          . Aqui você apenas organiza os <strong>seus próprios</strong> dados.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">CPF</span>
          <input
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Nome (opcional)</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Situação cadastral</span>
          <select
            value={situacao}
            onChange={(e) => setSituacao(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {SITUACOES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Data de inscrição (opcional)</span>
          <input
            value={dataInscricao}
            onChange={(e) => setDataInscricao(e.target.value)}
            placeholder="DD/MM/AAAA"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <button
        onClick={handleSave}
        className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
      >
        Registrar
      </button>

      {error && (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Situação registrada</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              fonte: {result.fonte}
            </span>
          </div>
          <dl className="grid grid-cols-1 gap-y-1 sm:grid-cols-2">
            <Field label="CPF" value={formatCpf(result.cpf)} />
            <Field label="Nome" value={result.nome} />
            <Field label="Situação" value={result.situacao} />
            <Field label="Data de inscrição" value={result.dataInscricao} />
          </dl>
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
