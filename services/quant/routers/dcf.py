"""DCF valuation endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from lib.calculations import run_dcf, cost_of_equity_brazil, compute_wacc
from lib.data import get_selic, get_embi_plus

router = APIRouter()


class DCFRequest(BaseModel):
    ticker: str
    base_revenue: float
    base_ebit_margin: float
    net_debt: float
    shares_outstanding: float
    current_price: float
    # WACC inputs
    beta: float = 1.0
    erp_us: float = 0.05
    cost_of_debt: float = 0.09
    tax_rate: float = 0.34
    debt_weight: float = 0.20
    # Growth inputs
    revenue_growth_y1_5: float = 0.08
    revenue_growth_y6_10: float = 0.04
    terminal_growth: float = 0.04
    ebit_margin_target: float = 0.15
    capex_pct: float = 0.08
    nwc_pct: float = 0.03
    projection_years: int = 10
    # Optional overrides
    selic_override: Optional[float] = None
    embi_override: Optional[float] = None


class SensitivityRequest(BaseModel):
    base_request: DCFRequest
    wacc_offsets: list[float] = [-0.02, -0.01, 0, 0.01, 0.02]
    terminal_growths: list[float] = [0.0, 0.01, 0.02, 0.03, 0.04]


@router.post("/run")
async def run_dcf_endpoint(req: DCFRequest):
    selic = req.selic_override or get_selic()
    embi = req.embi_override or get_embi_plus()

    ke = cost_of_equity_brazil(selic, req.beta, req.erp_us, embi)
    wacc = compute_wacc(ke, req.cost_of_debt, req.tax_rate, req.debt_weight, 1 - req.debt_weight)

    result = run_dcf(
        base_revenue=req.base_revenue,
        base_ebit_margin=req.base_ebit_margin,
        revenue_growth_y1_5=req.revenue_growth_y1_5,
        revenue_growth_y6_10=req.revenue_growth_y6_10,
        terminal_growth=req.terminal_growth,
        ebit_margin_target=req.ebit_margin_target,
        capex_pct=req.capex_pct,
        nwc_pct=req.nwc_pct,
        wacc=wacc,
        tax_rate=req.tax_rate,
        years=req.projection_years,
    )

    pv_projections = sum(p["pv_fcff"] for p in result["projections"])
    tv = result["terminal_value"]
    pv_tv = tv / (1 + wacc) ** req.projection_years
    enterprise_value = pv_projections + pv_tv
    equity_value = enterprise_value - req.net_debt
    intrinsic_per_share = equity_value / req.shares_outstanding if req.shares_outstanding > 0 else 0

    mos_pct = (
        (intrinsic_per_share - req.current_price) / intrinsic_per_share * 100
        if intrinsic_per_share > 0 else -100
    )

    damodaran_score = 100 / (1 + 2.718 ** (-0.1 * mos_pct))

    return {
        "ticker": req.ticker,
        "ke": ke,
        "wacc": wacc,
        "selic_used": selic,
        "embi_used": embi,
        "projections": result["projections"],
        "terminal_value": tv,
        "pv_projections": pv_projections,
        "pv_terminal_value": pv_tv,
        "enterprise_value": enterprise_value,
        "equity_value": equity_value,
        "intrinsic_per_share": intrinsic_per_share,
        "current_price": req.current_price,
        "margin_of_safety_pct": mos_pct,
        "damodaran_score": damodaran_score,
    }


@router.post("/sensitivity")
async def sensitivity_analysis(req: SensitivityRequest):
    selic = get_selic()
    embi = get_embi_plus()
    base = req.base_request
    ke_base = cost_of_equity_brazil(selic, base.beta, base.erp_us, embi)
    wacc_base = compute_wacc(ke_base, base.cost_of_debt, base.tax_rate, base.debt_weight, 1 - base.debt_weight)

    table = []
    for wacc_offset in req.wacc_offsets:
        row_wacc = wacc_base + wacc_offset
        row = []
        for tg in req.terminal_growths:
            if row_wacc <= tg:
                row.append(None)
                continue
            res = run_dcf(
                base_revenue=base.base_revenue,
                base_ebit_margin=base.base_ebit_margin,
                revenue_growth_y1_5=base.revenue_growth_y1_5,
                revenue_growth_y6_10=base.revenue_growth_y6_10,
                terminal_growth=tg,
                ebit_margin_target=base.ebit_margin_target,
                capex_pct=base.capex_pct,
                nwc_pct=base.nwc_pct,
                wacc=row_wacc,
                tax_rate=base.tax_rate,
            )
            pv_p = sum(p["pv_fcff"] for p in res["projections"])
            pv_tv = res["terminal_value"] / (1 + row_wacc) ** base.projection_years
            ev = pv_p + pv_tv
            iv = (ev - base.net_debt) / base.shares_outstanding if base.shares_outstanding > 0 else 0
            row.append(round(iv, 2))
        table.append({"wacc": round(row_wacc, 4), "values": row})

    return {
        "wacc_base": round(wacc_base, 4),
        "terminal_growths": req.terminal_growths,
        "table": table,
    }
