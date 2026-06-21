"""Canal de notificação via Telegram Bot API.

Implementa a interface ``Notifier`` (notify/base.py). Credenciais vêm do
ambiente/.env (``telegram_bot_token`` e ``telegram_chat_id``), nunca do código.
Crie um bot com o @BotFather, pegue o token e descubra seu chat_id (ex.: mande
uma mensagem ao bot e leia ``getUpdates``).
"""
from __future__ import annotations

import html

import requests

from ..store.db import LinhaOportunidade

_API = "https://api.telegram.org"
_MAX_MSG = 4096  # limite de caracteres por mensagem do Telegram


def montar_mensagem(novas: list[LinhaOportunidade], top_n: int = 15) -> str:
    """Monta o texto (HTML) com as melhores oportunidades novas do dia."""
    if not novas:
        return "🔕 <b>Empenho</b>: nenhuma oportunidade nova hoje."

    ordenadas = sorted(novas, key=lambda x: x.score, reverse=True)[:top_n]
    linhas = [f"🔔 <b>Empenho</b> — {len(novas)} oportunidade(s) nova(s)\n"]
    for l in ordenadas:
        valor = (f"R$ {l.valor_lote_ref:,.0f}"
                 if l.valor_lote_ref is not None else "valor n/d")
        encerra = (l.encerramento or "")[:10] or "s/ prazo"
        objeto = html.escape(l.objeto[:140])
        local = " · ".join(p for p in (l.uf, l.municipio) if p)
        cabecalho = f"<b>[{l.score:.0f}]</b> {objeto}"
        if l.link_edital:
            cabecalho += f'\n  🔗 <a href="{l.link_edital}">edital</a>'
        linhas.append(
            f"{cabecalho}\n  {local} · {valor} · encerra {encerra}\n"
        )
    texto = "\n".join(linhas)
    if len(texto) > _MAX_MSG:
        texto = texto[: _MAX_MSG - 20] + "\n… (lista truncada)"
    return texto


class TelegramNotifier:
    """Envia o resumo diário para um chat do Telegram."""

    def __init__(self, bot_token: str, chat_id: str, *, top_n: int = 15,
                 timeout: int = 15,
                 session: requests.Session | None = None) -> None:
        if not bot_token or not chat_id:
            raise ValueError(
                "TelegramNotifier exige telegram_bot_token e telegram_chat_id "
                "(configure no .env)."
            )
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.top_n = top_n
        self.timeout = timeout
        self.session = session or requests.Session()

    def enviar(self, novas: list[LinhaOportunidade]) -> None:
        texto = montar_mensagem(novas, self.top_n)
        url = f"{_API}/bot{self.bot_token}/sendMessage"
        resp = self.session.post(
            url,
            json={
                "chat_id": self.chat_id,
                "text": texto,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
            timeout=self.timeout,
        )
        resp.raise_for_status()
