import { NextResponse } from 'next/server'
import { fetchBCBSeries, BCB_SERIES, fetchCurrentSELIC, fetchCurrentIPCA, fetchCurrentEMBI, fetchPTAX } from '@/lib/api/bcb'
import { fetchQuote } from '@/lib/api/brapi'
import type { MacroData } from '@/types'

export const revalidate = 900 // 15 minutes

export async function GET() {
  try {
    const [
      selicHistory,
      ipcaHistory,
      embiData,
      usdBrlQuote,
      ibovQuote,
      smallCapsQuote,
      selicCurrent,
      ipcaCurrent,
      embiCurrent,
      usdBrlCurrent,
    ] = await Promise.all([
      fetchBCBSeries(BCB_SERIES.SELIC_META, 30),
      fetchBCBSeries(BCB_SERIES.IPCA_ACUMULADO_12M, 30),
      fetchBCBSeries(BCB_SERIES.EMBI_PLUS, 1),
      fetchQuote('USDBRL=X'),
      fetchQuote('^BVSP'),
      fetchQuote('SMLL11'),
      fetchCurrentSELIC(),
      fetchCurrentIPCA(),
      fetchCurrentEMBI(),
      fetchPTAX(),
    ])

    const selicValues = selicHistory.map((d) => d.value)
    const ipcaValues = ipcaHistory.map((d) => d.value)

    const macro: MacroData = {
      selic: selicCurrent,
      selicChange30d: selicValues.length >= 2
        ? selicValues[selicValues.length - 1] - selicValues[0]
        : 0,
      ipca: ipcaCurrent,
      ipcaChange30d: ipcaValues.length >= 2
        ? ipcaValues[ipcaValues.length - 1] - ipcaValues[0]
        : 0,
      usdBrl: usdBrlCurrent,
      usdBrlChange30d: usdBrlQuote?.changePercent ?? 0,
      ibov: ibovQuote?.price ?? 130000,
      ibovChange30d: ibovQuote?.changePercent ?? 0,
      ibovChangeYTD: 0, // computed separately if needed
      smallCaps: smallCapsQuote?.price ?? 0,
      smallCapsChange30d: smallCapsQuote?.changePercent ?? 0,
      brBond10y: selicCurrent + embiCurrent / 100,
      embiPlus: embiData[0]?.value ?? 200,
      timestamp: new Date().toISOString(),
      selicHistory: selicValues.slice(-30),
      ipcaHistory: ipcaValues.slice(-30),
      usdBrlHistory: [],
      ibovHistory: [],
    }

    return NextResponse.json({ data: macro, cached: false })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch macro data' }, { status: 500 })
  }
}
