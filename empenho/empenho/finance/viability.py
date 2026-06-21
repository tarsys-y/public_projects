"""Motor de viabilidade financeira (forma fechada).

Para um lance ``L`` (preço de venda), custo do fornecedor ``C``, frete ``F``,
imposto ``t`` (fração sobre o faturamento), custo de capital ``K`` (absoluto):

    lucro(L)  = L·(1 − t) − (C + F + K)
    margem(L) = (1 − t) − (C + F + K) / L          [cresce com L]

Como a margem é monótona crescente em L, o lance MÍNIMO que entrega a margem
mínima ``m`` tem solução fechada:

    L_min = (C + F + K) / (1 − t − m)

O lance MÁXIMO é o valor de referência ``R`` (teto do edital). A oportunidade é
VIÁVEL se ``L_min <= R``; a folga (headroom) é ``R − L_min``.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Viabilidade:
    viavel: bool
    custo_total_base: float        # C + F + K
    custo_capital: float           # K
    lance_minimo_viavel: float     # menor lance que entrega a margem mínima
    lance_maximo: float            # valor de referência (teto)
    folga_abs: float               # R − L_min (negativo se inviável)
    folga_pct: float               # folga / R
    margem_no_teto: float          # margem se vender exatamente no teto R
    lucro_no_teto: float           # lucro nominal vendendo no teto

    def resumo(self) -> str:
        sit = "VIÁVEL ✅" if self.viavel else "INVIÁVEL ❌"
        return (
            f"{sit}\n"
            f"  Lance mínimo viável : R$ {self.lance_minimo_viavel:,.2f}\n"
            f"  Teto (referência)   : R$ {self.lance_maximo:,.2f}\n"
            f"  Folga (headroom)    : R$ {self.folga_abs:,.2f} "
            f"({self.folga_pct*100:.1f}%)\n"
            f"  Margem no teto      : {self.margem_no_teto*100:.1f}%  "
            f"(lucro R$ {self.lucro_no_teto:,.2f})\n"
            f"  Custo de capital    : R$ {self.custo_capital:,.2f}"
        )


def custo_capital(
    custo_fornecedor: float,
    frete: float,
    taxa_dia: float,
    dias: int,
) -> float:
    """Custo de antecipar capital até o órgão pagar: (C+F)·taxa_dia·dias."""
    return (custo_fornecedor + frete) * taxa_dia * dias


def avaliar(
    *,
    valor_referencia: float,
    custo_fornecedor: float,
    frete: float = 0.0,
    imposto_pct: float,
    margem_minima: float,
    taxa_capital_dia: float = 0.0,
    dias_recebimento: int = 0,
) -> Viabilidade:
    """Calcula a faixa de lance viável para uma oportunidade."""
    if 1 - imposto_pct - margem_minima <= 0:
        raise ValueError(
            "imposto_pct + margem_minima >= 1: nenhum lance entrega a margem."
        )

    k = custo_capital(custo_fornecedor, frete, taxa_capital_dia, dias_recebimento)
    base = custo_fornecedor + frete + k

    l_min = base / (1 - imposto_pct - margem_minima)
    r = valor_referencia
    viavel = l_min <= r

    folga_abs = r - l_min
    folga_pct = folga_abs / r if r else 0.0
    margem_no_teto = (1 - imposto_pct) - base / r if r else 0.0
    lucro_no_teto = r * (1 - imposto_pct) - base

    return Viabilidade(
        viavel=viavel,
        custo_total_base=round(base, 2),
        custo_capital=round(k, 2),
        lance_minimo_viavel=round(l_min, 2),
        lance_maximo=round(r, 2),
        folga_abs=round(folga_abs, 2),
        folga_pct=round(folga_pct, 4),
        margem_no_teto=round(margem_no_teto, 4),
        lucro_no_teto=round(lucro_no_teto, 2),
    )
