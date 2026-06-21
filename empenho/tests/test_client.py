"""Testes do cliente PNCP: 204 (vazio), 422 (erro), paginação e datas."""
import json
from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from conftest import FIXTURES

from empenho.client.pncp import (
    PNCPClient,
    PNCPError,
    data_horizonte_brasilia,
    hoje_brasilia,
)


class FakeResponse:
    def __init__(self, status_code, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload
        self.text = text
        self.content = b"" if payload is None else b"x"

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise AssertionError("não deveria chegar aqui nos testes")


class FakeSession:
    """Session falsa: devolve respostas de uma fila por chamada."""

    def __init__(self, respostas):
        self.respostas = list(respostas)
        self.headers = {}
        self.chamadas = []

    def get(self, url, params=None, timeout=None):
        self.chamadas.append((url, params))
        return self.respostas.pop(0)


def test_204_retorna_lista_vazia():
    sess = FakeSession([FakeResponse(204)])
    client = PNCPClient(session=sess)
    assert client.contratacoes_proposta(data_final="20260621") == []


def test_422_levanta_erro_com_corpo():
    sess = FakeSession([FakeResponse(422, text="parametro dataFinal invalido")])
    client = PNCPClient(session=sess)
    with pytest.raises(PNCPError) as exc:
        client.contratacoes_proposta(data_final="data-errada")
    assert "422" in str(exc.value)
    assert "dataFinal" in str(exc.value)


def test_paginacao_percorre_todas_as_paginas():
    raw = json.loads((FIXTURES / "sample_proposta_raw.json").read_text("utf-8"))
    um = dict(raw)
    # Simula 2 páginas: cada uma com os mesmos 3 registros, totalPaginas=2.
    pag1 = {**um, "totalPaginas": 2, "numeroPagina": 1}
    pag2 = {**um, "totalPaginas": 2, "numeroPagina": 2}
    sess = FakeSession([FakeResponse(200, pag1), FakeResponse(200, pag2)])
    client = PNCPClient(session=sess, sleep_paginas=0)
    res = client.contratacoes_proposta(data_final="20260621", uf="AL")
    assert len(res) == 6  # 3 + 3
    assert len(sess.chamadas) == 2
    # Confirma que a 2ª chamada pediu pagina=2.
    assert sess.chamadas[1][1]["pagina"] == 2


def test_remove_params_none():
    raw = json.loads((FIXTURES / "sample_proposta_raw.json").read_text("utf-8"))
    sess = FakeSession([FakeResponse(200, {**raw, "totalPaginas": 1})])
    client = PNCPClient(session=sess)
    client.contratacoes_proposta(data_final="20260621", uf=None)
    # uf=None não deve ir na query.
    assert "uf" not in sess.chamadas[0][1]


def test_data_horizonte_e_futura_e_formatada():
    # dataFinal do PNCP é o TETO do encerramento: precisa ser >= hoje.
    hoje = datetime.now(ZoneInfo("America/Sao_Paulo")).strftime("%Y%m%d")
    h90 = data_horizonte_brasilia(90)
    assert len(h90) == 8 and h90.isdigit()
    assert h90 > hoje                       # estritamente no futuro
    assert data_horizonte_brasilia(0) == hoje_brasilia()
