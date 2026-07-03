// Integração das novas features: eventos semanais, TOTW dinâmico, copa,
// forma, treino, SBC e Draft.
import { eventForDate, SBC_CHALLENGES, validateSbc, type ResolvedSlot } from '@squad-dynasty/engine';
import { getAllCards, getCatalog, getCardById, cardOverall, playerById } from '../src/services/catalog';
import { useCareerStore } from '../src/stores/careerStore';
import { ownedCardsMap, useCollectionStore } from '../src/stores/collectionStore';
import { useDraftStore, DRAFT_ENTRY_COINS } from '../src/stores/draftStore';
import { useDynamicCardsStore } from '../src/stores/dynamicCardsStore';
import { useEconomyStore } from '../src/stores/economyStore';
import { useEventsStore } from '../src/stores/eventsStore';
import { useMatchStore } from '../src/stores/matchStore';
import { useSquadStore } from '../src/stores/squadStore';
import { resolveDraft } from '../src/stores/squadLogic';
import { fillDraft } from './helpers';

jest.setTimeout(180_000);

function setupCollectionAndSquad() {
  useCollectionStore.getState().reset();
  useEconomyStore.getState().reset();
  useMatchStore.getState().reset();
  useDynamicCardsStore.getState().reset();
  useCollectionStore.getState().seedDemoCollection();
  const collection = ownedCardsMap(useCollectionStore.getState());
  useSquadStore.setState({ draft: fillDraft(collection) });
}

describe('TOTW dinâmico + eventos na carreira', () => {
  beforeAll(() => {
    setupCollectionAndSquad();
    useCareerStore.getState().startCareer('flamengo', 777);
  });

  it('rodada simulada gera cartas "Em Alta" no catálogo dinâmico', () => {
    expect(useDynamicCardsStore.getState().list()).toHaveLength(0);
    useCareerStore.getState().simulateUserMatch();
    const dynamic = useDynamicCardsStore.getState();
    expect(dynamic.list().length).toBeGreaterThanOrEqual(8); // XI da rodada (quotas por setor)
    expect(dynamic.latestTotwIds.length).toBeGreaterThan(0);
    const inform = dynamic.list()[0]!;
    expect(inform.version).toBe('inform');
    expect(inform.frozen).toBe(true);
    // resolve pelo catálogo mesclado
    expect(getCardById(inform.id)).toBeDefined();
    expect(getAllCards().some((c) => c.id === inform.id)).toBe(true);
  });

  it('forma registra notas recentes após a rodada jogada ao vivo', () => {
    const started = useCareerStore.getState().playUserMatch();
    expect(started).toBe(true);
    const match = useMatchStore.getState;
    let guard = 0;
    while (match().phase !== 'finished' && guard++ < 500) {
      if (match().phase === 'decision') match().decide(match().pendingDecision!.options[0]!.id);
      match().advance(5);
    }
    useCareerStore.getState().consumeUserResult();
    const ratings = useCareerStore.getState().recentRatings;
    expect(Object.keys(ratings).length).toBeGreaterThanOrEqual(11);
    const form = useCareerStore.getState().formOf(Object.keys(ratings)[0]!);
    expect(form).toBeGreaterThanOrEqual(0.95);
    expect(form).toBeLessThanOrEqual(1.05);
  });

  it('copa: fase pendente aparece após a rodada 8 e resolve com o jogo do usuário', () => {
    let guard = 0;
    while (useCareerStore.getState().round <= 8 && guard++ < 20) {
      useCareerStore.getState().simulateUserMatch();
    }
    const s = useCareerStore.getState();
    expect(s.cup).not.toBeNull();
    if (s.cup!.userAlive && s.cup!.pending) {
      const match = s.currentMatch();
      expect(match?.type).toBe('cup');
      const aliveBefore = s.cup!.alive.length;
      useCareerStore.getState().simulateUserMatch();
      const after = useCareerStore.getState().cup!;
      expect(after.alive.length).toBe(aliveBefore / 2);
      expect(after.pending).toBe(false);
    }
  });

  it('evento da semana: pacote temático só entrega cartas do tema (ou Em Alta)', () => {
    useEconomyStore.getState().earn({ coins: 50000, gems: 500 });
    const events = useEventsStore.getState();
    const event = events.currentEvent();
    expect(event).toBe(eventForDate(new Date()));
    const opening = events.buyEventPack(42);
    expect(opening).not.toBeNull();
    const latestTotw = new Set(useDynamicCardsStore.getState().latestTotwIds);
    for (const card of opening!.cards) {
      const okTheme =
        latestTotw.has(card.id) ||
        (() => {
          const catalog = getCatalog();
          const player = catalog.players.get(card.basePlayerId)!;
          const t = event.theme;
          if (t.iconsOnly) return player.clubId === 'icons';
          if (t.leagueIds) return t.leagueIds.includes(player.leagueId);
          if (t.nationalities) return t.nationalities.includes(player.nationality);
          return true;
        })();
      expect(okTheme).toBe(true);
    }
  });

  it('objetivo de evento resgatável paga carta exclusiva', () => {
    const events = useEventsStore.getState();
    const event = events.currentEvent();
    const withCard = event.objectives.find((o) => o.rewardCardId);
    if (!withCard) return;
    useEventsStore.setState({ progress: { [withCard.id]: withCard.target } });
    const before = Object.values(useCollectionStore.getState().ownedCards).length;
    expect(useEventsStore.getState().claim(withCard.id)).toBe(true);
    expect(Object.values(useCollectionStore.getState().ownedCards).length).toBe(before + 1);
    expect(useEventsStore.getState().claim(withCard.id)).toBe(false); // não resgata 2×
  });
});

describe('SBC', () => {
  it('validação + consumo de cartas + recompensa (fluxo do desafio BR)', () => {
    setupCollectionAndSquad();
    const challenge = SBC_CHALLENGES.find((c) => c.id === 'aco-brasileiro')!;
    // desafio exige liga brasileirao; a coleção demo (Master Liga FC) é liga "legends" —
    // isola aqui uma coleção só com cartas reais do Brasileirão overall ≥72.
    useCollectionStore.getState().reset();
    for (const card of getAllCards()) {
      if (card.version !== 'base') continue;
      const player = playerById.get(card.basePlayerId);
      if (player?.leagueId === 'brasileirao' && cardOverall(card) >= 72) {
        useCollectionStore.getState().grantCard(card.id);
      }
    }
    const collection = ownedCardsMap(useCollectionStore.getState());
    const draft = fillDraft(collection, challenge.formation);
    const view = resolveDraft(draft, collection, getCatalog());
    expect(view.isComplete).toBe(true);
    const slots: ResolvedSlot[] = view.slots.map((s, i) => ({
      position: s.position as ResolvedSlot['position'],
      role: draft.slots[i]!.role,
      player: s.player!,
    }));
    const validation = validateSbc(challenge.formation, slots, challenge.requirements);
    expect(validation.ok).toBe(true); // agora montado com cartas reais do Brasileirão 72+

    // consumo: entregar as 11 remove da coleção
    const ids = draft.slots.map((s) => s.ownedCardId!).filter(Boolean);
    const before = Object.keys(useCollectionStore.getState().ownedCards).length;
    useCollectionStore.getState().consumeCards(ids);
    expect(Object.keys(useCollectionStore.getState().ownedCards).length).toBe(before - 11);
  });
});

describe('Draft', () => {
  it('fluxo completo: entrada, 11 escolhas, gauntlet e prêmio', () => {
    setupCollectionAndSquad();
    useDraftStore.getState().reset();
    const coinsBefore = useEconomyStore.getState().coins;
    expect(useDraftStore.getState().startDraft(99)).toBe(true);
    expect(useEconomyStore.getState().coins).toBe(coinsBefore - DRAFT_ENTRY_COINS);

    let guard = 0;
    while (useDraftStore.getState().phase === 'picking' && guard++ < 15) {
      const s = useDraftStore.getState();
      expect(s.choices.length).toBeGreaterThanOrEqual(3);
      s.choose(s.choices[0]!);
    }
    expect(useDraftStore.getState().phase).toBe('gauntlet');
    expect(useDraftStore.getState().picks).toHaveLength(11);

    guard = 0;
    while (useDraftStore.getState().phase === 'gauntlet' && guard++ < 6) {
      const entry = useDraftStore.getState().playNextMatch();
      expect(entry).not.toBeNull();
    }
    expect(useDraftStore.getState().phase).toBe('done');
    const beforeClaim = useEconomyStore.getState().coins;
    const reward = useDraftStore.getState().claimRewards();
    expect(reward).not.toBeNull();
    expect(useEconomyStore.getState().coins).toBe(beforeClaim + reward!.coins);
    expect(useDraftStore.getState().claimRewards()).toBeNull(); // sem double-claim
  });
});
