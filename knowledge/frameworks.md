# Investment Frameworks — Distilled Principles

This document maps the seven foundational investment books to actionable dashboard features.

---

## 1. The Intelligent Investor — Benjamin Graham

### Core Philosophy
Value investing: buy at a price sufficiently below intrinsic value to provide a margin of safety against error.

### Actionable Principles
| Principle | Dashboard Feature |
|-----------|------------------|
| Margin of Safety | MOS % meter on every stock (target ≥ 30%) |
| Mr. Market | Fear/Greed gauge for IBOV; sentiment overlay |
| Defensive Investor criteria | Graham Checklist (7 pass/fail items) |
| Graham Number | √(22.5 × EPS × BVPS) vs current price |
| Earnings stability | Positive EPS 10 consecutive years |
| Dividend record | Uninterrupted dividends 20 years |
| Earnings growth | ≥33% cumulative EPS growth over 10 years |

### Key Formulas
```
Graham Number = √(22.5 × EPS × Book Value Per Share)
Intrinsic Value (Graham) = EPS × (8.5 + 2g) × 4.4 / AAA_yield
  where g = expected 5-year growth rate
  AAA_yield = Brazilian AAA corporate bond yield
```

### Graham Defensive Screen (all must pass)
1. P/E ≤ 15
2. P/B ≤ 1.5
3. P/E × P/B ≤ 22.5
4. Current Ratio ≥ 2
5. Positive earnings every year for 10 years
6. Uninterrupted dividends for 20 years
7. EPS growth ≥ 33% over 10 years

---

## 2. Common Stocks and Uncommon Profits — Philip Fisher

### Core Philosophy
Growth investing: find exceptional companies with durable competitive advantages and hold them indefinitely ("never sell a great business").

### Actionable Principles
| Principle | Dashboard Feature |
|-----------|------------------|
| 15-point checklist | Qualitative checklist in Stock Detail → Fisher tab |
| Scuttlebutt method | Free-text notes field; link to management calls |
| Revenue growth | Revenue CAGR 5y and 10y KPIs |
| Profit margins | Operating margin trend (10 years) |
| R&D commitment | R&D/Revenue ratio |
| Management integrity | Insider ownership %; management score |
| Labor relations | Qualitative checkbox |
| Pricing power | Gross margin trend |

### Fisher's 15-Point Checklist (adapted for Brazil)
1. Does the company have products/services with sufficient market potential for substantial sales growth over several years?
2. Is management determined to continue developing products/services to grow sales even after current lines mature?
3. How effective is the company's R&D relative to size?
4. Does the company have above-average sales organization?
5. Does the company have a worthwhile profit margin?
6. What is the company doing to maintain or improve profit margins?
7. Does the company have outstanding labor and personnel relations?
8. Does the company have outstanding executive relations?
9. Does the company have depth to its management?
10. How good are the company's cost analysis and accounting controls?
11. Are there other aspects of the business that give clues to outstanding position in industry?
12. Does the company have a short-range or long-range outlook on profits?
13. Is there foreseeable equity financing that will dilute current shareholders?
14. Does management talk freely to investors in good times but clam up in bad?
15. Is management's integrity unquestionable?

### Key Metrics
```
Revenue CAGR 5y = (Revenue_t / Revenue_(t-5))^(1/5) - 1
ROE Consistency = StdDev(ROE_annual, 10 years) — lower is better
Operating Leverage = % change in EBIT / % change in Revenue
```

---

## 3. The Little Book That Beats the Market — Joel Greenblatt

### Core Philosophy
Magic Formula: systematically buy good businesses at bargain prices. Rank all stocks by Return on Capital and Earnings Yield, then buy the top combined-rank stocks.

### Actionable Principles
| Principle | Dashboard Feature |
|-----------|------------------|
| Return on Capital | ROC = EBIT / (Net Working Capital + Net Fixed Assets) |
| Earnings Yield | EY = EBIT / Enterprise Value |
| Combined rank | Magic Formula score (0–100 percentile rank in B3 universe) |
| Annual rebalancing | Backtester with Magic Formula strategy |
| Tax efficiency | Brazil-adjusted: accounts for JCP tax shield |

### Key Formulas
```
Return on Capital (ROC) = EBIT / (Net Working Capital + Net Fixed Assets)
  Net Working Capital = Current Assets - Current Liabilities - Excess Cash
  Net Fixed Assets = PP&E net of depreciation

Earnings Yield (EY) = EBIT / Enterprise Value
  Enterprise Value = Market Cap + Total Debt + Minority Interest 
                     - Cash & Equivalents

Magic Formula Score = (ROC_rank + EY_rank) / 2
  (percentile rank within B3 universe, higher = better)
```

### Implementation Notes for Brazil
- Adjust EBIT for JCP (Juros sobre Capital Próprio): JCP is tax-deductible, so add it back to get "true" EBIT for comparability
- Use BRL-adjusted figures; avoid mixing fiscal years
- Minimum liquidity filter: ADV ≥ R$ 1M
- Exclude financials and utilities (different capital structures)

---

## 4. Investment Valuation — Aswath Damodaran

### Core Philosophy
Every asset has an intrinsic value based on expected future cash flows, discounted at a rate reflecting riskiness. Brazil requires specific adjustments for country risk.

### Actionable Principles
| Principle | Dashboard Feature |
|-----------|------------------|
| DCF valuation | Interactive DCF model in Stock Detail → Damodaran tab |
| Cost of equity | CAPM with Brazil country risk premium (EMBI+) |
| Relative valuation | EV/EBITDA and P/E vs sector median |
| Margin of safety | DCF intrinsic value vs current price |
| Sensitivity analysis | 2×2 sensitivity table (WACC vs terminal growth) |

### Key Formulas
```
Cost of Equity (Brazil) = Rf_Brazil + β × ERP_US + Country_Risk_Premium
  Rf_Brazil = SELIC rate (risk-free proxy)
  ERP_US = 5.0% (Damodaran updated estimate)
  Country_Risk_Premium = EMBI+_Brazil / 100
  β = regression vs IBOV (2 years, weekly)

WACC = Ke × (E/V) + Kd × (1 - t) × (D/V)
  t = Brazilian corporate tax rate (34%)

DCF Terminal Value = FCF_n × (1 + g) / (WACC - g)
  g ≤ long-term Brazil GDP growth (typically 2-3%)

Intrinsic Value = Σ(FCF_t / (1+WACC)^t) + TV / (1+WACC)^n - Net Debt

Margin of Safety % = (Intrinsic Value - Current Price) / Intrinsic Value × 100
```

### Brazil-Specific Adjustments
- Risk-free rate: use SELIC (currently ~10.5%) not US Treasury
- Inflation: adjust real growth rates for IPCA differential
- Country risk: add EMBI+ Brasil (~200bps) to cost of equity
- FCFF: add back JCP as it's a financing cash flow, not operating

---

## 5. The Man Who Solved the Market — Gregory Zuckerman (Renaissance / Simons)

### Core Philosophy
Markets have exploitable statistical patterns. A systematic, quantitative approach removes emotional bias and finds edges in momentum, mean reversion, and factor anomalies.

### Actionable Principles
| Principle | Dashboard Feature |
|-----------|------------------|
| Momentum factor | 12-1 month price momentum (skip last month) |
| Mean reversion | Z-score of price vs 200d MA |
| Volatility signal | 90d annualized volatility; volatility regime |
| Volume anomaly | Relative volume vs 20d average |
| Factor model | Multi-factor composite in Quant tab |
| Statistical edge | Backtester with factor strategies |

### Key Formulas
```
Momentum (12-1) = Price(t-1month) / Price(t-13months) - 1
  (skip the most recent month to avoid short-term reversal)

Mean Reversion Z-Score = (Current Price - MA_200d) / StdDev(Price, 200d)
  Buy signal when Z < -2 (oversold), Sell when Z > +2 (overbought)

Volatility (90d annualized) = StdDev(daily_returns, 90d) × √252

Volume Anomaly = Volume_today / MA_Volume_20d
  > 2.0 = significant volume spike

Beta vs IBOV = Cov(stock_returns, IBOV_returns) / Var(IBOV_returns)
  (252 trading days of daily returns)

Residual Momentum = Stock_momentum - β × IBOV_momentum
  (idiosyncratic momentum, less correlated with market)
```

### Factor Signal Interpretation
- Momentum Z-score > 1: positive momentum trend
- Mean reversion Z > +2: potential reversal (avoid/short)
- Mean reversion Z < -2: potential reversion up (opportunity)
- Volume anomaly > 3: major institutional activity

---

## 6. Thinking in Bets — Annie Duke

### Core Philosophy
Separate decision quality from outcome quality. Think in probabilities, not certainties. Use expected value. Maintain a decision journal to learn from both good and bad outcomes.

### Actionable Principles
| Principle | Dashboard Feature |
|-----------|------------------|
| Probabilistic thinking | Confidence % on every buy/hold/avoid signal |
| Expected value | EV = Σ(probability × outcome) for each scenario |
| Decision quality | Decision Journal: record process at time of decision |
| Resulting protection | Flag decisions that worked despite bad process |
| Scenario analysis | Bull/base/bear case with explicit probabilities |
| Calibration | Track prediction accuracy over time |

### Decision Card Structure (per stock)
```
Decision: Buy / Hold / Avoid
Confidence: X% (calibrated estimate)

Scenarios:
- Bull case (P=25%): Target R$ [price], +[%] upside
- Base case (P=50%): Target R$ [price], +/-[%]  
- Bear case (P=25%): Target R$ [price], -[%] downside

Expected Value = P_bull × R_bull + P_base × R_base + P_bear × R_bear

Key assumptions:
1. [assumption 1]
2. [assumption 2]

What would change this view: [kill switch conditions]
```

### Decision Journal Entry
```
Date: [timestamp]
Ticker: [XXXX3]
Action: Buy / Sell / Hold / Watch
Price at decision: R$ [price]
Rationale: [free text]
Confidence: [1-10]
Expected outcome: [target, timeframe]
Key assumptions: [list]
What would make me wrong: [list]
--- (Review section, filled later) ---
Actual outcome: [price, date]
Was the decision quality good? [Y/N + why]
What did I learn? [free text]
```

---

## 7. Fusion Analysis — V. John Palicka

### Core Philosophy
No single analytical framework is sufficient. True investment insight comes from synthesizing fundamental, technical, quantitative, and behavioral signals into a coherent view.

### Actionable Principles
| Principle | Dashboard Feature |
|-----------|------------------|
| Fundamental pillar | Graham + Fisher + Damodaran scores |
| Technical pillar | Price trend, support/resistance, momentum |
| Quantitative pillar | Factor scores, statistical signals |
| Behavioral pillar | Sentiment, insider activity, analyst revisions |
| Synthesis | Fusion Score (0–100 composite) |
| Weight adjustment | User-configurable pillar weights in Settings |

### Fusion Score Calculation
```
Fusion Score = w1 × Graham_Score 
             + w2 × Fisher_Score 
             + w3 × Greenblatt_Score 
             + w4 × Damodaran_Score 
             + w5 × Quant_Score

Default weights: w1=20%, w2=20%, w3=20%, w4=25%, w5=15%
  (Damodaran slightly higher as it's most quantitatively rigorous)

Each sub-score is normalized 0–100:
- Graham Score: 100 × (Graham criteria passed / 7)
- Fisher Score: 100 × (Fisher criteria met / 15)  
- Greenblatt Score: Magic Formula percentile rank
- Damodaran Score: f(Margin of Safety %) — sigmoid normalized
- Quant Score: composite of momentum, mean reversion, volume signals
```

### Radar Chart Dimensions
The radar chart on the Fusion tab shows 5 axes:
1. Value (Graham + Greenblatt)
2. Quality (Fisher + ROE/ROIC)
3. Valuation (Damodaran DCF MOS)
4. Momentum (Quant momentum + trend)
5. Safety (Debt/Equity, Current Ratio, volatility)

---

## Dashboard Feature → Book Mapping

| Dashboard Feature | Primary Source | Secondary Source |
|-------------------|----------------|------------------|
| Graham Checklist | Intelligent Investor | — |
| Graham Number calculator | Intelligent Investor | Damodaran (validation) |
| Magic Formula rank | Little Book | — |
| DCF Model | Investment Valuation | — |
| Cost of Equity (Brazil) | Investment Valuation | — |
| Fisher 15-point checklist | Common Stocks | — |
| Scuttlebutt notes | Common Stocks | — |
| Momentum signals | Man Who Solved | Fusion Analysis |
| Mean reversion signals | Man Who Solved | Fusion Analysis |
| Decision Card (EV) | Thinking in Bets | — |
| Confidence intervals | Thinking in Bets | Investment Valuation |
| Decision Journal | Thinking in Bets | — |
| Fusion Score | Fusion Analysis | All books |
| Radar Chart | Fusion Analysis | All books |
| Macro Overview strip | Context for all | — |
| Mr. Market gauge | Intelligent Investor | Thinking in Bets |
| Backtester | Little Book | Man Who Solved |
