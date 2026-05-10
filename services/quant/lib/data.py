"""Data fetching utilities — B3, BCB, yfinance."""

import os
import json
from typing import Optional
import pandas as pd
import yfinance as yf
import requests
from datetime import datetime, timedelta

BRAPI_BASE = "https://brapi.dev/api"
BCB_SGS_BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs"

# BCB series
BCB = {
    "SELIC": 432,
    "IPCA_12M": 13522,
    "EMBI_PLUS": 17626,
}


def fetch_bcb_series(series_code: int, last_n: int = 1) -> list[dict]:
    url = f"{BCB_SGS_BASE}.{series_code}/dados/ultimos/{last_n}?formato=json"
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception:
        return []


def get_selic() -> float:
    data = fetch_bcb_series(BCB["SELIC"], 1)
    return float(data[0]["valor"].replace(",", ".")) / 100 if data else 0.105


def get_embi_plus() -> float:
    data = fetch_bcb_series(BCB["EMBI_PLUS"], 1)
    return float(data[0]["valor"].replace(",", ".")) / 10000 if data else 0.02


def fetch_historical_yf(ticker: str, period: str = "2y") -> pd.DataFrame:
    """Fetch historical OHLCV data from yfinance. Use .SA suffix for B3."""
    suffix = "" if ticker.endswith(".SA") or "=" in ticker or "^" in ticker else ".SA"
    yf_ticker = ticker + suffix
    try:
        df = yf.download(yf_ticker, period=period, auto_adjust=True, progress=False)
        df.columns = [c.lower() for c in df.columns]
        return df
    except Exception:
        return pd.DataFrame()


def fetch_ibov_prices(period: str = "5y") -> pd.Series:
    df = fetch_historical_yf("^BVSP", period=period)
    return df["close"] if not df.empty else pd.Series(dtype=float)


def get_prices(ticker: str, period: str = "2y") -> pd.Series:
    df = fetch_historical_yf(ticker, period)
    return df["close"] if not df.empty else pd.Series(dtype=float)


def get_ohlcv(ticker: str, period: str = "1y") -> list[dict]:
    df = fetch_historical_yf(ticker, period)
    if df.empty:
        return []
    df = df.reset_index()
    return [
        {
            "date": str(row["Date"].date()),
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": float(row["volume"]),
        }
        for _, row in df.iterrows()
    ]
