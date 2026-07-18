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
1. Coleta automática: o GitHub Actions roda `scripts/coleta.py` toda segunda 9h30 (Brasília) e abre um PR com `insumos/AAAA-Wnn.md` + `insumos/dados/AAAA-Wnn.json` (o usuário mergeia). Rodar localmente também funciona: `python scripts/coleta.py`.
2. Comando `/fechar-edicao` redige a edição a partir dos insumos + pesquisa web complementar.
3. O usuário revisa e aprova. A edição publicada é imutável.

## Convenção rascunho → publicação
- Toda edição recém-redigida começa com o banner `> RASCUNHO — aguardando revisão do editor` na primeira linha e pode ser commitada assim (ambientes efêmeros exigem commit para não perder trabalho).
- Publicar = após o OK explícito do editor, remover o banner e commitar com a mensagem `Publica edição AAAA-Wnn`.
- A partir do commit de publicação a edição é imutável; correção posterior vira nota em edição seguinte, nunca edição do arquivo.

## Estrutura
- `jornal/` edições publicadas (imutáveis)
- `temas/` páginas vivas por tema, atualizadas a cada edição com link para a edição
- `insumos/` coletas semanais brutas
- `scripts/coleta.py` coleta automatizada
