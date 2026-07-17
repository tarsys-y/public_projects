# Jornal Semanal do Tarsys

## Contexto
O usuário (Tarsys) é gerente sênior de crédito varejo no Brasil: estratégia de crédito, gestão de portfólio e rentabilização de cartões e empréstimos, com forte base em ciência de dados. Este projeto produz o jornal semanal pessoal dele.

## O que este projeto faz
1x por semana, gera uma edição em Markdown (`jornal/AAAA-Wnn.md`) consolidando os principais pontos da semana nos temas dele, seguindo rigorosamente as regras de `editorial.md`.

## Regras invioláveis
- `editorial.md` governa conteúdo, formato e tom. Leia antes de qualquer edição.
- NUNCA invente números, datas ou fatos. Todo número tem fonte com link e data.
- Hierarquia de autoridade de fontes (ver editorial.md). Fonte primária tem veto.
- Se não encontrar informação confiável sobre algo, diga que não encontrou — não preencha com plausibilidade.
- Sem dados confidenciais do empregador do usuário. Apenas informação pública.
- Português do Brasil, tom executivo direto.

## Fluxo semanal
1. `python scripts/coleta.py` gera `insumos/AAAA-Wnn.md` (feeds + APIs do BCB + RI de bancos na temporada).
2. Comando `/fechar-edicao` redige a edição a partir dos insumos + pesquisa web complementar.
3. O usuário revisa e faz commit. A edição publicada é imutável.

## Estrutura
- `jornal/` edições publicadas (imutáveis)
- `temas/` páginas vivas por tema, atualizadas a cada edição com link para a edição
- `insumos/` coletas semanais brutas
- `scripts/coleta.py` coleta automatizada
