"""Interface plugável de notificação.

Hoje só implementamos o canal de console/CSV. Telegram/e-mail (Fase 2) só
precisam implementar esta interface.
"""
from __future__ import annotations

from typing import Protocol

from ..store.db import LinhaOportunidade


class Notifier(Protocol):
    def enviar(self, novas: list[LinhaOportunidade]) -> None:
        """Notifica as melhores oportunidades NOVAS do dia."""
        ...
