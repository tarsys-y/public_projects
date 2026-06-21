"""Orquestração do comando `buscar`:

PNCP → filtro de escopo (objeto) → enriquecimento lazy de itens → score →
persistência idempotente → CSV + console.
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path

from .client.models import Contratacao
from .client.pncp import PNCPClient, agora_brasilia, hoje_brasilia
from .config import Config, RAIZ
from .filters.scope import avaliar_escopo
from .filters.score import pontuar
from .notify.console import ConsoleNotifier, exportar_csv
from .store.db import LinhaOportunidade, Store


def _para_linha(c: Contratacao, score, escopo) -> LinhaOportunidade:
    return LinhaOportunidade(
        numero_controle=c.numeroControlePNCP,
        objeto=c.objetoCompra,
        uf=c.unidadeOrgao.ufSigla,
        municipio=c.unidadeOrgao.municipioNome,
        orgao_cnpj=c.orgaoEntidade.cnpj,
        orgao_nome=c.orgaoEntidade.razaoSocial,
        valor_estimado=c.valorTotalEstimado,
        valor_lote_ref=score.valor_lote_referencia,
        srp=c.srp,
        encerramento=(c.dataEncerramentoProposta.isoformat()
                      if c.dataEncerramentoProposta else None),
        link_edital=c.link_edital,
        score=score.score,
        breakdown=score.breakdown,
        palavras={"objeto": escopo.casadas_objeto, "itens": escopo.casadas_itens},
        raw=c.model_dump(mode="json"),
    )


def processar(
    contratacoes: list[Contratacao],
    cfg: Config,
    *,
    agora,
    client: PNCPClient | None = None,
    enriquecer_itens: bool = True,
    exigir_em_aberto: bool = True,
) -> tuple[list[LinhaOportunidade], int]:
    """Filtra, enriquece e pontua uma lista de contratações.

    Devolve ``(aprovadas, descartadas)``. Compartilhado por ``buscar`` (só
    propostas em aberto) e ``backfill`` (histórico, ``exigir_em_aberto=False``).
    """
    blocklist = set(cfg.orgaos.blocklist)
    aprovadas: list[LinhaOportunidade] = []
    descartadas = 0

    for c in contratacoes:
        # Garante "ainda em aberto": encerramento >= agora (Brasília).
        if exigir_em_aberto and c.dataEncerramentoProposta:
            fim = c.dataEncerramentoProposta.replace(tzinfo=None)
            if fim < agora.replace(tzinfo=None):
                descartadas += 1
                continue
        # Blocklist de mau pagador é eliminatória.
        if (c.orgaoEntidade.cnpj or "") in blocklist:
            descartadas += 1
            continue

        # Triagem por objeto (barata) antes de gastar chamada de itens.
        esc = avaliar_escopo(c, cfg.escopo.inclusao, cfg.escopo.exclusao)
        if esc.motivo == "exclusao":
            descartadas += 1
            continue

        # Enriquecimento lazy: só busca itens de quem passou no objeto.
        itens = None
        if client and enriquecer_itens and c.orgaoEntidade.cnpj \
                and c.anoCompra and c.sequencialCompra:
            try:
                itens = client.itens(
                    c.orgaoEntidade.cnpj, c.anoCompra, c.sequencialCompra
                )
            except Exception:  # itens são opcionais; não derrubam o pipeline
                itens = None
            esc = avaliar_escopo(
                c, cfg.escopo.inclusao, cfg.escopo.exclusao, itens
            )

        if not esc.incluida:
            descartadas += 1
            continue

        sc = pontuar(
            c, esc, cfg.score,
            teto_lote=cfg.financeiro.teto_lote,
            ufs_alvo=cfg.busca.ufs,
            allowlist=cfg.orgaos.allowlist,
            dias_minimos=cfg.busca.dias_minimos_proposta,
            agora=agora,
            itens=itens,
        )
        aprovadas.append(_para_linha(c, sc, esc))

    return aprovadas, descartadas


def _persistir_e_notificar(
    aprovadas: list[LinhaOportunidade], cfg: Config, descartadas: int,
    consultadas: int, *, notificadores=None,
) -> dict:
    """Grava (idempotente), exporta CSV e dispara as notificações das NOVAS."""
    novas: list[LinhaOportunidade] = []
    with Store(cfg.db_path) as store:
        for linha in aprovadas:
            if store.upsert(linha):
                novas.append(linha)
        total_db = store.contar()
        if novas:
            store.marcar_notificadas([l.numero_controle for l in novas])

    csv_path: Path | None = None
    if aprovadas:
        csv_path = exportar_csv(aprovadas, cfg.saida.csv_prefix, RAIZ)

    for notificador in (notificadores or [ConsoleNotifier(cfg.saida.top_n_console)]):
        notificador.enviar(novas)

    return {
        "consultadas": consultadas,
        "aprovadas": len(aprovadas),
        "descartadas": descartadas,
        "novas": len(novas),
        "total_db": total_db,
        "csv": str(csv_path) if csv_path else None,
        "data": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }


def buscar(cfg: Config, *, client: PNCPClient | None = None,
           enriquecer_itens: bool = True, notificadores=None) -> dict:
    """Executa a busca completa e devolve um resumo (contadores + novas)."""
    client = client or PNCPClient()
    agora = agora_brasilia()
    data_final = hoje_brasilia()

    ufs = cfg.busca.ufs or [None]  # None = busca nacional
    contratacoes: list[Contratacao] = []
    for uf in ufs:
        contratacoes.extend(
            client.contratacoes_proposta(
                data_final=data_final,
                modalidade=cfg.busca.modalidade,
                uf=uf,
                tamanho_pagina=cfg.busca.tamanho_pagina,
            )
        )

    aprovadas, descartadas = processar(
        contratacoes, cfg, agora=agora, client=client,
        enriquecer_itens=enriquecer_itens, exigir_em_aberto=True,
    )
    return _persistir_e_notificar(
        aprovadas, cfg, descartadas, len(contratacoes),
        notificadores=notificadores,
    )


def backfill(cfg: Config, data_inicial: str, data_final: str, *,
             client: PNCPClient | None = None,
             enriquecer_itens: bool = False, notificadores=None) -> dict:
    """Backfill histórico por data de PUBLICAÇÃO (/v1/contratacoes/publicacao).

    Inclui também propostas já encerradas (``exigir_em_aberto=False``), úteis
    para calibrar o escopo/score com base no histórico. Datas em AAAAMMDD.
    """
    client = client or PNCPClient()
    agora = agora_brasilia()

    ufs = cfg.busca.ufs or [None]
    contratacoes: list[Contratacao] = []
    for uf in ufs:
        contratacoes.extend(
            client.contratacoes_publicacao(
                data_inicial=data_inicial,
                data_final=data_final,
                modalidade=cfg.busca.modalidade,
                uf=uf,
                tamanho_pagina=cfg.busca.tamanho_pagina,
            )
        )

    aprovadas, descartadas = processar(
        contratacoes, cfg, agora=agora, client=client,
        enriquecer_itens=enriquecer_itens, exigir_em_aberto=False,
    )
    return _persistir_e_notificar(
        aprovadas, cfg, descartadas, len(contratacoes),
        notificadores=notificadores,
    )
