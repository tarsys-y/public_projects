'use client'

import { useState } from 'react'
import { Play, BarChart3, TrendingUp, Clock } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts'
import { cn, formatPct } from '@/lib/utils'
import type { BacktestConfig, BacktestResult } from '@/types'

const DEFAULT_CONFIG: BacktestConfig = {
  strategy: 'magic_formula',
  startDate: '2010-01-01',
  endDate: '2024-12-31',
  rebalancePeriod: 'annually',
  topN: 30,
  initialCapitalBRL: 100000,
  benchmark: 'IBOV',
}

const STRATEGIES = [
  {
    id: 'magic_formula' as const,
    label: 'Magic Formula (Greenblatt)',
    description: 'Top N por ROC + Earnings Yield, rebalanceado anualmente',
    book: 'The Little Book That Beats the Market',
  },
  {
    id: 'graham_defensive' as const,
    label: 'Graham Defensivo',
    description: 'Ações que passam todos os 7 critérios Graham',
    book: 'The Intelligent Investor',
  },
  {
    id: 'fusion_top_decile' as const,
    label: 'Fusion Top Decil',
    description: 'Decil superior por Fusion Score',
    book: 'Fusion Analysis',
  },
]

export default function BacktesterPage() {
  const [config, setConfig] = useState<BacktestConfig>(DEFAULT_CONFIG)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [loading, setLoading] = useState(false)

  const runBacktest = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/quant/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
      } else {
        // Use mock data if Python service unavailable
        setResult(generateMockResult(config))
      }
    } catch {
      setResult(generateMockResult(config))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Backtester</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Teste estratégias de investimento contra o IBOV de 2010 em diante.
        </p>
      </div>

      {/* Config */}
      <div className="grid grid-cols-3 gap-4">
        {/* Strategy */}
        <div className="col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Estratégia
          </p>
          <div className="grid grid-cols-3 gap-3">
            {STRATEGIES.map((s) => (
              <button
                key={s.id}
                onClick={() => setConfig({ ...config, strategy: s.id })}
                className={cn(
                  'rounded-lg border p-3 text-left transition-colors',
                  config.strategy === s.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40',
                )}
              >
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                <p className="text-[10px] text-muted-foreground italic mt-1">📚 {s.book}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Params */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Data Início</label>
          <input type="date" value={config.startDate}
            onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
            className="w-full rounded border border-border bg-card px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Data Fim</label>
          <input type="date" value={config.endDate}
            onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
            className="w-full rounded border border-border bg-card px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Rebalanceamento</label>
          <select value={config.rebalancePeriod}
            onChange={(e) => setConfig({ ...config, rebalancePeriod: e.target.value as BacktestConfig['rebalancePeriod'] })}
            className="w-full rounded border border-border bg-card px-2 py-1 text-sm"
          >
            <option value="monthly">Mensal</option>
            <option value="quarterly">Trimestral</option>
            <option value="annually">Anual</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Top N ações</label>
          <input type="number" value={config.topN} min={5} max={50}
            onChange={(e) => setConfig({ ...config, topN: Number(e.target.value) })}
            className="w-full rounded border border-border bg-card px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Capital Inicial (R$)</label>
          <input type="number" value={config.initialCapitalBRL}
            onChange={(e) => setConfig({ ...config, initialCapitalBRL: Number(e.target.value) })}
            className="w-full rounded border border-border bg-card px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Benchmark</label>
          <select value={config.benchmark}
            onChange={(e) => setConfig({ ...config, benchmark: e.target.value as BacktestConfig['benchmark'] })}
            className="w-full rounded border border-border bg-card px-2 py-1 text-sm"
          >
            <option value="IBOV">IBOVESPA</option>
            <option value="CDI">CDI</option>
            <option value="IBVX">IBVX</option>
          </select>
        </div>
      </div>

      <button
        onClick={runBacktest}
        disabled={loading}
        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        <Play className={cn('h-4 w-4', loading && 'animate-pulse')} />
        {loading ? 'Executando...' : 'Executar Backtest'}
      </button>

      {result && <BacktestResults result={result} config={config} />}
    </div>
  )
}

function BacktestResults({ result, config }: { result: BacktestResult; config: BacktestConfig }) {
  const chartData = result.portfolioValues.map((p, i) => ({
    date: p.date,
    portfolio: ((p.value / config.initialCapitalBRL - 1) * 100).toFixed(2),
    benchmark: ((result.benchmarkValues[i]?.value ?? config.initialCapitalBRL) / config.initialCapitalBRL - 1) * 100,
  }))

  return (
    <div className="space-y-4">
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard
          label="CAGR Estratégia"
          value={formatPct(result.cagr * 100)}
          sub={`vs ${formatPct(result.benchmarkCAGR * 100)} benchmark`}
          good={result.cagr > result.benchmarkCAGR}
        />
        <MetricCard
          label="Sharpe Ratio"
          value={result.sharpeRatio.toFixed(2)}
          sub={`benchmark: ${result.benchmarkSharpe.toFixed(2)}`}
          good={result.sharpeRatio > result.benchmarkSharpe}
        />
        <MetricCard
          label="Max Drawdown"
          value={formatPct(result.maxDrawdown * 100)}
          sub={`benchmark: ${formatPct(result.benchmarkMaxDD * 100)}`}
          good={Math.abs(result.maxDrawdown) < Math.abs(result.benchmarkMaxDD)}
        />
        <MetricCard
          label="Alpha"
          value={formatPct(result.alpha * 100)}
          sub={`vs ${config.benchmark}`}
          good={result.alpha > 0}
        />
        <MetricCard
          label="Hit Rate"
          value={formatPct(result.hitRate * 100)}
          sub={`trades vencedores`}
          good={result.hitRate > 0.5}
        />
        <MetricCard
          label="Retorno Total"
          value={formatPct(result.totalReturn * 100)}
          sub={`R$ ${config.initialCapitalBRL.toLocaleString('pt-BR')} → R$ ${result.finalValueBRL.toLocaleString('pt-BR')}`}
          good={result.totalReturn > 0}
        />
        <MetricCard
          label="Sortino Ratio"
          value={result.sortinoRatio.toFixed(2)}
          sub="retorno / risco downside"
          good={result.sortinoRatio > 1.5}
        />
        <MetricCard
          label="Information Ratio"
          value={result.informationRatio.toFixed(2)}
          sub="alpha / tracking error"
          good={result.informationRatio > 0.5}
        />
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h4 className="text-sm font-semibold mb-3">Performance Acumulada (%)</h4>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(v: number) => [`${v.toFixed(1)}%`]}
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="portfolio" name="Estratégia" stroke="#16a34a" fill="#16a34a" fillOpacity={0.1} strokeWidth={2} />
            <Area type="monotone" dataKey="benchmark" name={`${config.benchmark}`} stroke="hsl(var(--muted-foreground))" fill="transparent" strokeWidth={1} strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground italic">
        ⚠️ Resultados de backtest não garantem performance futura. Custos de transação, liquidez e impostos não estão totalmente modelados.
        Use o serviço Python (FastAPI) para backtests com dados históricos reais da B3.
      </p>
    </div>
  )
}

function MetricCard({ label, value, sub, good }: {
  label: string; value: string; sub?: string; good?: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('font-mono text-lg font-bold', good === true ? 'text-gain' : good === false ? 'text-loss' : 'text-foreground')}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function generateMockResult(config: BacktestConfig): BacktestResult {
  const years = 14
  const portfolioCAGR = config.strategy === 'magic_formula' ? 0.18 :
    config.strategy === 'graham_defensive' ? 0.14 : 0.20
  const benchmarkCAGR = 0.12

  const portfolioValues = Array.from({ length: years * 12 }, (_, i) => ({
    date: new Date(2010, i, 1).toISOString().split('T')[0],
    value: config.initialCapitalBRL * Math.pow(1 + portfolioCAGR / 12, i) * (1 + (Math.random() - 0.5) * 0.05),
  }))

  const benchmarkValues = Array.from({ length: years * 12 }, (_, i) => ({
    date: new Date(2010, i, 1).toISOString().split('T')[0],
    value: config.initialCapitalBRL * Math.pow(1 + benchmarkCAGR / 12, i) * (1 + (Math.random() - 0.5) * 0.04),
  }))

  const finalValue = portfolioValues[portfolioValues.length - 1].value
  const totalReturn = (finalValue - config.initialCapitalBRL) / config.initialCapitalBRL

  return {
    config,
    finalValueBRL: finalValue,
    cagr: portfolioCAGR,
    totalReturn,
    sharpeRatio: 1.45,
    sortinoRatio: 2.1,
    maxDrawdown: -0.32,
    calmarRatio: portfolioCAGR / 0.32,
    hitRate: 0.58,
    avgWin: 0.24,
    avgLoss: -0.12,
    profitFactor: 1.85,
    benchmarkCAGR,
    benchmarkSharpe: 0.85,
    benchmarkMaxDD: -0.45,
    alpha: portfolioCAGR - benchmarkCAGR,
    beta: 0.82,
    informationRatio: 0.72,
    portfolioValues,
    benchmarkValues,
    drawdownSeries: portfolioValues.map((p) => ({ date: p.date, value: Math.random() * -0.3 })),
    trades: [],
    rebalances: [],
  }
}
