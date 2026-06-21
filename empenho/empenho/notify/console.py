"""Canal de notificação atual: tabela no terminal (rich) + export CSV."""
from __future__ import annotations

from datetime import datetime
from pathlib import Path

import pandas as pd
from rich.console import Console
from rich.table import Table

from ..store.db import LinhaOportunidade


def exportar_csv(linhas: list[LinhaOportunidade], prefixo: str,
                 pasta: Path) -> Path:
    """Exporta as oportunidades (ordenadas por score) para CSV datado."""
    pasta.mkdir(parents=True, exist_ok=True)
    data = datetime.now().strftime("%Y-%m-%d")
    destino = pasta / f"{prefixo}_{data}.csv"
    registros = [
        {
            "score": l.score,
            "numero_controle": l.numero_controle,
            "uf": l.uf,
            "municipio": l.municipio,
            "objeto": l.objeto,
            "valor_estimado": l.valor_estimado,
            "valor_lote_ref": l.valor_lote_ref,
            "srp": l.srp,
            "encerramento": l.encerramento,
            "orgao": l.orgao_nome,
            "palavras": ", ".join(
                l.palavras.get("objeto", []) + l.palavras.get("itens", [])
            ),
            "link_edital": l.link_edital,
        }
        for l in sorted(linhas, key=lambda x: x.score, reverse=True)
    ]
    pd.DataFrame(registros).to_csv(destino, index=False)
    return destino


class ConsoleNotifier:
    def __init__(self, top_n: int = 15) -> None:
        self.top_n = top_n
        self.console = Console()

    def enviar(self, novas: list[LinhaOportunidade]) -> None:
        if not novas:
            self.console.print("[yellow]Sem oportunidades novas hoje.[/yellow]")
            return
        tabela = Table(title=f"🔔 Melhores oportunidades NOVAS ({len(novas)})")
        tabela.add_column("Score", justify="right", style="bold green")
        tabela.add_column("UF")
        tabela.add_column("Objeto", overflow="fold", max_width=60)
        tabela.add_column("Valor lote", justify="right")
        tabela.add_column("Encerra")
        for l in sorted(novas, key=lambda x: x.score, reverse=True)[: self.top_n]:
            valor = (f"R$ {l.valor_lote_ref:,.0f}"
                     if l.valor_lote_ref is not None else "-")
            tabela.add_row(
                f"{l.score:.0f}", l.uf or "-", l.objeto[:120],
                valor, (l.encerramento or "-")[:10],
            )
        self.console.print(tabela)
