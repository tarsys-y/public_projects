---
description: Redige a edição semanal do Jornal do Tarsys a partir dos insumos + pesquisa web
---

Feche a edição semanal do Jornal do Tarsys. Siga exatamente este fluxo:

1. **Leia as regras primeiro**: leia `jornal-tarsys/editorial.md` por inteiro (e `jornal-tarsys/CLAUDE.md` se ainda não estiver em contexto). O editorial governa conteúdo, formato, tom e hierarquia de fontes — nada nele pode ser violado.

2. **Leia os insumos**: abra o arquivo `jornal-tarsys/insumos/AAAA-Wnn.md` da semana atual (semana ISO). Se não existir, use o mais recente disponível em `jornal-tarsys/insumos/` e avise o usuário que a coleta da semana não foi rodada (sugira `python jornal-tarsys/scripts/coleta.py`). Considere também a seção "Falhas de coleta" do insumo: o que falhou na coleta automática precisa ser coberto por pesquisa web.

3. **Complemente com pesquisa web** as lacunas dos insumos, especialmente para as seções 3–7 do template. Checagens obrigatórias da semana:
   - Houve reunião do Copom, ata ou comunicado? Houve decisões/resoluções do CMN ou normativos relevantes do BCB?
   - Números da semana: confirme Selic meta, medianas do Focus (IPCA, Selic fim de ano, PIB) e inadimplência (total e PF, SGS) com data de referência — se a API não retornou, busque na fonte primária (bcb.gov.br).
   - Estamos em temporada de balanços? Se sim, busque os releases/apresentações de RI dos bancos da lista do editorial (Itaú, Bradesco, Santander BR, BB, Nubank, Inter, C6, Mercado Pago) que divulgaram na semana. A fonte é o material de RI, nunca a manchete sobre ele.
   - Papers novos de credit risk/scoring (arXiv q-fin, SSRN) e novidades de IA aplicada a crédito.

4. **Redija a edição completa** seguindo rigorosamente o template de 9 seções do editorial, na ordem, com todas as regras de redação (todo item com fonte + link + data; hierarquia de autoridade; regra do veto da fonte primária; sinalizar comparações de inadimplência que cruzam jan/2025 — Resolução CMN 4.966/21; tamanho de 2–3 páginas; rodapé obrigatório com todas as fontes e data de captura).

5. **Salve** em `jornal-tarsys/jornal/AAAA-Wnn.md` (semana ISO da edição).

6. **Atualize as páginas de tema** em `jornal-tarsys/temas/` tocadas pela edição (crie se não existirem): 3–6 linhas do que mudou na semana + link para a edição, no topo da linha do tempo.

7. **NÃO COMMITE.** Mostre ao usuário um resumo do que foi feito (manchete escolhida, o que entrou em cada seção, quais temas foram atualizados, o que ficou sem informação confiável) e peça a revisão dele ANTES de qualquer commit. Só commite após o OK explícito do usuário.
