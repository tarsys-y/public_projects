import type { QuantAnalysis } from '@/types'

export function computeMomentum12_1(prices: number[]): number {
  // Prices ordered oldest → newest
  // 12-1 momentum: return from 13 months ago to 1 month ago (skip last 21 days)
  const n = prices.length
  if (n < 273) return 0
  const priceNow = prices[n - 22]   // ~1 month ago (skip last month)
  const price13m = prices[n - 274]  // ~13 months ago
  if (!price13m || price13m <= 0) return 0
  return priceNow / price13m - 1
}

export function computeMovingAverage(prices: number[], window: number): number {
  if (prices.length < window) return prices.reduce((s, p) => s + p, 0) / prices.length
  const slice = prices.slice(-window)
  return slice.reduce((s, p) => s + p, 0) / window
}

export function computeStdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (values.length - 1)
  return Math.sqrt(variance)
}

export function computeZScore(value: number, values: number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const std = computeStdDev(values)
  if (std === 0) return 0
  return (value - mean) / std
}

export function computeLogReturns(prices: number[]): number[] {
  const returns: number[] = []
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      returns.push(Math.log(prices[i] / prices[i - 1]))
    }
  }
  return returns
}

export function computeAnnualizedVolatility(prices: number[], window = 90): number {
  if (prices.length < window + 1) return 0
  const recentPrices = prices.slice(-window - 1)
  const returns = computeLogReturns(recentPrices)
  return computeStdDev(returns) * Math.sqrt(252)
}

export function computeBeta(stockPrices: number[], benchmarkPrices: number[], window = 252): number {
  const n = Math.min(window, stockPrices.length - 1, benchmarkPrices.length - 1)
  if (n < 30) return 1

  const stockReturns = computeLogReturns(stockPrices.slice(-n - 1))
  const benchReturns = computeLogReturns(benchmarkPrices.slice(-n - 1))

  const len = Math.min(stockReturns.length, benchReturns.length)
  const sr = stockReturns.slice(-len)
  const br = benchReturns.slice(-len)

  const benchMean = br.reduce((s, v) => s + v, 0) / len
  const stockMean = sr.reduce((s, v) => s + v, 0) / len

  let covariance = 0
  let variance = 0
  for (let i = 0; i < len; i++) {
    covariance += (sr[i] - stockMean) * (br[i] - benchMean)
    variance += Math.pow(br[i] - benchMean, 2)
  }

  if (variance === 0) return 1
  return covariance / variance
}

export function computeQuantAnalysis(params: {
  ticker: string
  prices: number[]       // daily closes, oldest → newest
  volumes: number[]      // daily volumes
  ibovPrices: number[]   // IBOV daily closes
}): QuantAnalysis {
  const { ticker, prices, volumes, ibovPrices } = params
  const n = prices.length

  const currentPrice = prices[n - 1]

  // Momentum 12-1
  const momentum12_1 = computeMomentum12_1(prices)

  // Momentum Z-score: compare to cross-section (approximate with time-series z-score)
  const recentMomenta: number[] = []
  for (let i = 273; i < n - 21; i += 21) {
    const m = prices[i - 1] / prices[i - 274] - 1
    if (isFinite(m)) recentMomenta.push(m)
  }
  const momentumZScore = recentMomenta.length > 0
    ? computeZScore(momentum12_1, recentMomenta)
    : 0

  // Mean reversion
  const ma200d = computeMovingAverage(prices, 200)
  const recentPrices200 = prices.slice(-200)
  const std200 = computeStdDev(recentPrices200)
  const meanReversionZScore = std200 > 0 ? (currentPrice - ma200d) / std200 : 0
  const priceVsMa200pct = ma200d > 0 ? (currentPrice / ma200d - 1) * 100 : 0

  // Volatility
  const volatility90d = computeAnnualizedVolatility(prices, 90)
  const volRegime: QuantAnalysis['volatilityRegime'] =
    volatility90d < 0.2 ? 'low' : volatility90d > 0.45 ? 'high' : 'normal'

  // Beta
  const beta = computeBeta(prices, ibovPrices, 252)
  const rollingBeta63d = computeBeta(prices, ibovPrices, 63)

  // Volume anomaly
  const recentVol20 = volumes.slice(-21, -1)
  const avgVol20 = recentVol20.reduce((s, v) => s + v, 0) / recentVol20.length
  const currentVolume = volumes[volumes.length - 1]
  const volumeAnomaly = avgVol20 > 0 ? currentVolume / avgVol20 : 1
  const relativeVolume = volumeAnomaly

  // Quant score composite
  // Base 50, add/subtract based on signals
  let score = 50
  // Momentum: positive adds up to +20
  score += Math.max(-20, Math.min(20, momentumZScore * 8))
  // Mean reversion: being oversold (negative Z) is good for buying
  score += Math.max(-15, Math.min(15, -meanReversionZScore * 5))
  // Low vol bonus/penalty
  if (volRegime === 'low') score += 5
  if (volRegime === 'high') score -= 10
  // Volume spike (neutral to slightly positive)
  if (volumeAnomaly > 2) score += 5

  const quantScore = Math.max(0, Math.min(100, score))

  return {
    ticker,
    momentum12_1,
    momentumZScore,
    ma200d,
    meanReversionZScore,
    priceVsMa200pct,
    volatility90d,
    volatilityRegime: volRegime,
    beta,
    rollingBeta63d,
    volumeAnomaly,
    relativeVolume,
    quantScore,
  }
}
