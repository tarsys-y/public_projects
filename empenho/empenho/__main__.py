"""CLI do Empenho · Radar de Licitações.

Uso:
    python -m empenho buscar
    python -m empenho viabilidade <id> --custo X [--frete Y] [--dias N]
    python -m empenho status <id> <NovoStatus>
"""
from __future__ import annotations

import argparse
import sys

from rich.console import Console

from .config import carregar_config
from .finance import viability
from .pipeline import buscar
from .store.db import STATUS, Store

console = Console()


def _cmd_buscar(_args: argparse.Namespace) -> int:
    cfg = carregar_config()
    resumo = buscar(cfg)
    console.print(
        f"\n[bold]Resumo[/bold] {resumo['data']}: "
        f"consultadas={resumo['consultadas']} "
        f"aprovadas={resumo['aprovadas']} "
        f"descartadas={resumo['descartadas']} "
        f"[green]novas={resumo['novas']}[/green] "
        f"total_db={resumo['total_db']}"
    )
    if resumo["csv"]:
        console.print(f"CSV: [cyan]{resumo['csv']}[/cyan]")
    return 0


def _cmd_viabilidade(args: argparse.Namespace) -> int:
    cfg = carregar_config()
    fin = cfg.financeiro

    valor_ref = args.valor_ref
    if valor_ref is None:
        with Store(cfg.db_path) as store:
            row = store.buscar(args.id)
        if row is None:
            console.print(f"[red]Oportunidade {args.id!r} não encontrada no DB. "
                          f"Informe --valor-ref manualmente.[/red]")
            return 1
        valor_ref = row["valor_lote_ref"] or row["valor_estimado"]
        console.print(f"[dim]Objeto: {row['objeto'][:90]}[/dim]")

    v = viability.avaliar(
        valor_referencia=float(valor_ref),
        custo_fornecedor=args.custo,
        frete=args.frete,
        imposto_pct=fin.imposto_pct,
        margem_minima=fin.margem_minima,
        taxa_capital_dia=fin.taxa_capital_dia,
        dias_recebimento=args.dias if args.dias is not None else fin.dias_recebimento,
    )
    console.print(v.resumo())
    return 0


def _cmd_status(args: argparse.Namespace) -> int:
    cfg = carregar_config()
    with Store(cfg.db_path) as store:
        store.atualizar_status(args.id, args.novo_status)
    console.print(f"[green]Status de {args.id} → {args.novo_status}[/green]")
    return 0


def construir_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="empenho", description="Radar de Licitações PNCP")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("buscar", help="puxa, filtra, ranqueia e salva").set_defaults(
        func=_cmd_buscar
    )

    pv = sub.add_parser("viabilidade", help="motor de margem para uma oportunidade")
    pv.add_argument("id", help="numeroControlePNCP (ou use --valor-ref)")
    pv.add_argument("--custo", type=float, required=True, help="custo do fornecedor")
    pv.add_argument("--frete", type=float, default=0.0)
    pv.add_argument("--dias", type=int, default=None, help="dias até receber do órgão")
    pv.add_argument("--valor-ref", dest="valor_ref", type=float, default=None,
                    help="valor de referência (se não estiver no DB)")
    pv.set_defaults(func=_cmd_viabilidade)

    ps = sub.add_parser("status", help="muda o status no pipeline")
    ps.add_argument("id")
    ps.add_argument("novo_status", choices=STATUS)
    ps.set_defaults(func=_cmd_status)

    return p


def main(argv: list[str] | None = None) -> int:
    args = construir_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
