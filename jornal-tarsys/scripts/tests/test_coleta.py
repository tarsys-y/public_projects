#!/usr/bin/env python3
"""Teste end-to-end do coleta.py contra o mock local (sem rede externa).

Uso: python scripts/tests/test_coleta.py
Sai com código 0 se tudo passar; imprime cada verificação.
"""
import json
import os
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mock_apis import criar_servidor  # noqa: E402

DIR_SCRIPTS = Path(__file__).resolve().parent.parent
COLETA = DIR_SCRIPTS / "coleta.py"

FALHAS = []


def checar(nome: str, cond: bool, detalhe: str = ""):
    status = "ok" if cond else "FALHOU"
    print(f"[{status}] {nome}" + (f" — {detalhe}" if detalhe and not cond else ""))
    if not cond:
        FALHAS.append(nome)


def rodar(insumos: Path, fontes: Path, base: str, *extra) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    env.update({
        "COLETA_DIR_INSUMOS": str(insumos),
        "COLETA_SGS_BASE": base,
        "COLETA_FOCUS_BASE": base,
        "NO_PROXY": "127.0.0.1,localhost",
        "no_proxy": "127.0.0.1,localhost",
    })
    return subprocess.run(
        [sys.executable, str(COLETA), "--fontes", str(fontes), *extra],
        capture_output=True, text=True, env=env, timeout=120,
    )


def main() -> int:
    servidor = criar_servidor()
    porta = servidor.server_address[1]
    base = f"http://127.0.0.1:{porta}"
    threading.Thread(target=servidor.serve_forever, daemon=True).start()

    with tempfile.TemporaryDirectory() as tmp:
        insumos = Path(tmp) / "insumos"
        fontes = Path(tmp) / "fontes.txt"
        fontes.write_text(
            f"{base}/rss/test.xml\n"
            "https://feed-quebrado.example.invalid/rss.xml\n"
            f"# {base}/rss/test.xml\n",  # candidata comentada p/ --verificar-fontes
            encoding="utf-8",
        )

        # 1ª coleta: itens novos, classificação, números e falha tolerada
        r1 = rodar(insumos, fontes, base, "--semana", "2026-W29")
        checar("run 1 sai com código 0", r1.returncode == 0, r1.stderr[-300:])
        md = (insumos / "2026-W29.md")
        checar("run 1 gera 2026-W29.md", md.exists())
        texto = md.read_text(encoding="utf-8") if md.exists() else ""
        checar("classificou risco-scoring", "### risco-scoring" in texto)
        checar("classificou cards-emprestimos", "### cards-emprestimos" in texto)
        checar("classificou macro-brasil", "### macro-brasil" in texto)
        checar("item sem tema vai p/ não-classificado", "### não-classificado" in texto)
        checar("tabela SGS presente (série 432)", "| 432 |" in texto)
        checar("série adicional 21112 presente", "| 21112 |" in texto)
        checar("Focus presente (Câmbio)", "Câmbio" in texto)
        checar("feed quebrado registrado em falhas", "Falhas de coleta" in texto)
        checar("dedup remove ?utm_ do link exibido? (link original mantido)",
               "utm_source=rss" in texto)  # o insumo mostra o link original
        js = insumos / "dados" / "2026-W29.json"
        checar("JSON bruto gravado", js.exists())
        if js.exists():
            bruto = json.loads(js.read_text(encoding="utf-8"))
            checar("JSON bruto tem sgs e focus",
                   bool(bruto.get("sgs")) and bool(bruto.get("focus")))

        # 2ª coleta da MESMA semana: idempotente (itens continuam lá)
        r2 = rodar(insumos, fontes, base, "--semana", "2026-W29")
        texto2 = md.read_text(encoding="utf-8")
        checar("re-execução da mesma semana mantém itens",
               r2.returncode == 0 and "### risco-scoring" in texto2)

        # 3ª coleta, semana SEGUINTE: dedup impede repetição
        r3 = rodar(insumos, fontes, base, "--semana", "2026-W30")
        texto3 = (insumos / "2026-W30.md").read_text(encoding="utf-8")
        checar("semana seguinte não repete itens",
               r3.returncode == 0 and "Nenhum item novo" in texto3)

        # --semana inválida é rejeitada
        r4 = rodar(insumos, fontes, base, "--semana", "2026-29")
        checar("--semana inválida é rejeitada", r4.returncode != 0)

        # --verificar-fontes: reporta ativo ok, quebrado com erro e comentada
        r5 = rodar(insumos, fontes, base, "--verificar-fontes")
        saida = r5.stdout
        checar("verificar-fontes: feed ativo OK", "[OK]    ATIVO" in saida)
        checar("verificar-fontes: feed quebrado com ERRO", "[ERRO]" in saida)
        checar("verificar-fontes: testa candidata comentada", "COMENTADO" in saida)
        checar("verificar-fontes: sai != 0 quando há falha", r5.returncode != 0)

    servidor.shutdown()
    print()
    if FALHAS:
        print(f"{len(FALHAS)} verificação(ões) falharam: {FALHAS}")
        return 1
    print("Todas as verificações passaram.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
