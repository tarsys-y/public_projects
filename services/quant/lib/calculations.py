"""Core financial calculations for Brazil market."""

import numpy as np
import pandas as pd
from typing import Optional


# ─── Graham ───────────────────────────────────────────────────────────────────

def graham_number(eps: float, bvps: float) -> float:
    if eps <= 0 or bvps <= 0:
        return 0.0
    return float(np.sqrt(22.5 * eps * bvps))


def graham_intrinsic_value(eps: float, growth_rate: float, aa_yield: float) -> float:
    if eps <= 0 or aa_yield <= 0:
        return 0.0
    return eps * (8.5 + 2 * growth_rate * 100) * 4.4 / (aa_yield * 100)


# ─── Greenblatt ───────────────────────────────────────────────────────────────

def compute_roc(
    ebit: float,
    current_assets: float,
    current_liabilities: float,
    cash: float,
    net_fixed_assets: float,
) -> float:
    """Return on Capital = EBIT / (NWC + Net Fixed Assets)"""
    excess_cash = max(0, cash - max(0, current_liabilities - (current_assets - cash)))
    nwc = current_assets - current_liabilities - excess_cash
    invested = nwc + net_fixed_assets
    if invested <= 0:
        return 0.0
    return ebit / invested


def compute_earnings_yield(ebit: float, enterprise_value: float) -> float:
    if enterprise_value <= 0:
        return 0.0
    return ebit / enterprise_value


def compute_ev(market_cap: float, total_debt: float, minority_interest: float, cash: float) -> float:
    return market_cap + total_debt + (minority_interest or 0) - cash


# ─── Damodaran DCF ────────────────────────────────────────────────────────────

def cost_of_equity_brazil(
    selic: float,
    beta: float,
    erp_us: float = 0.05,
    embi_plus: float = 0.02,
) -> float:
    """Ke = SELIC + β × (ERP_US + EMBI+)"""
    return selic + beta * (erp_us + embi_plus)


def compute_wacc(
    ke: float,
    kd: float,
    tax_rate: float,
    debt_weight: float,
    equity_weight: float,
) -> float:
    return ke * equity_weight + kd * (1 - tax_rate) * debt_weight


def run_dcf(
    base_revenue: float,
    base_ebit_margin: float,
    revenue_growth_y1_5: float,
    revenue_growth_y6_10: float,
    terminal_growth: float,
    ebit_margin_target: float,
    capex_pct: float,
    nwc_pct: float,
    wacc: float,
    tax_rate: float,
    years: int = 10,
) -> dict:
    """Run DCF model, return projections + terminal value."""
    projections = []
    revenue = base_revenue

    for year in range(1, years + 1):
        g = revenue_growth_y1_5 if year <= 5 else revenue_growth_y6_10
        revenue *= (1 + g)
        ebit = revenue * ebit_margin_target
        nopat = ebit * (1 - tax_rate)
        reinvestment = revenue * capex_pct + revenue * nwc_pct * g
        fcff = nopat - reinvestment
        discount = (1 + wacc) ** year
        pv_fcff = fcff / discount
        projections.append({
            "year": year, "revenue": revenue, "ebit": ebit,
            "nopat": nopat, "reinvestment": reinvestment,
            "fcff": fcff, "discount_factor": discount, "pv_fcff": pv_fcff,
        })

    last_fcff = projections[-1]["fcff"]
    terminal_value = (
        last_fcff * (1 + terminal_growth) / (wacc - terminal_growth)
        if wacc > terminal_growth else 0
    )

    return {"projections": projections, "terminal_value": terminal_value}


# ─── Quantitative Factors ─────────────────────────────────────────────────────

def compute_momentum_12_1(prices: pd.Series) -> float:
    """12-1 month momentum (skip last 21 trading days)"""
    n = len(prices)
    if n < 274:
        return 0.0
    p_now = prices.iloc[-22]
    p_13m = prices.iloc[-274]
    return float(p_now / p_13m - 1) if p_13m > 0 else 0.0


def compute_mean_reversion_zscore(prices: pd.Series, window: int = 200) -> float:
    if len(prices) < window:
        return 0.0
    ma = prices.rolling(window).mean().iloc[-1]
    std = prices.rolling(window).std().iloc[-1]
    current = prices.iloc[-1]
    return float((current - ma) / std) if std > 0 else 0.0


def compute_annualized_vol(prices: pd.Series, window: int = 90) -> float:
    if len(prices) < window + 1:
        return 0.0
    returns = np.log(prices / prices.shift(1)).dropna()
    recent = returns.iloc[-window:]
    return float(recent.std() * np.sqrt(252))


def compute_beta(stock_prices: pd.Series, bench_prices: pd.Series, window: int = 252) -> float:
    n = min(window, len(stock_prices) - 1, len(bench_prices) - 1)
    if n < 30:
        return 1.0
    s_ret = np.log(stock_prices.iloc[-n-1:] / stock_prices.iloc[-n-1:].shift(1)).dropna()
    b_ret = np.log(bench_prices.iloc[-n-1:] / bench_prices.iloc[-n-1:].shift(1)).dropna()
    aligned = pd.DataFrame({"s": s_ret, "b": b_ret}).dropna()
    if len(aligned) < 2:
        return 1.0
    cov = aligned["s"].cov(aligned["b"])
    var = aligned["b"].var()
    return float(cov / var) if var > 0 else 1.0


# ─── Portfolio Metrics ────────────────────────────────────────────────────────

def compute_sharpe(returns: pd.Series, risk_free_annual: float) -> float:
    rf_daily = risk_free_annual / 252
    excess = returns - rf_daily
    if excess.std() == 0:
        return 0.0
    return float((excess.mean() / excess.std()) * np.sqrt(252))


def compute_sortino(returns: pd.Series, risk_free_annual: float) -> float:
    rf_daily = risk_free_annual / 252
    excess = returns - rf_daily
    downside = excess[excess < 0]
    if len(downside) == 0 or downside.std() == 0:
        return 0.0
    return float((excess.mean() / downside.std()) * np.sqrt(252))


def compute_max_drawdown(values: pd.Series) -> float:
    rolling_max = values.expanding().max()
    drawdown = (values / rolling_max) - 1
    return float(drawdown.min())
