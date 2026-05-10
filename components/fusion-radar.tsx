'use client'

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts'
import type { FusionAnalysis } from '@/types'

interface FusionRadarProps {
  fusion: FusionAnalysis
}

export function FusionRadar({ fusion }: FusionRadarProps) {
  const data = [
    { axis: 'Value', score: Math.round((fusion.grahamScore + fusion.greenblattScore) / 2), book: 'Graham + Greenblatt' },
    { axis: 'Quality', score: fusion.fisherScore, book: 'Fisher' },
    { axis: 'Valuation', score: fusion.damodaranScore, book: 'Damodaran' },
    { axis: 'Momentum', score: fusion.quantScore, book: 'Simons' },
    { axis: 'Safety', score: fusion.grahamScore, book: 'Graham' },
  ]

  return (
    <div className="space-y-3">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid className="stroke-border" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Radar
              name="Fusion"
              dataKey="score"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Tooltip
              formatter={(v: number, name, props) => [
                `${v.toFixed(0)}/100`,
                props.payload.book,
              ]}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: 12,
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown table */}
      <div className="space-y-2">
        {[
          { label: 'Graham (Valor + Segurança)', score: fusion.grahamScore, weight: 20, book: 'The Intelligent Investor' },
          { label: 'Fisher (Qualidade)', score: fusion.fisherScore, weight: 20, book: 'Common Stocks & Uncommon Profits' },
          { label: 'Greenblatt (Magic Formula)', score: fusion.greenblattScore, weight: 20, book: 'The Little Book That Beats the Market' },
          { label: 'Damodaran (DCF)', score: fusion.damodaranScore, weight: 25, book: 'Investment Valuation' },
          { label: 'Quant (Momentum/Volatilidade)', score: fusion.quantScore, weight: 15, book: 'The Man Who Solved the Market' },
        ].map(({ label, score, weight, book }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-foreground">{label}</span>
                <span className="font-mono text-xs text-muted-foreground">{weight}%</span>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={
                    score >= 70 ? 'h-full rounded-full bg-gain' :
                    score >= 45 ? 'h-full rounded-full bg-warning' :
                    'h-full rounded-full bg-loss'
                  }
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
            <span className={`font-mono text-sm font-bold w-8 text-right ${score >= 70 ? 'text-gain' : score >= 45 ? 'text-warning' : 'text-loss'}`}>
              {score.toFixed(0)}
            </span>
          </div>
        ))}

        <div className="flex items-center gap-3 border-t border-border pt-2 mt-2">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-semibold text-foreground">Fusion Score</span>
              <span className="text-[10px] text-muted-foreground">ponderado</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={
                  fusion.fusionScore >= 70 ? 'h-full rounded-full bg-gain' :
                  fusion.fusionScore >= 45 ? 'h-full rounded-full bg-warning' :
                  'h-full rounded-full bg-loss'
                }
                style={{ width: `${fusion.fusionScore}%` }}
              />
            </div>
          </div>
          <span className={`font-mono text-xl font-bold w-10 text-right ${fusion.fusionScore >= 70 ? 'text-gain' : fusion.fusionScore >= 45 ? 'text-warning' : 'text-loss'}`}>
            {fusion.fusionScore.toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  )
}
