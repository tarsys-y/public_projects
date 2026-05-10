'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, BookOpen, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react'
import { cn, formatBRL, formatPct, changeClass, fusionScoreColor, generateId, formatDatetime } from '@/lib/utils'
import type { Position, DecisionEntry } from '@/types'

// ─── Portfolio Store (localStorage) ────────────────────────────────────────

function usePortfolio() {
  const [positions, setPositions] = useState<Position[]>([])
  const [journal, setJournal] = useState<DecisionEntry[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('b3_portfolio')
    if (saved) setPositions(JSON.parse(saved))
    const savedJournal = localStorage.getItem('b3_journal')
    if (savedJournal) setJournal(JSON.parse(savedJournal))
  }, [])

  const savePositions = (p: Position[]) => {
    setPositions(p)
    localStorage.setItem('b3_portfolio', JSON.stringify(p))
  }

  const saveJournal = (j: DecisionEntry[]) => {
    setJournal(j)
    localStorage.setItem('b3_journal', JSON.stringify(j))
  }

  const addPosition = (pos: Omit<Position, 'id'>) => {
    savePositions([...positions, { ...pos, id: generateId() }])
  }

  const removePosition = (id: string) => {
    savePositions(positions.filter((p) => p.id !== id))
  }

  const addJournalEntry = (entry: Omit<DecisionEntry, 'id' | 'timestamp'>) => {
    saveJournal([
      { ...entry, id: generateId(), timestamp: new Date().toISOString() },
      ...journal,
    ])
  }

  return { positions, journal, addPosition, removePosition, addJournalEntry, saveJournal }
}

export default function PortfolioPage() {
  const { positions, journal, addPosition, removePosition, addJournalEntry, saveJournal } = usePortfolio()
  const [tab, setTab] = useState<'holdings' | 'journal' | 'risk'>('holdings')
  const [showAddPosition, setShowAddPosition] = useState(false)
  const [showAddJournal, setShowAddJournal] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Portfolio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe seus investimentos e registre suas decisões no Diário de Apostas.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddPosition(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adicionar Posição
          </button>
        </div>
      </div>

      {/* Summary */}
      {positions.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <SummaryCard label="Posições" value={String(positions.length)} sub="ativos" />
          <SummaryCard label="Entradas no Diário" value={String(journal.length)} sub="decisões registradas" />
          <SummaryCard label="Revisadas" value={String(journal.filter((j) => j.reviewed).length)} sub={`de ${journal.length}`} />
          <SummaryCard label="Taxa de Acerto" value={`${journal.filter((j) => j.reviewed && (j.actualPrice ?? 0) > (j.priceAtDecision)).length}/${journal.filter((j) => j.reviewed).length}`} sub="decisions reviewed" />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-0">
          {[
            { id: 'holdings' as const, label: 'Posições' },
            { id: 'journal' as const, label: 'Diário de Decisões' },
            { id: 'risk' as const, label: 'Risco & Métricas' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'border-b-2 px-4 py-2 text-sm transition-colors',
                tab === id
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'holdings' && (
        <HoldingsTab
          positions={positions}
          onRemove={removePosition}
          onAddJournal={() => setShowAddJournal(true)}
        />
      )}
      {tab === 'journal' && (
        <JournalTab
          journal={journal}
          onAdd={() => setShowAddJournal(true)}
          onUpdateReview={(id, review) => {
            const updated = journal.map((j) => j.id === id ? { ...j, ...review, reviewed: true } : j)
            saveJournal(updated)
          }}
        />
      )}
      {tab === 'risk' && <RiskTab positions={positions} />}

      {/* Add Position Modal */}
      {showAddPosition && (
        <AddPositionModal
          onAdd={(pos) => { addPosition(pos); setShowAddPosition(false) }}
          onClose={() => setShowAddPosition(false)}
        />
      )}

      {/* Add Journal Entry Modal */}
      {showAddJournal && (
        <AddJournalModal
          onAdd={(entry) => { addJournalEntry(entry); setShowAddJournal(false) }}
          onClose={() => setShowAddJournal(false)}
        />
      )}
    </div>
  )
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

function HoldingsTab({ positions, onRemove, onAddJournal }: {
  positions: Position[]
  onRemove: (id: string) => void
  onAddJournal: () => void
}) {
  if (positions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
        <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Nenhuma posição registrada</p>
        <p className="text-xs text-muted-foreground mt-1">
          Adicione posições para acompanhar seu portfólio e calcular métricas de risco
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {positions.map((pos) => (
        <div key={pos.id} className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
          <div className="min-w-[70px]">
            <p className="font-mono font-bold">{pos.ticker}</p>
            <p className="text-xs text-muted-foreground">{pos.shares} cotas</p>
          </div>
          <div className="flex-1">
            <p className="text-sm">PM: R$ {pos.avgCostBRL.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total investido: R$ {(pos.shares * pos.avgCostBRL).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Entrada</p>
            <p className="text-xs">{pos.entryDate}</p>
          </div>
          {pos.notes && (
            <p className="text-xs text-muted-foreground max-w-[200px] truncate">{pos.notes}</p>
          )}
          <button
            onClick={() => onRemove(pos.id)}
            className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-loss/10 hover:text-loss transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

function JournalTab({ journal, onAdd, onUpdateReview }: {
  journal: DecisionEntry[]
  onAdd: () => void
  onUpdateReview: (id: string, review: Partial<DecisionEntry>) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Registre cada decisão de investimento com suas premissas e confiança. Revise depois para separar qualidade da decisão do resultado.
        </p>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          Nova Entrada
        </button>
      </div>

      {journal.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Diário vazio</p>
          <p className="text-xs text-muted-foreground mt-1">
            Registre a qualidade das suas decisões, não apenas os resultados — Annie Duke
          </p>
        </div>
      )}

      {journal.map((entry) => (
        <JournalEntry key={entry.id} entry={entry} onUpdateReview={(r) => onUpdateReview(entry.id, r)} />
      ))}
    </div>
  )
}

function JournalEntry({ entry, onUpdateReview }: {
  entry: DecisionEntry
  onUpdateReview: (review: Partial<DecisionEntry>) => void
}) {
  const [showReview, setShowReview] = useState(false)

  const actionColor =
    entry.action === 'Buy' ? 'text-gain' :
    entry.action === 'Sell' ? 'text-loss' :
    'text-warning'

  return (
    <div className={cn('rounded-lg border bg-card p-4', entry.reviewed ? 'border-border' : 'border-warning/30')}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold">{entry.ticker}</span>
          <span className={cn('text-sm font-semibold', actionColor)}>{entry.action}</span>
          <span className="font-mono text-sm">R$ {entry.priceAtDecision.toFixed(2)}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Confiança: {entry.confidence}/10
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{formatDatetime(entry.timestamp)}</span>
      </div>

      <p className="text-sm mb-2">{entry.rationale}</p>

      {entry.keyAssumptions.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">Premissas:</p>
          <ul className="text-xs text-muted-foreground list-disc list-inside">
            {entry.keyAssumptions.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {!entry.reviewed && (
        <button
          onClick={() => setShowReview(!showReview)}
          className="text-xs text-primary hover:underline"
        >
          {showReview ? 'Cancelar revisão' : '+ Adicionar revisão retrospectiva'}
        </button>
      )}

      {entry.reviewed && (
        <div className="mt-2 rounded-md bg-muted/50 p-2">
          <p className="text-xs font-medium text-muted-foreground">Revisão ({entry.reviewDate})</p>
          <p className="text-sm mt-1">{entry.lessonLearned}</p>
          {entry.actualPrice && (
            <p className={cn('font-mono text-xs mt-1', (entry.actualPrice > entry.priceAtDecision) ? 'text-gain' : 'text-loss')}>
              Preço final: R$ {entry.actualPrice.toFixed(2)} ({entry.actualPrice > entry.priceAtDecision ? '+' : ''}{(((entry.actualPrice - entry.priceAtDecision) / entry.priceAtDecision) * 100).toFixed(1)}%)
            </p>
          )}
        </div>
      )}

      {showReview && (
        <ReviewForm onSubmit={(review) => { onUpdateReview(review); setShowReview(false) }} />
      )}
    </div>
  )
}

function ReviewForm({ onSubmit }: { onSubmit: (r: Partial<DecisionEntry>) => void }) {
  const [actualPrice, setActualPrice] = useState('')
  const [lesson, setLesson] = useState('')

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      <p className="text-xs font-semibold text-muted-foreground">Revisão Retrospectiva</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Preço Final (R$)</label>
          <input
            type="number"
            value={actualPrice}
            onChange={(e) => setActualPrice(e.target.value)}
            placeholder="ex: 45.50"
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Lição aprendida</label>
        <textarea
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
          placeholder="A qualidade da decisão foi boa? O que eu aprenderia a fazer diferente?"
          className="w-full rounded border border-border bg-background px-2 py-1 text-sm resize-none"
          rows={2}
        />
      </div>
      <button
        onClick={() => onSubmit({
          reviewed: true,
          reviewDate: new Date().toISOString().split('T')[0],
          actualPrice: actualPrice ? Number(actualPrice) : undefined,
          lessonLearned: lesson,
        })}
        className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground"
      >
        Salvar Revisão
      </button>
    </div>
  )
}

function RiskTab({ positions }: { positions: Position[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Métricas de risco calculadas em tempo real quando posições têm dados de mercado.
      </p>
      <div className="grid grid-cols-3 gap-4">
        {['Beta do Portfólio', 'Sharpe Ratio', 'Max Drawdown', 'Sortino Ratio', 'VaR 95% (1 dia)', 'Diversificação'].map((metric) => (
          <div key={metric} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{metric}</p>
            <p className="font-mono text-xl font-bold text-muted-foreground">–</p>
            <p className="text-xs text-muted-foreground">Requer dados de preço</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground italic">
        Métricas de risco completas disponíveis quando o serviço Python (FastAPI) estiver rodando.
      </p>
    </div>
  )
}

function AddPositionModal({ onAdd, onClose }: {
  onAdd: (pos: Omit<Position, 'id'>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({ ticker: '', shares: '', avgCostBRL: '', entryDate: new Date().toISOString().split('T')[0], notes: '' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <h3 className="font-serif text-lg font-semibold mb-4">Adicionar Posição</h3>
        <div className="space-y-3">
          <Field label="Ticker" value={form.ticker} onChange={(v) => setForm({ ...form, ticker: v.toUpperCase() })} placeholder="ex: VALE3" />
          <Field label="Qtd de Ações" value={form.shares} onChange={(v) => setForm({ ...form, shares: v })} placeholder="ex: 100" type="number" />
          <Field label="Preço Médio (R$)" value={form.avgCostBRL} onChange={(v) => setForm({ ...form, avgCostBRL: v })} placeholder="ex: 65.50" type="number" />
          <Field label="Data de Entrada" value={form.entryDate} onChange={(v) => setForm({ ...form, entryDate: v })} type="date" />
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm resize-none"
              rows={2}
              placeholder="Tese de investimento, observações..."
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onAdd({ ticker: form.ticker, shares: Number(form.shares), avgCostBRL: Number(form.avgCostBRL), entryDate: form.entryDate, notes: form.notes })}
            className="flex-1 rounded-md bg-primary py-2 text-sm text-primary-foreground"
            disabled={!form.ticker || !form.shares || !form.avgCostBRL}
          >
            Adicionar
          </button>
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function AddJournalModal({ onAdd, onClose }: {
  onAdd: (entry: Omit<DecisionEntry, 'id' | 'timestamp'>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    ticker: '', action: 'Buy' as DecisionEntry['action'],
    priceAtDecision: '', rationale: '', confidence: '5',
    expectedOutcome: '', targetPrice: '', targetDate: '',
    assumptions: '', killSwitch: '',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-serif text-lg font-semibold mb-1">Registrar Decisão</h3>
        <p className="text-xs text-muted-foreground mb-4 italic">
          Registre a qualidade do seu raciocínio agora, independente do resultado futuro — Annie Duke
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Ticker" value={form.ticker} onChange={(v) => setForm({ ...form, ticker: v.toUpperCase() })} placeholder="VALE3" />
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Ação</label>
              <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value as DecisionEntry['action'] })}
                className="w-full rounded border border-border bg-background px-2 py-1 text-sm">
                <option>Buy</option><option>Sell</option><option>Hold</option><option>Watch</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Preço (R$)" value={form.priceAtDecision} onChange={(v) => setForm({ ...form, priceAtDecision: v })} type="number" placeholder="65.00" />
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Confiança (1-10)</label>
              <input type="range" min={1} max={10} value={form.confidence}
                onChange={(e) => setForm({ ...form, confidence: e.target.value })}
                className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-muted-foreground"><span>1</span><span>{form.confidence}</span><span>10</span></div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Racional da decisão</label>
            <textarea value={form.rationale} onChange={(e) => setForm({ ...form, rationale: e.target.value })}
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm resize-none" rows={2}
              placeholder="Por que estou tomando esta decisão? Quais são os principais drivers?" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Preço-alvo (R$)" value={form.targetPrice} onChange={(v) => setForm({ ...form, targetPrice: v })} type="number" placeholder="80.00" />
            <Field label="Prazo" value={form.targetDate} onChange={(v) => setForm({ ...form, targetDate: v })} type="date" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Premissas principais (uma por linha)</label>
            <textarea value={form.assumptions} onChange={(e) => setForm({ ...form, assumptions: e.target.value })}
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm resize-none" rows={2}
              placeholder="Minério de ferro > US$100&#10;Produção 350Mt/ano&#10;BRL se mantém < 5.5" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Kill switch — o que me faria mudar esta visão?</label>
            <textarea value={form.killSwitch} onChange={(e) => setForm({ ...form, killSwitch: e.target.value })}
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm resize-none" rows={2}
              placeholder="Se minério < US$80 por 3 meses&#10;Se EPS cair > 30% vs guidance" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onAdd({
              ticker: form.ticker, action: form.action,
              priceAtDecision: Number(form.priceAtDecision),
              rationale: form.rationale, confidence: Number(form.confidence),
              expectedOutcome: form.expectedOutcome,
              targetPrice: Number(form.targetPrice), targetDate: form.targetDate,
              keyAssumptions: form.assumptions.split('\n').filter(Boolean),
              killSwitchConditions: form.killSwitch.split('\n').filter(Boolean),
              fusionScoreAtDecision: 0,
              reviewed: false,
            })}
            className="flex-1 rounded-md bg-primary py-2 text-sm text-primary-foreground"
          >
            Registrar
          </button>
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
      />
    </div>
  )
}
