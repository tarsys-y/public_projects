// Markowitz Mean-Variance Portfolio Optimizer
// Pure TypeScript — no external math libraries required.
// Works for N ≤ 30 assets (O(N³) matrix ops, negligible at this scale).

import type { HistoricalBar } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PortfolioPoint {
  vol: number       // annualized volatility (decimal)
  ret: number       // annualized expected return (decimal)
  sharpe: number
  weights: number[] // same order as input tickers
}

export interface OptimizationResult {
  tickers: string[]
  expectedReturns: number[]   // annualized per ticker
  annualVols: number[]        // annualized per ticker
  correlationMatrix: number[][]
  minVariance: PortfolioPoint
  maxSharpe: PortfolioPoint
  equalWeight: PortfolioPoint
  frontier: { vol: number; ret: number }[]
  monteCarlo: PortfolioPoint[]  // sample of 2000 for scatter plot
}

// ─── Matrix utilities (Gaussian elimination) ─────────────────────────────────

function matMul(A: number[][], B: number[][]): number[][] {
  const n = A.length
  const m = B[0].length
  const p = B.length
  const C = Array.from({ length: n }, () => new Array(m).fill(0))
  for (let i = 0; i < n; i++)
    for (let k = 0; k < p; k++)
      for (let j = 0; j < m; j++)
        C[i][j] += A[i][k] * B[k][j]
  return C
}

function matVec(A: number[][], v: number[]): number[] {
  return A.map((row) => row.reduce((s, a, j) => s + a * v[j], 0))
}

function vecDot(a: number[], b: number[]): number {
  return a.reduce((s, v, i) => s + v * b[i], 0)
}

// Invert matrix using Gauss-Jordan elimination with partial pivoting
function matInverse(M: number[][]): number[][] {
  const n = M.length
  const A = M.map((row) => [...row])
  const I = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  )

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) maxRow = row
    }
    ;[A[col], A[maxRow]] = [A[maxRow], A[col]]
    ;[I[col], I[maxRow]] = [I[maxRow], I[col]]

    const pivot = A[col][col]
    if (Math.abs(pivot) < 1e-12) continue  // singular column — skip (regularized)

    for (let j = 0; j < n; j++) {
      A[col][j] /= pivot
      I[col][j] /= pivot
    }
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = A[row][col]
      for (let j = 0; j < n; j++) {
        A[row][j] -= factor * A[col][j]
        I[row][j] -= factor * I[col][j]
      }
    }
  }
  return I
}

// ─── Return + covariance matrix construction ──────────────────────────────────

// Build aligned monthly log-return matrix (N assets × T months)
export function buildReturnMatrix(historicals: HistoricalBar[][]): {
  returnMatrix: number[][]
  dates: string[]
} {
  // Collect common dates across all assets
  const dateSets = historicals.map((h) => new Set(h.map((b) => b.date)))
  const commonDates = [...dateSets[0]].filter((d) => dateSets.every((s) => s.has(d))).sort()

  const returnMatrix = historicals.map((hist) => {
    const byDate = new Map(hist.map((b) => [b.date, b.adjustedClose || b.close]))
    const prices = commonDates.map((d) => byDate.get(d) ?? 0).filter((p) => p > 0)
    const logRets: number[] = []
    for (let i = 1; i < prices.length; i++) {
      logRets.push(Math.log(prices[i] / prices[i - 1]))
    }
    return logRets
  })

  return { returnMatrix, dates: commonDates }
}

// Annualized mean returns (monthly data → ×12)
export function computeMeanReturns(returnMatrix: number[][], periodsPerYear = 12): number[] {
  return returnMatrix.map((rets) => {
    if (!rets.length) return 0
    return (rets.reduce((s, r) => s + r, 0) / rets.length) * periodsPerYear
  })
}

// Annualized covariance matrix with Ledoit-Wolf shrinkage (regularization)
export function buildCovMatrix(returnMatrix: number[][], periodsPerYear = 12): number[][] {
  const N = returnMatrix.length
  const T = Math.min(...returnMatrix.map((r) => r.length))
  const means = returnMatrix.map((rets) => rets.reduce((s, r) => s + r, 0) / T)

  const cov = Array.from({ length: N }, () => new Array(N).fill(0))
  for (let i = 0; i < N; i++) {
    for (let j = i; j < N; j++) {
      let c = 0
      for (let t = 0; t < T; t++) {
        c += ((returnMatrix[i][t] ?? 0) - means[i]) * ((returnMatrix[j][t] ?? 0) - means[j])
      }
      cov[i][j] = (c / (T - 1)) * periodsPerYear
      cov[j][i] = cov[i][j]
    }
  }

  // Ledoit-Wolf shrinkage: Σ_reg = (1-λ)Σ + λ·diag(Σ)
  const lambda = 0.05
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) {
        cov[i][j] = (1 - lambda) * cov[i][j] + lambda * cov[i][i]
      } else {
        cov[i][j] *= (1 - lambda)
      }
    }
    cov[i][i] += 1e-6  // numerical stability
  }

  return cov
}

export function buildCorrelationMatrix(cov: number[][]): number[][] {
  const N = cov.length
  const corr = Array.from({ length: N }, () => new Array(N).fill(0))
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const denom = Math.sqrt(cov[i][i] * cov[j][j])
      corr[i][j] = denom > 0 ? cov[i][j] / denom : (i === j ? 1 : 0)
    }
  }
  return corr
}

// ─── Portfolio metrics ────────────────────────────────────────────────────────

function portfolioReturn(weights: number[], means: number[]): number {
  return vecDot(weights, means)
}

function portfolioVol(weights: number[], cov: number[][]): number {
  const Sw = matVec(cov, weights)
  const variance = vecDot(weights, Sw)
  return Math.sqrt(Math.max(0, variance))
}

function normalize(weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0)
  return sum === 0 ? weights.map(() => 1 / weights.length) : weights.map((w) => w / sum)
}

// ─── Analytical optimal portfolios ───────────────────────────────────────────

// Minimum-variance portfolio: w* = Σ⁻¹·1 / (1ᵀ·Σ⁻¹·1)
export function findMinVariance(means: number[], cov: number[][]): PortfolioPoint {
  const N = means.length
  const invCov = matInverse(cov)
  const ones = new Array(N).fill(1)
  const invCovOnes = matVec(invCov, ones)
  const denom = vecDot(ones, invCovOnes)
  const rawWeights = invCovOnes.map((w) => w / denom)
  // Long-only constraint: clip negatives, renormalize
  const weights = normalize(rawWeights.map((w) => Math.max(0, w)))
  const ret = portfolioReturn(weights, means)
  const vol = portfolioVol(weights, cov)
  return { weights, ret, vol, sharpe: 0 }
}

// Maximum-Sharpe (tangency) portfolio: w* = Σ⁻¹·(μ-rf) normalized
export function findMaxSharpe(means: number[], cov: number[][], rf: number): PortfolioPoint {
  const N = means.length
  const invCov = matInverse(cov)
  const excess = means.map((m) => m - rf)
  const rawWeights = matVec(invCov, excess)
  const weights = normalize(rawWeights.map((w) => Math.max(0, w)))
  const ret = portfolioReturn(weights, means)
  const vol = portfolioVol(weights, cov)
  const sharpe = vol > 0 ? (ret - rf) / vol : 0
  return { weights, ret, vol, sharpe }
}

// Equal-weight baseline
function equalWeightPortfolio(means: number[], cov: number[][], rf: number): PortfolioPoint {
  const N = means.length
  const weights = new Array(N).fill(1 / N)
  const ret = portfolioReturn(weights, means)
  const vol = portfolioVol(weights, cov)
  return { weights, ret, vol, sharpe: vol > 0 ? (ret - rf) / vol : 0 }
}

// ─── Efficient frontier (parametric sweep) ────────────────────────────────────

// For each target return, find minimum-variance portfolio via quadratic solve.
// We use a simple gradient descent constrained optimization.
function minVolForReturn(
  targetReturn: number,
  means: number[],
  cov: number[][],
  steps = 2000,
  lr = 0.01,
): number[] {
  const N = means.length
  // Start from equal weights
  let w = new Array(N).fill(1 / N)

  for (let step = 0; step < steps; step++) {
    // Gradient of variance w.r.t. w: 2·Σ·w
    const grad = matVec(cov, w).map((g) => 2 * g)
    // Penalty for constraint violations: return constraint + sum-to-1
    const retErr = portfolioReturn(w, means) - targetReturn
    const sumErr = w.reduce((s, v) => s + v, 0) - 1
    const penaltyGrad = means.map((m) => 2 * retErr * m)
    const sumGrad = new Array(N).fill(2 * sumErr)

    // Combined gradient
    const alpha = 50  // constraint penalty weight
    w = w.map((wi, i) =>
      Math.max(0, wi - lr * (grad[i] + alpha * penaltyGrad[i] + alpha * sumGrad[i])),
    )
    // Re-normalize periodically
    if (step % 100 === 99) w = normalize(w)
  }
  return normalize(w)
}

export function buildFrontierCurve(
  means: number[],
  cov: number[][],
  rf: number,
  numPoints = 30,
): { vol: number; ret: number }[] {
  const mvp = findMinVariance(means, cov)
  const maxRet = Math.max(...means) * 0.95
  const minRet = mvp.ret

  const points: { vol: number; ret: number }[] = []
  for (let i = 0; i < numPoints; i++) {
    const targetRet = minRet + (i / (numPoints - 1)) * (maxRet - minRet)
    const w = minVolForReturn(targetRet, means, cov)
    const vol = portfolioVol(w, cov)
    const ret = portfolioReturn(w, means)
    if (isFinite(vol) && isFinite(ret) && vol > 0) {
      points.push({ vol, ret })
    }
  }
  return points
}

// ─── Monte Carlo simulation ───────────────────────────────────────────────────

// Dirichlet-sampled random weights (uniform on simplex)
function randomWeights(N: number, rng: () => number = Math.random): number[] {
  const u = Array.from({ length: N }, () => -Math.log(rng() + 1e-10))
  return normalize(u)
}

export function monteCarloFrontier(
  means: number[],
  cov: number[][],
  rf: number,
  n = 8000,
): PortfolioPoint[] {
  const points: PortfolioPoint[] = []
  for (let i = 0; i < n; i++) {
    const weights = randomWeights(means.length)
    const ret = portfolioReturn(weights, means)
    const vol = portfolioVol(weights, cov)
    const sharpe = vol > 0 ? (ret - rf) / vol : 0
    points.push({ weights, ret, vol, sharpe })
  }
  return points
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function runOptimization(
  tickers: string[],
  historicals: HistoricalBar[][],
  rf: number,  // annualized risk-free rate (e.g. 0.105 for 10.5% SELIC)
): OptimizationResult {
  const { returnMatrix } = buildReturnMatrix(historicals)
  const means = computeMeanReturns(returnMatrix)
  const cov = buildCovMatrix(returnMatrix)
  const corrMatrix = buildCorrelationMatrix(cov)
  const annualVols = cov.map((row, i) => Math.sqrt(row[i]))

  const minVar = findMinVariance(means, cov)
  const maxShr = findMaxSharpe(means, cov, rf)
  const eqW = equalWeightPortfolio(means, cov, rf)

  // Add sharpe to minVar
  minVar.sharpe = minVar.vol > 0 ? (minVar.ret - rf) / minVar.vol : 0

  const frontier = buildFrontierCurve(means, cov, rf)

  // Monte Carlo: run 8000, return 2000 for the chart (sampled)
  const all = monteCarloFrontier(means, cov, rf, 8000)
  const step = Math.ceil(all.length / 2000)
  const monteCarlo = all.filter((_, i) => i % step === 0)

  return {
    tickers,
    expectedReturns: means,
    annualVols,
    correlationMatrix: corrMatrix,
    minVariance: minVar,
    maxSharpe: maxShr,
    equalWeight: eqW,
    frontier,
    monteCarlo,
  }
}
