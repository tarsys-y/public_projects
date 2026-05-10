'use client'

import { useState } from 'react'
import { Filter, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScreenerFilters } from '@/types'

interface ScreenerFiltersProps {
  filters: ScreenerFilters
  onChange: (filters: ScreenerFilters) => void
}

const SECTORS = [
  'Materiais Básicos', 'Energia', 'Financeiro', 'Consumo Discricionário',
  'Consumo Básico', 'Saúde', 'Tecnologia', 'Telecomunicações',
  'Utilidades', 'Imobiliário', 'Construção Civil', 'Transporte & Logística',
  'Agronegócio', 'Industriais',
]

export function ScreenerFiltersPanel({ filters, onChange }: ScreenerFiltersProps) {
  const [open, setOpen] = useState(false)
  const activeCount = countActiveFilters(filters)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
          open || activeCount > 0
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-card text-foreground hover:bg-accent',
        )}
      >
        <Filter className="h-4 w-4" />
        Filtros
        {activeCount > 0 && (
          <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-xs">
            {activeCount}
          </span>
        )}
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[600px] rounded-lg border border-border bg-card p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium text-sm">Filtros do Screener</h3>
            <button
              onClick={() => {
                onChange({ minAvgDailyVolumeBRL: 1_000_000 })
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpar todos
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Graham filters */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Graham
              </p>
              <FilterInput
                label="P/L máximo"
                value={filters.maxPE}
                placeholder="ex: 15"
                onChange={(v) => onChange({ ...filters, maxPE: v })}
              />
              <FilterInput
                label="P/VP máximo"
                value={filters.maxPB}
                placeholder="ex: 1.5"
                onChange={(v) => onChange({ ...filters, maxPB: v })}
              />
              <FilterInput
                label="Liquidez corrente mín"
                value={filters.minCurrentRatio}
                placeholder="ex: 2"
                onChange={(v) => onChange({ ...filters, minCurrentRatio: v })}
              />
              <FilterInput
                label="Graham Score mínimo"
                value={filters.minGrahamScore}
                placeholder="0–100"
                onChange={(v) => onChange({ ...filters, minGrahamScore: v })}
              />
            </div>

            {/* Valuation filters */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Valuation (Damodaran)
              </p>
              <FilterInput
                label="DCF MoS% mínimo"
                value={filters.minDCFMOS}
                placeholder="ex: 20"
                onChange={(v) => onChange({ ...filters, minDCFMOS: v })}
              />
              <FilterInput
                label="Magic Formula mínimo"
                value={filters.minGreenblattScore}
                placeholder="0–100"
                onChange={(v) => onChange({ ...filters, minGreenblattScore: v })}
              />
              <FilterInput
                label="Fisher Score mínimo"
                value={filters.minFisherScore}
                placeholder="0–100"
                onChange={(v) => onChange({ ...filters, minFisherScore: v })}
              />
              <FilterInput
                label="Fusion Score mínimo"
                value={filters.minFusionScore}
                placeholder="0–100"
                onChange={(v) => onChange({ ...filters, minFusionScore: v })}
              />
            </div>

            {/* Category filters */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Categoria
              </p>
              {/* Decision filter */}
              <div className="mb-2">
                <p className="mb-1 text-xs text-muted-foreground">Decisão Fusion</p>
                <div className="flex gap-1">
                  {(['Buy', 'Hold', 'Avoid'] as const).map((d) => {
                    const selected = filters.decision?.includes(d)
                    return (
                      <button
                        key={d}
                        onClick={() => {
                          const current = filters.decision ?? []
                          const next = selected
                            ? current.filter((x) => x !== d)
                            : [...current, d]
                          onChange({ ...filters, decision: next.length > 0 ? next : undefined })
                        }}
                        className={cn(
                          'rounded px-2 py-0.5 text-xs transition-colors border',
                          selected
                            ? d === 'Buy'
                              ? 'bg-gain/10 text-gain border-gain/20'
                              : d === 'Hold'
                              ? 'bg-warning/10 text-warning border-warning/20'
                              : 'bg-loss/10 text-loss border-loss/20'
                            : 'border-border text-muted-foreground hover:bg-accent',
                        )}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Exclude flags */}
              <label className="flex items-center gap-2 mb-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.excludeFinancials ?? true}
                  onChange={(e) => onChange({ ...filters, excludeFinancials: e.target.checked })}
                  className="rounded"
                />
                <span className="text-xs text-muted-foreground">Excluir Financeiro</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.excludeUtilities ?? false}
                  onChange={(e) => onChange({ ...filters, excludeUtilities: e.target.checked })}
                  className="rounded"
                />
                <span className="text-xs text-muted-foreground">Excluir Utilidades</span>
              </label>
            </div>
          </div>

          {/* Sector multi-select */}
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Setor
            </p>
            <div className="flex flex-wrap gap-1">
              {SECTORS.map((sector) => {
                const selected = filters.sectors?.includes(sector)
                return (
                  <button
                    key={sector}
                    onClick={() => {
                      const current = filters.sectors ?? []
                      const next = selected
                        ? current.filter((s) => s !== sector)
                        : [...current, sector]
                      onChange({ ...filters, sectors: next.length > 0 ? next : undefined })
                    }}
                    className={cn(
                      'rounded-md px-2 py-0.5 text-xs transition-colors border',
                      selected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {sector}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: number | undefined
  placeholder: string
  onChange: (v: number | undefined) => void
}) {
  return (
    <div className="mb-2">
      <label className="block text-[11px] text-muted-foreground">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  )
}

function countActiveFilters(f: ScreenerFilters): number {
  let count = 0
  if (f.maxPE) count++
  if (f.maxPB) count++
  if (f.minCurrentRatio) count++
  if (f.minGrahamScore) count++
  if (f.minGreenblattScore) count++
  if (f.minFisherScore) count++
  if (f.minDCFMOS) count++
  if (f.minFusionScore) count++
  if (f.decision && f.decision.length > 0) count++
  if (f.sectors && f.sectors.length > 0) count++
  if (f.excludeUtilities) count++
  return count
}
