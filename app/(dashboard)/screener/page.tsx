'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { RefreshCw, Search } from 'lucide-react'
import { ScreenerTable } from '@/components/screener-table'
import { ScreenerFiltersPanel } from '@/components/screener-filters'
import { DataFreshness } from '@/components/data-freshness'
import type { ScreenerRow, ScreenerFilters } from '@/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ScreenerPage() {
  const [filters, setFilters] = useState<ScreenerFilters>({
    minAvgDailyVolumeBRL: 1_000_000,
    excludeFinancials: true,
  })
  const [search, setSearch] = useState('')
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const prevDataRef = useRef<unknown>(null)

  const queryString = new URLSearchParams(
    Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]),
    ),
  ).toString()

  const { data, isLoading, mutate } = useSWR<{ data: ScreenerRow[]; total: number }>(
    `/api/screener?${queryString}`,
    fetcher,
    { revalidateOnFocus: false },
  )

  useEffect(() => {
    if (data && data !== prevDataRef.current) {
      prevDataRef.current = data
      setFetchedAt(Date.now())
    }
  }, [data])

  const rows = (data?.data ?? []).filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return r.ticker.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Screener B3</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Análise multi-framework de todas as ações listadas na B3 — Graham, Fisher, Greenblatt, Damodaran e Quant.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataFreshness source="Yahoo Finance" fetchedAt={isLoading ? null : fetchedAt} staleAfterMs={60_000} onRefresh={() => mutate()} />
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar ticker ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-card pl-9 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <ScreenerFiltersPanel filters={filters} onChange={setFilters} />

        {/* Quick filter presets */}
        <div className="flex gap-2">
          <button
            onClick={() =>
              setFilters({
                maxPE: 15,
                maxPB: 1.5,
                minCurrentRatio: 2,
                minGrahamScore: 70,
                minAvgDailyVolumeBRL: 1_000_000,
                excludeFinancials: true,
              })
            }
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent transition-colors"
            title="Investidor Defensivo de Graham"
          >
            Graham Defensivo
          </button>
          <button
            onClick={() =>
              setFilters({
                minGreenblattScore: 80,
                minAvgDailyVolumeBRL: 1_000_000,
                excludeFinancials: true,
              })
            }
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent transition-colors"
            title="Top 20% Magic Formula"
          >
            Magic Formula Top 20%
          </button>
          <button
            onClick={() =>
              setFilters({
                minFusionScore: 65,
                decision: ['Buy'],
                minAvgDailyVolumeBRL: 1_000_000,
              })
            }
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent transition-colors text-gain border-gain/30"
            title="Melhores por Fusion Score"
          >
            Top Fusion Buys
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground font-mono">{rows.length}</strong> ações
        </span>
        {rows.filter((r) => r.decision === 'Buy').length > 0 && (
          <span>
            <strong className="text-gain font-mono">{rows.filter((r) => r.decision === 'Buy').length}</strong> Buy
          </span>
        )}
        {rows.filter((r) => r.decision === 'Hold').length > 0 && (
          <span>
            <strong className="text-warning font-mono">{rows.filter((r) => r.decision === 'Hold').length}</strong> Hold
          </span>
        )}
        {rows.filter((r) => r.decision === 'Avoid').length > 0 && (
          <span>
            <strong className="text-loss font-mono">{rows.filter((r) => r.decision === 'Avoid').length}</strong> Avoid
          </span>
        )}
        <span className="ml-auto text-[11px]">
          Volume mínimo: R$ 1M/dia • Atualizado a cada 5 min
        </span>
      </div>

      {/* Table */}
      <ScreenerTable data={rows} isLoading={isLoading} />

      {/* Disclaimer */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        ⚠️ Este dashboard é uma ferramenta de suporte à decisão, não uma recomendação de investimento.
        Scores e valuations são baseados em dados fundamentais e modelos quantitativos — sempre faça sua
        própria análise antes de investir. Dados com atraso de 15 min (brapi.dev free tier).
      </p>
    </div>
  )
}
