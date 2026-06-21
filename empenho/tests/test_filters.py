"""Testes do filtro de escopo e da pontuação de fit."""
import json
from datetime import datetime

from conftest import FIXTURES

from empenho.client.models import Contratacao, Item
from empenho.config import ScoreCfg
from empenho.filters.scope import avaliar_escopo, normalizar, palavras_casadas
from empenho.filters.score import pontuar

INCLUSAO = ["material de expediente", "papel a4", "cimento", "argamassa"]
EXCLUSAO = ["serviço", "obra", "pavimentação", "reforma", "especializada"]


def _carregar_contratacoes() -> list[Contratacao]:
    raw = json.loads((FIXTURES / "sample_proposta_raw.json").read_text("utf-8"))
    return [Contratacao.model_validate(d) for d in raw["data"]]


def test_normalizar_remove_acento_e_caixa():
    assert normalizar("Pavimentação ASFÁLTICA") == "pavimentacao asfaltica"


def test_palavras_casadas_ignora_acentos():
    assert palavras_casadas("Aquisição de Cimento CP-II", ["cimento"]) == ["cimento"]


def test_obra_eh_excluida_eliminatoria():
    contratacoes = _carregar_contratacoes()
    obra = contratacoes[2]  # objeto de obra/pavimentação/especializada
    esc = avaliar_escopo(obra, INCLUSAO, EXCLUSAO)
    assert esc.incluida is False
    assert esc.motivo == "exclusao"
    assert esc.excluida_por in ("serviço", "obra", "pavimentação",
                                "reforma", "especializada")


def test_material_expediente_incluido_pelo_objeto():
    contratacoes = _carregar_contratacoes()
    expediente = contratacoes[0]
    esc = avaliar_escopo(expediente, INCLUSAO, EXCLUSAO)
    assert esc.incluida is True
    assert "material de expediente" in esc.casadas_objeto


def test_inclusao_pelos_itens_quando_objeto_generico():
    c = Contratacao.model_validate({
        "numeroControlePNCP": "x-1-1/2026",
        "objetoCompra": "Aquisição de materiais diversos",
    })
    itens = [Item.model_validate({"descricao": "Papel A4 75g resma"})]
    sem_itens = avaliar_escopo(c, INCLUSAO, EXCLUSAO)
    com_itens = avaliar_escopo(c, INCLUSAO, EXCLUSAO, itens)
    assert sem_itens.incluida is False
    assert com_itens.incluida is True
    assert "papel a4" in com_itens.casadas_itens


def test_score_premia_srp_valor_e_prazo():
    contratacoes = _carregar_contratacoes()
    c = contratacoes[0]  # SRP, valor 64k <= teto 80k, encerra em 30/06
    esc = avaliar_escopo(c, INCLUSAO, EXCLUSAO)
    agora = datetime(2026, 6, 21, 12, 0, 0)
    sc = pontuar(
        c, esc, ScoreCfg(),
        teto_lote=80000.0, ufs_alvo=["AL"], allowlist=[],
        dias_minimos=2, agora=agora,
    )
    assert 0 < sc.score <= 100
    assert "srp" in sc.breakdown
    assert "valor_no_teto" in sc.breakdown
    assert "uf_alvo" in sc.breakdown
    assert "prazo_confortavel" in sc.breakdown
