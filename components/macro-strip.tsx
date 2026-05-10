'use client'

import useSWR from 'swr'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn, formatBRL, formatPct } from '@/lib/utils'
import type { MacroData } from '@/types'

interface MacroTileProps {
  label: string
  value: string
  change: number
  changeLabel?: string
  sparkline?: number[]
  tooltip?: string
  valueClass?: string
}

function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null
  const minVal = Math.min(...data)
  const maxVal = Math.max(...data)
  const last = data[data.length - 1]
  const first = data[0]
  const color = last >= first ? '#16a34a' : '#dc2626'
  // Map to recharts data format
  const chartData = data.map((v) => ({ v }))
  return (
    <div className="h-6 w-16 opacity-70">
      {/* Simple inline SVG sparkline */}
      <svg width="64" height="24" viewBox={`0 0 64 24`}>
        <polyline
          points={data
            .map((v, i) => {
              const x = (i / (data.length - 1)) * 64
              const range = maxVal - minVal || 1
              const y = 22 - ((v - minVal) / range) * 20
              return `${x},${y}`
            })
            .join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function MacroTile({ label, value, change, changeLabel, sparkline, tooltip, valueClass }: MacroTileProps) {
  const isPositive = change > 0
  const isNeutral = change === 0 || !change

  return (
    <div
      title={tooltip}
      className="flex items-center gap-3 rounded-md px-3 py-1.5 hover:bg-accent transition-colors cursor-default"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className={cn('font-mono text-sm font-semibold tabular-nums', valueClass)}>
          {value}
        </p>
      </div>
      {sparkline && <Sparkline data={sparkline} />}
      <div className="flex items-center gap-0.5">
        {isNeutral ? (
          <Minus className="h-3 w-3 text-muted-foreground" />
        ) : isPositive ? (
          <TrendingUp className="h-3 w-3 text-gain" />
        ) : (
          <TrendingDown className="h-3 w-3 text-loss" />
        )}
        <span
          className={cn(
            'font-mono text-[11px] tabular-nums',
            isNeutral ? 'text-muted-foreground' : isPositive ? 'text-gain' : 'text-loss',
          )}
        >
          {changeLabel ?? formatPct(change)}
        </span>
      </div>
    </div>
  )
}

const fetcher = (url: string) => fetch(url).then((r) => r.json()).then((r) => r.data)

export function MacroStrip() {
  const { data: macro } = useSWR<MacroData>('/api/macro', fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  })

  if (!macro) {
    return (
      <div className="flex h-10 items-center border-b border-border bg-card px-4">
        <div className="flex gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-5 w-24 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  const tiles: MacroTileProps[] = [
    {
      label: 'SELIC',
      value: `${macro.selic.toFixed(2)}% a.a.`,
      change: macro.selicChange30d,
      sparkline: macro.selicHistory,
      tooltip: 'Taxa SELIC — taxa básica de juros (BCB). Usada como taxa livre de risco no CAPM.',
      valueClass: 'text-foreground',
    },
    {
      label: 'IPCA 12m',
      value: `${macro.ipca.toFixed(2)}%`,
      change: macro.ipcaChange30d,
      sparkline: macro.ipcaHistory,
      tooltip: 'IPCA acumulado 12 meses — índice de inflação oficial do Brasil (IBGE).',
      valueClass: 'text-foreground',
    },
    {
      label: 'USD/BRL',
      value: `R$ ${macro.usdBrl.toFixed(2)}`,
      change: macro.usdBrlChange30d,
      tooltip: 'Taxa de câmbio dólar / real (PTAX de fechamento - BCB).',
    },
    {
      label: 'IBOV',
      value: macro.ibov.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
      change: macro.ibovChange30d,
      sparkline: macro.ibovHistory,
      tooltip: 'Índice Bovespa — principal indicador do desempenho das ações brasileiras.',
      valueClass: macro.ibovChange30d >= 0 ? 'text-gain' : 'text-loss',
    },
    {
      label: 'Small Caps',
      value: macro.smallCaps > 0
        ? macro.smallCaps.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
        : '–',
      change: macro.smallCapsChange30d,
      tooltip: 'Índice Small Caps (SMLL) — ações de menor capitalização da B3.',
    },
    {
      label: 'Brasil 10Y',
      value: `${macro.brBond10y.toFixed(2)}%`,
      change: 0,
      tooltip: 'Taxa implícita do título de 10 anos (proxy: SELIC + EMBI+). Referência para valuation de longo prazo.',
    },
    {
      label: 'EMBI+',
      value: `${macro.embiPlus.toFixed(0)} bps`,
      change: 0,
      tooltip: 'Risco-país Brasil (EMBI+) em basis points. Adicionado ao custo de capital no CAPM de Damodaran.',
      valueClass: macro.embiPlus > 300 ? 'text-warning' : 'text-foreground',
    },
  ]

  return (
    <div className="flex h-12 items-center gap-1 overflow-x-auto border-b border-border bg-card px-2 scrollbar-hide">
      {tiles.map((tile) => (
        <MacroTile key={tile.label} {...tile} />
      ))}
    </div>
  )
}
