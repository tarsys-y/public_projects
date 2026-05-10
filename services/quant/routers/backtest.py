"""Backtesting endpoints."""

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date

from lib.data import fetch_historical_yf, fetch_ibov_prices, get_selic
from lib.calculations import compute_sharpe, compute_sortino, compute_max_drawdown, compute_beta

router = APIRouter()


class BacktestRequest(BaseModel):
    strategy: str  # "magic_formula" | "graham_defensive" | "fusion_top_decile"
    start_date: str
    end_date: str
    rebalance_period: str  # "monthly" | "quarterly" | "annually"
    top_n: int = 30
    initial_capital_brl: float = 100_000
    benchmark: str = "IBOV"
    tickers: Optional[list[str]] = None


@router.post("/run")
async def run_backtest(req: BacktestRequest):
    """
    Run a backtest for the specified strategy.
    Uses yfinance for historical data (.SA suffix for B3 stocks).
    """
    from lib.data import get_selic

    selic = get_selic()

    # Universe of tickers to test
    tickers = req.tickers or [
        "VALE3", "PETR4", "ITUB4", "BBAS3", "ABEV3", "WEGE3", "SUZB3",
        "GGBR4", "JBSS3", "BRFS3", "PRIO3", "EMBR3", "TOTS3", "VIVT3",
        "RADL3", "HYPE3", "EQTL3", "KLBN11", "BBDC4", "CYRE3",
    ]

    # Fetch all prices
    all_prices: dict[str, pd.Series] = {}
    for ticker in tickers:
        try:
            prices = fetch_historical_yf(ticker, period="15y")
            if not prices.empty:
                all_prices[ticker] = prices["close"]
        except Exception:
            pass

    if not all_prices:
        raise HTTPException(status_code=422, detail="No price data available")

    # Fetch benchmark
    ibov = fetch_ibov_prices("15y")

    # Build combined price frame
    price_df = pd.DataFrame(all_prices).dropna(how="all")
    price_df.index = pd.to_datetime(price_df.index)

    # Filter by date range
    start = pd.to_datetime(req.start_date)
    end = pd.to_datetime(req.end_date)
    price_df = price_df.loc[start:end]
    ibov_filtered = ibov.loc[start:end] if not ibov.empty else pd.Series(dtype=float)

    if price_df.empty:
        raise HTTPException(status_code=422, detail="No price data in date range")

    # Compute simple equal-weight portfolio
    returns = price_df.pct_change().dropna()

    # Determine rebalance dates
    if req.rebalance_period == "monthly":
        freq = "ME"
    elif req.rebalance_period == "quarterly":
        freq = "QE"
    else:
        freq = "YE"

    rebalance_dates = pd.date_range(start, end, freq=freq)

    # Simulate portfolio (simplified equal-weight, no transaction costs)
    portfolio_value = req.initial_capital_brl
    portfolio_values: list[dict] = []
    current_holdings: list[str] = []

    for i, date_idx in enumerate(price_df.index):
        if i == 0:
            continue

        # Rebalance
        if len(rebalance_dates) > 0:
            recent_rebalance = rebalance_dates[rebalance_dates <= date_idx]
            if len(recent_rebalance) > 0:
                last_rb = recent_rebalance[-1]
                if i == 1 or (i > 1 and last_rb > price_df.index[i - 1]):
                    # Select top N by momentum (proxy for any strategy)
                    lookback = min(252, i - 1)
                    if lookback > 20:
                        moms = returns.iloc[i - lookback:i].mean()
                        if req.strategy == "graham_defensive":
                            # Low volatility (proxy for defensive)
                            vols = returns.iloc[i - lookback:i].std()
                            ranked = vols.nsmallest(req.top_n)
                        else:
                            ranked = moms.nlargest(req.top_n)
                        current_holdings = ranked.index.tolist()

        if not current_holdings:
            current_holdings = returns.columns.tolist()[:req.top_n]

        # Daily return of portfolio
        daily_rets = returns.loc[date_idx, [t for t in current_holdings if t in returns.columns]]
        if not daily_rets.empty:
            portfolio_return = daily_rets.mean()
            portfolio_value *= (1 + portfolio_return)

        portfolio_values.append({"date": str(date_idx.date()), "value": round(portfolio_value, 2)})

    # Benchmark values
    bench_values: list[dict] = []
    if not ibov_filtered.empty:
        base_val = ibov_filtered.iloc[0]
        for d, v in ibov_filtered.items():
            bench_values.append({
                "date": str(d.date()),
                "value": round(req.initial_capital_brl * (v / base_val), 2),
            })

    # Compute metrics
    port_series = pd.Series(
        [p["value"] for p in portfolio_values],
        index=pd.to_datetime([p["date"] for p in portfolio_values]),
    )
    port_returns = port_series.pct_change().dropna()

    bench_series = pd.Series(
        [p["value"] for p in bench_values],
        index=pd.to_datetime([p["date"] for p in bench_values]),
    ) if bench_values else port_series

    final_value = portfolio_values[-1]["value"] if portfolio_values else req.initial_capital_brl
    n_years = (end - start).days / 365.25
    total_return = (final_value / req.initial_capital_brl) - 1
    cagr = (final_value / req.initial_capital_brl) ** (1 / n_years) - 1 if n_years > 0 else 0

    bench_final = bench_values[-1]["value"] if bench_values else req.initial_capital_brl
    bench_cagr = (bench_final / req.initial_capital_brl) ** (1 / n_years) - 1 if n_years > 0 else 0

    sharpe = compute_sharpe(port_returns, selic)
    sortino = compute_sortino(port_returns, selic)
    mdd = compute_max_drawdown(port_series)

    bench_rets = bench_series.pct_change().dropna()
    bench_sharpe = compute_sharpe(bench_rets, selic) if not bench_rets.empty else 0
    bench_mdd = compute_max_drawdown(bench_series) if not bench_series.empty else 0

    beta = compute_beta(port_series, bench_series) if len(bench_series) > 10 else 1.0
    alpha = cagr - (selic + beta * (bench_cagr - selic))

    # Hit rate
    wins = (port_returns > 0).sum()
    hit_rate = float(wins / len(port_returns)) if len(port_returns) > 0 else 0.5

    return {
        "config": req.dict(),
        "final_value_brl": round(final_value, 2),
        "cagr": round(cagr, 4),
        "total_return": round(total_return, 4),
        "sharpe_ratio": round(sharpe, 3),
        "sortino_ratio": round(sortino, 3),
        "max_drawdown": round(mdd, 4),
        "calmar_ratio": round(cagr / abs(mdd), 3) if mdd < 0 else 0,
        "hit_rate": round(hit_rate, 4),
        "avg_win": round(float(port_returns[port_returns > 0].mean()), 4) if (port_returns > 0).any() else 0,
        "avg_loss": round(float(port_returns[port_returns < 0].mean()), 4) if (port_returns < 0).any() else 0,
        "profit_factor": abs(port_returns[port_returns > 0].sum() / port_returns[port_returns < 0].sum()) if (port_returns < 0).any() else 999,
        "benchmark_cagr": round(bench_cagr, 4),
        "benchmark_sharpe": round(bench_sharpe, 3),
        "benchmark_max_dd": round(bench_mdd, 4),
        "alpha": round(alpha, 4),
        "beta": round(beta, 3),
        "information_ratio": round((cagr - bench_cagr) / max(0.001, (port_returns - bench_rets.reindex(port_returns.index)).std() * np.sqrt(252)), 3) if not bench_rets.empty else 0,
        "portfolio_values": portfolio_values[::5],  # every 5th point for bandwidth
        "benchmark_values": bench_values[::5],
        "drawdown_series": [],
        "trades": [],
        "rebalances": [],
    }
