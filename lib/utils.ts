import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBRL(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1e12) return `R$ ${(value / 1e12).toFixed(1)}T`
    if (Math.abs(value) >= 1e9) return `R$ ${(value / 1e9).toFixed(1)}B`
    if (Math.abs(value) >= 1e6) return `R$ ${(value / 1e6).toFixed(1)}M`
    if (Math.abs(value) >= 1e3) return `R$ ${(value / 1e3).toFixed(1)}K`
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPct(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1e12) return `${(value / 1e12).toFixed(1)}T`
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`
  return value.toFixed(0)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function formatDatetime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function fusionScoreColor(score: number): string {
  if (score >= 70) return 'text-gain'
  if (score >= 45) return 'text-warning'
  return 'text-loss'
}

export function mosColor(mos: number): string {
  if (mos >= 30) return 'text-gain'
  if (mos >= 0) return 'text-warning'
  return 'text-loss'
}

export function decisionColor(decision: 'Buy' | 'Hold' | 'Avoid'): string {
  if (decision === 'Buy') return 'text-gain'
  if (decision === 'Hold') return 'text-warning'
  return 'text-loss'
}

export function decisionBadgeClass(decision: 'Buy' | 'Hold' | 'Avoid'): string {
  if (decision === 'Buy') return 'bg-gain/10 text-gain border-gain/20'
  if (decision === 'Hold') return 'bg-warning/10 text-warning border-warning/20'
  return 'bg-loss/10 text-loss border-loss/20'
}

export function changeClass(value: number): string {
  if (value > 0) return 'text-gain'
  if (value < 0) return 'text-loss'
  return 'text-muted-foreground'
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function percentileToScore(value: number, values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const idx = sorted.findIndex((v) => v >= value)
  if (idx === -1) return 100
  return Math.round((idx / (values.length - 1)) * 100)
}

export function linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
  const n = Math.min(x.length, y.length)
  if (n < 2) return { slope: 0, intercept: 0 }
  const sumX = x.slice(0, n).reduce((s, v) => s + v, 0)
  const sumY = y.slice(0, n).reduce((s, v) => s + v, 0)
  const sumXY = x.slice(0, n).reduce((s, v, i) => s + v * y[i], 0)
  const sumX2 = x.slice(0, n).reduce((s, v) => s + v * v, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}
