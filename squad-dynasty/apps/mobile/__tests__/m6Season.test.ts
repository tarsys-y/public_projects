// Aceite M6: completar uma temporada inteira da carreira PvE e ver as cartas
// envelhecendo, a premiação por colocação e a nova temporada começando.
import { useCareerStore } from '../src/stores/careerStore';
import { ownedCardsMap, useCollectionStore } from '../src/stores/collectionStore';
import { useEconomyStore } from '../src/stores/economyStore';
import { useMatchStore } from '../src/stores/matchStore';
import { useSquadStore } from '../src/stores/squadStore';
import { toSquad } from '../src/stores/squadLogic';
import { fillDraft } from './helpers';

jest.setTimeout(180_000);

describe('aceite M6: temporada completa da carreira', () => {
  beforeAll(() => {
    useCollectionStore.getState().reset();
    useEconomyStore.getState().reset();
    useMatchStore.getState().reset();
    useCollectionStore.getState().seedDemoCollection();
    // escala um 11 completo do Flamengo/Palmeiras para o modo carreira
    const collection = ownedCardsMap(useCollectionStore.getState());
    const draft = fillDraft(collection);
    useSquadStore.setState({ draft });
  });

  it('inicia a carreira com calendário de 38 rodadas (20 clubes do Brasileirão)', () => {
    useCareerStore.getState().startCareer('flamengo', 123);
    const career = useCareerStore.getState();
    expect(career.active).toBe(true);
    expect(career.leagueId).toBe('brasileirao');
    expect(career.fixtures).toHaveLength(380);
    expect(Math.max(...career.fixtures.map((f) => f.round))).toBe(38);
    expect(career.userFixture()?.round).toBe(1);
  });

  it('jogar ao vivo uma rodada registra o resultado e avança', () => {
    const started = useCareerStore.getState().playUserMatch();
    expect(started).toBe(true);
    expect(useMatchStore.getState().mode).toBe('career');
    // avança o playback até o fim
    let guard = 0;
    const match = useMatchStore.getState;
    while (match().phase !== 'finished' && guard++ < 500) {
      if (match().phase === 'decision') match().decide(match().pendingDecision!.options[0]!.id);
      match().advance(5);
    }
    useCareerStore.getState().consumeUserResult();
    const career = useCareerStore.getState();
    expect(career.round).toBe(2);
    expect(career.results).toHaveLength(10); // rodada completa (user + 9 da IA)
    const standings = career.standings();
    expect(standings.reduce((s, r) => s + r.played, 0)).toBe(20);
  });

  it('simula até o fim da temporada: premiação, envelhecimento e nova temporada', () => {
    const coinsBefore = useEconomyStore.getState().coins;
    const agesBefore = new Map(
      Object.values(useCollectionStore.getState().ownedCards).map((o) => [o.id, o.age]),
    );

    let guard = 0;
    while (useCareerStore.getState().season === 1 && guard++ < 40) {
      useCareerStore.getState().simulateUserMatch();
    }

    const career = useCareerStore.getState();
    expect(career.season).toBe(2);
    expect(career.round).toBe(1);
    expect(career.results).toHaveLength(0); // nova temporada zera
    expect(career.fixtures).toHaveLength(380); // novo calendário

    // premiação por colocação creditada
    const summary = career.lastSummary!;
    expect(summary).not.toBeNull();
    expect(summary.placement).toBeGreaterThanOrEqual(1);
    expect(summary.placement).toBeLessThanOrEqual(20);
    expect(summary.prizeCoins).toBeGreaterThan(0);
    expect(useEconomyStore.getState().coins).toBeGreaterThan(coinsBefore);
    expect(career.history).toHaveLength(1);

    // envelhecimento: cartas não-congeladas ganharam +1 ano
    const owned = Object.values(useCollectionStore.getState().ownedCards);
    const aged = owned.filter((o) => (agesBefore.get(o.id) ?? 0) + 1 === o.age);
    expect(aged.length).toBeGreaterThan(owned.length * 0.8); // maioria envelhece (frozen não)
    // e o resumo registra mudanças de atributo ou aposentadorias
    expect(Array.isArray(summary.aging)).toBe(true);
  });

  it('a segunda temporada continua jogável', () => {
    expect(useCareerStore.getState().userFixture()).not.toBeNull();
    useCareerStore.getState().simulateUserMatch();
    expect(useCareerStore.getState().round).toBe(2);
  });
});
