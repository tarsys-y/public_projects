"""Data proxy endpoints."""

from fastapi import APIRouter, HTTPException
from lib.data import get_selic, get_embi_plus, get_ohlcv, fetch_historical_yf

router = APIRouter()


@router.get("/macro")
async def get_macro():
    selic = get_selic()
    embi = get_embi_plus()
    return {
        "selic": round(selic * 100, 2),
        "embi_plus_bps": round(embi * 10000, 0),
        "country_risk_premium": round(embi, 4),
    }


@router.get("/history/{ticker}")
async def get_history(ticker: str, period: str = "1y"):
    bars = get_ohlcv(ticker, period)
    if not bars:
        raise HTTPException(status_code=404, detail=f"No data for {ticker}")
    return {"ticker": ticker, "bars": bars}
