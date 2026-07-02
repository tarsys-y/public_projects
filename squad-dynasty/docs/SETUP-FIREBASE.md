# Ativando o modo online (M7) — Firebase

O jogo funciona 100% offline. Este guia liga a **Liga de Amigos** e o
**Mercado de transferências** entre os aparelhos do grupo.

## 1. Criar o projeto (5 min, grátis)

1. Acesse [console.firebase.google.com](https://console.firebase.google.com) e crie um projeto (ex: `squad-dynasty`). Google Analytics pode ficar desligado.
2. **Authentication** → Get started → aba *Sign-in method* → ative **Anonymous**.
3. **Firestore Database** → Create database → *production mode* → região `southamerica-east1` (São Paulo).
4. Configurações do projeto (⚙️) → *Seus apps* → **</> (Web)** → registre um app (nome livre, sem hosting) e copie o objeto `firebaseConfig`.

## 2. Configurar o app

```bash
cd squad-dynasty/apps/mobile
cp .env.example .env
# cole os valores do firebaseConfig nas EXPO_PUBLIC_FIREBASE_*
```

Reinicie o `npm start` (com `--clear` se o Metro estava aberto). A tela
**Liga → Liga de Amigos** deixa de mostrar instruções e passa a ter o botão
"Conectar".

## 3. Publicar as regras de segurança (obrigatório)

```bash
cd squad-dynasty
npx firebase-tools login
npx firebase-tools use SEU_PROJECT_ID
npx firebase-tools deploy --only firestore:rules
```

## 4. Jogar em liga

- Um amigo **cria a liga** (precisa do 11 completo no Meu Time) e compartilha o **código de 6 letras**.
- Os demais **entram com o código**. O calendário (todos contra todos, ida e volta) nasce automaticamente do sorteio da liga — o mesmo em todos os aparelhos.
- Cada confronto: **quem joga primeiro** simula contra o elenco publicado do adversário e registra o resultado (imutável). A partida é determinística pela seed do confronto — o adversário pode reassistir o mesmo jogo.
- O elenco publicado é atualizado sempre que você cria/entra na liga; toque em "Atualizar" para ver rodadas e tabela.
- **Mercado**: anuncie cartas (lance mínimo + compre-já, 12h), dê lances e compre. A liquidação acontece quando cada um abre o mercado (reembolsos, créditos de venda com taxa de 5%, resgate de cartas).

## 5. (Opcional) Sorteios no servidor — plano Blaze

O modo padrão ("lite") roda os sorteios no cliente — ok entre amigos. Para o
anti-fraude completo da SPEC (pacotes/resultados/leilões no servidor):

1. Ative o plano **Blaze** no projeto (cartão; custo ~zero nessa escala).
2. ```bash
   cd squad-dynasty/functions && npm install && npm run deploy
   ```
3. No `.env` do app: `EXPO_PUBLIC_USE_FUNCTIONS=1`.

## Checklist de teste manual (2 aparelhos)

- [ ] Conectar em ambos (login anônimo) — nomes de técnico distintos no Perfil.
- [ ] A cria liga, B entra pelo código; ambos veem 2 membros.
- [ ] A joga a rodada 1; B vê o resultado na tabela após "Atualizar".
- [ ] B anuncia uma carta; A dá lance e compra; após atualizar dos dois lados, a carta mudou de dono e o vendedor recebeu 95% do valor.
- [ ] Desligar a rede: o resto do jogo (carreira, loja, draft) segue funcionando.
