"""Filtro de escopo: inclusão (objeto + itens) e exclusão eliminatória.

A comparação ignora acentos e maiúsculas/minúsculas para ser robusta à grafia
irregular dos editais.
"""
from __future__ import annotations

import unicodedata
from dataclasses import dataclass, field

from ..client.models import Contratacao, Item


def normalizar(texto: str | None) -> str:
    """minúsculas + sem acento, para casar palavras-chave de forma robusta."""
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", texto)
    sem_acento = "".join(c for c in nfkd if not unicodedata.combining(c))
    return sem_acento.lower()


def palavras_casadas(texto: str, chaves: list[str]) -> list[str]:
    """Devolve as palavras-chave (originais) que aparecem no texto."""
    alvo = normalizar(texto)
    return [c for c in chaves if normalizar(c) in alvo]


@dataclass
class ResultadoEscopo:
    incluida: bool
    motivo: str
    casadas_objeto: list[str] = field(default_factory=list)
    casadas_itens: list[str] = field(default_factory=list)
    excluida_por: str | None = None


def avaliar_escopo(
    c: Contratacao,
    inclusao: list[str],
    exclusao: list[str],
    itens: list[Item] | None = None,
) -> ResultadoEscopo:
    """Classifica uma contratação quanto ao escopo da empresa.

    Regras:
    - exclusão é **eliminatória**: se o objeto contém termo de exclusão, fora;
    - precisa bater ao menos uma palavra de inclusão no objeto OU nos itens.
    """
    # 1) Exclusão eliminatória (avaliada no objeto).
    excl = palavras_casadas(c.objetoCompra, exclusao)
    if excl:
        return ResultadoEscopo(False, "exclusao", excluida_por=excl[0])

    # 2) Inclusão no objeto.
    casadas_obj = palavras_casadas(c.objetoCompra, inclusao)

    # 3) Inclusão nos itens (quando já enriquecido).
    casadas_itens: list[str] = []
    if itens:
        texto_itens = " ".join(i.descricao for i in itens)
        casadas_itens = palavras_casadas(texto_itens, inclusao)

    if casadas_obj or casadas_itens:
        return ResultadoEscopo(
            True, "incluida",
            casadas_objeto=casadas_obj, casadas_itens=casadas_itens,
        )
    return ResultadoEscopo(False, "sem_inclusao")
