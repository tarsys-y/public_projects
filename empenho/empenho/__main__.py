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

from .config import Secrets, carregar_config
from .finance import viability
from .notify.console import ConsoleNotifier
from .notify.telegram import TelegramNotifier
from .pipeline import backfill, buscar
from .store.db import STATUS, Store

console = Console()


def _montar_notificadores(cfg, usar_telegram: bool) -> list:
    """Console sempre; Telegram quando pedido e com credenciais no .env."""
    notificadores = [ConsoleNotifier(cfg.saida.top_n_console)]
    if usar_telegram:
        s = Secrets()
        if s.telegram_bot_token and s.telegram_chat_id:
            notificadores.append(
                TelegramNotifier(
                    s.telegram_bot_token, s.telegram_chat_id,
                    top_n=cfg.saida.top_n_console,
                )
            )
        else:
            console.print(
                "[yellow]--telegram pedido, mas telegram_bot_token/"
                "telegram_chat_id não estão no .env. Pulando Telegram.[/yellow]"
            )
    return notificadores


def _imprimir_resumo(resumo: dict) -> None:
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


def _cmd_buscar(args: argparse.Namespace) -> int:
    cfg = carregar_config()
    resumo = buscar(cfg, notificadores=_montar_notificadores(cfg, args.telegram))
    _imprimir_resumo(resumo)
    return 0


def _cmd_backfill(args: argparse.Namespace) -> int:
    cfg = carregar_config()
    resumo = backfill(
        cfg, args.de, args.ate,
        notificadores=_montar_notificadores(cfg, args.telegram),
    )
    _imprimir_resumo(resumo)
    return 0


def _cmd_painel(_args: argparse.Namespace) -> int:
    """Atalho para abrir o painel Streamlit."""
    import subprocess
    from pathlib import Path

    app = Path(__file__).resolve().parent / "ui" / "app.py"
    try:
        return subprocess.call(["streamlit", "run", str(app)])
    except FileNotFoundError:
        console.print(
            "[red]Streamlit não instalado.[/red] Rode: "
            "[cyan]pip install streamlit[/cyan] (ou descomente em requirements.txt)."
        )
        return 1


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

    pb = sub.add_parser("buscar", help="puxa, filtra, ranqueia e salva")
    pb.add_argument("--telegram", action="store_true",
                    help="também notifica via Telegram (precisa de .env)")
    pb.set_defaults(func=_cmd_buscar)

    pbf = sub.add_parser("backfill", help="histórico por data de publicação")
    pbf.add_argument("--de", required=True, help="data inicial AAAAMMDD")
    pbf.add_argument("--ate", required=True, help="data final AAAAMMDD")
    pbf.add_argument("--telegram", action="store_true",
                     help="também notifica via Telegram (precisa de .env)")
    pbf.set_defaults(func=_cmd_backfill)

    sub.add_parser("painel", help="abre o painel Streamlit").set_defaults(
        func=_cmd_painel
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
