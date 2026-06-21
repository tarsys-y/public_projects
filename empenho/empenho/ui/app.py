"""Painel Streamlit do Empenho · Radar de Licitações.

Lê o mesmo SQLite e config.yaml do CLI e oferece:
- lista ranqueada com filtros (UF, status, score, texto, só abertas);
- quadro do pipeline (contagem por estágio);
- detalhe da oportunidade com link do edital;
- calculadora de margem interativa (motor de viabilidade);
- mudança de status no pipeline.

Rodar:  streamlit run empenho/ui/app.py   (ou: python -m empenho painel)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

# O Streamlit executa este arquivo como script solto (sem pacote pai), então
# imports relativos não funcionam. Garantimos a raiz do projeto no sys.path e
# usamos imports absolutos do pacote `empenho`.
_RAIZ = Path(__file__).resolve().parent.parent.parent
if str(_RAIZ) not in sys.path:
    sys.path.insert(0, str(_RAIZ))

from empenho.config import carregar_config  # noqa: E402
from empenho.finance import viability  # noqa: E402
from empenho.store.db import STATUS, Store  # noqa: E402

st.set_page_config(page_title="Empenho · Radar de Licitações",
                   page_icon="📋", layout="wide")


@st.cache_data(ttl=60)
def _carregar(_assinatura: float) -> dict:
    """Lê config + linhas do DB. ``_assinatura`` invalida o cache no refresh."""
    cfg = carregar_config()
    with Store(cfg.db_path) as store:
        linhas = [dict(r) for r in store.listar(limite=2000)]
        ufs = store.ufs_distintas()
        contagem = store.contagem_por_status()
        total = store.contar()
    return {
        "cfg": cfg, "linhas": linhas, "ufs": ufs,
        "contagem": contagem, "total": total,
    }


def _fmt_moeda(v) -> str:
    return f"R$ {v:,.0f}" if v is not None else "—"


def main() -> None:
    st.title("📋 Empenho · Radar de Licitações")

    refresh = st.session_state.get("_refresh", 0.0)
    dados = _carregar(refresh)
    cfg = dados["cfg"]
    df = pd.DataFrame(dados["linhas"])

    # ---- Sidebar: filtros ---------------------------------------------------
    with st.sidebar:
        st.header("Filtros")
        if st.button("🔄 Recarregar dados", use_container_width=True):
            _carregar.clear()
            st.session_state["_refresh"] = refresh + 1
            st.rerun()

        uf = st.selectbox("UF", ["(todas)"] + dados["ufs"])
        status_sel = st.selectbox("Status", ["(todos)"] + STATUS)
        score_min = st.slider("Score mínimo", 0, 100, 0, step=5)
        busca = st.text_input("Buscar (objeto/órgão/município)")
        so_abertas = st.checkbox("Só com proposta em aberto", value=True)
        st.caption(f"Total no banco: {dados['total']}")

    # ---- Quadro do pipeline -------------------------------------------------
    st.subheader("Pipeline")
    cols = st.columns(len(STATUS))
    for col, etapa in zip(cols, STATUS):
        col.metric(etapa, dados["contagem"].get(etapa, 0))

    # ---- Aplica filtros sobre o DataFrame -----------------------------------
    if not df.empty:
        if uf != "(todas)":
            df = df[df["uf"] == uf]
        if status_sel != "(todos)":
            df = df[df["status"] == status_sel]
        if score_min:
            df = df[df["score"] >= score_min]
        if busca:
            termo = busca.lower()
            mask = (
                df["objeto"].fillna("").str.lower().str.contains(termo)
                | df["orgao_nome"].fillna("").str.lower().str.contains(termo)
                | df["municipio"].fillna("").str.lower().str.contains(termo)
            )
            df = df[mask]
        if so_abertas:
            agora = pd.Timestamp.now().isoformat()
            df = df[df["encerramento"].isna() | (df["encerramento"] >= agora)]
        df = df.sort_values("score", ascending=False)

    st.subheader(f"Oportunidades ({len(df)})")
    if df.empty:
        st.info("Nenhuma oportunidade para os filtros atuais. "
                "Rode `python -m empenho buscar` para popular o banco.")
        return

    visao = df[[
        "score", "uf", "municipio", "objeto", "valor_lote_ref",
        "encerramento", "orgao_nome", "status", "link_edital",
    ]].rename(columns={
        "valor_lote_ref": "valor_lote", "orgao_nome": "orgão",
        "link_edital": "edital",
    })
    st.dataframe(
        visao,
        use_container_width=True,
        hide_index=True,
        column_config={
            "score": st.column_config.NumberColumn("score", format="%d"),
            "valor_lote": st.column_config.NumberColumn(
                "valor lote", format="R$ %.0f"),
            "edital": st.column_config.LinkColumn("edital", display_text="abrir"),
        },
    )

    # ---- Detalhe + calculadora de margem ------------------------------------
    st.subheader("Detalhe & calculadora de margem")
    rotulos = {
        f"[{r.score:.0f}] {(r.objeto or '')[:70]} — {r.numero_controle}":
            r.numero_controle
        for r in df.itertuples()
    }
    escolha = st.selectbox("Oportunidade", list(rotulos.keys()))
    numero = rotulos[escolha]
    linha = df[df["numero_controle"] == numero].iloc[0]

    esq, dir_ = st.columns([1, 1])
    with esq:
        st.markdown(f"**Objeto:** {linha['objeto']}")
        st.markdown(
            f"**Órgão:** {linha['orgao_nome']}  \n"
            f"**Local:** {linha['uf']} · {linha['municipio']}  \n"
            f"**Valor lote (ref.):** {_fmt_moeda(linha['valor_lote_ref'])}  \n"
            f"**Encerramento:** {linha['encerramento'] or '—'}  \n"
            f"**SRP (reg. preços):** {'sim' if linha['srp'] else 'não'}"
        )
        if linha["link_edital"]:
            st.markdown(f"🔗 [Abrir edital no PNCP]({linha['link_edital']})")
        try:
            bd = json.loads(linha["breakdown_json"] or "{}")
            if bd:
                st.caption("Breakdown do score: " + ", ".join(
                    f"{k}={v:g}" for k, v in bd.items()))
        except (json.JSONDecodeError, TypeError):
            pass

        # Mover no pipeline.
        novo = st.selectbox(
            "Mover para", STATUS,
            index=STATUS.index(linha["status"]) if linha["status"] in STATUS else 0,
        )
        if st.button("Salvar status"):
            with Store(cfg.db_path) as store:
                store.atualizar_status(numero, novo)
            _carregar.clear()
            st.session_state["_refresh"] = refresh + 1
            st.success(f"Status → {novo}")
            st.rerun()

    with dir_:
        st.markdown("**Calculadora de margem**")
        fin = cfg.financeiro
        valor_ref_default = float(
            linha["valor_lote_ref"] or linha["valor_estimado"] or 0.0)
        valor_ref = st.number_input("Valor de referência (teto)",
                                    min_value=0.0, value=valor_ref_default,
                                    step=100.0)
        custo = st.number_input("Custo do fornecedor", min_value=0.0,
                                value=round(valor_ref_default * 0.7, 2),
                                step=100.0)
        frete = st.number_input("Frete", min_value=0.0, value=0.0, step=50.0)
        dias = st.number_input("Dias até receber", min_value=0,
                               value=int(fin.dias_recebimento), step=5)
        imposto = st.slider("Imposto (%)", 0.0, 30.0,
                            float(fin.imposto_pct * 100), step=0.5) / 100
        margem = st.slider("Margem mínima (%)", 0.0, 50.0,
                           float(fin.margem_minima * 100), step=0.5) / 100

        if valor_ref > 0 and (1 - imposto - margem) > 0:
            v = viability.avaliar(
                valor_referencia=valor_ref, custo_fornecedor=custo, frete=frete,
                imposto_pct=imposto, margem_minima=margem,
                taxa_capital_dia=fin.taxa_capital_dia, dias_recebimento=int(dias),
            )
            if v.viavel:
                st.success(f"VIÁVEL ✅ — folga R$ {v.folga_abs:,.2f} "
                           f"({v.folga_pct*100:.1f}%)")
            else:
                st.error(f"INVIÁVEL ❌ — falta R$ {-v.folga_abs:,.2f} de teto")
            m1, m2, m3 = st.columns(3)
            m1.metric("Lance mínimo viável", _fmt_moeda(v.lance_minimo_viavel))
            m2.metric("Margem no teto", f"{v.margem_no_teto*100:.1f}%")
            m3.metric("Lucro no teto", _fmt_moeda(v.lucro_no_teto))
            st.caption(f"Custo de capital embutido: R$ {v.custo_capital:,.2f}")
        else:
            st.warning("Informe um valor de referência > 0 e garanta "
                       "imposto + margem < 100%.")


main()
