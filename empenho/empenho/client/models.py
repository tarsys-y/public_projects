"""Modelos pydantic para o JSON do PNCP (apenas os campos que usamos).

``extra="allow"`` mantém os demais campos sem quebrar quando o PNCP evolui.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class OrgaoEntidade(BaseModel):
    model_config = ConfigDict(extra="allow")
    cnpj: str | None = None
    razaoSocial: str | None = None
    poderId: str | None = None
    esferaId: str | None = None


class UnidadeOrgao(BaseModel):
    model_config = ConfigDict(extra="allow")
    ufSigla: str | None = None
    ufNome: str | None = None
    municipioNome: str | None = None
    codigoIbge: str | None = None
    nomeUnidade: str | None = None


class Contratacao(BaseModel):
    """Uma contratação (pregão) retornada por /v1/contratacoes/proposta."""

    model_config = ConfigDict(extra="allow")

    numeroControlePNCP: str
    numeroCompra: str | None = None
    anoCompra: int | None = None
    sequencialCompra: int | None = None
    processo: str | None = None
    objetoCompra: str = ""
    valorTotalEstimado: float | None = None
    srp: bool = False
    dataAberturaProposta: datetime | None = None
    dataEncerramentoProposta: datetime | None = None
    modalidadeId: int | None = None
    modalidadeNome: str | None = None
    linkSistemaOrigem: str | None = None
    orgaoEntidade: OrgaoEntidade = Field(default_factory=OrgaoEntidade)
    unidadeOrgao: UnidadeOrgao = Field(default_factory=UnidadeOrgao)

    @property
    def link_edital(self) -> str | None:
        """URL legível do edital no portal PNCP."""
        cnpj = self.orgaoEntidade.cnpj
        if cnpj and self.anoCompra and self.sequencialCompra:
            return (
                f"https://pncp.gov.br/app/editais/"
                f"{cnpj}/{self.anoCompra}/{self.sequencialCompra}"
            )
        return None


class Item(BaseModel):
    """Item de uma contratação (/v1/orgaos/{cnpj}/compras/{ano}/{seq}/itens)."""

    model_config = ConfigDict(extra="allow")

    numeroItem: int | None = None
    descricao: str = ""
    materialOuServico: str | None = None
    quantidade: float | None = None
    valorUnitarioEstimado: float | None = None
    valorTotal: float | None = None
    itemCategoriaNome: str | None = None
