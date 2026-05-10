'use client'

import { useState } from 'react'
import { cn, formatBRL, mosColor } from '@/lib/utils'
import type { DamodaranAnalysis, DamodaranInputs } from '@/types'
import { computeDamodaranAnalysis, computeWACC, computeCostOfEquity } from '@/lib/calculations/damodaran'

interface DCFModelProps {
  analysis: DamodaranAnalysis
  baseRevenue: number
  baseEbitMargin: number
  netDebt: number
  sharesOutstanding: number
  currentPrice: number
}

export function DCFModel({
  analysis: initialAnalysis,
  baseRevenue,
  baseEbitMargin,
  netDebt,
  sharesOutstanding,
  currentPrice,
}: DCFModelProps) {
  const [inputs, setInputs] = useState<DamodaranInputs>(initialAnalysis.inputs)
  const [analysis, setAnalysis] = useState<DamodaranAnalysis>(initialAnalysis)

  const updateInputs = (patch: Partial<DamodaranInputs>) => {
    const updated = { ...inputs, ...patch }
    const ke = computeCostOfEquity({
      selic: updated.riskFreeRate,
      beta: updated.beta,
      erpUS: updated.erp,
      embiPlus: updated.countryRiskPremium,
    })
    const wacc = computeWACC({
      costOfEquity: ke,
      costOfDebt: updated.costOfDebt,
      taxRate: updated.taxRate,
      debtWeight: updated.debtWeight,
      equityWeight: updated.equityWeight,
    })
    const newInputs = { ...updated, costOfEquity: ke, wacc }
    setInputs(newInputs)
    const newAnalysis = computeDamodaranAnalysis({
      ticker: initialAnalysis.ticker,
      baseRevenue,
      baseEbitMargin,
      netDebt,
      sharesOutstanding,
      currentPrice,
      inputs: newInputs,
    })
    setAnalysis(newAnalysis)
  }

  const slider = (
    key: keyof DamodaranInputs,
    label: string,
    min: number,
    max: number,
    step: number,
    format: (v: number) => string,
  ) => (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-muted-foreground">{label}</label>
        <span className="font-mono text-xs font-medium">{format(inputs[key] as number)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={inputs[key] as number}
        onChange={(e) => updateInputs({ [key]: Number(e.target.value) })}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  )

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Inputs */}
      <div>
        <h4 className="mb-3 text-sm font-semibold">Premissas do Modelo</h4>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Custo de Capital (WACC)
          </p>
          {slider('riskFreeRate', 'SELIC (taxa livre de risco)', 0.08, 0.18, 0.005, pct)}
          {slider('beta', 'Beta vs IBOV', 0.3, 2.5, 0.05, (v) => v.toFixed(2))}
          {slider('countryRiskPremium', 'EMBI+ (risco-país)', 0.01, 0.05, 0.001, pct)}
          {slider('costOfDebt', 'Custo da Dívida', 0.05, 0.20, 0.005, pct)}
          {slider('debtWeight', 'Peso da Dívida (D/V)', 0, 0.80, 0.01, pct)}

          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-3">
            Crescimento & Margens
          </p>
          {slider('revenueGrowthY1to5', 'Crescimento Receita Anos 1-5', 0, 0.30, 0.005, pct)}
          {slider('revenueGrowthY6to10', 'Crescimento Receita Anos 6-10', 0, 0.20, 0.005, pct)}
          {slider('terminalGrowthRate', 'Crescimento Terminal (g)', 0, 0.06, 0.005, pct)}
          {slider('ebitMarginTarget', 'Margem EBIT alvo', 0.02, 0.50, 0.005, pct)}
        </div>
      </div>

      {/* Results */}
      <div>
        <h4 className="mb-3 text-sm font-semibold">Resultados</h4>

        {/* Key outputs */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Ke (Custo do PL)</p>
            <p className="font-mono text-lg font-bold">{(inputs.costOfEquity * 100).toFixed(2)}%</p>
            <p className="text-[10px] text-muted-foreground">SELIC + β×(ERP+EMBI)</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">WACC</p>
            <p className="font-mono text-lg font-bold">{(inputs.wacc * 100).toFixed(2)}%</p>
            <p className="text-[10px] text-muted-foreground">custo médio ponderado</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Valor Intrínseco</p>
            <p className="font-mono text-lg font-bold">R$ {analysis.intrinsicValuePerShare.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">por ação</p>
          </div>
          <div className={cn('rounded-lg border p-3', analysis.marginOfSafety >= 30 ? 'border-gain/20 bg-gain/5' : analysis.marginOfSafety >= 0 ? 'border-warning/20 bg-warning/5' : 'border-loss/20 bg-loss/5')}>
            <p className="text-xs text-muted-foreground">Margem de Segurança</p>
            <p className={cn('font-mono text-lg font-bold', mosColor(analysis.marginOfSafety))}>
              {analysis.marginOfSafety.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground">
              {analysis.marginOfSafety >= 30 ? '✓ Atraente' : analysis.marginOfSafety >= 0 ? '~ Razoável' : '✗ Sobrevalorizado'}
            </p>
          </div>
        </div>

        {/* Sensitivity table */}
        <div>
          <h5 className="mb-2 text-xs font-semibold">
            Sensibilidade: Valor por Ação (R$)
          </h5>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr>
                  <th className="py-1 text-left text-muted-foreground">WACC ↓ / g →</th>
                  {analysis.sensitivityTable.terminalGrowthValues.map((tg) => (
                    <th key={tg} className="py-1 text-center font-mono text-muted-foreground">
                      {(tg * 100).toFixed(0)}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.sensitivityTable.waccValues.map((wacc, wi) => (
                  <tr key={wacc}>
                    <td className="py-1 font-mono text-muted-foreground text-left">
                      {(wacc * 100).toFixed(1)}%
                    </td>
                    {analysis.sensitivityTable.intrinsicValues[wi].map((iv, gi) => {
                      const mos = (iv - currentPrice) / iv * 100
                      return (
                        <td
                          key={gi}
                          className={cn(
                            'py-1 text-center font-mono',
                            wi === 2 && gi === 2 ? 'font-bold text-foreground bg-accent/50 rounded' : '',
                            mos >= 30 ? 'text-gain' : mos >= 0 ? 'text-warning' : 'text-loss',
                          )}
                        >
                          {iv.toFixed(0)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Base: WACC={pct(inputs.wacc)}, g={pct(inputs.terminalGrowthRate)}. Verde=MoS≥30%, Amarelo=MoS≥0%
          </p>
        </div>

        {/* Projections table */}
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            Ver projeções ano a ano
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="py-0.5 text-left">Ano</th>
                  <th className="py-0.5 text-right">Receita</th>
                  <th className="py-0.5 text-right">EBIT</th>
                  <th className="py-0.5 text-right">FCFF</th>
                  <th className="py-0.5 text-right">PV(FCFF)</th>
                </tr>
              </thead>
              <tbody>
                {analysis.projections.map((p) => (
                  <tr key={p.year} className="border-t border-border/30">
                    <td className="py-0.5 font-mono">{p.year}</td>
                    <td className="py-0.5 text-right font-mono">{(p.revenue / 1000).toFixed(0)}M</td>
                    <td className="py-0.5 text-right font-mono">{(p.ebit / 1000).toFixed(0)}M</td>
                    <td className="py-0.5 text-right font-mono">{(p.fcff / 1000).toFixed(0)}M</td>
                    <td className="py-0.5 text-right font-mono text-muted-foreground">{(p.pvFCFF / 1000).toFixed(0)}M</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  )
}
