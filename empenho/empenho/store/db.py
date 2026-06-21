"""Persistência em SQLite: idempotente, dedup por numeroControlePNCP.

Cada oportunidade guarda o JSON cru, o score/breakdown, o status do pipeline e
os timestamps de primeira/última vez vista (para distinguir "nova" de "já vista").
"""
from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

# Status do pipeline do negócio.
STATUS = [
    "Triagem", "Cotando", "Análise", "Cadastrada",
    "Disputa", "Entregue", "Pago", "Perdida",
]

_SCHEMA = """
CREATE TABLE IF NOT EXISTS oportunidades (
    numero_controle   TEXT PRIMARY KEY,
    objeto            TEXT,
    uf                TEXT,
    municipio         TEXT,
    orgao_cnpj        TEXT,
    orgao_nome        TEXT,
    valor_estimado    REAL,
    valor_lote_ref    REAL,
    srp               INTEGER,
    encerramento      TEXT,
    link_edital       TEXT,
    score             REAL,
    breakdown_json    TEXT,
    palavras_json     TEXT,
    raw_json          TEXT,
    status            TEXT DEFAULT 'Triagem',
    first_seen        TEXT,
    last_seen         TEXT,
    notified          INTEGER DEFAULT 0
);
"""


@dataclass
class LinhaOportunidade:
    numero_controle: str
    objeto: str
    uf: str | None
    municipio: str | None
    orgao_cnpj: str | None
    orgao_nome: str | None
    valor_estimado: float | None
    valor_lote_ref: float | None
    srp: bool
    encerramento: str | None
    link_edital: str | None
    score: float
    breakdown: dict
    palavras: dict
    raw: dict


class Store:
    def __init__(self, db_path: Path | str) -> None:
        self.conn = sqlite3.connect(str(db_path))
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(_SCHEMA)
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()

    def __enter__(self) -> "Store":
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    def existe(self, numero_controle: str) -> bool:
        cur = self.conn.execute(
            "SELECT 1 FROM oportunidades WHERE numero_controle = ?",
            (numero_controle,),
        )
        return cur.fetchone() is not None

    def upsert(self, op: LinhaOportunidade) -> bool:
        """Insere (nova) ou atualiza (já vista). Retorna True se for NOVA.

        Idempotente: rodar duas vezes não duplica. Em registro já existente,
        atualiza score/last_seen mas preserva status, first_seen e notified.
        """
        agora = datetime.now().isoformat(timespec="seconds")
        nova = not self.existe(op.numero_controle)
        if nova:
            self.conn.execute(
                """INSERT INTO oportunidades (
                    numero_controle, objeto, uf, municipio, orgao_cnpj,
                    orgao_nome, valor_estimado, valor_lote_ref, srp,
                    encerramento, link_edital, score, breakdown_json,
                    palavras_json, raw_json, status, first_seen, last_seen,
                    notified
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)""",
                (
                    op.numero_controle, op.objeto, op.uf, op.municipio,
                    op.orgao_cnpj, op.orgao_nome, op.valor_estimado,
                    op.valor_lote_ref, int(op.srp), op.encerramento,
                    op.link_edital, op.score, json.dumps(op.breakdown),
                    json.dumps(op.palavras, ensure_ascii=False),
                    json.dumps(op.raw, ensure_ascii=False), "Triagem",
                    agora, agora,
                ),
            )
        else:
            self.conn.execute(
                """UPDATE oportunidades
                   SET score=?, breakdown_json=?, valor_lote_ref=?,
                       encerramento=?, last_seen=?
                   WHERE numero_controle=?""",
                (
                    op.score, json.dumps(op.breakdown), op.valor_lote_ref,
                    op.encerramento, agora, op.numero_controle,
                ),
            )
        self.conn.commit()
        return nova

    def buscar(self, numero_controle: str) -> sqlite3.Row | None:
        cur = self.conn.execute(
            "SELECT * FROM oportunidades WHERE numero_controle = ?",
            (numero_controle,),
        )
        return cur.fetchone()

    def atualizar_status(self, numero_controle: str, status: str) -> None:
        if status not in STATUS:
            raise ValueError(f"status inválido: {status!r}. Use um de {STATUS}")
        self.conn.execute(
            "UPDATE oportunidades SET status=? WHERE numero_controle=?",
            (status, numero_controle),
        )
        self.conn.commit()

    def marcar_notificadas(self, numeros: list[str]) -> None:
        self.conn.executemany(
            "UPDATE oportunidades SET notified=1 WHERE numero_controle=?",
            [(n,) for n in numeros],
        )
        self.conn.commit()

    def top(self, limite: int = 50) -> list[sqlite3.Row]:
        cur = self.conn.execute(
            "SELECT * FROM oportunidades ORDER BY score DESC, last_seen DESC "
            "LIMIT ?",
            (limite,),
        )
        return cur.fetchall()

    def contar(self) -> int:
        return self.conn.execute(
            "SELECT COUNT(*) FROM oportunidades"
        ).fetchone()[0]
