'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataFreshnessProps {
  source: string
  fetchedAt: number | null   // ms epoch; null = loading
  staleAfterMs?: number      // default 5 min
  onRefresh?: () => void
  className?: string
}

function elapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}min`
  return `${Math.floor(m / 60)}h`
}

export function DataFreshness({
  source,
  fetchedAt,
  staleAfterMs = 300_000,
  onRefresh,
  className,
}: DataFreshnessProps) {
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  if (fetchedAt === null) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-[11px] text-muted-foreground', className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
        Carregando…
      </span>
    )
  }

  const age = now - fetchedAt
  const stale = age > staleAfterMs
  const veryStale = age > staleAfterMs * 3

  const dotColor = veryStale
    ? 'bg-red-500'
    : stale
    ? 'bg-yellow-500'
    : 'bg-green-500'

  const label = veryStale
    ? `Possivelmente desatualizado (${elapsed(age)}) · ${source}`
    : stale
    ? `${elapsed(age)} atrás · ${source}`
    : `Atualizado há ${elapsed(age)} · ${source}`

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] text-muted-foreground', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dotColor)} />
      {label}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="ml-0.5 rounded p-0.5 hover:bg-muted transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}
