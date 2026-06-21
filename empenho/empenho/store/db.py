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

    def listar(
        self,
        *,
        status: str | None = None,
        uf: str | None = None,
        score_minimo: float | None = None,
        busca: str | None = None,
        somente_abertas: bool = False,
        agora_iso: str | None = None,
        ordenar_por: str = "score",
        limite: int | None = None,
    ) -> list[sqlite3.Row]:
        """Lista oportunidades com filtros combináveis (usado pelo painel).

        ``somente_abertas`` mantém só as que ainda têm proposta em aberto
        (encerramento >= ``agora_iso``); ``busca`` casa em objeto/órgão/UF.
        """
        clausulas: list[str] = []
        params: list[object] = []
        if status:
            clausulas.append("status = ?")
            params.append(status)
        if uf:
            clausulas.append("uf = ?")
            params.append(uf)
        if score_minimo is not None:
            clausulas.append("score >= ?")
            params.append(score_minimo)
        if busca:
            termo = f"%{busca.lower()}%"
            clausulas.append(
                "(LOWER(objeto) LIKE ? OR LOWER(orgao_nome) LIKE ? "
                "OR LOWER(municipio) LIKE ?)"
            )
            params.extend([termo, termo, termo])
        if somente_abertas:
            ref = agora_iso or datetime.now().isoformat(timespec="seconds")
            clausulas.append("(encerramento IS NULL OR encerramento >= ?)")
            params.append(ref)

        ordem = {
            "score": "score DESC, last_seen DESC",
            "encerramento": "encerramento ASC",
            "valor": "valor_lote_ref DESC",
            "recentes": "first_seen DESC",
        }.get(ordenar_por, "score DESC, last_seen DESC")

        sql = "SELECT * FROM oportunidades"
        if clausulas:
            sql += " WHERE " + " AND ".join(clausulas)
        sql += f" ORDER BY {ordem}"
        if limite is not None:
            sql += " LIMIT ?"
            params.append(limite)
        return self.conn.execute(sql, params).fetchall()

    def ufs_distintas(self) -> list[str]:
        cur = self.conn.execute(
            "SELECT DISTINCT uf FROM oportunidades WHERE uf IS NOT NULL "
            "ORDER BY uf"
        )
        return [r[0] for r in cur.fetchall()]

    def contagem_por_status(self) -> dict[str, int]:
        """Quantas oportunidades em cada estágio do pipeline (para o quadro)."""
        cur = self.conn.execute(
            "SELECT status, COUNT(*) FROM oportunidades GROUP BY status"
        )
        contagem = {s: 0 for s in STATUS}
        for status, n in cur.fetchall():
            contagem[status or "Triagem"] = n
        return contagem

    def contar(self) -> int:
        return self.conn.execute(
            "SELECT COUNT(*) FROM oportunidades"
        ).fetchone()[0]
