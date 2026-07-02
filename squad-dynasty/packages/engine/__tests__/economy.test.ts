import { CONFIG } from '../src/config';
import { applyEvolution, evolutionCost, evolutionKeyAttributes, matchReward } from '../src/economy/economy';
import { simulateMatch } from '../src/sim/simulate';
import { computeOverall } from '../src/overall';
import { applyDeltas } from '../src/resolve';
import { ownedCard, cardDef, basePlayer, outfield, gk } from './helpers';
import { uniformSquad } from './simHelpers';

describe('matchReward (SPEC 6)', () => {
  it('paga 400/200/100 conforme o resultado + bônus de desempenho ≥0', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const result = simulateMatch({
        home: uniformSquad(85, 'h'),
        away: uniformSquad(75, 'a'),
        seed,
        homeController: 'ai',
        awayController: 'ai',
      });
      const [h, a] = result.score;
      const reward = matchReward(result, 'home');
      const expectedBase =
        h > a ? CONFIG.economy.matchCoins.win : h === a ? CONFIG.economy.matchCoins.draw : CONFIG.economy.matchCoins.loss;
      expect(reward.base).toBe(expectedBase);
      expect(reward.performanceBonus).toBeGreaterThanOrEqual(0);
      expect(reward.performanceBonus).toBeLessThanOrEqual(CONFIG.economy.performanceBonusMax);
      expect(reward.coins).toBe(reward.base + reward.performanceBonus);
    }
  });
});

describe('evolução (SPEC 4.6)', () => {
  it('custos por nível: duplicatas 1,1,2,2,3,3 + coins crescentes; nível 6 = teto', () => {
    expect(evolutionCost(0)).toEqual({ duplicates: 1, coins: 400 });
    expect(evolutionCost(2)).toEqual({ duplicates: 2, coins: 900 });
    expect(evolutionCost(5)).toEqual({ duplicates: 3, coins: 2400 });
    expect(evolutionCost(6)).toBeNull();
  });

  it('applyEvolution acumula deltas nos atributos-chave e sobe o overall derivado', () => {
    const player = basePlayer({ positions: ['ST'], attributes: outfield(75) });
    const card = cardDef(player);
    let owned = ownedCard(card);
    const before = computeOverall(applyDeltas(card.attributes, owned.attributeDeltas), 'ST');
    owned = applyEvolution(owned, 'ST', false);
    expect(owned.evolutionLevel).toBe(1);
    const after = computeOverall(applyDeltas(card.attributes, owned.attributeDeltas), 'ST');
    expect(after).toBeGreaterThan(before);
    // atributos-chave do ST incluem finishing
    expect(evolutionKeyAttributes('ST', false)).toContain('finishing');
    expect((owned.attributeDeltas as Record<string, number>).finishing).toBe(
      CONFIG.economy.evolutionDeltaPerLevel,
    );
  });

  it('goleiro evolui pelos atributos de goleiro', () => {
    const player = basePlayer({ positions: ['GK'], attributes: gk(75) });
    const card = cardDef(player);
    let owned = ownedCard(card);
    owned = applyEvolution(owned, 'GK', true);
    expect((owned.attributeDeltas as Record<string, number>).reflexes).toBeDefined();
  });

  it('não evolui além do nível máximo', () => {
    const player = basePlayer({ positions: ['ST'] });
    let owned = ownedCard(cardDef(player));
    for (let i = 0; i < 10; i++) owned = applyEvolution(owned, 'ST', false);
    expect(owned.evolutionLevel).toBe(CONFIG.evolution.maxLevel);
  });
});
