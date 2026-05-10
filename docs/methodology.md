# Methodology — Formula Reference

Every formula used in this dashboard, with its source book, implementation notes, and Brazil-specific adjustments.

---

## Graham Metrics

### Graham Number
**Book:** The Intelligent Investor, Chapter 14  
**Formula:** `Graham Number = √(22.5 × EPS × BVPS)`  
**Purpose:** Upper bound on fair price for a defensive investor  
**Brazil adjustment:** Use diluted EPS in BRL; use BVPS excluding intangibles  
**Implementation:** `lib/calculations/graham.ts → grahamNumber()`

### Graham Intrinsic Value
**Formula:** `V = EPS × (8.5 + 2g) × 4.4 / Y`  
Where: `g` = expected EPS growth next 7-10 years, `Y` = current AAA bond yield  
**Brazil adjustment:** Replace AAA bond yield with IPCA + 6% (corporate bond proxy)  
**Limitation:** Graham himself cautioned this is approximate; supplement with DCF

### P/E × P/B Rule
**Formula:** `P/E × P/B < 22.5`  
This is the multiplicative form of the Graham Number inequality  
Both P/E and P/B individually must also be within bounds

---

## Greenblatt Magic Formula

### Return on Capital (ROC)
**Book:** The Little Book That Beats the Market, Chapter 4  
**Formula:** `ROC = EBIT / (Net Working Capital + Net Fixed Assets)`  
Where:  
- `Net Working Capital = Current Assets - Current Liabilities - Excess Cash`  
- `Excess Cash = Cash - max(0, Current Liabilities - Current Assets + Cash)`  
- `Net Fixed Assets = Gross PP&E - Accumulated Depreciation`  

**Why EBIT not net income?** EBIT is pre-tax and pre-interest, allowing fair comparison across firms with different tax rates and leverage levels.  
**Brazil note:** Add back JCP (Juros sobre Capital Próprio) to EBIT since it's a financing decision, not operating.

### Earnings Yield (EY)
**Formula:** `EY = EBIT / Enterprise Value`  
Where: `EV = Market Cap + Total Debt + Minority Interest - Cash & Equivalents`  
**Brazil note:** EV uses total financial debt (not total liabilities); include debentures, CRI, CRA, debt abroad

### Magic Formula Combined Score
**Formula:** `Rank = Percentile(ROC_rank + EY_rank)`  
- Both ranks are ascending (higher ROC = lower rank number; we want TOP ranked)
- Final score normalized 0-100 (100 = best in universe)
- Universe: all B3 stocks with ADV ≥ R$1M, excluding financials (banks, insurers) and utilities

---

## Damodaran Valuation

### Cost of Equity — Brazil CAPM
**Book:** Investment Valuation, Chapter 8  
**Formula:**  
```
Ke = Rf + β × (ERP_US + CRP)
   = SELIC + β × (5.0% + EMBI+_Brazil%)
```
Where:
- `Rf` = SELIC rate (current target rate from BCB)  
- `β` = equity beta vs IBOV (2-year weekly regression)  
- `ERP_US` = 5.0% (Damodaran's current mature market ERP estimate)  
- `CRP` = Country Risk Premium = EMBI+ Brasil ÷ 100 (in decimal)  

**Why SELIC as risk-free?** SELIC is the overnight rate set by BCB; for consistency we use the short-term rate and capture Brazil risk in CRP rather than in the bond yield.  
**Alternative:** Use NTN-B (IPCA-linked bond) for the real risk-free rate, especially for inflation-adjusted DCF.

### WACC
**Formula:**  
```
WACC = Ke × (E/V) + Kd × (1 - t) × (D/V)
```
Where:
- `E/V` = equity weight = Market Cap / (Market Cap + Net Debt)
- `D/V` = debt weight = Net Debt / (Market Cap + Net Debt)
- `Kd` = cost of debt = interest expense / total financial debt
- `t` = 34% (Brazilian IRPJ 25% + CSLL 9%)

**JCP treatment:** JCP reduces taxable income; adjust Kd upward by (JCP / Total Debt) before applying tax shield, or equivalently reduce Ke by (JCP × t / Equity) post-tax.

### DCF Intrinsic Value
**Formula:**  
```
IV = Σ(t=1 to n) [FCFF_t / (1+WACC)^t] + [TV / (1+WACC)^n] - Net Debt
TV = FCFF_n × (1 + g_perp) / (WACC - g_perp)
```
Where:
- `FCFF = EBIT × (1-t) + D&A - CapEx - ΔNWC`
- `g_perp ≤ long-term Brazil nominal GDP growth (~5.5% nominal, ~2.5% real)`
- Default projection period: 10 years
- n = 10 (projection horizon)

**Margin of Safety:**  
```
MOS% = (Intrinsic Value - Current Price) / Intrinsic Value × 100
```
Target: MOS ≥ 30% (conservative); MOS ≥ 15% (enterprising)

### Sensitivity Table
Shows how intrinsic value changes across:
- WACC: [base-2%, base-1%, base, base+1%, base+2%]
- Terminal growth: [0%, 1%, 2%, 3%, 4%]

---

## Fisher Quality Metrics

### Revenue CAGR
**Formula:** `CAGR_n = (Revenue_current / Revenue_(current-n))^(1/n) - 1`  
Track 3-year and 5-year CAGRs. Flag if deceleration > 5pp over 3 years.

### ROE Consistency
**Formula:** `σ_ROE = StdDev(annual_ROE, 10_years)`  
High σ_ROE signals cyclicality or management inconsistency.  
Target: σ_ROE < 5% for a truly stable compounder.

### Operating Margin Trend
Compute linear regression slope of operating margin over 10 years.  
Positive slope = expanding margins (good); negative = compressing (red flag).

---

## Quantitative Signals

### 12-1 Month Momentum
**Book:** The Man Who Solved the Market (factor research)  
**Formula:** `Mom = (P_(t-21) / P_(t-273)) - 1`  
(21 trading days ≈ 1 month; 273 trading days ≈ 13 months)  
**Why skip the last month?** Short-term reversal effect — recent 1-month returns are negatively autocorrelated in the cross-section.

### Mean Reversion Z-Score
**Formula:**  
```
μ = MA_200d (200-day simple moving average)
σ = StdDev(daily_close, 200d)
Z = (P_current - μ) / σ
```
Interpretation:
- Z > +2: significantly above trend, potential reversal
- Z < -2: significantly below trend, potential mean reversion
- -1 < Z < +1: within normal range

### Volatility
**Formula:** `σ_annual = StdDev(ln(P_t / P_(t-1)), 90d) × √252`  
Note: using log returns for stationarity.

### Beta vs IBOV
**Formula:** `β = Cov(R_stock, R_IBOV) / Var(R_IBOV)`  
Computed over 252 trading days using daily returns.  
Rolling beta also displayed (63d window) to show instability.

---

## Fusion Score

**Book:** Fusion Analysis (Palicka)  
**Formula:**  
```
Fusion = 0.20 × Graham_Score
       + 0.20 × Fisher_Score
       + 0.20 × Greenblatt_Score
       + 0.25 × Damodaran_Score
       + 0.15 × Quant_Score
```

### Sub-Score Normalization

**Graham Score:** `100 × (passed_criteria / 7)`  
Range 0-100; each criterion is binary pass/fail.

**Fisher Score:** `100 × (positive_responses / 15)`  
Range 0-100; user fills qualitative items, some auto-populated from filings.

**Greenblatt Score:** Percentile rank within B3 universe  
100 = top rank (best combined ROC + EY)

**Damodaran Score:**  
```
D_score = 100 × sigmoid(MOS%, k=0.1, midpoint=0)
        = 100 / (1 + exp(-0.1 × MOS%))
```
- MOS% = -30% → D_score ≈ 5 (very overvalued)
- MOS% = 0% → D_score = 50 (fair value)
- MOS% = +30% → D_score ≈ 95 (30% margin of safety)

**Quant Score:**  
```
Q = clamp(50 + 10×Mom_zscore - 5×MR_zscore + 5×Vol_adjustment, 0, 100)
```
- Positive momentum adds points
- Overbought (high MR Z) subtracts points
- Low volatility adds points (risk-adjusted)

---

## Portfolio Metrics

### Sharpe Ratio
**Formula:** `Sharpe = (R_portfolio - R_f) / σ_portfolio`  
Use SELIC as `R_f`; compute daily, annualize.

### Maximum Drawdown
**Formula:** `MDD = min(P_t / max(P_0..P_t) - 1)`  
Track rolling 252d MDD and all-time MDD.

### Portfolio Beta
**Formula:** `β_portfolio = Σ(w_i × β_i)` (weighted average)

### Sortino Ratio
**Formula:** `Sortino = (R_portfolio - R_f) / σ_downside`  
Where `σ_downside = StdDev(returns < 0) × √252`

---

## Brazil-Specific Data Sources

| Data Point | Source | API / Method |
|------------|--------|--------------|
| B3 quotes (real-time) | brapi.dev | REST API (free tier: delayed 15min) |
| Historical prices | brapi.dev / yfinance (.SA suffix) | REST / Python |
| SELIC rate | BCB SGS series 432 | `api.bcb.gov.br/dados/serie/bcdata.sgs.432` |
| IPCA (inflation) | BCB SGS series 433 | `api.bcb.gov.br/dados/serie/bcdata.sgs.433` |
| USD/BRL (PTax) | BCB PTAX | `olinda.bcb.gov.br/olinda/servico/PTAX` |
| EMBI+ Brasil | BCB SGS series 17626 | `api.bcb.gov.br/dados/serie/bcdata.sgs.17626` |
| Fundamentals | Fundamentus.com.br | HTML scraping (respectful) |
| CVM filings | dados.cvm.gov.br | REST API (open data) |
| IBOV composition | brapi.dev or B3 website | REST API |
