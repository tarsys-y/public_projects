"""Testes do motor de viabilidade (forma fechada)."""
import math

import pytest

from empenho.finance import viability


def test_lance_minimo_forma_fechada_sem_capital():
    # C=1000, F=50, t=0.07, m=0.10, sem custo de capital.
    # L_min = (1050) / (1 - 0.07 - 0.10) = 1050 / 0.83 = 1265,0602...
    v = viability.avaliar(
        valor_referencia=2000.0,
        custo_fornecedor=1000.0,
        frete=50.0,
        imposto_pct=0.07,
        margem_minima=0.10,
    )
    assert math.isclose(v.lance_minimo_viavel, 1265.06, abs_tol=0.01)
    assert v.viavel is True
    assert v.custo_capital == 0.0


def test_margem_no_lance_minimo_bate_a_minima():
    # No lance mínimo, a margem realizada deve ser exatamente a margem mínima.
    C, F, t, m = 1000.0, 50.0, 0.07, 0.10
    v = viability.avaliar(
        valor_referencia=5000.0, custo_fornecedor=C, frete=F,
        imposto_pct=t, margem_minima=m,
    )
    L = v.lance_minimo_viavel
    lucro = L - C - F - L * t  # sem custo de capital
    margem = lucro / L
    assert math.isclose(margem, m, abs_tol=1e-4)


def test_inviavel_quando_lmin_acima_do_teto():
    # Teto muito baixo em relação ao custo → inviável, folga negativa.
    v = viability.avaliar(
        valor_referencia=1000.0,
        custo_fornecedor=1000.0,
        frete=0.0,
        imposto_pct=0.07,
        margem_minima=0.10,
    )
    assert v.viavel is False
    assert v.folga_abs < 0


def test_custo_capital_entra_na_base():
    # Com custo de capital, L_min sobe.
    sem = viability.avaliar(
        valor_referencia=5000.0, custo_fornecedor=1000.0, frete=0.0,
        imposto_pct=0.07, margem_minima=0.10,
    )
    com = viability.avaliar(
        valor_referencia=5000.0, custo_fornecedor=1000.0, frete=0.0,
        imposto_pct=0.07, margem_minima=0.10,
        taxa_capital_dia=0.001, dias_recebimento=30,
    )
    assert com.custo_capital == pytest.approx(1000.0 * 0.001 * 30)  # 30.0
    assert com.lance_minimo_viavel > sem.lance_minimo_viavel


def test_config_invalida_levanta():
    with pytest.raises(ValueError):
        viability.avaliar(
            valor_referencia=1000.0, custo_fornecedor=10.0,
            imposto_pct=0.95, margem_minima=0.10,  # soma >= 1
        )


def test_margem_no_teto_maior_que_minima_quando_viavel():
    v = viability.avaliar(
        valor_referencia=2000.0, custo_fornecedor=1000.0, frete=50.0,
        imposto_pct=0.07, margem_minima=0.10,
    )
    assert v.margem_no_teto > 0.10  # há folga acima da margem mínima
