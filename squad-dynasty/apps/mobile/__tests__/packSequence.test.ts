// Sequência de reveal do pacote: melhores por último, tiers e "NOVO".
import type { AnyAttributes, CardDefinition, CardVersion, Rarity } from '@squad-dynasty/engine';
import { buildRevealSequence, revealTier } from '../src/services/packSequence';

const def = (id: string, rarity: Rarity, version: CardVersion = 'base'): CardDefinition => ({
  id,
  basePlayerId: id,
  version,
  rarity,
  attributes: {} as AnyAttributes,
  frozen: version !== 'base',
});

const result = (cards: CardDefinition[]) => ({ cards, ownedIds: [], pityTriggered: null });

describe('packSequence', () => {
  it('tier por raridade/versão; cinemática só nas raríssimas', () => {
    expect(revealTier(def('a', 'common'))).toBe('normal');
    expect(revealTier(def('a', 'rare'))).toBe('rare');
    expect(revealTier(def('a', 'epic'))).toBe('big');
    expect(revealTier(def('a', 'rare', 'inform'))).toBe('big'); // TOTW frequente
    expect(revealTier(def('a', 'legendary'))).toBe('cinematic');
    expect(revealTier(def('a', 'icon', 'icon'))).toBe('cinematic');
    expect(revealTier(def('a', 'legendary', 'epic_moment'))).toBe('cinematic');
  });

  it('ordena melhores por último, com empates na ordem do sorteio (estável)', () => {
    const seq = buildRevealSequence(
      result([def('leg', 'legendary'), def('c1', 'common'), def('r1', 'rare'), def('c2', 'common')]),
      () => 1,
    );
    expect(seq.steps.map((s) => s.card.id)).toEqual(['c1', 'c2', 'r1', 'leg']);
    expect(seq.hasCinematic).toBe(true);
    expect(buildRevealSequence(result([def('c1', 'common')]), () => 1).hasCinematic).toBe(false);
  });

  it('isNew: primeira cópia é nova; duplicata (na coleção ou no próprio pacote) não é', () => {
    const counts: Record<string, number> = { fresh: 1, dupe: 3, twice: 2 };
    const seq = buildRevealSequence(
      result([def('fresh', 'common'), def('dupe', 'common'), def('twice', 'rare'), def('twice', 'rare')]),
      (id) => counts[id] ?? 0,
    );
    const byId = Object.fromEntries(seq.steps.map((s, i) => [`${s.card.id}-${i}`, s.isNew]));
    expect(seq.steps.find((s) => s.card.id === 'fresh')!.isNew).toBe(true); // 1 - 1 = 0 antes
    expect(seq.steps.find((s) => s.card.id === 'dupe')!.isNew).toBe(false); // já tinha 2
    // 'twice': 2 cópias vieram todas deste pacote → 1ª é nova, 2ª é duplicata
    const twice = seq.steps.filter((s) => s.card.id === 'twice');
    expect(twice.map((s) => s.isNew)).toEqual([true, false]);
    expect(Object.keys(byId)).toHaveLength(4);
  });
});
