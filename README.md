# B3 Investment Dashboard

A production-grade multi-framework investment analysis dashboard for Brazilian stocks (B3 / Bovespa), synthesizing wisdom from seven legendary investment books.

## Philosophical Foundation

| Book | Author | Dashboard Features |
|------|--------|-------------------|
| The Intelligent Investor | Benjamin Graham | Graham Checklist, Graham Number, Margin of Safety meter |
| Common Stocks & Uncommon Profits | Philip Fisher | 15-point checklist, Scuttlebutt notes, Quality Score |
| The Little Book That Beats the Market | Joel Greenblatt | Magic Formula (ROC + EY ranking) |
| Investment Valuation | Aswath Damodaran | Interactive DCF, WACC (Brazil-adjusted), Sensitivity table |
| The Man Who Solved the Market | Zuckerman (Renaissance/Simons) | Momentum, Mean Reversion, Volatility signals |
| Thinking in Bets | Annie Duke | Decision Card (EV), Confidence %, Decision Journal |
| Fusion Analysis | V. John Palicka | Fusion Score (0–100 composite), Radar Chart |

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Charts:** Recharts + TradingView lightweight-charts
- **Backend:** Next.js API routes + Python FastAPI (heavy calculations)
- **Data:** brapi.dev (B3 quotes), BCB API (macro), yfinance (.SA tickers), Fundamentus (fundamentals)
- **Storage:** localStorage for portfolio/watchlist (upgrade to Supabase for production)

## Features

### 1. Macro Overview Strip
- SELIC, IPCA, USD/BRL, IBOV, Small Caps, Brazil 10Y, EMBI+
- Tiny sparklines + 30-day delta
- Tooltips explaining each metric and its role in valuation

### 2. Stock Screener (Primary Tool)
Multi-framework filterable table with:
- **Graham:** P/L, P/VP, Margem de Segurança, Graham Score (7 criteria)
- **Greenblatt:** ROC, Earnings Yield, Magic Formula Score (percentile rank)
- **Fisher:** Revenue CAGR 5y, ROE Consistency, Fisher Score
- **Damodaran:** DCF MoS%, EV/EBITDA vs sector median, Damodaran Score
- **Quant:** Momentum 12-1, Volatility 90d, Beta, Mean Reversion Z
- **Fusion:** Weighted composite score + Buy/Hold/Avoid with confidence %

Quick presets: Graham Defensivo, Magic Formula Top 20%, Top Fusion Buys

### 3. Stock Detail Page
- Price chart (candlestick) with DCF IV and Graham Number overlay
- KPI strip: Fusion Score, DCF MoS, Graham Number, WACC, Beta, Momentum
- **Decision Card** (Annie Duke): Bull/Base/Bear scenarios with explicit probabilities + Expected Value
- **5 Framework Tabs:** Graham checklist, Fisher 15-point, Damodaran DCF (interactive), Magic Formula, Quant signals
- **Fusion Tab:** Radar chart + breakdown of all sub-scores

### 4. Portfolio Tracker
- Add/remove positions (stored in localStorage)
- Decision Journal: record every trade with rationale, confidence, assumptions, kill switches
- Retrospective review: separate decision quality from outcome (Thinking in Bets)
- Risk metrics (requires Python service for full computation)

### 5. Watchlist & Alerts
- Add tickers with notes
- Configure alerts: price triggers, Fusion Score changes, Magic Formula rank improvement, DCF MoS threshold

### 6. Backtester
- Strategies: Magic Formula, Graham Defensive, Fusion Top Decile
- Configurable: date range, rebalance period, top N, initial capital, benchmark
- Metrics: CAGR, Sharpe, Sortino, Max Drawdown, Alpha, Beta, Hit Rate, Information Ratio
- Full backtest with real data requires Python FastAPI service

## Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- (Optional) Redis for caching
- (Optional) Supabase for persistent storage

### Quick Start

```bash
# 1. Clone and install
git clone <repo>
cd brazilian-stocks-dashboard
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — add BRAPI_TOKEN (free tier at brapi.dev)

# 3. Start Next.js
npm run dev
# → http://localhost:3000

# 4. (Optional) Start Python service
cd services/quant
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000
```

### Environment Variables

```env
# Required
BRAPI_TOKEN=your_brapi_token   # Free at https://brapi.dev

# Optional (enhances functionality)
DATABASE_URL=postgresql://...  # Supabase for persistent portfolio
REDIS_URL=redis://localhost:6379
QUANT_SERVICE_URL=http://localhost:8000
```

### Seeding Stock Data

```bash
npm run seed
```

Updates `lib/data/seeded-fundamentals.ts` with fresh prices from brapi.dev.
Run weekly in production.

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Dashboard layout
│   │   ├── screener/       # Stock screener (primary)
│   │   ├── stock/[ticker]/ # Stock detail page
│   │   ├── portfolio/      # Portfolio + Decision Journal
│   │   ├── watchlist/      # Watchlist + Alerts
│   │   └── backtester/     # Strategy backtester
│   └── api/                # API routes
│       ├── macro/          # BCB macro data
│       ├── screener/       # Screener with all KPIs
│       └── stock/[ticker]/ # Stock detail data
├── components/             # React components
│   ├── macro-strip.tsx
│   ├── screener-table.tsx
│   ├── screener-filters.tsx
│   ├── decision-card.tsx   # Annie Duke decision card
│   ├── dcf-model.tsx       # Interactive Damodaran DCF
│   ├── fusion-radar.tsx    # Fusion score radar chart
│   └── price-chart.tsx     # TradingView candlestick
├── lib/
│   ├── api/                # External API clients
│   │   ├── brapi.ts        # brapi.dev (B3 quotes)
│   │   ├── bcb.ts          # Brazilian Central Bank
│   │   └── fundamentus.ts  # Fundamentus scraper
│   ├── calculations/       # Financial math (fully tested)
│   │   ├── graham.ts       # Graham Number, checklist
│   │   ├── greenblatt.ts   # Magic Formula (ROC + EY)
│   │   ├── damodaran.ts    # DCF, WACC, sensitivity
│   │   ├── quant.ts        # Momentum, MR, volatility, beta
│   │   └── fusion.ts       # Fusion Score, decision card
│   └── data/
│       ├── tickers.ts      # Top 100 B3 tickers
│       └── seeded-fundamentals.ts  # Baseline fundamentals
├── types/
│   └── index.ts            # All TypeScript types
├── services/quant/         # Python FastAPI
│   ├── main.py
│   ├── requirements.txt
│   ├── routers/
│   │   ├── dcf.py          # DCF endpoint
│   │   ├── backtest.py     # Backtest endpoint
│   │   ├── factors.py      # Quant factors
│   │   └── data.py         # Data proxy
│   └── lib/
│       ├── calculations.py # Python financial math
│       └── data.py         # yfinance, BCB data
├── knowledge/
│   ├── frameworks.md       # All 7 books → dashboard mapping
│   └── books/              # Upload book PDFs here
├── docs/
│   └── methodology.md      # Every formula with source book
└── scripts/
    └── seed.ts             # Seed top 100 stocks
```

## Brazil-Specific Adjustments

- **Risk-free rate:** SELIC (not US Treasury) — updated live from BCB API
- **Country risk:** EMBI+ Brasil added to CAPM cost of equity
- **WACC:** Brazilian IRPJ + CSLL = 34% effective tax rate
- **DCF terminal growth:** ≤ long-term Brazil nominal GDP growth (~5.5%)
- **JCP:** Juros sobre Capital Próprio treated alongside dividends
- **Liquidity filter:** Minimum R$1M average daily volume
- **Inflation adjustment:** IPCA used for real vs nominal growth normalization

## Formula Sources

Every metric has a tooltip in the UI pointing to its source book and formula.
See `docs/methodology.md` for the complete reference.

## Disclaimer

This dashboard is a **decision support tool**, not an investment recommendation.
Scores and valuations are based on fundamental data and quantitative models.
Always conduct your own due diligence. Past backtest performance does not
guarantee future returns.

Data provided with 15-minute delay by brapi.dev free tier.

## Deployment

### Vercel (Frontend)
```bash
vercel deploy
# Set BRAPI_TOKEN in Vercel environment variables
```

### Railway (Python Service)
```bash
# In services/quant/
railway up
# Set QUANT_SERVICE_URL in Vercel env vars → Railway URL
```
