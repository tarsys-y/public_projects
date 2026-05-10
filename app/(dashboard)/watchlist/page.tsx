'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, BellOff, Plus, Trash2, ExternalLink, Star } from 'lucide-react'
import { cn, generateId, formatDatetime } from '@/lib/utils'
import type { WatchlistItem, Alert } from '@/types'

function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('b3_watchlist')
    if (saved) setItems(JSON.parse(saved))
  }, [])

  const save = (updated: WatchlistItem[]) => {
    setItems(updated)
    localStorage.setItem('b3_watchlist', JSON.stringify(updated))
  }

  const addItem = (ticker: string) => {
    if (items.find((i) => i.ticker === ticker)) return
    save([...items, { id: generateId(), ticker, addedAt: new Date().toISOString(), notes: '', alerts: [] }])
  }

  const removeItem = (id: string) => save(items.filter((i) => i.id !== id))

  const addAlert = (itemId: string, alert: Omit<Alert, 'id' | 'triggered' | 'active'>) => {
    save(items.map((i) => i.id === itemId
      ? { ...i, alerts: [...i.alerts, { ...alert, id: generateId(), triggered: false, active: true }] }
      : i
    ))
  }

  const removeAlert = (itemId: string, alertId: string) => {
    save(items.map((i) => i.id === itemId
      ? { ...i, alerts: i.alerts.filter((a) => a.id !== alertId) }
      : i
    ))
  }

  return { items, addItem, removeItem, addAlert, removeAlert }
}

export default function WatchlistPage() {
  const { items, addItem, removeItem, addAlert, removeAlert } = useWatchlist()
  const [addTicker, setAddTicker] = useState('')
  const [addingAlertFor, setAddingAlertFor] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold">Watchlist</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe ações e configure alertas automáticos para eventos de investimento.
          </p>
        </div>
      </div>

      {/* Add ticker */}
      <div className="flex gap-2">
        <input
          type="text"
          value={addTicker}
          onChange={(e) => setAddTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === 'Enter' && addTicker) { addItem(addTicker); setAddTicker('') } }}
          placeholder="Adicionar ticker (ex: VALE3, PETR4)..."
          className="flex-1 max-w-xs rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={() => { if (addTicker) { addItem(addTicker); setAddTicker('') } }}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </div>

      {items.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <Star className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Watchlist vazia</p>
          <p className="text-xs text-muted-foreground mt-1">
            Adicione tickers para acompanhar e configurar alertas
          </p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Link
                  href={`/stock/${item.ticker}`}
                  className="flex items-center gap-1 font-mono font-bold text-lg hover:underline"
                >
                  {item.ticker}
                  <ExternalLink className="h-3.5 w-3.5 opacity-40" />
                </Link>
                <span className="text-xs text-muted-foreground">
                  Adicionado {formatDatetime(item.addedAt)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAddingAlertFor(addingAlertFor === item.id ? null : item.id)}
                  className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent transition-colors"
                >
                  <Bell className="h-3.5 w-3.5" />
                  Alerta
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-loss/10 hover:text-loss transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Alerts */}
            {item.alerts.length > 0 && (
              <div className="space-y-1 mb-3">
                {item.alerts.map((alert) => (
                  <div key={alert.id} className={cn(
                    'flex items-center justify-between rounded-md px-2 py-1 text-xs',
                    alert.triggered ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground',
                  )}>
                    <div className="flex items-center gap-2">
                      {alert.triggered ? (
                        <Bell className="h-3 w-3 text-warning" />
                      ) : (
                        <BellOff className="h-3 w-3" />
                      )}
                      <span>{ALERT_TYPE_LABELS[alert.type]}: {alert.threshold}</span>
                      {alert.triggered && <span className="text-[10px]">• Disparado {formatDatetime(alert.triggeredAt!)}</span>}
                    </div>
                    <button
                      onClick={() => removeAlert(item.id, alert.id)}
                      className="hover:text-loss transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add alert form */}
            {addingAlertFor === item.id && (
              <AddAlertForm
                ticker={item.ticker}
                onAdd={(alert) => { addAlert(item.id, alert); setAddingAlertFor(null) }}
                onClose={() => setAddingAlertFor(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const ALERT_TYPE_LABELS: Record<Alert['type'], string> = {
  price_below: 'Preço abaixo de R$',
  price_above: 'Preço acima de R$',
  fusion_change: 'Fusion Score muda ≥',
  mf_rank_improve: 'Magic Formula rank melhora para top',
  dcf_mos: 'DCF MoS% cruza',
}

function AddAlertForm({ ticker, onAdd, onClose }: {
  ticker: string
  onAdd: (alert: Omit<Alert, 'id' | 'triggered' | 'active'>) => void
  onClose: () => void
}) {
  const [type, setType] = useState<Alert['type']>('price_below')
  const [threshold, setThreshold] = useState('')

  const ALERT_EXAMPLES: Record<Alert['type'], string> = {
    price_below: 'ex: 60.00',
    price_above: 'ex: 80.00',
    fusion_change: 'ex: 10 (mudança de 10 pontos)',
    mf_rank_improve: 'ex: 30 (top 30)',
    dcf_mos: 'ex: 30 (MoS ≥ 30%)',
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 mt-2">
      <p className="text-xs font-semibold mb-2">Configurar Alerta para {ticker}</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Tipo de Alerta</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Alert['type'])}
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
          >
            {Object.entries(ALERT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Valor</label>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder={ALERT_EXAMPLES[type]}
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onAdd({ ticker, type, threshold: Number(threshold), message: `${ALERT_TYPE_LABELS[type]} ${threshold}` })}
          className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground"
          disabled={!threshold}
        >
          Criar Alerta
        </button>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
      </div>
    </div>
  )
}
