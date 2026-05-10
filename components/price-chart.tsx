'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'
import type { HistoricalBar } from '@/types'

interface PriceChartProps {
  data: HistoricalBar[]
  ticker: string
  intrinsicValue?: number
  grahamNumber?: number
}

export function PriceChart({ data, ticker, intrinsicValue, grahamNumber }: PriceChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 280,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'hsl(20, 8%, 46%)',
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'hsl(40, 10%, 88%)' },
        horzLines: { color: 'hsl(40, 10%, 88%)' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: 'hsl(40, 10%, 88%)' },
      timeScale: {
        borderColor: 'hsl(40, 10%, 88%)',
        timeVisible: true,
      },
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#16a34a',
      downColor: '#dc2626',
      borderUpColor: '#16a34a',
      borderDownColor: '#dc2626',
      wickUpColor: '#16a34a',
      wickDownColor: '#dc2626',
    })

    const candleData = data.map((d) => ({
      time: d.date as `${number}-${number}-${number}`,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }))

    candleSeries.setData(candleData)

    // Intrinsic value line
    if (intrinsicValue && intrinsicValue > 0) {
      const ivSeries = chart.addLineSeries({
        color: '#d97706',
        lineWidth: 1,
        lineStyle: 2, // dashed
        title: 'DCF IV',
      })
      ivSeries.setData(data.map((d) => ({ time: d.date as `${number}-${number}-${number}`, value: intrinsicValue })))
    }

    // Graham number line
    if (grahamNumber && grahamNumber > 0) {
      const gnSeries = chart.addLineSeries({
        color: '#2563eb',
        lineWidth: 1,
        lineStyle: 2,
        title: 'Graham #',
      })
      gnSeries.setData(data.map((d) => ({ time: d.date as `${number}-${number}-${number}`, value: grahamNumber })))
    }

    chart.timeScale().fitContent()

    const handleResize = () => {
      if (chartRef.current) {
        chart.applyOptions({ width: chartRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data, intrinsicValue, grahamNumber])

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg border border-border bg-card">
        <p className="text-sm text-muted-foreground">Dados históricos não disponíveis</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-3">
        <p className="text-sm font-medium">{ticker}</p>
        {intrinsicValue && intrinsicValue > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-warning">
            <span className="inline-block h-0.5 w-4 bg-warning/60" style={{ borderTop: '1px dashed' }} />
            DCF IV: R$ {intrinsicValue.toFixed(2)}
          </span>
        )}
        {grahamNumber && grahamNumber > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-blue-500">
            <span className="inline-block h-0.5 w-4" style={{ borderTop: '1px dashed #2563eb' }} />
            Graham #: R$ {grahamNumber.toFixed(2)}
          </span>
        )}
      </div>
      <div ref={chartRef} />
    </div>
  )
}
