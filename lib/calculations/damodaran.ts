import type {
  DamodaranInputs,
  DamodaranAnalysis,
  DCFProjection,
  SensitivityTable,
} from '@/types'

export function computeCostOfEquity(inputs: {
  selic: number
  beta: number
  erpUS: number
  embiPlus: number
}): number {
  return inputs.selic + inputs.beta * (inputs.erpUS + inputs.embiPlus)
}

export function computeWACC(inputs: {
  costOfEquity: number
  costOfDebt: number
  taxRate: number
  debtWeight: number
  equityWeight: number
}): number {
  return (
    inputs.costOfEquity * inputs.equityWeight +
    inputs.costOfDebt * (1 - inputs.taxRate) * inputs.debtWeight
  )
}

export function runDCF(
  baseRevenue: number,
  baseEbitMargin: number,
  inputs: DamodaranInputs,
): { projections: DCFProjection[]; terminalValue: number } {
  const projections: DCFProjection[] = []
  let revenue = baseRevenue

  for (let year = 1; year <= inputs.projectionYears; year++) {
    const growthRate =
      year <= 5 ? inputs.revenueGrowthY1to5 : inputs.revenueGrowthY6to10

    revenue = revenue * (1 + growthRate)
    const ebit = revenue * inputs.ebitMarginTarget
    const nopat = ebit * (1 - inputs.taxRate)
    const reinvestment =
      revenue * inputs.capexPctRevenue + revenue * inputs.nwcPctRevenue * growthRate
    const fcff = nopat - reinvestment
    const discountFactor = Math.pow(1 + inputs.wacc, year)
    const pvFCFF = fcff / discountFactor

    projections.push({
      year,
      revenue,
      ebit,
      nopat,
      reinvestment,
      fcff,
      discountFactor,
      pvFCFF,
    })
  }

  const lastFCFF = projections[projections.length - 1]?.fcff ?? 0
  const terminalValue =
    inputs.wacc > inputs.terminalGrowthRate
      ? (lastFCFF * (1 + inputs.terminalGrowthRate)) /
        (inputs.wacc - inputs.terminalGrowthRate)
      : 0

  return { projections, terminalValue }
}

export function computeDamodaranAnalysis(params: {
  ticker: string
  baseRevenue: number
  baseEbitMargin: number
  netDebt: number
  sharesOutstanding: number
  currentPrice: number
  inputs: DamodaranInputs
}): DamodaranAnalysis {
  const { ticker, baseRevenue, baseEbitMargin, netDebt, sharesOutstanding, currentPrice, inputs } =
    params

  const { projections, terminalValue } = runDCF(baseRevenue, baseEbitMargin, inputs)

  const pvProjections = projections.reduce((sum, p) => sum + p.pvFCFF, 0)
  const pvTerminalValue = terminalValue / Math.pow(1 + inputs.wacc, inputs.projectionYears)
  const enterpriseValue = pvProjections + pvTerminalValue
  const equityValue = enterpriseValue - netDebt
  const intrinsicValuePerShare = sharesOutstanding > 0 ? equityValue / sharesOutstanding : 0
  const mos = intrinsicValuePerShare > 0
    ? ((intrinsicValuePerShare - currentPrice) / intrinsicValuePerShare) * 100
    : -100

  // Sigmoid-normalize MOS to 0-100 score
  const damodaranScore = 100 / (1 + Math.exp(-0.1 * mos))

  const sensitivityTable = buildSensitivityTable(
    baseRevenue,
    baseEbitMargin,
    netDebt,
    sharesOutstanding,
    inputs,
  )

  return {
    ticker,
    inputs,
    projections,
    terminalValue,
    pvProjections,
    pvTerminalValue,
    enterpriseValue,
    netDebt,
    intrinsicValue: equityValue,
    sharesOutstanding,
    intrinsicValuePerShare,
    currentPrice,
    marginOfSafety: mos,
    damodaranScore,
    sensitivityTable,
  }
}

function buildSensitivityTable(
  baseRevenue: number,
  baseEbitMargin: number,
  netDebt: number,
  shares: number,
  baseInputs: DamodaranInputs,
): SensitivityTable {
  const waccOffsets = [-0.02, -0.01, 0, 0.01, 0.02]
  const terminalGrowths = [0, 0.01, 0.02, 0.03, 0.04]

  const waccValues = waccOffsets.map((d) => baseInputs.wacc + d)
  const terminalGrowthValues = terminalGrowths

  const intrinsicValues = waccValues.map((wacc) =>
    terminalGrowthValues.map((tg) => {
      const inputs = { ...baseInputs, wacc, terminalGrowthRate: tg }
      const { projections, terminalValue } = runDCF(baseRevenue, baseEbitMargin, inputs)
      const pvP = projections.reduce((s, p) => s + p.pvFCFF, 0)
      const pvTV = terminalValue / Math.pow(1 + wacc, inputs.projectionYears)
      const iv = pvP + pvTV - netDebt
      return shares > 0 ? iv / shares : 0
    }),
  )

  return { waccValues, terminalGrowthValues, intrinsicValues }
}
