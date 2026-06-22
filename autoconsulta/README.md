# autoconsulta

Subprojeto **standalone** (Next.js 14 + TypeScript) com quatro ferramentas
**independentes** de autoconsulta. Vive isolado em `autoconsulta/` para não se
misturar com o dashboard B3 do repositório.

## Princípio central

> Cada ferramenta opera sobre os **próprios dados do titular** ou sobre dados
> **públicos de uma empresa** (CNPJ). **Nada é agregado a partir de um CPF.**

Isto é uma decisão de design por causa da LGPD: uma ferramenta que cruzasse
redes sociais, empresas e endereço a partir do CPF de uma pessoa seria
*people-search* / perfilamento, e não é construída aqui.

## Ferramentas

| Aba | O que faz | Dados |
| --- | --------- | ----- |
| **Validador** | Valida dígitos verificadores de CPF/CNPJ | 100% offline, nada é consultado |
| **CNPJ & Sócios** | Dados cadastrais públicos + QSA de uma empresa | Entrada = CNPJ (BrasilAPI) |
| **Situação Receita** | Organiza a situação do **próprio** CPF | Auto-relato; consulta oficial é feita pelo titular no gov.br |
| **Vazamentos** | Verifica o **próprio** e-mail em vazamentos | Have I Been Pwned (requer chave) |

### O que NÃO é feito (fora de escopo)

- Reverse-lookup CPF → empresas / redes sociais / endereço.
- Qualquer "perfil" agregado de uma pessoa a partir do CPF.
- Scraping de endpoint protegido ou bypass de captcha da Receita.
- Busca de dados de terceiros sem consentimento/autenticação do titular.

## Rodando

```bash
cd autoconsulta
npm install
cp .env.example .env.local   # opcional: preencha HIBP_API_KEY etc.
npm run dev                  # http://localhost:3000
```

### Verificação dos validadores (offline)

```bash
npm run check:validation
```

### Variáveis de ambiente

Todas opcionais — cada ferramenta degrada de forma graciosa sem elas:

- `HIBP_API_KEY` — necessária para a checagem de vazamentos.
- `GOVBR_*` / `RECEITA_API_BASE` — fluxo oficial gov.br para situação de CPF.
  Exige **credenciamento** do serviço junto ao governo; sem isso, a aba de
  situação opera em modo de auto-relato.

## Endpoints

- `GET /api/cnpj/[cnpj]` — dados públicos da empresa + QSA.
- `POST /api/breaches` — body `{ "email": "seu@email.com" }`; vazamentos do
  próprio e-mail.
