"""Testes do Store: idempotência, filtros do painel e quadro do pipeline."""
from datetime import datetime, timedelta

from empenho.store.db import LinhaOportunidade, Store


def _linha(numero, *, objeto="material de expediente", uf="AL",
           municipio="Maceió", orgao="Prefeitura X", score=50.0,
           valor=10000.0, encerramento=None) -> LinhaOportunidade:
    return LinhaOportunidade(
        numero_controle=numero, objeto=objeto, uf=uf, municipio=municipio,
        orgao_cnpj="12345678000190", orgao_nome=orgao, valor_estimado=valor,
        valor_lote_ref=valor, srp=False, encerramento=encerramento,
        link_edital=None, score=score, breakdown={}, palavras={}, raw={},
    )


def _store(tmp_path):
    return Store(tmp_path / "t.db")


def test_upsert_idempotente_nao_duplica(tmp_path):
    with _store(tmp_path) as s:
        assert s.upsert(_linha("a-1")) is True   # nova
        assert s.upsert(_linha("a-1")) is False  # já vista
        assert s.contar() == 1


def test_upsert_preserva_status_em_reinsercao(tmp_path):
    with _store(tmp_path) as s:
        s.upsert(_linha("a-1"))
        s.atualizar_status("a-1", "Cotando")
        s.upsert(_linha("a-1", score=99.0))  # nova passada do buscar
        row = s.buscar("a-1")
        assert row["status"] == "Cotando"   # status preservado
        assert row["score"] == 99.0          # score atualizado


def test_listar_filtra_por_uf_status_score_e_busca(tmp_path):
    with _store(tmp_path) as s:
        s.upsert(_linha("a-1", uf="AL", score=80, objeto="papel a4"))
        s.upsert(_linha("b-2", uf="PE", score=40, objeto="cimento"))
        s.upsert(_linha("c-3", uf="AL", score=20, objeto="toner"))
        s.atualizar_status("a-1", "Cotando")

        assert {r["numero_controle"] for r in s.listar(uf="AL")} == {"a-1", "c-3"}
        assert [r["numero_controle"] for r in s.listar(score_minimo=50)] == ["a-1"]
        assert [r["numero_controle"] for r in s.listar(status="Cotando")] == ["a-1"]
        assert [r["numero_controle"] for r in s.listar(busca="cimento")] == ["b-2"]


def test_listar_somente_abertas(tmp_path):
    agora = datetime(2026, 6, 21, 12, 0, 0)
    passado = (agora - timedelta(days=1)).isoformat()
    futuro = (agora + timedelta(days=3)).isoformat()
    with _store(tmp_path) as s:
        s.upsert(_linha("aberta", encerramento=futuro))
        s.upsert(_linha("encerrada", encerramento=passado))
        abertas = s.listar(somente_abertas=True, agora_iso=agora.isoformat())
        assert [r["numero_controle"] for r in abertas] == ["aberta"]


def test_contagem_por_status_cobre_todos_os_estagios(tmp_path):
    with _store(tmp_path) as s:
        s.upsert(_linha("a-1"))
        s.upsert(_linha("b-2"))
        s.atualizar_status("b-2", "Pago")
        cont = s.contagem_por_status()
        assert cont["Triagem"] == 1
        assert cont["Pago"] == 1
        assert cont["Perdida"] == 0  # estágios sem registro vêm zerados


def test_ufs_distintas_ordenadas(tmp_path):
    with _store(tmp_path) as s:
        s.upsert(_linha("a-1", uf="PE"))
        s.upsert(_linha("b-2", uf="AL"))
        s.upsert(_linha("c-3", uf="AL"))
        assert s.ufs_distintas() == ["AL", "PE"]
