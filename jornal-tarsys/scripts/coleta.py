#!/usr/bin/env python3
"""Coleta semanal de insumos do Jornal Semanal do Tarsys.

Fluxo:
  1. Lê feeds RSS de scripts/fontes.txt e coleta itens novos (dedup em SQLite).
  2. Busca séries do BCB/SGS (Selic meta, inadimplência total e PF) e as
     medianas do Focus (IPCA, Selic, PIB) via API Olinda.
  3. Classifica os itens pela taxonomia do editorial.md (palavras-chave) e
     grava insumos/AAAA-Wnn.md.

Uso:
  python scripts/coleta.py [--semana AAAA-Wnn] [--fontes CAMINHO]

Dependências: requests, feedparser (pip install requests feedparser).
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import sqlite3
import sys
import urllib.parse
from pathlib import Path

import feedparser
import requests

RAIZ = Path(__file__).resolve().parent.parent
DIR_INSUMOS = RAIZ / "insumos"
ARQ_FONTES_PADRAO = Path(__file__).resolve().parent / "fontes.txt"
ARQ_DEDUP = DIR_INSUMOS / ".dedup.db"

# Bases sobrescrevíveis por env var para testes locais (mock server).
SGS_BASE = os.environ.get("COLETA_SGS_BASE", "https://api.bcb.gov.br")
FOCUS_BASE = os.environ.get(
    "COLETA_FOCUS_BASE",
    "https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1",
)

TIMEOUT = 30
UA = "jornal-tarsys/1.0 (coleta pessoal semanal; +https://github.com/tarsys-y)"

# Séries SGS confirmadas no Portal de Dados Abertos do BCB (dadosabertos.bcb.gov.br):
#   432   Meta Selic definida pelo Copom (% a.a., diária)
#   21082 Inadimplência da carteira de crédito - Total (%, mensal)
#   21084 Inadimplência da carteira de crédito - Pessoas físicas - Total (%, mensal)
SERIES_SGS = [
    (432, "Meta Selic (% a.a.)", 5),
    (21082, "Inadimplência total SFN (%)", 3),
    (21084, "Inadimplência PF total (%)", 3),
]

INDICADORES_FOCUS = ["IPCA", "Selic", "PIB Total"]

# Taxonomia do editorial.md; a ordem define a prioridade quando há empate.
TAGS_KEYWORDS: dict[str, list[str]] = {
    "resultados-bancos": [
        "resultado", "earnings", "lucro", "balanço", "balanco", "trimestre",
        "guidance", "roe", "release de resultados", "divulgação de resultados",
    ],
    "regulacao": [
        "regulação", "regulacao", "resolução", "resolucao", "normativo",
        "circular", "cmn", "consulta pública", "consulta publica", "open finance",
        "regulation", "regulatory", "basel", "basileia", "compliance", "pix",
    ],
    "risco-scoring": [
        "credit risk", "credit scoring", "scoring", "default prediction",
        "probability of default", "risco de crédito", "risco de credito",
        "inadimpl", "provision", "pdd", "ifrs 9", "expected loss", "lgd", "ead",
        "survival analysis", "stress test",
    ],
    "ciencia-de-dados-ia": [
        "machine learning", "deep learning", "inteligência artificial",
        "inteligencia artificial", "artificial intelligence", " ai ", "genai",
        "gen ai", "llm", "modelo de linguagem", "data science",
        "ciência de dados", "ciencia de dados", "mlops", "feature store",
        "neural network", "xgboost", "gradient boosting",
    ],
    "cards-emprestimos": [
        "cartão", "cartões", "cartao", "cartoes", "credit card", "rotativo",
        "consignado", "empréstimo", "emprestimo", "personal loan", "bnpl",
        "parcelado", "interchange", "maquininha", "adquirência", "adquirencia",
    ],
    "credito-varejo": [
        "crédito", "credito", "lending", "inadimplência", "endividamento",
        "concessão", "concessao", "originação", "originacao", "funding",
        "varejo bancário", "varejo bancario", "fintech", "banco digital",
    ],
    "macro-brasil": [
        "copom", "selic", "ipca", "focus", "banco central do brasil", "bcb",
        "pib brasil", "desemprego", "caged", "renda", "atividade econômica",
        "atividade economica", "fiscal", "arcabouço", "arcabouco",
    ],
    "macro-global": [
        "fed", "fomc", "ecb", "bce", "treasury", "global economy", "tarifa",
        "juros americanos", "dólar", "dolar", "recession", "recessão", "recessao",
        "china", "imf", "fmi",
    ],
}

RASTREADORES = ("utm_", "fbclid", "gclid", "mc_cid", "mc_eid", "ref_src")


def semana_iso_atual() -> str:
    ano, semana, _ = dt.date.today().isocalendar()
    return f"{ano}-W{semana:02d}"


def validar_semana(valor: str) -> str:
    if not re.fullmatch(r"\d{4}-W\d{2}", valor):
        raise argparse.ArgumentTypeError("formato esperado: AAAA-Wnn (ex.: 2026-W29)")
    return valor


def normalizar_url(url: str) -> str:
    """Chave de dedup: minúsculas em host/esquema, sem fragmento nem trackers."""
    p = urllib.parse.urlsplit(url.strip())
    query = [
        (k, v)
        for k, v in urllib.parse.parse_qsl(p.query, keep_blank_values=True)
        if not k.lower().startswith(RASTREADORES)
    ]
    return urllib.parse.urlunsplit((
        p.scheme.lower() or "https",
        p.netloc.lower(),
        p.path.rstrip("/") or "/",
        urllib.parse.urlencode(query),
        "",
    ))


def abrir_dedup() -> sqlite3.Connection:
    DIR_INSUMOS.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(ARQ_DEDUP)
    con.execute(
        "CREATE TABLE IF NOT EXISTS vistos ("
        " url TEXT PRIMARY KEY, semana TEXT NOT NULL, titulo TEXT,"
        " adicionado_em TEXT NOT NULL)"
    )
    return con


def ler_fontes(caminho: Path) -> list[str]:
    feeds = []
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if linha and not linha.startswith("#"):
            feeds.append(linha)
    return feeds


def classificar(texto: str) -> str:
    texto = f" {texto.lower()} "
    melhor_tag, melhor_pontos = "não-classificado", 0
    for tag, palavras in TAGS_KEYWORDS.items():
        pontos = sum(1 for kw in palavras if kw in texto)
        if pontos > melhor_pontos:
            melhor_tag, melhor_pontos = tag, pontos
    return melhor_tag


def coletar_feeds(
    feeds: list[str], con: sqlite3.Connection, semana: str, erros: list[str]
) -> dict[str, list[dict]]:
    por_tag: dict[str, list[dict]] = {}
    agora = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    for url_feed in feeds:
        try:
            resp = requests.get(url_feed, timeout=TIMEOUT, headers={"User-Agent": UA})
            resp.raise_for_status()
            parsed = feedparser.parse(resp.content)
        except Exception as exc:  # rede/HTTP/parse — loga e segue para o próximo feed
            erros.append(f"feed {url_feed}: {exc}")
            print(f"[aviso] falha no feed {url_feed}: {exc}", file=sys.stderr)
            continue
        if parsed.bozo and not parsed.entries:
            erros.append(f"feed {url_feed}: conteúdo não parece RSS/Atom válido")
            continue
        novos = 0
        for item in parsed.entries:
            link = getattr(item, "link", "") or ""
            titulo = (getattr(item, "title", "") or "(sem título)").strip()
            if not link:
                continue
            chave = normalizar_url(link)
            cur = con.execute(
                "INSERT OR IGNORE INTO vistos (url, semana, titulo, adicionado_em)"
                " VALUES (?, ?, ?, ?)",
                (chave, semana, titulo, agora),
            )
            if cur.rowcount == 0:
                # Já visto: reprocessa apenas se foi atribuído a ESTA semana,
                # para a re-execução da mesma semana ser idempotente.
                registro = con.execute(
                    "SELECT semana FROM vistos WHERE url = ?", (chave,)
                ).fetchone()
                if registro is None or registro[0] != semana:
                    continue
            resumo = re.sub(r"<[^>]+>", " ", getattr(item, "summary", "") or "")
            resumo = re.sub(r"\s+", " ", resumo).strip()
            data_pub = getattr(item, "published", "") or getattr(item, "updated", "")
            tag = classificar(f"{titulo} {resumo}")
            por_tag.setdefault(tag, []).append({
                "titulo": titulo,
                "link": link,
                "resumo": resumo[:400],
                "data": data_pub,
                "fonte": parsed.feed.get("title", url_feed),
            })
            novos += 1
        print(f"[ok] {url_feed}: {novos} item(ns) novo(s) de {len(parsed.entries)}")
    con.commit()
    return por_tag


def coletar_sgs(erros: list[str]) -> list[dict]:
    series = []
    for codigo, nome, n in SERIES_SGS:
        url = f"{SGS_BASE}/dados/serie/bcdata.sgs.{codigo}/dados/ultimos/{n}?formato=json"
        try:
            resp = requests.get(url, timeout=TIMEOUT, headers={"User-Agent": UA})
            resp.raise_for_status()
            dados = resp.json()
            series.append({"codigo": codigo, "nome": nome, "dados": dados})
        except Exception as exc:
            erros.append(f"SGS {codigo} ({nome}): {exc}")
            print(f"[aviso] falha na série SGS {codigo}: {exc}", file=sys.stderr)
    return series


def coletar_focus(erros: list[str]) -> list[dict]:
    ano = dt.date.today().year
    resultados = []
    for indicador in INDICADORES_FOCUS:
        for ref in (str(ano), str(ano + 1)):
            filtro = (
                f"Indicador eq '{indicador}' and DataReferencia eq '{ref}'"
                " and baseCalculo eq 0"
            )
            params = {
                "$filter": filtro,
                "$orderby": "Data desc",
                "$top": "1",
                "$select": "Indicador,Data,DataReferencia,Mediana",
                "$format": "json",
            }
            url = f"{FOCUS_BASE}/ExpectativasMercadoAnuais"
            try:
                resp = requests.get(
                    url, params=params, timeout=TIMEOUT, headers={"User-Agent": UA}
                )
                resp.raise_for_status()
                valores = resp.json().get("value", [])
                if valores:
                    resultados.append(valores[0])
                else:
                    erros.append(f"Focus {indicador}/{ref}: sem dados retornados")
            except Exception as exc:
                erros.append(f"Focus {indicador}/{ref}: {exc}")
                print(
                    f"[aviso] falha no Focus {indicador}/{ref}: {exc}", file=sys.stderr
                )
    return resultados


def montar_markdown(
    semana: str,
    por_tag: dict[str, list[dict]],
    sgs: list[dict],
    focus: list[dict],
    erros: list[str],
) -> str:
    hoje = dt.date.today().isoformat()
    linhas = [
        f"# Insumos — {semana}",
        "",
        f"Coleta automática em {hoje}. Material bruto para o `/fechar-edicao`;",
        "todo número abaixo deve ser reconferido na fonte antes de publicado.",
        "",
        "## Números BCB (APIs SGS e Focus)",
        "",
    ]
    if sgs:
        linhas += ["### SGS", "", "| Série | Indicador | Data | Valor |", "|---|---|---|---|"]
        for s in sgs:
            for ponto in s["dados"]:
                linhas.append(
                    f"| {s['codigo']} | {s['nome']} | {ponto['data']} | {ponto['valor']} |"
                )
        linhas.append("")
    else:
        linhas += ["_SGS indisponível nesta coleta (ver falhas no rodapé)._", ""]
    if focus:
        linhas += [
            "### Focus (medianas, base de cálculo 0)",
            "",
            "| Indicador | Ano ref. | Mediana | Data do boletim |",
            "|---|---|---|---|",
        ]
        for f in focus:
            linhas.append(
                f"| {f.get('Indicador')} | {f.get('DataReferencia')} |"
                f" {f.get('Mediana')} | {f.get('Data')} |"
            )
        linhas.append("")
    else:
        linhas += ["_Focus indisponível nesta coleta (ver falhas no rodapé)._", ""]

    linhas += ["## Itens coletados por tema", ""]
    ordem = list(TAGS_KEYWORDS) + ["não-classificado"]
    total = 0
    for tag in ordem:
        itens = por_tag.get(tag, [])
        if not itens:
            continue
        total += len(itens)
        linhas.append(f"### {tag} ({len(itens)})")
        linhas.append("")
        for it in itens:
            data = f" — {it['data']}" if it["data"] else ""
            linhas.append(f"- **[{it['titulo']}]({it['link']})** ({it['fonte']}{data})")
            if it["resumo"]:
                linhas.append(f"  - {it['resumo']}")
        linhas.append("")
    if total == 0:
        linhas += ["_Nenhum item novo nos feeds nesta semana._", ""]

    if erros:
        linhas += ["## Falhas de coleta", ""]
        linhas += [f"- {e}" for e in erros]
        linhas.append("")
    return "\n".join(linhas)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--semana",
        type=validar_semana,
        default=semana_iso_atual(),
        help="semana ISO no formato AAAA-Wnn (default: semana atual)",
    )
    parser.add_argument(
        "--fontes",
        type=Path,
        default=ARQ_FONTES_PADRAO,
        help="arquivo de feeds (default: scripts/fontes.txt)",
    )
    args = parser.parse_args()

    erros: list[str] = []
    con = abrir_dedup()
    try:
        feeds = ler_fontes(args.fontes)
        print(f"[info] {len(feeds)} feed(s) em {args.fontes}")
        por_tag = coletar_feeds(feeds, con, args.semana, erros)
        sgs = coletar_sgs(erros)
        focus = coletar_focus(erros)
    finally:
        con.close()

    destino = DIR_INSUMOS / f"{args.semana}.md"
    destino.write_text(
        montar_markdown(args.semana, por_tag, sgs, focus, erros), encoding="utf-8"
    )
    n_itens = sum(len(v) for v in por_tag.values())
    print(f"[ok] {destino} gravado: {n_itens} item(ns) novo(s), "
          f"{len(sgs)} série(s) SGS, {len(focus)} linha(s) Focus, {len(erros)} falha(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
