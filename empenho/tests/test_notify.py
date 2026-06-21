"""Testes do notificador Telegram: formatação e envio (sem rede)."""
import pytest

from empenho.notify.telegram import TelegramNotifier, montar_mensagem
from empenho.store.db import LinhaOportunidade


def _linha(numero, objeto, score, **kw) -> LinhaOportunidade:
    base = dict(
        uf="AL", municipio="Maceió", orgao_cnpj="1", orgao_nome="Pref X",
        valor_estimado=10000.0, valor_lote_ref=10000.0, srp=False,
        encerramento="2026-06-30T09:00:00", link_edital="https://pncp.gov.br/x",
        breakdown={}, palavras={}, raw={},
    )
    base.update(kw)
    return LinhaOportunidade(numero_controle=numero, objeto=objeto,
                            score=score, **base)


def test_mensagem_vazia_quando_sem_novas():
    msg = montar_mensagem([])
    assert "nenhuma" in msg.lower()


def test_mensagem_ordena_por_score_e_escapa_html():
    novas = [
        _linha("a-1", "Material de expediente <secretaria>", 40.0),
        _linha("b-2", "Cimento & argamassa", 90.0),
    ]
    msg = montar_mensagem(novas)
    # maior score aparece primeiro
    assert msg.index("[90]") < msg.index("[40]")
    # caracteres especiais escapados (não quebram o parse_mode=HTML)
    assert "&lt;secretaria&gt;" in msg
    assert "&amp;" in msg


def test_construtor_exige_credenciais():
    with pytest.raises(ValueError):
        TelegramNotifier("", "")


class _FakeResp:
    def raise_for_status(self):
        pass


class _FakeSession:
    def __init__(self):
        self.posts = []

    def post(self, url, json=None, timeout=None):
        self.posts.append((url, json))
        return _FakeResp()


def test_enviar_faz_post_com_chat_e_parse_mode():
    sess = _FakeSession()
    notif = TelegramNotifier("TOKEN", "CHAT", session=sess)
    notif.enviar([_linha("a-1", "Papel A4", 70.0)])
    assert len(sess.posts) == 1
    url, payload = sess.posts[0]
    assert "botTOKEN/sendMessage" in url
    assert payload["chat_id"] == "CHAT"
    assert payload["parse_mode"] == "HTML"
    assert "Papel A4" in payload["text"]
