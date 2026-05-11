'use client'

import { useState, useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line, LineChart, Legend,
} from 'recharts'
import { cn, formatPct } from '@/lib/utils'
import type { OptimizationResult, PortfolioPoint } from '@/lib/calculations/optimizer'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  result: OptimizationResult
  onApplyWeights?: (weights: Record<string, number>) => void
}

type SelectedPortfolio = 'minVariance' | 'maxSharpe' | 'equalWeight' | 'custom'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toPercent(v: number) { return +(v * 100).toFixed(2) }

function weightsRecord(tickers: string[], weights: number[]): Record<string, number> {
  const rec: Record<string, number> = {}
  tickers.forEach((t, i) => { rec[t] = weights[i] ?? 0 })
  return rec
}

// ─── Correlation heatmap ──────────────────────────────────────────────────────

function CorrelationHeatmap({ tickers, matrix }: { tickers: string[]; matrix: number[][] }) {
  const N = tickers.length
  return (
    <div className="overflow-x-auto">
      <div
        className="grid text-center"
        style={{ gridTemplateColumns: `60px repeat(${N}, minmax(40px, 1fr))` }}
      >
        {/* Header row */}
        <div />
        {tickers.map((t) => (
          <div key={t} className="text-[10px] font-mono font-semibold text-muted-foreground truncate px-0.5">{t.replace(/\d+$/, '')}</div>
        ))}
        {/* Data rows */}
        {tickers.map((rowT, i) => (
          <>
            <div key={`lbl-${i}`} className="text-[10px] font-mono font-semibold text-muted-foreground text-right pr-1 truncate self-center">{rowT.replace(/\d+$/, '')}</div>
            {matrix[i]?.map((corr, j) => {
              const abs = Math.abs(corr)
              const bg = corr >= 0
                ? `rgba(59,130,246,${(abs * 0.85).toFixed(2)})`   // blue = positive corr
                : `rgba(220,38,38,${(abs * 0.85).toFixed(2)})`    // red = negative corr
              return (
                <div
                  key={`${i}-${j}`}
                  title={`${rowT} / ${tickers[j]}: ${corr.toFixed(2)}`}
                  className="aspect-square flex items-center justify-center text-[9px] font-mono rounded-sm m-0.5"
                  style={{ background: bg, color: abs > 0.5 ? '#fff' : 'inherit' }}
                >
                  {corr.toFixed(1)}
                </div>
              )
            })}
          </>
        ))}
      </div>
    </div>
  )
}

// ─── Weight allocation bar ────────────────────────────────────────────────────

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#6366f1']

function AllocationBar({ tickers, weights }: { tickers: string[]; weights: number[] }) {
  const pairs = tickers
    .map((t, i) => ({ ticker: t, w: weights[i] ?? 0 }))
    .filter((p) => p.w > 0.005)
    .sort((a, b) => b.w - a.w)

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <div className="flex h-5 rounded-md overflow-hidden w-full">
        {pairs.map((p, i) => (
          <div
            key={p.ticker}
            style={{ width: `${(p.w * 100).toFixed(1)}%`, background: COLORS[i % COLORS.length] }}
            title={`${p.ticker}: ${(p.w * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {pairs.map((p, i) => (
          <div key={p.ticker} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-xs font-mono text-muted-foreground">{p.ticker}</span>
            <span className="text-xs font-semibold">{(p.w * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Portfolio comparison table ───────────────────────────────────────────────

function PortfolioCompare({
  result,
  selected,
  onSelect,
}: {
  result: OptimizationResult
  selected: SelectedPortfolio
  onSelect: (p: SelectedPortfolio) => void
}) {
  const rows: { id: SelectedPortfolio; label: string; color: string; point: PortfolioPoint }[] = [
    { id: 'minVariance', label: 'Mínima Variância', color: '#10b981', point: result.minVariance },
    { id: 'maxSharpe',   label: 'Máximo Sharpe',   color: '#f59e0b', point: result.maxSharpe },
    { id: 'equalWeight', label: 'Equal-Weight',     color: '#8b5cf6', point: result.equalWeight },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-xs">
            <th className="text-left py-2 pr-4 font-medium">Portfólio</th>
            <th className="text-right py-2 px-3 font-medium">Retorno</th>
            <th className="text-right py-2 px-3 font-medium">Vol.</th>
            <th className="text-right py-2 px-3 font-medium">Sharpe</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ id, label, color, point }) => (
            <tr
              key={id}
              onClick={() => onSelect(id)}
              className={cn(
                'border-b border-border/50 cursor-pointer transition-colors',
                selected === id ? 'bg-accent' : 'hover:bg-accent/50',
              )}
            >
              <td className="py-2 pr-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="font-medium">{label}</span>
                </div>
              </td>
              <td className="text-right py-2 px-3 font-mono text-gain-light">
                {formatPct(point.ret)}
              </td>
              <td className="text-right py-2 px-3 font-mono text-muted-foreground">
                {formatPct(point.vol)}
              </td>
              <td className="text-right py-2 px-3 font-mono font-semibold">
                {point.sharpe.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Custom tooltip for scatter ───────────────────────────────────────────────

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: { payload: { vol: number; ret: number; sharpe: number } }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-background/95 backdrop-blur p-2 text-xs shadow-lg">
      <div>Retorno: <span className="font-semibold text-gain-light">{formatPct(d.ret)}</span></div>
      <div>Volatil.: <span className="font-semibold">{formatPct(d.vol)}</span></div>
      <div>Sharpe: <span className="font-semibold">{d.sharpe?.toFixed(2) ?? '—'}</span></div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EfficientFrontier({ result, onApplyWeights }: Props) {
  const [selected, setSelected] = useState<SelectedPortfolio>('maxSharpe')
  const [activeTab, setActiveTab] = useState<'frontier' | 'allocation' | 'correlation'>('frontier')

  const selectedPoint = useMemo(() => {
    switch (selected) {
      case 'minVariance': return result.minVariance
      case 'maxSharpe':   return result.maxSharpe
      case 'equalWeight': return result.equalWeight
      default: return result.maxSharpe
    }
  }, [selected, result])

  // Downsample Monte Carlo for chart performance
  const mcSample = useMemo(() => {
    const step = Math.max(1, Math.floor(result.monteCarlo.length / 1500))
    return result.monteCarlo.filter((_, i) => i % step === 0).map((p) => ({
      vol: toPercent(p.vol), ret: toPercent(p.ret), sharpe: p.sharpe,
    }))
  }, [result.monteCarlo])

  const frontierData = result.frontier.map((p) => ({ vol: toPercent(p.vol), ret: toPercent(p.ret) }))

  const specialPoints = [
    { vol: toPercent(result.minVariance.vol), ret: toPercent(result.minVariance.ret), sharpe: result.minVariance.sharpe, label: 'Min-Var' },
    { vol: toPercent(result.maxSharpe.vol),   ret: toPercent(result.maxSharpe.ret),   sharpe: result.maxSharpe.sharpe,   label: 'Max-Sharpe' },
    { vol: toPercent(result.equalWeight.vol), ret: toPercent(result.equalWeight.ret), sharpe: result.equalWeight.sharpe, label: 'Equal-W' },
  ]

  const specialColors: Record<string, string> = { 'Min-Var': '#10b981', 'Max-Sharpe': '#f59e0b', 'Equal-W': '#8b5cf6' }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['frontier', 'allocation', 'correlation'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === 'frontier' ? 'Fronteira Eficiente' : tab === 'allocation' ? 'Alocação' : 'Correlação'}
          </button>
        ))}
      </div>

      {activeTab === 'frontier' && (
        <div className="space-y-4">
          {/* Scatter chart */}
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis
                  dataKey="vol" name="Volatilidade" unit="%" type="number"
                  label={{ value: 'Volatilidade (%)', position: 'insideBottom', offset: -10, fontSize: 11 }}
                  tick={{ fontSize: 10 }} tickLine={false}
                />
                <YAxis
                  dataKey="ret" name="Retorno" unit="%" type="number"
                  label={{ value: 'Retorno Esperado (%)', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11 }}
                  tick={{ fontSize: 10 }} tickLine={false}
                />
                <Tooltip content={<ScatterTooltip />} />

                {/* Monte Carlo cloud */}
                <Scatter
                  name="Simulações"
                  data={mcSample}
                  fill="#6b7280"
                  opacity={0.25}
                  r={2}
                />

                {/* Efficient frontier line */}
                <Scatter
                  name="Fronteira"
                  data={frontierData}
                  fill="#3b82f6"
                  line={{ stroke: '#3b82f6', strokeWidth: 2 }}
                  shape={() => null as unknown as React.ReactElement}
                  r={0}
                />

                {/* Special portfolios */}
                {specialPoints.map((p) => (
                  <Scatter
                    key={p.label}
                    name={p.label}
                    data={[p]}
                    fill={specialColors[p.label]}
                    r={7}
                    shape="diamond"
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison table */}
          <PortfolioCompare result={result} selected={selected} onSelect={setSelected} />

          {/* Apply button */}
          {onApplyWeights && (
            <button
              onClick={() => onApplyWeights(weightsRecord(result.tickers, selectedPoint.weights))}
              className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Aplicar pesos &quot;{selected === 'minVariance' ? 'Mínima Variância' : selected === 'maxSharpe' ? 'Máximo Sharpe' : 'Equal-Weight'}&quot; ao Portfólio
            </button>
          )}
        </div>
      )}

      {activeTab === 'allocation' && (
        <div className="space-y-4">
          <PortfolioCompare result={result} selected={selected} onSelect={setSelected} />
          <div className="rounded-lg border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {selected === 'minVariance' ? 'Mínima Variância' : selected === 'maxSharpe' ? 'Máximo Sharpe' : 'Equal-Weight'}
            </h3>
            <AllocationBar tickers={result.tickers} weights={selectedPoint.weights} />
            {/* Per-ticker details */}
            <div className="divide-y divide-border/50">
              {result.tickers.map((t, i) => {
                const w = selectedPoint.weights[i] ?? 0
                const ret = result.expectedReturns[i] ?? 0
                const vol = result.annualVols[i] ?? 0
                return (
                  <div key={t} className="flex items-center justify-between py-1.5 text-sm">
                    <div className="flex items-center gap-2 font-mono font-semibold w-20">{t}</div>
                    <div className="text-muted-foreground text-xs w-16 text-right">Ret: {formatPct(ret)}</div>
                    <div className="text-muted-foreground text-xs w-16 text-right">Vol: {formatPct(vol)}</div>
                    <div className="font-bold w-14 text-right">{(w * 100).toFixed(1)}%</div>
                  </div>
                )
              })}
            </div>
          </div>

          {onApplyWeights && (
            <button
              onClick={() => onApplyWeights(weightsRecord(result.tickers, selectedPoint.weights))}
              className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Aplicar pesos ao Portfólio
            </button>
          )}
        </div>
      )}

      {activeTab === 'correlation' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Correlação de Pearson entre retornos mensais (5 anos). Azul = positiva, Vermelho = negativa.
          </p>
          <CorrelationHeatmap tickers={result.tickers} matrix={result.correlationMatrix} />
        </div>
      )}
    </div>
  )
}
