import type {
  FusionAnalysis,
  FusionWeights,
  ScenarioCase,
  DEFAULT_FUSION_WEIGHTS,
} from '@/types'
import { DEFAULT_FUSION_WEIGHTS as DEFAULTS } from '@/types'

export function computeFusionScore(
  grahamScore: number,
  fisherScore: number,
  greenblattScore: number,
  damodaranScore: number,
  quantScore: number,
  weights: FusionWeights = DEFAULTS,
): number {
  return (
    grahamScore * weights.graham +
    fisherScore * weights.fisher +
    greenblattScore * weights.greenblatt +
    damodaranScore * weights.damodaran +
    quantScore * weights.quant
  )
}

export function fusionToDecision(
  fusionScore: number,
  mosPercent: number,
): { decision: 'Buy' | 'Hold' | 'Avoid'; confidence: number } {
  if (fusionScore >= 70 && mosPercent >= 15) {
    const confidence = Math.min(95, 60 + (fusionScore - 70) + mosPercent * 0.5)
    return { decision: 'Buy', confidence: Math.round(confidence) }
  }
  if (fusionScore >= 45 || mosPercent >= -10) {
    const confidence = Math.min(85, 45 + fusionScore * 0.3)
    return { decision: 'Hold', confidence: Math.round(confidence) }
  }
  const confidence = Math.min(90, 50 + (50 - fusionScore) * 0.5)
  return { decision: 'Avoid', confidence: Math.round(confidence) }
}

export function buildDecisionScenarios(
  currentPrice: number,
  intrinsicValue: number,
  momentum12_1: number,
  volatility90d: number,
): { bull: ScenarioCase; base: ScenarioCase; bear: ScenarioCase } {
  // Base: converge to intrinsic value over 12 months
  const baseTarget = intrinsicValue > 0 ? intrinsicValue : currentPrice
  const baseReturn = currentPrice > 0 ? (baseTarget - currentPrice) / currentPrice : 0

  // Bull: 20% premium to intrinsic (valuation re-rating)
  const bullTarget = baseTarget * 1.2
  const bullReturn = currentPrice > 0 ? (bullTarget - currentPrice) / currentPrice : 0

  // Bear: drawdown based on volatility (1.5 std dev down)
  const bearTarget = currentPrice * (1 - 1.5 * volatility90d)
  const bearReturn = currentPrice > 0 ? (bearTarget - currentPrice) / currentPrice : 0

  // Adjust probabilities based on momentum
  const bullP = momentum12_1 > 0.1 ? 0.30 : 0.20
  const bearP = momentum12_1 < -0.1 ? 0.35 : 0.25
  const baseP = 1 - bullP - bearP

  return {
    bull: {
      label: 'Bull',
      probability: bullP,
      targetPrice: Math.round(bullTarget * 100) / 100,
      returnPct: Math.round(bullReturn * 1000) / 10,
      rationale: 'Intrinsic value realized + valuation re-rating',
    },
    base: {
      label: 'Base',
      probability: baseP,
      targetPrice: Math.round(baseTarget * 100) / 100,
      returnPct: Math.round(baseReturn * 1000) / 10,
      rationale: 'Gradual convergence to DCF intrinsic value',
    },
    bear: {
      label: 'Bear',
      probability: bearP,
      targetPrice: Math.round(bearTarget * 100) / 100,
      returnPct: Math.round(bearReturn * 1000) / 10,
      rationale: 'Macro deterioration / thesis break (1.5σ drawdown)',
    },
  }
}

export function computeExpectedValue(
  bull: ScenarioCase,
  base: ScenarioCase,
  bear: ScenarioCase,
): number {
  return bull.probability * bull.returnPct +
    base.probability * base.returnPct +
    bear.probability * bear.returnPct
}

export function buildFusionAnalysis(params: {
  ticker: string
  grahamScore: number
  fisherScore: number
  greenblattScore: number
  damodaranScore: number
  quantScore: number
  mosPercent: number
  currentPrice: number
  intrinsicValue: number
  momentum12_1: number
  volatility90d: number
  weights?: FusionWeights
}): FusionAnalysis {
  const {
    ticker, grahamScore, fisherScore, greenblattScore, damodaranScore,
    quantScore, mosPercent, currentPrice, intrinsicValue,
    momentum12_1, volatility90d, weights = DEFAULTS,
  } = params

  const fusionScore = computeFusionScore(
    grahamScore, fisherScore, greenblattScore, damodaranScore, quantScore, weights,
  )
  const { decision, confidence } = fusionToDecision(fusionScore, mosPercent)
  const scenarios = buildDecisionScenarios(currentPrice, intrinsicValue, momentum12_1, volatility90d)
  const expectedValue = computeExpectedValue(scenarios.bull, scenarios.base, scenarios.bear)

  return {
    ticker,
    grahamScore,
    fisherScore,
    greenblattScore,
    damodaranScore,
    quantScore,
    fusionScore: Math.round(fusionScore * 10) / 10,
    decision,
    confidence,
    weights,
    bullCase: scenarios.bull,
    baseCase: scenarios.base,
    bearCase: scenarios.bear,
    expectedValue: Math.round(expectedValue * 10) / 10,
  }
}
