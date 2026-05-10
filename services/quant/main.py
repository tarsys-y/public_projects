"""
B3 Investment Dashboard — Python Quant Microservice
Handles: DCF calculations, backtesting, factor computations, data fetching
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import dcf, backtest, factors, data

load_dotenv()

app = FastAPI(
    title="B3 Quant Service",
    description="Quantitative analysis microservice for Brazilian stocks",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dcf.router, prefix="/dcf", tags=["DCF"])
app.include_router(backtest.router, prefix="/backtest", tags=["Backtest"])
app.include_router(factors.router, prefix="/factors", tags=["Factors"])
app.include_router(data.router, prefix="/data", tags=["Data"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "b3-quant"}
