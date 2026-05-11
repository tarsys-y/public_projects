import { NextRequest, NextResponse } from 'next/server'
import { fetchQuote, fetchHistorical } from '@/lib/api/yahoo'
import { overlayCVMData, getCVMData } from '@/lib/api/cvm'
import { fetchCurrentSELIC, fetchCurrentEMBI } from '@/lib/api/bcb'
import { computeGrahamAnalysis } from '@/lib/calculations/graham'
import { computeDamodaranAnalysis } from '@/lib/calculations/damodaran'
import { computeQuantAnalysis } from '@/lib/calculations/quant'
import { buildFusionAnalysis } from '@/lib/calculations/fusion'

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } },
) {
  const ticker = params.ticker.toUpperCase()

  try {
    const [quote, history, selic, embi] = await Promise.all([
      fetchQuote(ticker),
      fetchHistorical(ticker, '2y', '1d'),
      fetchCurrentSELIC(),
      fetchCurrentEMBI(),
    ])

    if (!quote) {
      return NextResponse.json({ error: 'Ticker not found' }, { status: 404 })
    }

    // Load seeded fundamentals as baseline, overlay with real CVM data if available
    const { SEEDED_FUNDAMENTALS } = await import('@/lib/data/seeded-fundamentals')
    const seededRaw = SEEDED_FUNDAMENTALS.find((f) => f.ticker === ticker)
    const seeded = seededRaw ? overlayCVMData(seededRaw) : seededRaw
    const cvmData = getCVMData(ticker)

    if (!seeded) {
      return NextResponse.json({ error: 'Fundamentals not available' }, { status: 404 })
    }

    const prices = history.map((h) => h.close)
    const volumes = history.map((h) => h.volume)
    const ibovHistory = await fetchHistorical('^BVSP', '2y', '1d')

    const ibovPrices = ibovHistory.map((h) => h.close)

    const graham = computeGrahamAnalysis({
      ticker,
      eps: seeded.eps,
      bvps: seeded.bvps,
      pe: quote.price / seeded.eps,
      pb: quote.price / seeded.bvps,
      currentRatio: seeded.currentRatio,
      currentPrice: quote.price,
      history: seeded.history,
      hasDividendHistory20y: seeded.hasDividendHistory20y,
      aaBondYield: 0.12,
      expectedGrowthRate: seeded.expectedGrowthRate,
    })

    const wacc = selic / 100 + seeded.beta * (0.05 + embi / 10000)
    const damodaranInputs = {
      ticker,
      riskFreeRate: selic / 100,
      beta: seeded.beta,
      erp: 0.05,
      countryRiskPremium: embi / 10000,
      costOfDebt: seeded.costOfDebt,
      taxRate: 0.34,
      debtWeight: seeded.debtWeight,
      equityWeight: 1 - seeded.debtWeight,
      revenueGrowthY1to5: seeded.revenueGrowthY1to5,
      revenueGrowthY6to10: seeded.revenueGrowthY6to10,
      terminalGrowthRate: 0.04,
      ebitMarginTarget: seeded.ebitMarginTarget,
      capexPctRevenue: seeded.capexPctRevenue,
      nwcPctRevenue: seeded.nwcPctRevenue,
      projectionYears: 10,
      wacc,
      costOfEquity: selic / 100 + seeded.beta * (0.05 + embi / 10000),
    }

    const damodaran = computeDamodaranAnalysis({
      ticker,
      baseRevenue: seeded.revenue,
      baseEbitMargin: seeded.ebitMargin,
      netDebt: seeded.netDebt,
      sharesOutstanding: seeded.sharesOutstanding,
      currentPrice: quote.price,
      inputs: damodaranInputs,
    })

    const quant = prices.length > 200
      ? computeQuantAnalysis({ ticker, prices, volumes, ibovPrices })
      : {
          ticker,
          momentum12_1: seeded.momentum,
          momentumZScore: 0,
          ma200d: quote.price,
          meanReversionZScore: seeded.meanReversionZ,
          priceVsMa200pct: 0,
          volatility90d: seeded.volatility,
          volatilityRegime: 'normal' as const,
          beta: seeded.beta,
          rollingBeta63d: seeded.beta,
          volumeAnomaly: seeded.volumeAnomaly,
          relativeVolume: 1,
          quantScore: seeded.quantScore,
        }

    const fusion = buildFusionAnalysis({
      ticker,
      grahamScore: graham.grahamScore,
      fisherScore: seeded.fisherScore,
      greenblattScore: seeded.greenblattScore,
      damodaranScore: damodaran.damodaranScore,
      quantScore: quant.quantScore,
      mosPercent: damodaran.marginOfSafety,
      currentPrice: quote.price,
      intrinsicValue: damodaran.intrinsicValuePerShare,
      momentum12_1: quant.momentum12_1,
      volatility90d: quant.volatility90d,
    })

    return NextResponse.json({
      data: {
        stock: {
          ticker,
          name: seeded.name,
          sector: seeded.sector,
          subsector: seeded.subsector ?? '',
        },
        quote,
        history: history.slice(-365),
        graham,
        damodaran,
        quant,
        fusion,
        fisher: {
          ticker,
          revenueCAGR5y: seeded.revenueCAGR5y,
          revenueCAGR3y: seeded.revenueCAGR3y ?? seeded.revenueCAGR5y,
          roeConsistency: seeded.roeConsistency,
          rdeRatio: seeded.rdeRatio ?? 0,
          operatingMarginTrend: seeded.operatingMarginTrend,
          insiderOwnership: seeded.insiderOwnership ?? 0,
          grossMarginTrend: 0,
          // Qualitative: null = not yet answered
          marketPotential: null,
          productPipelineStrength: null,
          rdeEffectiveness: null,
          salesOrganization: null,
          worthwhileProfitMargin: null,
          marginImprovementPlan: null,
          laborRelations: null,
          executiveRelations: null,
          managementDepth: null,
          costControls: null,
          industryPosition: null,
          longRangeOutlook: null,
          noDilutionRisk: null,
          managementTransparency: null,
          managementIntegrity: null,
          autoScore: seeded.fisherScore,
          qualitativeScore: null,
          fisherScore: seeded.fisherScore,
          scuttlebuttNotes: '',
        },
        fundamentals: seeded,
        // Real CVM financials history (present only when sync-cvm has been run)
        cvmAnnual: cvmData?.annual ?? null,
        cvmQuarterly: cvmData?.quarterly ?? null,
      },
      cached: false,
    })
  } catch (err) {
    console.error('Stock detail error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
