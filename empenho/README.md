# Empenho · Radar de Licitações

Aplicação **local** (Python) que garimpa **Pregões Eletrônicos** na API pública
do **PNCP**, filtra pelo escopo da empresa (materiais de construção e de
expediente/escritório simples), pontua o *fit*, calcula a **viabilidade
financeira** (lance mínimo/máximo viável) e acompanha o pipeline das licitações
que você decide seguir.

Modelo de negócio: ME/EPP sem estoque, intermediação — só compra do fornecedor
depois de vencer e receber o empenho. Objetivo: muitos pregões pequenos e bem
escolhidos, margem fina repetida ("bola de neve" de capital com risco diluído).

> A API do PNCP é pública e **não exige credencial**. Base de consulta:
> `https://pncp.gov.br/api/consulta` · Swagger:
> `https://pncp.gov.br/api/consulta/swagger-ui/index.html`

## Como funciona (pipeline)

```
PNCP /contratacoes/proposta (modalidade 6, UF alvo)
  → mantém só propostas ainda em aberto (encerramento >= agora, fuso Brasília)
  → exclusão eliminatória por palavra-chave no objeto (obra, serviço, ...)
  → enriquecimento LAZY: busca os itens só de quem passou na triagem
  → inclusão por objeto E/OU itens + pontuação de fit (0–100, com breakdown)
  → persistência idempotente no SQLite (dedup por numeroControlePNCP)
  → CSV datado + tabela no terminal (melhores NOVAS do dia)
```

## Setup

Requisitos: Python 3.11+.

```bash
cd empenho
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # só necessário p/ notificação (Fase 2)
```

## Uso

```bash
# Puxa, filtra, ranqueia e salva no SQLite + exporta CSV das melhores
python -m empenho buscar

# Motor de margem para uma oportunidade (id = numeroControlePNCP)
python -m empenho viabilidade <id> --custo 12000 --frete 300 --dias 45
#   ou, sem depender do DB:
python -m empenho viabilidade x --custo 12000 --valor-ref 18000

# Move uma oportunidade no pipeline
python -m empenho status <id> Cotando
```

`buscar` gera `oportunidades_AAAA-MM-DD.csv` (ordenado por score) e grava em
`empenho.db`. Rodar de novo **não duplica** registros — só marca os que já
foram vistos e adiciona os novos.

## Motor de viabilidade (forma fechada)

Para um lance `L`, custo do fornecedor `C`, frete `F`, imposto `t`, custo de
capital `K = (C+F)·taxa_dia·dias`:

```
lucro(L)  = L·(1 − t) − (C + F + K)
margem(L) = (1 − t) − (C + F + K)/L          (cresce com L)

Lance mínimo viável:  L_min = (C + F + K) / (1 − t − m)
Lance máximo:         R = valor de referência (teto do edital)
VIÁVEL  ⟺  L_min ≤ R         Folga (headroom) = R − L_min
```

Onde `m` é a margem mínima. Como a margem cresce com o lance, basta o lance
mínimo que entrega `m`; acima dele (até o teto `R`) a margem só melhora.

## Configuração (`config.yaml`)

Todos os parâmetros 🔧 ficam lá: palavras de inclusão/exclusão, UFs alvo
(**hoje: `[AL]`**), teto por lote (**R$ 80.000**, casa com a faixa de
exclusividade ME/EPP da LC 123 art. 48), margem mínima (**10%**), imposto
(**7%**, Simples Anexo I), custo de capital, allow/blocklist de CNPJ e os pesos
do score. Segredos de notificação ficam no `.env` (nunca no código).

## Agendamento diário

**Linux/macOS (cron)** — todo dia útil às 8h:
```cron
0 8 * * 1-5 cd /caminho/empenho && /caminho/empenho/.venv/bin/python -m empenho buscar >> empenho.log 2>&1
```

**Windows (Agendador de Tarefas):** crie uma tarefa básica diária que executa
`...\.venv\Scripts\python.exe -m empenho buscar` no diretório do projeto.

## Testes

```bash
python -m pytest -q
```

Cobrem o motor de margem (forma fechada, viabilidade, folga, config inválida),
os filtros (inclusão/exclusão, acentuação, inclusão por item) e o cliente
(HTTP 204 vazio, 422 com erro claro, paginação). As fixtures em
`tests/fixtures/` reproduzem a estrutura real do JSON do PNCP — os testes
rodam **offline**.

## Estrutura

```
empenho/
  config.yaml            # todos os parâmetros ajustáveis
  empenho/
    config.py            # carga/validação de config + segredos
    client/pncp.py       # API: paginação, retry/backoff, 204/422, fuso
    client/models.py     # modelos pydantic (Contratacao, Item)
    filters/scope.py     # inclusão/exclusão (objeto + itens)
    filters/score.py     # fit 0–100 com breakdown
    finance/viability.py # motor de margem (forma fechada)
    store/db.py          # SQLite idempotente + pipeline de status
    notify/console.py    # CSV + tabela rich (canal atual)
    pipeline.py          # orquestra o comando `buscar`
    __main__.py          # CLI
  tests/                 # pytest + fixtures
```

## Status / próximos passos (Fase 2)

- Painel **Streamlit**: lista ranqueada com filtros, detalhe/link do edital,
  calculadora de margem interativa e quadro do pipeline.
- **Notificação** Telegram/e-mail (interface `notify/base.py` já pronta).
- Backfill histórico via `/v1/contratacoes/publicacao`.

## Notas

- A API responde **HTTP 204** (sem corpo) quando não há resultados — tratado
  como lista vazia. `tamanhoPagina` máximo é **50**. Parâmetro inválido → **422**.
- Datas vêm em horário de **Brasília** (sem timezone); prazos são comparados
  nesse fuso.
- Alerta fiscal: além do Simples (7%), materiais a órgãos públicos podem ter
  **ICMS-ST/DIFAL** — confira caso a caso antes de fechar a margem.
```
