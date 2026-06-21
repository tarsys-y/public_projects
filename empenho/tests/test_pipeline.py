"""Testes da orquestração: processar (filtro+score) e backfill (offline)."""
import json
from datetime import datetime

from conftest import FIXTURES

from empenho.client.models import Contratacao
from empenho.config import Config
from empenho.pipeline import backfill, processar

INCLUSAO = ["material de expediente", "papel a4", "material de construção",
            "cimento", "argamassa", "toner"]
EXCLUSAO = ["serviço", "obra", "pavimentação", "reforma", "especializada"]


def _config(tmp_path) -> Config:
    return Config.model_validate({
        "busca": {"ufs": ["AL"], "dias_minimos_proposta": 2},
        "escopo": {"inclusao": INCLUSAO, "exclusao": EXCLUSAO},
        "saida": {"db_path": str(tmp_path / "t.db")},
    })


def _contratacoes() -> list[Contratacao]:
    raw = json.loads((FIXTURES / "sample_proposta_raw.json").read_text("utf-8"))
    return [Contratacao.model_validate(d) for d in raw["data"]]


class _FakeClient:
    """Cliente falso: devolve as fixtures sem rede; itens vazios."""

    def __init__(self, contratacoes):
        self._contratacoes = contratacoes

    def contratacoes_publicacao(self, **_kw):
        return list(self._contratacoes)

    def itens(self, *_a, **_kw):
        return []


def test_processar_inclui_dois_e_exclui_obra(tmp_path):
    cfg = _config(tmp_path)
    agora = datetime(2026, 6, 21, 12, 0, 0)
    aprovadas, descartadas = processar(
        _contratacoes(), cfg, agora=agora, client=None,
        enriquecer_itens=False, exigir_em_aberto=True,
    )
    assert len(aprovadas) == 2          # expediente + construção
    assert descartadas == 1            # obra (exclusão eliminatória)
    numeros = {a.numero_controle for a in aprovadas}
    assert "11222333000144-1-000007/2026" not in numeros  # obra fora


def test_processar_exigir_em_aberto_descarta_encerrada(tmp_path):
    cfg = _config(tmp_path)
    # 25/06: a de construção (encerra 22/06) já passou; expediente (30/06) segue.
    agora = datetime(2026, 6, 25, 12, 0, 0)
    abertas, _ = processar(
        _contratacoes(), cfg, agora=agora, exigir_em_aberto=True,
    )
    historico, _ = processar(
        _contratacoes(), cfg, agora=agora, exigir_em_aberto=False,
    )
    assert len(abertas) == 1           # só a de expediente continua aberta
    assert len(historico) == 2         # backfill mantém a já encerrada


def test_backfill_persiste_e_conta_novas(tmp_path):
    cfg = _config(tmp_path)
    client = _FakeClient(_contratacoes())
    resumo = backfill(cfg, "20260601", "20260621", client=client,
                      notificadores=[])
    assert resumo["consultadas"] == 3
    assert resumo["aprovadas"] == 2
    assert resumo["novas"] == 2
    # Rodar de novo não duplica (idempotente): zero novas.
    resumo2 = backfill(cfg, "20260601", "20260621", client=client,
                       notificadores=[])
    assert resumo2["novas"] == 0
    assert resumo2["total_db"] == 2
