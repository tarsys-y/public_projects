'use client'

import { TrendingUp, TrendingDown, Minus, AlertTriangle, BookOpen } from 'lucide-react'
import { cn, formatPct, decisionBadgeClass } from '@/lib/utils'
import type { FusionAnalysis } from '@/types'

interface DecisionCardProps {
  fusion: FusionAnalysis
  currentPrice: number
}

export function DecisionCard({ fusion, currentPrice }: DecisionCardProps) {
  const { decision, confidence, bullCase, baseCase, bearCase, expectedValue } = fusion

  const evColor = expectedValue > 5 ? 'text-gain' : expectedValue > 0 ? 'text-warning' : 'text-loss'

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Decisão Fusion
          </p>
          <div className="mt-1 flex items-center gap-3">
            <span className={cn('rounded-md border px-4 py-1.5 text-base font-bold', decisionBadgeClass(decision))}>
              {decision}
            </span>
            <div>
              <p className="font-mono text-2xl font-bold">{confidence}%</p>
              <p className="text-[11px] text-muted-foreground">confiança</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Valor Esperado</p>
          <p className={cn('font-mono text-xl font-bold', evColor)}>
            {expectedValue > 0 ? '+' : ''}{expectedValue.toFixed(1)}%
          </p>
          <p className="text-[11px] text-muted-foreground">retorno esperado</p>
        </div>
      </div>

      {/* Scenarios */}
      <div className="grid grid-cols-3 gap-2">
        {[bullCase, baseCase, bearCase].map((sc) => (
          <div
            key={sc.label}
            className={cn(
              'rounded-md border p-2',
              sc.label === 'Bull' ? 'border-gain/20 bg-gain/5' :
              sc.label === 'Base' ? 'border-border bg-muted/30' :
              'border-loss/20 bg-loss/5',
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={cn('text-[11px] font-semibold',
                sc.label === 'Bull' ? 'text-gain' :
                sc.label === 'Base' ? 'text-foreground' :
                'text-loss',
              )}>
                {sc.label === 'Bull' ? 'Otimista' : sc.label === 'Base' ? 'Base' : 'Pessimista'}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                P={Math.round(sc.probability * 100)}%
              </span>
            </div>
            <p className="font-mono text-sm font-bold">
              R$ {sc.targetPrice.toFixed(2)}
            </p>
            <p className={cn('font-mono text-xs', sc.returnPct >= 0 ? 'text-gain' : 'text-loss')}>
              {sc.returnPct > 0 ? '+' : ''}{sc.returnPct.toFixed(1)}%
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground leading-tight">
              {sc.rationale}
            </p>
          </div>
        ))}
      </div>

      {/* EV formula */}
      <div className="mt-3 rounded-md bg-muted/50 px-3 py-2">
        <p className="font-mono text-[10px] text-muted-foreground">
          VE = {Math.round(bullCase.probability * 100)}%×{bullCase.returnPct > 0 ? '+' : ''}{bullCase.returnPct.toFixed(1)}%
          + {Math.round(baseCase.probability * 100)}%×{baseCase.returnPct > 0 ? '+' : ''}{baseCase.returnPct.toFixed(1)}%
          + {Math.round(bearCase.probability * 100)}%×{bearCase.returnPct > 0 ? '+' : ''}{bearCase.returnPct.toFixed(1)}%
          = <span className={cn('font-bold', evColor)}>{expectedValue > 0 ? '+' : ''}{expectedValue.toFixed(1)}%</span>
        </p>
      </div>

      <div className="mt-2 flex items-center gap-1">
        <BookOpen className="h-3 w-3 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground italic">
          Pensando Em Apostas — Annie Duke: separar qualidade da decisão do resultado
        </p>
      </div>
    </div>
  )
}
