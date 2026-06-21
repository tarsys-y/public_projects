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


def buscar(cfg: Config, *, client: PNCPClient | None = None,
           enriquecer_itens: bool = True) -> dict:
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

    blocklist = set(cfg.orgaos.blocklist)
    aprovadas: list[LinhaOportunidade] = []
    descartadas = 0

    for c in contratacoes:
        # Garante "ainda em aberto": encerramento >= agora (Brasília).
        if c.dataEncerramentoProposta:
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
        if enriquecer_itens and c.orgaoEntidade.cnpj and c.anoCompra \
                and c.sequencialCompra:
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

    # Persistência idempotente + identificação das NOVAS.
    novas: list[LinhaOportunidade] = []
    with Store(cfg.db_path) as store:
        for linha in aprovadas:
            if store.upsert(linha):
                novas.append(linha)
        total_db = store.contar()

    # Saída: CSV datado + notificação no console.
    csv_path: Path | None = None
    if aprovadas:
        csv_path = exportar_csv(aprovadas, cfg.saida.csv_prefix, RAIZ)
    ConsoleNotifier(cfg.saida.top_n_console).enviar(novas)

    return {
        "consultadas": len(contratacoes),
        "aprovadas": len(aprovadas),
        "descartadas": descartadas,
        "novas": len(novas),
        "total_db": total_db,
        "csv": str(csv_path) if csv_path else None,
        "data": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
