"""Factor analysis endpoints."""

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from lib.data import fetch_historical_yf, fetch_ibov_prices
from lib.calculations import (
    compute_momentum_12_1,
    compute_mean_reversion_zscore,
    compute_annualized_vol,
    compute_beta,
)

router = APIRouter()


class QuantRequest(BaseModel):
    ticker: str
    period: str = "2y"


@router.get("/quant/{ticker}")
async def get_quant_signals(ticker: str):
    """Compute all quantitative signals for a B3 stock."""
    try:
        prices_df = fetch_historical_yf(ticker, period="3y")
        ibov = fetch_ibov_prices("3y")

        if prices_df.empty:
            raise HTTPException(status_code=404, detail=f"No data for {ticker}")

        prices = prices_df["close"]
        volumes = prices_df["volume"] if "volume" in prices_df.columns else pd.Series(dtype=float)

        momentum = compute_momentum_12_1(prices)
        mr_z = compute_mean_reversion_zscore(prices)
        vol_90 = compute_annualized_vol(prices, 90)
        beta = compute_beta(prices, ibov) if len(ibov) > 30 else 1.0
        beta_63 = compute_beta(prices, ibov, 63) if len(ibov) > 63 else beta

        # Volume anomaly
        vol_anomaly = 1.0
        if not volumes.empty and len(volumes) > 21:
            avg_vol_20 = volumes.iloc[-21:-1].mean()
            current_vol = volumes.iloc[-1]
            vol_anomaly = float(current_vol / avg_vol_20) if avg_vol_20 > 0 else 1.0

        # MA200
        ma200 = float(prices.rolling(200).mean().iloc[-1]) if len(prices) >= 200 else float(prices.mean())

        # Momentum Z-score (rolling over 12 months)
        mo_z = 0.0
        if len(prices) >= 300:
            monthly_moms = []
            for i in range(273, len(prices) - 21, 21):
                m = prices.iloc[i - 1] / prices.iloc[max(0, i - 274)] - 1
                monthly_moms.append(float(m))
            if len(monthly_moms) > 2:
                arr = np.array(monthly_moms)
                std = arr.std()
                mo_z = float((momentum - arr.mean()) / std) if std > 0 else 0.0

        vol_regime = "low" if vol_90 < 0.20 else "high" if vol_90 > 0.45 else "normal"

        # Quant score
        score = 50.0
        score += max(-20, min(20, mo_z * 8))
        score += max(-15, min(15, -mr_z * 5))
        if vol_regime == "low":
            score += 5
        elif vol_regime == "high":
            score -= 10
        if vol_anomaly > 2:
            score += 5
        quant_score = max(0, min(100, score))

        return {
            "ticker": ticker,
            "momentum_12_1": round(momentum, 4),
            "momentum_z_score": round(mo_z, 3),
            "ma_200d": round(ma200, 2),
            "mean_reversion_z_score": round(mr_z, 3),
            "price_vs_ma200_pct": round((prices.iloc[-1] / ma200 - 1) * 100, 2),
            "volatility_90d": round(vol_90, 4),
            "volatility_regime": vol_regime,
            "beta": round(beta, 3),
            "rolling_beta_63d": round(beta_63, 3),
            "volume_anomaly": round(vol_anomaly, 2),
            "relative_volume": round(vol_anomaly, 2),
            "quant_score": round(quant_score, 1),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
