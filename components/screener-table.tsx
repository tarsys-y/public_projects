'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { useRouter } from 'next/navigation'
import { ArrowUpDown, ArrowUp, ArrowDown, Info, ExternalLink, Filter, Plus } from 'lucide-react'
import { cn, formatBRL, formatPct, formatNumber, decisionBadgeClass, changeClass, fusionScoreColor, mosColor } from '@/lib/utils'
import type { ScreenerRow, ScreenerFilters } from '@/types'

const col = createColumnHelper<ScreenerRow>()

interface TooltipProps {
  text: string
  source: string
  children: React.ReactNode
}

function MetricTooltip({ text, source, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex items-center gap-1">
      {children}
      <Info className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-60 rounded-md border border-border bg-popover p-2 text-xs shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="block text-foreground">{text}</span>
        <span className="mt-1 block text-[10px] text-muted-foreground italic">📚 {source}</span>
      </span>
    </span>
  )
}

function ScoreBar({ score, className }: { score: number; className?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            score >= 70 ? 'bg-gain' : score >= 45 ? 'bg-warning' : 'bg-loss',
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={cn('font-mono text-xs tabular-nums', fusionScoreColor(score))}>
        {score.toFixed(0)}
      </span>
    </div>
  )
}

function SortButton({
  isSorted,
  onClick,
}: {
  isSorted: false | 'asc' | 'desc'
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="ml-1 inline-flex opacity-50 hover:opacity-100 transition-opacity">
      {isSorted === 'asc' ? (
        <ArrowUp className="h-3 w-3" />
      ) : isSorted === 'desc' ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3" />
      )}
    </button>
  )
}

const COLUMNS = [
  col.accessor('ticker', {
    header: 'Ticker',
    cell: (info) => (
      <Link
        href={`/stock/${info.getValue()}`}
        className="flex items-center gap-1 font-mono text-sm font-semibold text-foreground hover:underline"
      >
        {info.getValue()}
        <ExternalLink className="h-3 w-3 opacity-40" />
      </Link>
    ),
    size: 90,
  }),
  col.accessor('name', {
    header: 'Empresa',
    cell: (info) => (
      <span className="text-sm text-muted-foreground truncate max-w-[140px] block" title={info.getValue()}>
        {info.getValue()}
      </span>
    ),
    size: 150,
  }),
  col.accessor('price', {
    header: ({ column }) => (
      <span className="flex items-center">
        Preço
        <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
      </span>
    ),
    cell: (info) => (
      <span className="font-mono text-sm tabular-nums">
        R$ {info.getValue().toFixed(2)}
      </span>
    ),
    size: 90,
  }),
  col.accessor('change1d', {
    header: ({ column }) => (
      <span className="flex items-center">
        Var%
        <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
      </span>
    ),
    cell: (info) => (
      <span className={cn('font-mono text-xs tabular-nums', changeClass(info.getValue()))}>
        {formatPct(info.getValue())}
      </span>
    ),
    size: 70,
  }),
  // ── Graham ────────────────────────────────────
  col.accessor('pe', {
    header: ({ column }) => (
      <MetricTooltip text="Price/Earnings — deve ser < 15 para o investidor defensivo." source="Graham, Cap. 14">
        <span className="flex items-center">
          P/L
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => {
      const v = info.getValue()
      const pass = v > 0 && v < 15
      return (
        <span className={cn('font-mono text-xs tabular-nums', pass ? 'text-gain' : v > 0 ? 'text-loss' : 'text-muted-foreground')}>
          {v > 0 ? v.toFixed(1) : '–'}
        </span>
      )
    },
    size: 60,
  }),
  col.accessor('pb', {
    header: ({ column }) => (
      <MetricTooltip text="Price/Book Value — deve ser < 1.5 para o investidor defensivo." source="Graham, Cap. 14">
        <span className="flex items-center">
          P/VP
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => {
      const v = info.getValue()
      const pass = v > 0 && v < 1.5
      return (
        <span className={cn('font-mono text-xs tabular-nums', pass ? 'text-gain' : v > 0 ? 'text-warning' : 'text-muted-foreground')}>
          {v > 0 ? v.toFixed(2) : '–'}
        </span>
      )
    },
    size: 65,
  }),
  col.accessor('grahamMOS', {
    header: ({ column }) => (
      <MetricTooltip text="Margem de segurança vs valor intrínseco Graham. Meta: ≥ 30%." source="Graham, Cap. 20">
        <span className="flex items-center">
          MoS%
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => {
      const v = info.getValue()
      return (
        <span className={cn('font-mono text-xs tabular-nums', mosColor(v))}>
          {v.toFixed(1)}%
        </span>
      )
    },
    size: 70,
  }),
  col.accessor('grahamScore', {
    header: ({ column }) => (
      <MetricTooltip text="Critérios Graham aprovados (0–7). Score = passed/7 × 100." source="Graham, Cap. 14">
        <span className="flex items-center">
          Graham
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => <ScoreBar score={info.getValue()} />,
    size: 110,
  }),
  // ── Greenblatt ────────────────────────────────
  col.accessor('roc', {
    header: ({ column }) => (
      <MetricTooltip text="Return on Capital = EBIT / (NWC + Ativos Fixos). Greenblatt exclui intangíveis." source="Greenblatt, Cap. 4">
        <span className="flex items-center">
          ROC
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => (
      <span className={cn('font-mono text-xs tabular-nums', info.getValue() > 0.15 ? 'text-gain' : 'text-muted-foreground')}>
        {info.getValue() > 0 ? `${(info.getValue() * 100).toFixed(1)}%` : '–'}
      </span>
    ),
    size: 70,
  }),
  col.accessor('earningsYield', {
    header: ({ column }) => (
      <MetricTooltip text="Earnings Yield = EBIT / Enterprise Value. Quanto você ganha por real investido." source="Greenblatt, Cap. 4">
        <span className="flex items-center">
          EY
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => (
      <span className={cn('font-mono text-xs tabular-nums', info.getValue() > 0.08 ? 'text-gain' : 'text-muted-foreground')}>
        {info.getValue() > 0 ? `${(info.getValue() * 100).toFixed(1)}%` : '–'}
      </span>
    ),
    size: 60,
  }),
  col.accessor('greenblattScore', {
    header: ({ column }) => (
      <MetricTooltip text="Magic Formula Score — ranking combinado ROC + EY no universo B3 (percentil 0-100)." source="Greenblatt, Magic Formula">
        <span className="flex items-center">
          Magic
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => <ScoreBar score={info.getValue()} />,
    size: 110,
  }),
  // ── Fisher ────────────────────────────────────
  col.accessor('revenueCAGR5y', {
    header: ({ column }) => (
      <MetricTooltip text="CAGR de receita em 5 anos. Fisher buscava empresas com crescimento consistente." source="Fisher, Cap. 3">
        <span className="flex items-center">
          CAGR5a
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => {
      const v = info.getValue()
      return (
        <span className={cn('font-mono text-xs tabular-nums', v > 0.10 ? 'text-gain' : v > 0.05 ? 'text-warning' : 'text-loss')}>
          {(v * 100).toFixed(1)}%
        </span>
      )
    },
    size: 80,
  }),
  col.accessor('fisherScore', {
    header: ({ column }) => (
      <MetricTooltip text="Fisher Score — 15-point checklist de qualidade (quantitativo + qualitativo)." source="Fisher, 15-point Checklist">
        <span className="flex items-center">
          Fisher
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => <ScoreBar score={info.getValue()} />,
    size: 110,
  }),
  // ── Damodaran ─────────────────────────────────
  col.accessor('dcfMOS', {
    header: ({ column }) => (
      <MetricTooltip text="Margem de segurança DCF (Damodaran). (Valor Intrínseco - Preço) / Valor Intrínseco × 100." source="Damodaran, Valuation">
        <span className="flex items-center">
          DCF MoS
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => {
      const v = info.getValue()
      return (
        <span className={cn('font-mono text-xs tabular-nums', mosColor(v))}>
          {v.toFixed(1)}%
        </span>
      )
    },
    size: 80,
  }),
  col.accessor('evEbitda', {
    header: ({ column }) => (
      <MetricTooltip text="EV/EBITDA — valuation relativo vs mediana setorial." source="Damodaran, Cap. 9">
        <span className="flex items-center">
          EV/EBITDA
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => {
      const v = info.getValue()
      const median = info.row.original.evEbitdaSectorMedian
      const cheap = median > 0 && v < median * 0.85
      return (
        <span className={cn('font-mono text-xs tabular-nums', cheap ? 'text-gain' : 'text-muted-foreground')}>
          {v > 0 ? v.toFixed(1) : '–'}
          {median > 0 && <span className="opacity-40 text-[10px]">/{median.toFixed(1)}</span>}
        </span>
      )
    },
    size: 95,
  }),
  col.accessor('damodaranScore', {
    header: ({ column }) => (
      <MetricTooltip text="Damodaran Score — derivado da margem de segurança DCF (sigmoid normalizado 0-100)." source="Damodaran, Investment Valuation">
        <span className="flex items-center">
          Damod.
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => <ScoreBar score={info.getValue()} />,
    size: 110,
  }),
  // ── Quant ─────────────────────────────────────
  col.accessor('momentum12_1', {
    header: ({ column }) => (
      <MetricTooltip text="Momentum 12-1: retorno dos últimos 13 meses excluindo o último mês." source="Simons / Fatores Quantitativos">
        <span className="flex items-center">
          Mom12-1
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => {
      const v = info.getValue()
      return (
        <span className={cn('font-mono text-xs tabular-nums', v > 0 ? 'text-gain' : 'text-loss')}>
          {formatPct(v * 100, 1)}
        </span>
      )
    },
    size: 80,
  }),
  col.accessor('volatility90d', {
    header: ({ column }) => (
      <MetricTooltip text="Volatilidade 90 dias anualizada (desvio padrão de log-retornos × √252)." source="Simons / Risk Management">
        <span className="flex items-center">
          Vol90
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => {
      const v = info.getValue()
      return (
        <span className={cn('font-mono text-xs tabular-nums', v < 0.25 ? 'text-gain' : v > 0.45 ? 'text-loss' : 'text-warning')}>
          {(v * 100).toFixed(1)}%
        </span>
      )
    },
    size: 65,
  }),
  col.accessor('beta', {
    header: ({ column }) => (
      <MetricTooltip text="Beta vs IBOV — sensibilidade aos movimentos do mercado brasileiro." source="CAPM / Damodaran">
        <span className="flex items-center">
          Beta
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => (
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {info.getValue().toFixed(2)}
      </span>
    ),
    size: 55,
  }),
  col.accessor('quantScore', {
    header: ({ column }) => (
      <MetricTooltip text="Quant Score — combinação de momentum, mean-reversion e volatilidade (0-100)." source="Simons / Fusion Analysis">
        <span className="flex items-center">
          Quant
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => <ScoreBar score={info.getValue()} />,
    size: 110,
  }),
  // ── Fusion ────────────────────────────────────
  col.accessor('fusionScore', {
    header: ({ column }) => (
      <MetricTooltip text="Fusion Score — combinação ponderada de Graham + Fisher + Greenblatt + Damodaran + Quant (0-100)." source="Palicka, Fusion Analysis">
        <span className="flex items-center text-foreground font-semibold">
          Fusion
          <SortButton isSorted={column.getIsSorted()} onClick={() => column.toggleSorting()} />
        </span>
      </MetricTooltip>
    ),
    cell: (info) => (
      <div className="flex items-center gap-2">
        <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full',
              info.getValue() >= 70 ? 'bg-gain' : info.getValue() >= 45 ? 'bg-warning' : 'bg-loss',
            )}
            style={{ width: `${info.getValue()}%` }}
          />
        </div>
        <span className={cn('font-mono text-sm font-bold tabular-nums', fusionScoreColor(info.getValue()))}>
          {info.getValue().toFixed(0)}
        </span>
      </div>
    ),
    size: 130,
  }),
  col.accessor('decision', {
    header: 'Decisão',
    cell: (info) => {
      const row = info.row.original
      return (
        <div className="flex items-center gap-1">
          <span className={cn('rounded border px-2 py-0.5 text-xs font-medium', decisionBadgeClass(info.getValue()))}>
            {info.getValue()}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">{row.confidence}%</span>
        </div>
      )
    },
    size: 100,
  }),
  col.display({
    id: 'addToPortfolio',
    header: '',
    cell: (info) => <AddToPortfolioButton ticker={info.row.original.ticker} />,
    size: 40,
  }),
]

function AddToPortfolioButton({ ticker }: { ticker: string }) {
  const router = useRouter()
  return (
    <button
      onClick={(e) => { e.stopPropagation(); router.push(`/portfolio?prefill=${ticker}`) }}
      title={`Adicionar ${ticker} ao portfólio`}
      className="rounded-md border border-border p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      <Plus className="h-3 w-3" />
    </button>
  )
}

interface ScreenerTableProps {
  data: ScreenerRow[]
  isLoading: boolean
}

export function ScreenerTable({ data, isLoading }: ScreenerTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'fusionScore', desc: true },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns: COLUMNS,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/50">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="whitespace-nowrap px-3 py-2 text-xs font-medium text-muted-foreground"
                  style={{ width: header.column.columnDef.size }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <tr
              key={row.id}
              className={cn(
                'border-b border-border/50 transition-colors hover:bg-accent/30',
                i % 2 === 0 ? 'bg-background' : 'bg-card/50',
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-muted-foreground">
                Nenhuma ação encontrada com os filtros aplicados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {table.getRowModel().rows.length} ações exibidas de {data.length} total
        </p>
        <p className="text-xs text-muted-foreground">
          Ordenado por Fusion Score ↓ • Clique no cabeçalho para ordenar
        </p>
      </div>
    </div>
  )
}
