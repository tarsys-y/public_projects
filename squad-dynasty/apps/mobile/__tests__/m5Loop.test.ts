// Aceite M5: loop completo offline — jogar → ganhar moedas → abrir pacote →
// evoluir carta → escalar. Exercita os stores reais (AsyncStorage mockado).
import { CONFIG } from '@squad-dynasty/engine';
import { CATALOG, cardById } from '../src/services/catalog';
import { ownedCardsMap, useCollectionStore } from '../src/stores/collectionStore';
import { useEconomyStore } from '../src/stores/economyStore';
import { useMatchStore } from '../src/stores/matchStore';
import { useObjectivesStore, DAILY_OBJECTIVES } from '../src/stores/objectivesStore';
import { usePacksStore } from '../src/stores/packsStore';
import { resolveDraft, toSquad } from '../src/stores/squadLogic';
import { fillDraft } from './helpers';

function playToEnd() {
  const store = useMatchStore.getState;
  let guard = 0;
  while (store().phase !== 'finished' && guard++ < 500) {
    if (store().phase === 'decision') {
      store().decide(store().pendingDecision!.options[0]!.id);
    }
    store().advance(5);
  }
}

describe('aceite M5: loop jogar → ganhar → abrir → evoluir → escalar', () => {
  beforeEach(() => {
    useCollectionStore.getState().reset();
    useEconomyStore.getState().reset();
    usePacksStore.getState().reset();
    useMatchStore.getState().reset();
    useCollectionStore.getState().seedDemoCollection();
  });

  it('completa o ciclo inteiro offline', () => {
    // 1. JOGAR: amistoso contra IA até o fim
    const collection = ownedCardsMap(useCollectionStore.getState());
    const draft = fillDraft(collection);
    useMatchStore.getState().startFriendly(toSquad(draft), collection, 'botafogo', 42);
    const coinsBefore = useEconomyStore.getState().coins;
    playToEnd();

    // 2. GANHAR: recompensa creditada + objetivo de jogar progrediu
    const reward = useMatchStore.getState().reward;
    expect(reward).not.toBeNull();
    expect(reward!.coins).toBeGreaterThanOrEqual(CONFIG.economy.matchCoins.loss);
    expect(useEconomyStore.getState().coins).toBe(coinsBefore + reward!.coins);
    expect(useObjectivesStore.getState().progress.play1).toBeGreaterThanOrEqual(1);
    const claimed = useObjectivesStore.getState().claim('play1');
    expect(claimed).toBe(true);
    const objective = DAILY_OBJECTIVES.find((o) => o.id === 'play1')!;
    expect(useEconomyStore.getState().coins).toBe(coinsBefore + reward!.coins + objective.rewardCoins);

    // 3. ABRIR: pacote básico debita coins, entrega 3 cartas e conta pity
    const cardsBefore = Object.keys(useCollectionStore.getState().ownedCards).length;
    const coinsBeforePack = useEconomyStore.getState().coins;
    const opening = usePacksStore.getState().buyAndOpen('basic', 7);
    expect(opening).not.toBeNull();
    expect(opening!.cards).toHaveLength(CONFIG.packs.types.basic.cards);
    expect(useEconomyStore.getState().coins).toBe(
      coinsBeforePack - CONFIG.packs.types.basic.costCoins,
    );
    expect(Object.keys(useCollectionStore.getState().ownedCards).length).toBe(
      cardsBefore + opening!.cards.length,
    );
    const pity = usePacksStore.getState().pity;
    expect(pity.sinceIcon + pity.sinceLegendary).toBeGreaterThanOrEqual(0);
    expect(usePacksStore.getState().totalOpened).toBe(1);

    // 4. EVOLUIR: cria uma duplicata de uma carta escalada e evolui
    const anyOwned = Object.values(useCollectionStore.getState().ownedCards)[0]!;
    useCollectionStore.getState().grantCard(anyOwned.cardDefId); // duplicata
    const outcome = useCollectionStore.getState().evolveCard(anyOwned.id);
    expect(outcome).toBe('ok');
    const evolved = useCollectionStore.getState().ownedCards[anyOwned.id]!;
    expect(evolved.evolutionLevel).toBe(1);
    expect(Object.keys(evolved.attributeDeltas).length).toBeGreaterThan(0);

    // 5. ESCALAR: a carta evoluída entra no time e o overall derivado reflete
    const collectionAfter = ownedCardsMap(useCollectionStore.getState());
    const card = cardById.get(evolved.cardDefId)!;
    const isGk = 'reflexes' in card.attributes;
    const slotIndex = isGk ? 0 : 9;
    let draftAfter = fillDraft(collectionAfter);
    const { assignCard } = require('../src/stores/squadLogic');
    draftAfter = assignCard(draftAfter, slotIndex, evolved.id);
    const view = resolveDraft(draftAfter, collectionAfter, CATALOG);
    const slot = view.slots[slotIndex]!;
    expect(slot.player?.ownedCardId).toBe(evolved.id);
    expect(slot.player?.overall).toBeGreaterThan(0);
  });

  it('saldo insuficiente não abre pacote nem debita', () => {
    useEconomyStore.getState().reset();
    useEconomyStore.getState().spend({ coins: 2000 }); // deixa 1000 (< 1500)
    const opening = usePacksStore.getState().buyAndOpen('basic', 1);
    expect(opening).toBeNull();
    expect(useEconomyStore.getState().coins).toBe(1000);
  });
});
