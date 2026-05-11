#!/usr/bin/env tsx
// sync-cvm.ts — Baixa e processa demonstrações financeiras oficiais da CVM
//
// Fontes:
//   DFP (anual):     https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS/
//   ITR (trimestral):https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/ITR/DADOS/
//   Cadastro:        https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv
//
// Uso:
//   npm run sync-cvm                 # sincroniza ano atual + anterior
//   npm run sync-cvm -- --years=3   # sincroniza últimos 3 anos
//   npm run sync-cvm -- --itr       # inclui dados trimestrais (ITR)
//
// Saída: lib/data/cvm-cache.json

import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { createInterface } from 'readline'
import {
  dfpUrl, itrUrl, CAD_URL, ACCOUNT_CODES,
  type CVMCache, type CVMCompanyData, type CVMAnnualData, type CVMQuarterlyData,
} from '../lib/api/cvm'
import { TICKER_TO_CVM, buildReverseMap } from '../lib/data/cvm-ticker-map'

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const numYears = parseInt(args.find((a) => a.startsWith('--years='))?.split('=')[1] ?? '2', 10)
const includeITR = args.includes('--itr')
const currentYear = new Date().getFullYear()

const OUT_PATH = path.join(process.cwd(), 'lib', 'data', 'cvm-cache.json')

// ─── CVM codes we care about ─────────────────────────────────────────────────

const targetCodes = new Set(Object.values(TICKER_TO_CVM).map((r) => r.cvmCode))
const reverseMap = buildReverseMap()

console.log(`\n🇧🇷  sync-cvm — Dados Abertos CVM`)
console.log(`   Anos: ${currentYear - numYears + 1} → ${currentYear}`)
console.log(`   Empresas mapeadas: ${targetCodes.size}`)
console.log(`   ITR (trimestral): ${includeITR ? 'sim' : 'não'}\n`)

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function fetchStream(url: string): Promise<Readable | null> {
  try {
    console.log(`   ⬇  ${url}`)
    const res = await fetch(url, {
      headers: { 'User-Agent': 'sync-cvm/1.0 (dados.cvm.gov.br; research)' },
    })
    if (!res.ok) {
      console.warn(`   ⚠  HTTP ${res.status} — ${url}`)
      return null
    }
    // Convert Web ReadableStream to Node Readable
    const reader = res.body!.getReader()
    return new Readable({
      async read() {
        const { done, value } = await reader.read()
        if (done) this.push(null)
        else this.push(Buffer.from(value))
      },
    })
  } catch (e) {
    console.warn(`   ✗  Falha ao baixar ${url}: ${(e as Error).message}`)
    return null
  }
}

// ─── CSV parser ───────────────────────────────────────────────────────────────
// CVM CSVs: semicolon-separated, may be UTF-8 or ISO-8859-1 (Latin1)
// We decode as latin1 to handle both without extra deps.

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (c === ';' && !inQ) {
      fields.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  fields.push(cur)
  return fields
}

type RowHandler = (row: Record<string, string>) => void

async function parseCSV(stream: Readable, handler: RowHandler): Promise<number> {
  let headers: string[] | null = null
  let count = 0
  const rl = createInterface({ input: stream, crlfDelay: Infinity })
  for await (const raw of rl) {
    const line = raw.trim()
    if (!line) continue
    const fields = parseCsvLine(line)
    if (!headers) {
      // Strip UTF-8 BOM if present
      headers = fields.map((h) => h.replace(/^﻿/, '').trim())
      continue
    }
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (fields[i] ?? '').trim() })
    handler(row)
    count++
  }
  return count
}

// ─── Data structures ──────────────────────────────────────────────────────────

type AccountMap = Map<string, Map<string, number>>
// AccountMap: cvmCode → (accountCode → value in BRL millions)

function parseValue(raw: string, escala: string): number {
  const v = parseFloat(raw.replace(',', '.'))
  if (isNaN(v)) return 0
  // CVM reports in 'MIL' (thousands) — convert to BRL millions
  if (escala === 'MIL' || escala === 'MILHAR') return v / 1000
  if (escala === 'UNIDADE') return v / 1_000_000
  return v / 1000  // default assume MIL
}

// ─── DFP parsing ─────────────────────────────────────────────────────────────

async function parseDFP(
  type: 'BPA' | 'BPP' | 'DRE' | 'DFC_MI',
  year: number,
  targetAccounts: string[],
): Promise<Map<string, AccountMap>> {
  // result: referenceDate → cvmCode → accountMap
  const byDate = new Map<string, AccountMap>()

  const stream = await fetchStream(dfpUrl(type, year))
  if (!stream) return byDate

  let rows = 0
  await parseCSV(stream, (row) => {
    const cvmCode = row['CD_CVM']
    if (!targetCodes.has(cvmCode)) return

    const ordem = row['ORDEM_EXERC']
    if (ordem !== 'ÚLTIMO') return  // only most recent period in each filing

    const dtFim = row['DT_FIM_EXERC']  // YYYY-MM-DD
    const accountCode = row['CD_CONTA']
    if (!targetAccounts.includes(accountCode)) return

    const escala = row['ESCALA_MOEDA'] ?? 'MIL'
    const value = parseValue(row['VL_CONTA'] ?? '0', escala)

    if (!byDate.has(dtFim)) byDate.set(dtFim, new Map())
    const codeMap = byDate.get(dtFim)!
    if (!codeMap.has(cvmCode)) codeMap.set(cvmCode, new Map())
    codeMap.get(cvmCode)!.set(accountCode, value)
    rows++
  })

  console.log(`   ✓  DFP ${type} ${year}: ${rows} linhas relevantes`)
  return byDate
}

// ─── ITR parsing ─────────────────────────────────────────────────────────────

interface ITREntry {
  cvmCode: string
  dtFim: string
  revenue: number | null
  ebit: number | null
  netIncome: number | null
  totalAssets: number | null
  totalEquity: number | null
}

async function parseITR(year: number): Promise<ITREntry[]> {
  const entries: ITREntry[] = []
  const byPeriod = new Map<string, Map<string, Map<string, number>>>()
  // period → cvmCode → accountCode → value

  const targetAccounts: string[] = [
    ACCOUNT_CODES.revenue, ACCOUNT_CODES.ebit, ACCOUNT_CODES.netIncome,
    ACCOUNT_CODES.totalAssets, ACCOUNT_CODES.totalEquity,
  ]

  for (const type of ['BPA', 'BPP', 'DRE'] as const) {
    const stream = await fetchStream(itrUrl(type as 'BPA' | 'BPP' | 'DRE', year))
    if (!stream) continue

    await parseCSV(stream, (row) => {
      const cvmCode = row['CD_CVM']
      if (!targetCodes.has(cvmCode)) return
      if (row['ORDEM_EXERC'] !== 'ÚLTIMO') return

      const dtFim = row['DT_FIM_EXERC']
      const ac = row['CD_CONTA']
      if (!targetAccounts.includes(ac)) return

      const escala = row['ESCALA_MOEDA'] ?? 'MIL'
      const value = parseValue(row['VL_CONTA'] ?? '0', escala)

      if (!byPeriod.has(dtFim)) byPeriod.set(dtFim, new Map())
      const cm = byPeriod.get(dtFim)!
      if (!cm.has(cvmCode)) cm.set(cvmCode, new Map())
      cm.get(cvmCode)!.set(ac, value)
    })
  }

  for (const [dtFim, codeMap] of byPeriod) {
    for (const [cvmCode, accounts] of codeMap) {
      entries.push({
        cvmCode,
        dtFim,
        revenue: accounts.get(ACCOUNT_CODES.revenue) ?? null,
        ebit: accounts.get(ACCOUNT_CODES.ebit) ?? null,
        netIncome: accounts.get(ACCOUNT_CODES.netIncome) ?? null,
        totalAssets: accounts.get(ACCOUNT_CODES.totalAssets) ?? null,
        totalEquity: accounts.get(ACCOUNT_CODES.totalEquity) ?? null,
      })
    }
  }

  return entries
}

// ─── Build company dataset ────────────────────────────────────────────────────

function dtToYear(dt: string): number {
  return parseInt(dt.split('-')[0], 10)
}

function dtToQuarter(dt: string): number {
  const month = parseInt(dt.split('-')[1], 10)
  return Math.ceil(month / 3)
}

function buildAnnual(
  cvmCode: string,
  bpaMap: Map<string, AccountMap>,
  bppMap: Map<string, AccountMap>,
  dreMap: Map<string, AccountMap>,
  dfcMap: Map<string, AccountMap>,
): CVMAnnualData[] {
  // Collect all dates that appear in any statement
  const dates = new Set<string>([
    ...bpaMap.keys(), ...bppMap.keys(), ...dreMap.keys(), ...dfcMap.keys()
  ])

  const results: CVMAnnualData[] = []
  for (const dtFim of dates) {
    const bpa = bpaMap.get(dtFim)?.get(cvmCode)
    const bpp = bppMap.get(dtFim)?.get(cvmCode)
    const dre = dreMap.get(dtFim)?.get(cvmCode)
    const dfc = dfcMap.get(dtFim)?.get(cvmCode)

    const revenue = dre?.get(ACCOUNT_CODES.revenue) ?? null
    const ebit = dre?.get(ACCOUNT_CODES.ebit) ?? null

    // Fix revenue sign: CVM often reports revenue as negative in DRE (deduction convention)
    const revFixed = revenue !== null ? Math.abs(revenue) : null
    // EBIT: absolute value if negative (some companies invert sign)
    const ebitFixed = ebit !== null && ebit < -1 ? null : ebit  // leave negative EBIT as-is

    results.push({
      year: dtToYear(dtFim),
      referenceDate: dtFim,
      revenue: revFixed,
      grossProfit: dre?.get(ACCOUNT_CODES.grossProfit) ?? null,
      ebit: ebitFixed,
      netIncome: dre?.get(ACCOUNT_CODES.netIncome) ?? null,
      totalAssets: bpa?.get(ACCOUNT_CODES.totalAssets) ?? null,
      currentAssets: bpa?.get(ACCOUNT_CODES.currentAssets) ?? null,
      cash: bpa?.get(ACCOUNT_CODES.cash) ?? null,
      noncurrentAssets: bpa?.get(ACCOUNT_CODES.noncurrentAssets) ?? null,
      currentLiabilities: bpp?.get(ACCOUNT_CODES.currentLiabilities) ?? null,
      noncurrentLiabilities: bpp?.get(ACCOUNT_CODES.noncurrentLiabilities) ?? null,
      shortTermDebt: bpp?.get(ACCOUNT_CODES.shortTermDebt) ?? null,
      longTermDebt: bpp?.get(ACCOUNT_CODES.longTermDebt) ?? null,
      totalEquity: bpp?.get(ACCOUNT_CODES.totalEquity) ?? null,
      operatingCF: dfc?.get(ACCOUNT_CODES.operatingCF) ?? null,
      investingCF: dfc?.get(ACCOUNT_CODES.investingCF) ?? null,
      financingCF: dfc?.get(ACCOUNT_CODES.financingCF) ?? null,
    })
  }

  // Sort newest first
  return results.sort((a, b) => b.referenceDate.localeCompare(a.referenceDate))
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const cache: CVMCache = {
    generatedAt: new Date().toISOString(),
    companies: {},
  }

  // Target account codes for DFP
  const bpaAccounts = [ACCOUNT_CODES.totalAssets, ACCOUNT_CODES.currentAssets, ACCOUNT_CODES.cash, ACCOUNT_CODES.noncurrentAssets]
  const bppAccounts = [ACCOUNT_CODES.currentLiabilities, ACCOUNT_CODES.shortTermDebt, ACCOUNT_CODES.noncurrentLiabilities, ACCOUNT_CODES.longTermDebt, ACCOUNT_CODES.totalEquity]
  const dreAccounts = [ACCOUNT_CODES.revenue, ACCOUNT_CODES.grossProfit, ACCOUNT_CODES.ebit, ACCOUNT_CODES.netIncome]
  const dfcAccounts = [ACCOUNT_CODES.operatingCF, ACCOUNT_CODES.investingCF, ACCOUNT_CODES.financingCF]

  // Download DFP data for each requested year
  const years = Array.from({ length: numYears }, (_, i) => currentYear - i).filter((y) => y >= 2015)
  console.log('━━━ DFP (anual) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Aggregate across all years: cvmCode → annual entries
  const allBPA = new Map<string, AccountMap>()
  const allBPP = new Map<string, AccountMap>()
  const allDRE = new Map<string, AccountMap>()
  const allDFC = new Map<string, AccountMap>()

  function mergeInto(target: Map<string, AccountMap>, source: Map<string, AccountMap>) {
    for (const [dt, codeMap] of source) {
      if (!target.has(dt)) target.set(dt, codeMap)
      else {
        const t = target.get(dt)!
        for (const [cvmCode, accs] of codeMap) {
          if (!t.has(cvmCode)) t.set(cvmCode, accs)
          else {
            for (const [ac, v] of accs) t.get(cvmCode)!.set(ac, v)
          }
        }
      }
    }
  }

  for (const year of years) {
    const [bpa, bpp, dre, dfc] = await Promise.all([
      parseDFP('BPA', year, bpaAccounts),
      parseDFP('BPP', year, bppAccounts),
      parseDFP('DRE', year, dreAccounts),
      parseDFP('DFC_MI', year, dfcAccounts),
    ])
    mergeInto(allBPA, bpa)
    mergeInto(allBPP, bpp)
    mergeInto(allDRE, dre)
    mergeInto(allDFC, dfc)
  }

  // ITR (quarterly)
  let itrEntries: ITREntry[] = []
  if (includeITR) {
    console.log('\n━━━ ITR (trimestral) ━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    itrEntries = await parseITR(currentYear)
  }

  // Build company records
  console.log('\n━━━ Construindo cache ━━━━━━━━━━━━━━━━━━━━━━━━━━')
  for (const cvmCode of targetCodes) {
    const tickers = reverseMap.get(cvmCode) ?? []
    if (!tickers.length) continue

    const ref = Object.values(TICKER_TO_CVM).find((r) => r.cvmCode === cvmCode)
    if (!ref) continue

    const annual = buildAnnual(cvmCode, allBPA, allBPP, allDRE, allDFC)
    if (annual.length === 0) {
      console.warn(`   ⚠  Sem dados anuais para ${cvmCode} (${tickers.join('/')})`)
      continue
    }

    // Build quarterly from ITR entries
    const quarterly: CVMQuarterlyData[] = itrEntries
      .filter((e) => e.cvmCode === cvmCode)
      .map((e) => ({
        year: dtToYear(e.dtFim),
        quarter: dtToQuarter(e.dtFim),
        referenceDate: e.dtFim,
        revenue: e.revenue,
        ebit: e.ebit,
        netIncome: e.netIncome,
        totalAssets: e.totalAssets,
        totalEquity: e.totalEquity,
      }))
      .sort((a, b) => b.referenceDate.localeCompare(a.referenceDate))

    const company: CVMCompanyData = {
      cvmCode,
      cnpj: ref.cnpj,
      officialName: ref.name,
      updatedAt: new Date().toISOString(),
      annual,
      quarterly,
    }

    cache.companies[cvmCode] = company
    console.log(`   ✓  ${cvmCode} (${tickers.join('/')}) — ${annual.length} anos, ${quarterly.length} trimestres`)
  }

  // Write cache
  fs.writeFileSync(OUT_PATH, JSON.stringify(cache, null, 2), 'utf-8')
  const sizeMB = (fs.statSync(OUT_PATH).size / 1_048_576).toFixed(1)
  console.log(`\n✅  Cache gravado em ${OUT_PATH}`)
  console.log(`   Empresas: ${Object.keys(cache.companies).length}`)
  console.log(`   Tamanho: ${sizeMB} MB`)
  console.log(`   Gerado em: ${cache.generatedAt}\n`)
}

main().catch((e) => {
  console.error('❌ Erro:', e)
  process.exit(1)
})
