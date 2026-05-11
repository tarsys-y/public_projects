'use client'

import { cn, formatPct } from '@/lib/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { BacktestResult } from '@/types'

const STRATEGY_META = {
  magic_formula:    { label: 'Magic Formula', color: '#16a34a', shortLabel: 'MF' },
  graham_defensive: { label: 'Graham Defensivo', color: '#2563eb', shortLabel: 'GR' },
  fusion_top_decile:{ label: 'Fusion Top Decil', color: '#9333ea', shortLabel: 'FU' },
} as const

interface Props {
  results: BacktestResult[]
  initialCapital: number
}

function winner(results: BacktestResult[], key: keyof BacktestResult): string {
  let best = results[0]
  for (const r of results) {
    const a = r[key] as number
    const b = best[key] as number
    if (key === 'maxDrawdown' ? Math.abs(a) < Math.abs(b) : a > b) best = r
  }
  return best.config.strategy
}

export function StrategyComparison({ results, initialCapital }: Props) {
  if (!results.length) return null

  const dates = results[0].portfolioValues.map((p) => p.date)
  const chartData = dates.map((date, i) => {
    const point: Record<string, string | number> = { date: date.slice(0, 7) }
    for (const r of results) {
      const v = r.portfolioValues[i]?.value ?? initialCapital
      point[r.config.strategy] = +((v / initialCapital - 1) * 100).toFixed(2)
    }
    const bv = results[0].benchmarkValues[i]?.value ?? initialCapital
    point['benchmark'] = +((bv / initialCapital - 1) * 100).toFixed(2)
    return point
  })

  const metrics: { key: keyof BacktestResult; label: string; fmt: (v: number) => string; higherBetter: boolean }[] = [
    { key: 'cagr',              label: 'CAGR',          fmt: (v) => formatPct(v * 100),  higherBetter: true  },
    { key: 'totalReturn',       label: 'Retorno Total',  fmt: (v) => formatPct(v * 100),  higherBetter: true  },
    { key: 'sharpeRatio',       label: 'Sharpe',         fmt: (v) => v.toFixed(2),         higherBetter: true  },
    { key: 'sortinoRatio',      label: 'Sortino',        fmt: (v) => v.toFixed(2),         higherBetter: true  },
    { key: 'maxDrawdown',       label: 'Max Drawdown',   fmt: (v) => formatPct(v * 100),   higherBetter: false },
    { key: 'calmarRatio',       label: 'Calmar',         fmt: (v) => v.toFixed(2),         higherBetter: true  },
    { key: 'hitRate',           label: 'Hit Rate',       fmt: (v) => formatPct(v * 100),   higherBetter: true  },
    { key: 'alpha',             label: 'Alpha',          fmt: (v) => formatPct(v * 100),   higherBetter: true  },
    { key: 'informationRatio',  label: 'Info Ratio',     fmt: (v) => v.toFixed(2),         higherBetter: true  },
  ]

  const bestCagr = winner(results, 'cagr')
  const bestSharpe = winner(results, 'sharpeRatio')
  const bestDD = winner(results, 'maxDrawdown')

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <SummaryChip label="Maior Retorno" strategy={bestCagr} />
        <SummaryChip label="Melhor Risk-Adj" strategy={bestSharpe} />
        <SummaryChip label="Menor Drawdown" strategy={bestDD} />
      </div>

      {/* Equity curve chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="text-sm font-semibold mb-3">Performance Acumulada (%) — todas as estratégias</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={11} />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(v: number) => [`${v.toFixed(1)}%`]}
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {results.map((r) => {
              const meta = STRATEGY_META[r.config.strategy as keyof typeof STRATEGY_META]
              return (
                <Line
                  key={r.config.strategy}
                  type="monotone"
                  dataKey={r.config.strategy}
                  name={meta?.label ?? r.config.strategy}
                  stroke={meta?.color ?? '#888'}
                  strokeWidth={2}
                  dot={false}
                />
              )
            })}
            <Line type="monotone" dataKey="benchmark" name="IBOV" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Metrics table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Métrica</th>
              {results.map((r) => {
                const meta = STRATEGY_META[r.config.strategy as keyof typeof STRATEGY_META]
                return (
                  <th key={r.config.strategy} className="px-4 py-2 text-right text-xs font-semibold" style={{ color: meta?.color }}>
                    {meta?.label ?? r.config.strategy}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {metrics.map(({ key, label, fmt, higherBetter }) => {
              const bestId = winner(results, key)
              return (
                <tr key={key} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2 text-xs text-muted-foreground">{label}</td>
                  {results.map((r) => {
                    const v = r[key] as number
                    const isBest = r.config.strategy === bestId
                    const isDD = key === 'maxDrawdown'
                    return (
                      <td
                        key={r.config.strategy}
                        className={cn(
                          'px-4 py-2 text-right font-mono text-xs',
                          isBest && 'font-bold',
                          !isDD && v > 0 && isBest && 'text-gain',
                          isDD && Math.abs(v) < 0.2 && 'text-gain',
                          !isDD && v < 0 && 'text-loss',
                          isDD && Math.abs(v) > 0.4 && 'text-loss',
                        )}
                      >
                        {fmt(v)}{isBest ? ' ★' : ''}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SummaryChip({ label, strategy }: { label: string; strategy: string }) {
  const meta = STRATEGY_META[strategy as keyof typeof STRATEGY_META]
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold" style={{ color: meta?.color }}>{meta?.label ?? strategy}</span>
    </div>
  )
}
