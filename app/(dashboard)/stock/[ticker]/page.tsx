'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { ArrowLeft, Star, Plus, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { cn, formatBRL, formatPct, changeClass, decisionBadgeClass, fusionScoreColor, mosColor } from '@/lib/utils'
import { DecisionCard } from '@/components/decision-card'
import { PriceChart } from '@/components/price-chart'
import { DCFModel } from '@/components/dcf-model'
import { FusionRadar } from '@/components/fusion-radar'
import { DataFreshness } from '@/components/data-freshness'
import type {
  Quote, HistoricalBar, GrahamAnalysis, DamodaranAnalysis,
  QuantAnalysis, FusionAnalysis, FisherChecklist,
} from '@/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Tab = 'overview' | 'graham' | 'fisher' | 'damodaran' | 'magic' | 'quant' | 'fusion'

const TABS: { id: Tab; label: string; book: string }[] = [
  { id: 'overview', label: 'Visão Geral', book: '' },
  { id: 'graham', label: 'Graham', book: 'The Intelligent Investor' },
  { id: 'fisher', label: 'Fisher', book: 'Common Stocks' },
  { id: 'damodaran', label: 'Damodaran DCF', book: 'Investment Valuation' },
  { id: 'magic', label: 'Magic Formula', book: 'The Little Book' },
  { id: 'quant', label: 'Quant', book: 'The Man Who Solved' },
  { id: 'fusion', label: 'Fusion', book: 'Fusion Analysis' },
]

interface StockData {
  stock: { ticker: string; name: string; sector: string; subsector: string }
  quote: Quote
  history: HistoricalBar[]
  graham: GrahamAnalysis
  damodaran: DamodaranAnalysis
  quant: QuantAnalysis
  fusion: FusionAnalysis
  fisher: FisherChecklist
  fundamentals: Record<string, unknown>
}

export default function StockDetailPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const prevDataRef = useRef<unknown>(null)

  const { data: res, isLoading, mutate } = useSWR<{ data: StockData }>(
    `/api/stock/${ticker}`,
    fetcher,
    { revalidateOnFocus: false },
  )

  useEffect(() => {
    if (res && res !== prevDataRef.current) {
      prevDataRef.current = res
      setFetchedAt(Date.now())
    }
  }, [res])

  if (isLoading) return <StockDetailSkeleton ticker={ticker} />
  if (!res?.data) return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-muted-foreground">Ação {ticker} não encontrada.</p>
      <Link href="/screener" className="mt-2 text-sm text-primary hover:underline">
        ← Voltar ao Screener
      </Link>
    </div>
  )

  const { stock, quote, history, graham, damodaran, quant, fusion, fisher, fundamentals } = res.data

  return (
    <div className="space-y-4 pb-8">
      {/* Back + Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/screener"
            className="mt-1 flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Screener
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-3xl font-semibold">{ticker}</h1>
              <span className={cn('rounded-md border px-3 py-1 text-sm font-bold', decisionBadgeClass(fusion.decision))}>
                {fusion.decision} · {fusion.confidence}%
              </span>
            </div>
            <p className="text-muted-foreground">{stock.name}</p>
            <p className="text-xs text-muted-foreground">
              {stock.sector} · {stock.subsector}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="font-mono text-2xl font-bold">R$ {quote.price.toFixed(2)}</p>
            <p className={cn('font-mono text-sm', changeClass(quote.changePercent))}>
              {quote.change >= 0 ? '+' : ''}R$ {quote.change.toFixed(2)} ({formatPct(quote.changePercent)})
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => mutate()}
              className="rounded-md border border-border p-2 hover:bg-accent transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <DataFreshness source="Yahoo Finance" fetchedAt={isLoading ? null : fetchedAt} staleAfterMs={60_000} />
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <KPI label="Fusion Score" value={fusion.fusionScore.toFixed(0)} valueClass={fusionScoreColor(fusion.fusionScore)} sub="ponderado" />
        <KPI label="DCF MoS" value={`${damodaran.marginOfSafety.toFixed(1)}%`} valueClass={mosColor(damodaran.marginOfSafety)} sub={`IV: R$ ${damodaran.intrinsicValuePerShare.toFixed(2)}`} />
        <KPI label="Graham #" value={`R$ ${graham.grahamNumber.toFixed(2)}`} valueClass={graham.grahamNumber > quote.price ? 'text-gain' : 'text-loss'} sub={`${graham.passedCriteria}/7 critérios`} />
        <KPI label="WACC" value={`${(damodaran.inputs.wacc * 100).toFixed(2)}%`} valueClass="text-foreground" sub={`Ke: ${(damodaran.inputs.costOfEquity * 100).toFixed(2)}%`} />
        <KPI label="Beta vs IBOV" value={quant.beta.toFixed(2)} valueClass="text-foreground" sub={`Vol: ${(quant.volatility90d * 100).toFixed(1)}%`} />
        <KPI label="Momentum 12-1" value={formatPct(quant.momentum12_1 * 100)} valueClass={quant.momentum12_1 > 0 ? 'text-gain' : 'text-loss'} sub={`Z: ${quant.meanReversionZScore.toFixed(2)}`} />
      </div>

      {/* Decision Card */}
      <DecisionCard fusion={fusion} currentPrice={quote.price} />

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-0 overflow-x-auto">
          {TABS.map(({ id, label, book }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-2 text-sm transition-colors',
                activeTab === id
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
              title={book}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab quote={quote} history={history} graham={graham} damodaran={damodaran} quant={quant} fundamentals={fundamentals} />
      )}
      {activeTab === 'graham' && <GrahamTab graham={graham} quote={quote} />}
      {activeTab === 'fisher' && <FisherTab fisher={fisher} />}
      {activeTab === 'damodaran' && (
        <DamodaranTab damodaran={damodaran} fundamentals={fundamentals} currentPrice={quote.price} />
      )}
      {activeTab === 'magic' && <MagicTab fundamentals={fundamentals} />}
      {activeTab === 'quant' && <QuantTab quant={quant} history={history} />}
      {activeTab === 'fusion' && <FusionTab fusion={fusion} />}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KPI({ label, value, valueClass, sub }: { label: string; value: string; valueClass?: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn('font-mono text-lg font-bold', valueClass)}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function OverviewTab({ quote, history, graham, damodaran, quant, fundamentals }: {
  quote: Quote
  history: HistoricalBar[]
  graham: GrahamAnalysis
  damodaran: DamodaranAnalysis
  quant: QuantAnalysis
  fundamentals: Record<string, unknown>
}) {
  return (
    <div className="space-y-4">
      <PriceChart
        data={history}
        ticker={quote.ticker}
        intrinsicValue={damodaran.intrinsicValuePerShare}
        grahamNumber={graham.grahamNumber}
      />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Dados de Mercado</h4>
          <StatsGrid rows={[
            { label: 'Abertura', value: `R$ ${quote.openPrice.toFixed(2)}` },
            { label: 'Fechamento Anterior', value: `R$ ${quote.previousClose.toFixed(2)}` },
            { label: 'Máxima 52 semanas', value: `R$ ${quote.high52w.toFixed(2)}` },
            { label: 'Mínima 52 semanas', value: `R$ ${quote.low52w.toFixed(2)}` },
            { label: 'Volume', value: quote.volume.toLocaleString('pt-BR') },
            { label: 'Market Cap', value: `R$ ${(quote.marketCap / 1e9).toFixed(1)}B` },
          ]} />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Múltiplos</h4>
          <StatsGrid rows={[
            { label: 'P/L', value: (fundamentals.pe as number)?.toFixed(1) ?? '–' },
            { label: 'P/VP', value: (fundamentals.pb as number)?.toFixed(2) ?? '–' },
            { label: 'EV/EBITDA', value: (fundamentals.evEbitda as number)?.toFixed(1) ?? '–' },
            { label: 'ROE', value: `${((fundamentals.roe as number) * 100)?.toFixed(1) ?? '–'}%` },
            { label: 'Margem EBIT', value: `${((fundamentals.ebitMargin as number) * 100)?.toFixed(1) ?? '–'}%` },
            { label: 'Dívida Líq./PL', value: (fundamentals.debtToEquity as number)?.toFixed(2) ?? '–' },
          ]} />
        </div>
      </div>
    </div>
  )
}

function StatsGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="rounded-lg border border-border divide-y divide-border/50">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between px-3 py-1.5">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="font-mono text-xs">{value}</span>
        </div>
      ))}
    </div>
  )
}

function GrahamTab({ graham, quote }: { graham: GrahamAnalysis; quote: Quote }) {
  const criteria: { label: string; pass: boolean; detail: string; rule: string }[] = [
    { label: 'P/L < 15', pass: graham.peLessThan15, detail: `P/L atual: ${quote.price > 0 ? (quote.price / (graham.grahamNumber ** 2 / 22.5 / quote.price)).toFixed(1) : '–'}`, rule: 'Evitar especulação de crescimento' },
    { label: 'P/VP < 1.5', pass: graham.pbLessThan15, detail: 'Abaixo do patrimônio líquido', rule: 'Proteção downside pelo balanço' },
    { label: 'P/L × P/VP < 22.5', pass: graham.pePbProduct, detail: 'Produto combinado', rule: 'Equivalente ao Graham Number' },
    { label: 'Liquidez Corrente ≥ 2', pass: graham.currentRatioAbove2, detail: 'Saúde financeira curto prazo', rule: 'Fortaleza financeira' },
    { label: 'Lucros positivos 10 anos', pass: graham.positiveEarnings10y, detail: 'Sem prejuízos nos últimos 10 anos', rule: 'Estabilidade de resultados' },
    { label: 'Dividendos 20 anos', pass: graham.dividendHistory20y, detail: 'Histórico ininterrupto', rule: 'Comprometimento com shareholders' },
    { label: 'Crescimento EPS ≥ 33% em 10a', pass: graham.earningsGrowth33p, detail: 'Crescimento mínimo acumulado', rule: 'Progresso moderado mas real' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg">Critérios Graham — Investidor Defensivo</h3>
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gain" style={{ width: `${(graham.passedCriteria / 7) * 100}%` }} />
          </div>
          <span className="font-mono text-sm font-bold">
            {graham.passedCriteria}/7 ({graham.grahamScore.toFixed(0)})
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {criteria.map(({ label, pass, detail, rule }) => (
          <div key={label} className={cn('flex items-start gap-3 rounded-lg border p-3', pass ? 'border-gain/20 bg-gain/5' : 'border-loss/20 bg-loss/5')}>
            <span className={cn('mt-0.5 text-base', pass ? 'text-gain' : 'text-loss')}>
              {pass ? '✓' : '✗'}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{detail}</p>
            </div>
            <p className="text-xs text-muted-foreground italic text-right max-w-[160px]">{rule}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Graham Number</p>
          <p className="font-mono text-2xl font-bold">R$ {graham.grahamNumber.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">√(22.5 × EPS × VP/Ação)</p>
          <p className={cn('mt-2 text-sm font-medium', graham.grahamNumber > (quote?.price ?? 0) ? 'text-gain' : 'text-loss')}>
            {graham.grahamNumber > (quote?.price ?? 0) ? `${(((graham.grahamNumber - quote.price) / graham.grahamNumber) * 100).toFixed(1)}% abaixo do Graham #` : `${(((quote.price - graham.grahamNumber) / graham.grahamNumber) * 100).toFixed(1)}% acima do Graham #`}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Valor Intrínseco Graham</p>
          <p className="font-mono text-2xl font-bold">R$ {graham.intrinsicValue.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">EPS × (8.5 + 2g) × 4.4 / Y</p>
          <p className={cn('mt-2 text-sm font-medium', mosColor(graham.marginOfSafety))}>
            MoS: {graham.marginOfSafety.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  )
}

function FisherTab({ fisher }: { fisher: FisherChecklist }) {
  const qualitativeItems: { key: keyof FisherChecklist; label: string; description: string }[] = [
    { key: 'marketPotential', label: 'Potencial de mercado', description: 'Produtos/serviços com potencial para crescimento de vendas por vários anos' },
    { key: 'productPipelineStrength', label: 'Pipeline de produto', description: 'Gestão determinada a continuar desenvolvendo novos produtos' },
    { key: 'rdeEffectiveness', label: 'P&D eficaz', description: 'P&D eficaz em relação ao tamanho da empresa' },
    { key: 'salesOrganization', label: 'Organização de vendas', description: 'Organização de vendas acima da média' },
    { key: 'worthwhileProfitMargin', label: 'Margem de lucro atraente', description: 'Margem de lucro líquida acima do setor' },
    { key: 'marginImprovementPlan', label: 'Melhora de margem', description: 'A empresa está ativamente melhorando suas margens' },
    { key: 'laborRelations', label: 'Relações trabalhistas', description: 'Relações com funcionários excelentes' },
    { key: 'executiveRelations', label: 'Relações executivas', description: 'Harmonia entre executivos sênior' },
    { key: 'managementDepth', label: 'Profundidade gerencial', description: 'Gestão com profundidade (não depende de 1 pessoa)' },
    { key: 'costControls', label: 'Controle de custos', description: 'Análise de custos e controles contábeis sólidos' },
    { key: 'industryPosition', label: 'Posição no setor', description: 'Aspectos do negócio exclusivos que indicam posição diferenciada' },
    { key: 'longRangeOutlook', label: 'Visão de longo prazo', description: 'Gestão orientada ao longo prazo, não ao próximo trimestre' },
    { key: 'noDilutionRisk', label: 'Sem diluição futura', description: 'Sem necessidade previsível de emissão de ações que dilua os atuais acionistas' },
    { key: 'managementTransparency', label: 'Transparência', description: 'Gestão comunica abertamente tanto em bons quanto maus momentos' },
    { key: 'managementIntegrity', label: 'Integridade da gestão', description: 'Integridade da gestão é inquestionável' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg">Fisher 15-Point Checklist</h3>
        <div className="text-sm text-muted-foreground">
          Preencha os itens qualitativos para melhorar o Fisher Score
        </div>
      </div>

      {/* Auto metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">CAGR Receita 5a</p>
          <p className={cn('font-mono text-lg font-bold', fisher.revenueCAGR5y > 0.10 ? 'text-gain' : 'text-warning')}>
            {(fisher.revenueCAGR5y * 100).toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Consistência ROE (σ)</p>
          <p className={cn('font-mono text-lg font-bold', fisher.roeConsistency < 0.05 ? 'text-gain' : 'text-warning')}>
            {(fisher.roeConsistency * 100).toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">P&D / Receita</p>
          <p className={cn('font-mono text-lg font-bold', fisher.rdeRatio > 0.02 ? 'text-gain' : 'text-muted-foreground')}>
            {(fisher.rdeRatio * 100).toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Tendência Margem Op.</p>
          <p className={cn('font-mono text-lg font-bold', fisher.operatingMarginTrend > 0 ? 'text-gain' : 'text-loss')}>
            {fisher.operatingMarginTrend > 0 ? '▲' : '▼'} {Math.abs(fisher.operatingMarginTrend * 100).toFixed(2)}pp/a
          </p>
        </div>
      </div>

      {/* Qualitative checklist */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Checklist Qualitativo (método Scuttlebutt)
        </p>
        {qualitativeItems.map(({ key, label, description }) => {
          const val = fisher[key] as boolean | null
          return (
            <div key={key} className={cn('flex items-center gap-3 rounded-lg border p-3 transition-colors',
              val === true ? 'border-gain/20 bg-gain/5' :
              val === false ? 'border-loss/20 bg-loss/5' :
              'border-border bg-card',
            )}>
              <div className="flex gap-2">
                <button
                  className={cn('h-6 w-6 rounded text-xs font-bold transition-colors',
                    val === true ? 'bg-gain text-white' : 'bg-muted text-muted-foreground hover:bg-gain/20',
                  )}
                >✓</button>
                <button
                  className={cn('h-6 w-6 rounded text-xs font-bold transition-colors',
                    val === false ? 'bg-loss text-white' : 'bg-muted text-muted-foreground hover:bg-loss/20',
                  )}
                >✗</button>
              </div>
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <span className={cn('ml-auto text-xs', val === null ? 'text-muted-foreground italic' : '')}>
                {val === null ? 'não avaliado' : ''}
              </span>
            </div>
          )
        })}
      </div>

      {/* Scuttlebutt notes */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Notas Scuttlebutt (observações qualitativas)
        </label>
        <textarea
          defaultValue={fisher.scuttlebuttNotes}
          placeholder="Registre suas observações sobre a empresa — falar com clientes, fornecedores, ex-funcionários, concorrentes (método Fisher)..."
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          rows={4}
        />
      </div>
    </div>
  )
}

function DamodaranTab({ damodaran, fundamentals, currentPrice }: {
  damodaran: DamodaranAnalysis
  fundamentals: Record<string, unknown>
  currentPrice: number
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-serif text-lg">Damodaran DCF — Modelo Interativo</h3>
      <DCFModel
        analysis={damodaran}
        baseRevenue={fundamentals.revenue as number ?? 0}
        baseEbitMargin={fundamentals.ebitMargin as number ?? 0.1}
        netDebt={fundamentals.netDebt as number ?? 0}
        sharesOutstanding={fundamentals.sharesOutstanding as number ?? 1}
        currentPrice={currentPrice}
      />
    </div>
  )
}

function MagicTab({ fundamentals }: { fundamentals: Record<string, unknown> }) {
  const greenblattScore = fundamentals.greenblattScore as number ?? 50
  const roc = fundamentals.roc as number ?? 0
  const earningsYield = fundamentals.earningsYield as number ?? 0

  return (
    <div className="space-y-4">
      <h3 className="font-serif text-lg">Greenblatt Magic Formula</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Return on Capital</p>
          <p className={cn('font-mono text-2xl font-bold', roc > 0.15 ? 'text-gain' : roc > 0 ? 'text-warning' : 'text-loss')}>
            {(roc * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">EBIT / (NWC + Ativos Fixos)</p>
          <p className="text-[10px] text-muted-foreground italic mt-2">
            Meta: &gt; 15% (bom negócio por Greenblatt)
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Earnings Yield</p>
          <p className={cn('font-mono text-2xl font-bold', earningsYield > 0.08 ? 'text-gain' : earningsYield > 0 ? 'text-warning' : 'text-loss')}>
            {(earningsYield * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">EBIT / Enterprise Value</p>
          <p className="text-[10px] text-muted-foreground italic mt-2">
            Meta: &gt; SELIC (preço razoável)
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Magic Formula Score</p>
          <p className={cn('font-mono text-2xl font-bold', greenblattScore >= 70 ? 'text-gain' : greenblattScore >= 45 ? 'text-warning' : 'text-loss')}>
            {greenblattScore.toFixed(0)}/100
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full', greenblattScore >= 70 ? 'bg-gain' : greenblattScore >= 45 ? 'bg-warning' : 'bg-loss')}
              style={{ width: `${greenblattScore}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground italic mt-2">
            Percentil no universo B3 (ROC + EY combinados)
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm font-medium mb-2">Como funciona a Magic Formula</p>
        <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
          <li>Calcule ROC para todas as ações do universo → rank 1..n (menor rank = maior ROC)</li>
          <li>Calcule Earnings Yield para todas → rank 1..n (menor rank = maior EY)</li>
          <li>Some os dois ranks: combinedRank = ROC_rank + EY_rank</li>
          <li>Compre as 30 ações com menor combinedRank</li>
          <li>Rebalanceie anualmente</li>
        </ol>
        <p className="mt-2 text-xs text-muted-foreground italic">
          📚 The Little Book That Beats the Market — Joel Greenblatt. Exclui bancos, seguradoras e utilidades.
        </p>
      </div>
    </div>
  )
}

function QuantTab({ quant, history }: { quant: QuantAnalysis; history: HistoricalBar[] }) {
  return (
    <div className="space-y-4">
      <h3 className="font-serif text-lg">Sinais Quantitativos</h3>
      <div className="grid grid-cols-3 gap-4">
        <QuantSignal
          label="Momentum 12-1"
          value={`${(quant.momentum12_1 * 100).toFixed(1)}%`}
          subValue={`Z: ${quant.momentumZScore.toFixed(2)}`}
          signal={quant.momentum12_1 > 0.10 ? 'positive' : quant.momentum12_1 > 0 ? 'neutral' : 'negative'}
          description="Retorno dos últimos 13 meses excluindo o último mês (evita reversão curto prazo)"
          source="The Man Who Solved the Market"
        />
        <QuantSignal
          label="Mean Reversion Z-Score"
          value={quant.meanReversionZScore.toFixed(2)}
          subValue={`vs MA200: ${quant.priceVsMa200pct.toFixed(1)}%`}
          signal={quant.meanReversionZScore < -1.5 ? 'positive' : quant.meanReversionZScore > 1.5 ? 'negative' : 'neutral'}
          description="Desvios padrão do preço acima/abaixo da média móvel de 200 dias"
          source="Análise Quantitativa / Simons"
        />
        <QuantSignal
          label="Volatilidade 90d"
          value={`${(quant.volatility90d * 100).toFixed(1)}%`}
          subValue={`Regime: ${quant.volatilityRegime}`}
          signal={quant.volatility90d < 0.25 ? 'positive' : quant.volatility90d > 0.45 ? 'negative' : 'neutral'}
          description="Desvio padrão dos log-retornos diários × √252"
          source="Risk Management"
        />
        <QuantSignal
          label="Beta vs IBOV"
          value={quant.beta.toFixed(2)}
          subValue={`Beta 63d: ${quant.rollingBeta63d.toFixed(2)}`}
          signal="neutral"
          description="Sensibilidade às variações do IBOV (252 dias úteis, retornos diários)"
          source="CAPM / Damodaran"
        />
        <QuantSignal
          label="Anomalia de Volume"
          value={`${quant.volumeAnomaly.toFixed(1)}x`}
          subValue="vs média 20 dias"
          signal={quant.volumeAnomaly > 2 ? 'neutral' : 'neutral'}
          description="Volume atual dividido pela média dos últimos 20 dias. >2x pode indicar atividade institucional"
          source="Análise Técnica"
        />
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground mb-1">Quant Score</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted mb-1">
            <div className={cn('h-full rounded-full', quant.quantScore >= 70 ? 'bg-gain' : quant.quantScore >= 45 ? 'bg-warning' : 'bg-loss')}
              style={{ width: `${quant.quantScore}%` }} />
          </div>
          <p className={cn('font-mono text-2xl font-bold', quant.quantScore >= 70 ? 'text-gain' : quant.quantScore >= 45 ? 'text-warning' : 'text-loss')}>
            {quant.quantScore.toFixed(0)}
          </p>
          <p className="text-[10px] text-muted-foreground italic mt-1">
            Combinação: momentum + mean-reversion + volatilidade
          </p>
        </div>
      </div>
    </div>
  )
}

function QuantSignal({ label, value, subValue, signal, description, source }: {
  label: string
  value: string
  subValue: string
  signal: 'positive' | 'negative' | 'neutral'
  description: string
  source: string
}) {
  return (
    <div className={cn('rounded-lg border p-3',
      signal === 'positive' ? 'border-gain/20 bg-gain/5' :
      signal === 'negative' ? 'border-loss/20 bg-loss/5' :
      'border-border bg-card',
    )}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('font-mono text-xl font-bold',
        signal === 'positive' ? 'text-gain' : signal === 'negative' ? 'text-loss' : 'text-foreground',
      )}>{value}</p>
      <p className="text-xs text-muted-foreground">{subValue}</p>
      <p className="mt-2 text-[11px] text-muted-foreground leading-tight">{description}</p>
      <p className="mt-1 text-[10px] text-muted-foreground italic">📚 {source}</p>
    </div>
  )
}

function FusionTab({ fusion }: { fusion: FusionAnalysis }) {
  return (
    <div className="space-y-4">
      <h3 className="font-serif text-lg">Fusion Score — Análise Integrada</h3>
      <FusionRadar fusion={fusion} />
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm font-medium mb-1">O que é o Fusion Score?</p>
        <p className="text-sm text-muted-foreground">
          O Fusion Score integra cinco frameworks de investimento em uma pontuação única de 0 a 100.
          Inspirado em <em>Fusion Analysis</em> de V. John Palicka, ele combina análise fundamental
          (Graham, Fisher, Damodaran), análise de qualidade (Greenblatt) e sinais quantitativos (Simons).
          Uma ação com Fusion ≥ 70 e MoS ≥ 30% representa a melhor convergência de critérios.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Pesos padrão: Graham 20% + Fisher 20% + Greenblatt 20% + Damodaran 25% + Quant 15%
        </p>
      </div>
    </div>
  )
}

function StockDetailSkeleton({ ticker }: { ticker: string }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-32 rounded bg-muted" />
      <div className="h-6 w-64 rounded bg-muted" />
      <div className="grid grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted" />)}
      </div>
      <div className="h-40 rounded-lg bg-muted" />
    </div>
  )
}

