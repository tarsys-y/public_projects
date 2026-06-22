'use client'

import { useState } from 'react'
import { formatCpf, isValidCpf } from '@/lib/validation/cpf'
import { formatCnpj, isValidCnpj } from '@/lib/validation/cnpj'

type Doc = 'cpf' | 'cnpj'

export function CpfValidator() {
  const [doc, setDoc] = useState<Doc>('cpf')
  const [value, setValue] = useState('')
  const [result, setResult] = useState<boolean | null>(null)

  const format = doc === 'cpf' ? formatCpf : formatCnpj
  const validate = doc === 'cpf' ? isValidCpf : isValidCnpj

  function handleChange(raw: string) {
    setValue(format(raw))
    setResult(null)
  }

  function handleValidate() {
    setResult(validate(value))
  }

  return (
    <section className="space-y-4">
      <p className="text-sm text-slate-600">
        Verifica apenas se os dígitos verificadores estão corretos. Roda 100% no
        navegador — <strong>nenhum dado é consultado ou enviado a lugar nenhum</strong>.
      </p>

      <div className="inline-flex rounded-lg border border-slate-300 p-1 text-sm">
        {(['cpf', 'cnpj'] as Doc[]).map((d) => (
          <button
            key={d}
            onClick={() => {
              setDoc(d)
              setValue('')
              setResult(null)
            }}
            className={`rounded-md px-3 py-1 font-medium uppercase ${
              doc === d ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={doc === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
          inputMode="numeric"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono"
        />
        <button
          onClick={handleValidate}
          className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
        >
          Validar
        </button>
      </div>

      {result !== null && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            result
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}
        >
          {result
            ? `${doc.toUpperCase()} estruturalmente válido.`
            : `${doc.toUpperCase()} inválido.`}
        </div>
      )}
    </section>
  )
}
