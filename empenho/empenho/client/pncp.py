"""Cliente da API pública de consultas do PNCP.

Trata as armadilhas reais da API:
- HTTP 204 (sem corpo) quando não há resultados → devolve lista vazia;
- HTTP 422 (parâmetro inválido) → erro claro com o corpo da resposta;
- paginação por ``totalPaginas`` com sleep entre páginas;
- retry com backoff exponencial em falhas de rede / 5xx / 429;
- fuso horário de Brasília para comparar prazos.
"""
from __future__ import annotations

import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import requests

from .models import Contratacao, Item

BASE_URL = "https://pncp.gov.br/api/consulta"
TZ_BRASILIA = ZoneInfo("America/Sao_Paulo")
_USER_AGENT = "empenho-radar/0.1 (+https://pncp.gov.br)"


class PNCPError(RuntimeError):
    """Erro ao consultar o PNCP (inclui o corpo do 422 quando houver)."""


class PNCPClient:
    def __init__(
        self,
        base_url: str = BASE_URL,
        *,
        timeout: int = 30,
        sleep_paginas: float = 0.5,
        max_tentativas: int = 4,
        session: requests.Session | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.sleep_paginas = sleep_paginas
        self.max_tentativas = max_tentativas
        self.session = session or requests.Session()
        self.session.headers.update(
            {"accept": "application/json", "User-Agent": _USER_AGENT}
        )

    # ---- HTTP com retry/backoff e tratamento de 204/422 -------------------
    def _get(self, path: str, params: dict | None = None) -> dict | list | None:
        url = f"{self.base_url}{path}"
        atraso = 2.0
        ultimo_erro: Exception | None = None
        for tentativa in range(1, self.max_tentativas + 1):
            try:
                resp = self.session.get(url, params=params, timeout=self.timeout)
            except requests.RequestException as exc:  # rede instável
                ultimo_erro = exc
            else:
                if resp.status_code == 204:
                    return None  # sem resultados → caller trata como vazio
                if resp.status_code == 422:
                    raise PNCPError(
                        f"422 parâmetro inválido em {url} "
                        f"params={params}: {resp.text[:500]}"
                    )
                if resp.status_code in (429, 500, 502, 503, 504):
                    ultimo_erro = PNCPError(f"HTTP {resp.status_code}: {resp.text[:200]}")
                else:
                    resp.raise_for_status()
                    return resp.json()
            # backoff exponencial: 2s, 4s, 8s, 16s
            if tentativa < self.max_tentativas:
                time.sleep(atraso)
                atraso *= 2
        raise PNCPError(f"Falha ao consultar {url} após "
                        f"{self.max_tentativas} tentativas: {ultimo_erro}")

    # ---- Endpoints --------------------------------------------------------
    def contratacoes_proposta(
        self,
        *,
        data_final: str,
        modalidade: int = 6,
        uf: str | None = None,
        municipio_ibge: str | None = None,
        tamanho_pagina: int = 50,
    ) -> list[Contratacao]:
        """Contratações com período de propostas em aberto (percorre páginas).

        ``data_final`` no formato AAAAMMDD (data de referência do encerramento).
        """
        return self._coletar_paginas(
            "/v1/contratacoes/proposta",
            {
                "dataFinal": data_final,
                "codigoModalidadeContratacao": modalidade,
                "uf": uf,
                "codigoMunicipioIbge": municipio_ibge,
                "tamanhoPagina": min(tamanho_pagina, 50),
            },
        )

    def contratacoes_publicacao(
        self,
        *,
        data_inicial: str,
        data_final: str,
        modalidade: int = 6,
        uf: str | None = None,
        tamanho_pagina: int = 50,
    ) -> list[Contratacao]:
        """Contratações por data de publicação (backfill/histórico)."""
        return self._coletar_paginas(
            "/v1/contratacoes/publicacao",
            {
                "dataInicial": data_inicial,
                "dataFinal": data_final,
                "codigoModalidadeContratacao": modalidade,
                "uf": uf,
                "tamanhoPagina": min(tamanho_pagina, 50),
            },
        )

    def itens(self, cnpj: str, ano: int, sequencial: int) -> list[Item]:
        """Itens de uma contratação. Endpoint retorna uma lista direta."""
        path = f"/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens"
        corpo = self._get(path, {"pagina": 1, "tamanhoPagina": 100})
        if not corpo:
            return []
        # Alguns ambientes paginam itens num objeto {data:[...]}; outros listam direto.
        dados = corpo.get("data", corpo) if isinstance(corpo, dict) else corpo
        return [Item.model_validate(d) for d in dados]

    # ---- Paginação --------------------------------------------------------
    def _coletar_paginas(self, path: str, params: dict) -> list[Contratacao]:
        # Remove params None (a API rejeita alguns valores nulos com 422).
        base = {k: v for k, v in params.items() if v is not None}
        resultado: list[Contratacao] = []
        pagina = 1
        while True:
            corpo = self._get(path, {**base, "pagina": pagina})
            if not corpo:  # 204 / vazio
                break
            data = corpo.get("data") or []
            resultado.extend(Contratacao.model_validate(d) for d in data)
            total_paginas = int(corpo.get("totalPaginas") or 1)
            if pagina >= total_paginas:
                break
            pagina += 1
            time.sleep(self.sleep_paginas)
        return resultado


def hoje_brasilia() -> str:
    """Data de hoje (Brasília) no formato AAAAMMDD exigido pela API."""
    return datetime.now(TZ_BRASILIA).strftime("%Y%m%d")


def data_horizonte_brasilia(dias: int) -> str:
    """Data de hoje + ``dias`` (Brasília) em AAAAMMDD.

    Usada como ``dataFinal`` em /contratacoes/proposta: a API trata esse
    parâmetro como o TETO da data de encerramento das propostas em aberto, então
    hoje + horizonte varre tudo que está aberto agora e encerra dentro da janela.
    """
    return (datetime.now(TZ_BRASILIA) + timedelta(days=dias)).strftime("%Y%m%d")


def agora_brasilia() -> datetime:
    return datetime.now(TZ_BRASILIA)
