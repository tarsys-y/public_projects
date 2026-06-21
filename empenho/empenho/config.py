"""Carregamento e validação da configuração (config.yaml) e dos segredos (.env).

A configuração funcional fica em ``config.yaml`` (versionável); segredos de
notificação ficam em ``.env`` (NÃO versionado). Nada de credencial no código.
"""
from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Raiz do projeto = pasta que contém config.yaml (um nível acima deste pacote).
RAIZ = Path(__file__).resolve().parent.parent


class BuscaCfg(BaseModel):
    modalidade: int = 6
    ufs: list[str] = Field(default_factory=lambda: ["AL"])
    municipios_ibge: list[str] = Field(default_factory=list)
    tamanho_pagina: int = 50
    dias_minimos_proposta: int = 2


class EscopoCfg(BaseModel):
    inclusao: list[str] = Field(default_factory=list)
    exclusao: list[str] = Field(default_factory=list)


class ScoreCfg(BaseModel):
    peso_inclusao_objeto: float = 30
    peso_inclusao_item: float = 25
    peso_srp: float = 10
    peso_valor_no_teto: float = 15
    peso_uf_alvo: float = 5
    peso_prazo_confortavel: float = 10
    peso_allowlist: float = 5


class OrgaosCfg(BaseModel):
    allowlist: list[str] = Field(default_factory=list)
    blocklist: list[str] = Field(default_factory=list)


class FinanceiroCfg(BaseModel):
    teto_lote: float = 80000.0
    margem_minima: float = 0.10
    imposto_pct: float = 0.07
    taxa_capital_dia: float = 0.0008
    dias_recebimento: int = 45


class SaidaCfg(BaseModel):
    top_n_console: int = 15
    db_path: str = "empenho.db"
    csv_prefix: str = "oportunidades"


class Config(BaseModel):
    """Configuração completa carregada do config.yaml."""

    busca: BuscaCfg = Field(default_factory=BuscaCfg)
    escopo: EscopoCfg = Field(default_factory=EscopoCfg)
    score: ScoreCfg = Field(default_factory=ScoreCfg)
    orgaos: OrgaosCfg = Field(default_factory=OrgaosCfg)
    financeiro: FinanceiroCfg = Field(default_factory=FinanceiroCfg)
    saida: SaidaCfg = Field(default_factory=SaidaCfg)

    @property
    def db_path(self) -> Path:
        p = Path(self.saida.db_path)
        return p if p.is_absolute() else RAIZ / p


class Secrets(BaseSettings):
    """Segredos lidos do ambiente / .env (Fase 2, notificações)."""

    model_config = SettingsConfigDict(env_file=str(RAIZ / ".env"), extra="ignore")

    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_to: str | None = None


def carregar_config(caminho: Path | str | None = None) -> Config:
    """Lê o config.yaml e devolve um objeto Config validado."""
    caminho = Path(caminho) if caminho else RAIZ / "config.yaml"
    if not caminho.exists():
        raise FileNotFoundError(f"config.yaml não encontrado em {caminho}")
    dados = yaml.safe_load(caminho.read_text(encoding="utf-8")) or {}
    cfg = Config.model_validate(dados)
    # Sanidade do motor financeiro: 1 - imposto - margem precisa ser > 0.
    fin = cfg.financeiro
    if 1 - fin.imposto_pct - fin.margem_minima <= 0:
        raise ValueError(
            "Config inválida: imposto_pct + margem_minima >= 1 "
            "(não há lance que entregue a margem). Ajuste no config.yaml."
        )
    return cfg
