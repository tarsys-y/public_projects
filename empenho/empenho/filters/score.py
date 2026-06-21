"""Pontuação de fit (0–100) com breakdown explicável.

O score é a soma ponderada dos critérios atendidos, normalizada para 0–100 pelo
total de pesos configurados. Guardamos o detalhamento para auditoria.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from ..client.models import Contratacao, Item
from ..config import ScoreCfg
from .scope import ResultadoEscopo

_TZ_REF = timezone.utc  # usado só p/ tornar datas naive comparáveis


def _menor_valor_item(itens: list[Item] | None,
                      valor_total: float | None) -> float | None:
    """Maior referência de valor por lote/item para checar o teto de capital.

    Se temos itens, usamos o maior ``valorTotal`` de item (o lote mais caro);
    senão caímos para o valorTotalEstimado da contratação.
    """
    if itens:
        valores = [i.valorTotal for i in itens if i.valorTotal is not None]
        if valores:
            return max(valores)
    return valor_total


def _dias_ate_encerramento(c: Contratacao, agora: datetime) -> float | None:
    fim = c.dataEncerramentoProposta
    if not fim:
        return None
    # Datas do PNCP vêm sem timezone (horário de Brasília). Normalizamos ambas
    # para naive antes de subtrair, evitando erro de offset-aware vs naive.
    fim_naive = fim.replace(tzinfo=None)
    agora_naive = agora.replace(tzinfo=None)
    return (fim_naive - agora_naive).total_seconds() / 86400.0


@dataclass
class ResultadoScore:
    score: float
    breakdown: dict[str, float] = field(default_factory=dict)
    valor_lote_referencia: float | None = None
    dias_ate_encerramento: float | None = None


def pontuar(
    c: Contratacao,
    escopo: ResultadoEscopo,
    cfg: ScoreCfg,
    *,
    teto_lote: float,
    ufs_alvo: list[str],
    allowlist: list[str],
    dias_minimos: int,
    agora: datetime,
    itens: list[Item] | None = None,
) -> ResultadoScore:
    bd: dict[str, float] = {}

    if escopo.casadas_objeto:
        bd["inclusao_objeto"] = cfg.peso_inclusao_objeto
    if escopo.casadas_itens:
        bd["inclusao_item"] = cfg.peso_inclusao_item
    if c.srp:
        bd["srp"] = cfg.peso_srp

    valor_lote = _menor_valor_item(itens, c.valorTotalEstimado)
    if valor_lote is not None and valor_lote <= teto_lote:
        bd["valor_no_teto"] = cfg.peso_valor_no_teto

    uf = (c.unidadeOrgao.ufSigla or "").upper()
    if not ufs_alvo or uf in [u.upper() for u in ufs_alvo]:
        bd["uf_alvo"] = cfg.peso_uf_alvo

    dias = _dias_ate_encerramento(c, agora)
    if dias is not None and dias >= dias_minimos:
        bd["prazo_confortavel"] = cfg.peso_prazo_confortavel

    cnpj = c.orgaoEntidade.cnpj or ""
    if cnpj in allowlist:
        bd["allowlist"] = cfg.peso_allowlist

    total_pesos = (
        cfg.peso_inclusao_objeto + cfg.peso_inclusao_item + cfg.peso_srp
        + cfg.peso_valor_no_teto + cfg.peso_uf_alvo
        + cfg.peso_prazo_confortavel + cfg.peso_allowlist
    )
    score = 100.0 * sum(bd.values()) / total_pesos if total_pesos else 0.0
    return ResultadoScore(
        score=round(score, 1),
        breakdown=bd,
        valor_lote_referencia=valor_lote,
        dias_ate_encerramento=round(dias, 1) if dias is not None else None,
    )
