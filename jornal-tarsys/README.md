# Jornal Semanal do Tarsys

Jornal pessoal semanal sobre crédito varejo no Brasil, gerado com Claude Code.
As regras do projeto estão em [`CLAUDE.md`](CLAUDE.md) e as regras editoriais
(fontes, template de 9 seções, tom) em [`editorial.md`](editorial.md).

## Ritual semanal

1. **Segunda 9h30 (Brasília)** — o GitHub Actions ([coleta-semanal](../.github/workflows/coleta-semanal.yml))
   roda a coleta da semana que fechou (feeds RSS + SGS + Focus) e abre um PR
   `Coleta semanal AAAA-Wnn`. Revise e mergeie.
2. **`/fechar-edicao`** — numa sessão do Claude Code, o comando lê o editorial e
   os insumos, complementa lacunas com pesquisa web e redige a edição em
   `jornal/AAAA-Wnn.md` (com banner de rascunho), atualizando `temas/`.
3. **Revisão** — você revisa; com o OK, o banner sai e a edição é publicada com
   o commit `Publica edição AAAA-Wnn`. Publicada = imutável.

Retrospectiva trimestral: comando `/retro-trimestral`.

## Rodando localmente

```bash
pip install -r scripts/requirements.txt
python scripts/coleta.py                 # semana ISO atual (fuso de Brasília)
python scripts/coleta.py --semana 2026-W29
python scripts/coleta.py --verificar-fontes   # testa cada feed de fontes.txt
python scripts/tests/test_coleta.py      # testes end-to-end com mock local
```

A coleta grava `insumos/AAAA-Wnn.md` (material bruto por tema), o JSON das
APIs do BCB em `insumos/dados/AAAA-Wnn.json` (fonte primária citável) e
deduplica contra semanas anteriores via `insumos/.dedup.db` (commitado — é a
memória do dedup entre execuções).

## Fontes

- Feeds em [`scripts/fontes.txt`](scripts/fontes.txt) — um por linha; linhas
  `#` são ignoradas. URLs candidatas ficam comentadas até serem confirmadas
  com `--verificar-fontes` (as do BCB estão pendentes de confirmação).
- Séries SGS e indicadores do Focus estão declarados em
  [`scripts/coleta.py`](scripts/coleta.py); só entram códigos confirmados no
  [Portal de Dados Abertos do BCB](https://dadosabertos.bcb.gov.br/).

## Estrutura

```
jornal/    edições publicadas (imutáveis) e rascunhos com banner
temas/     páginas vivas por tema — linha do tempo de cada assunto
insumos/   coletas semanais brutas + dados/ (JSON primário) + .dedup.db
scripts/   coleta.py, fontes.txt, requirements.txt, tests/
```
