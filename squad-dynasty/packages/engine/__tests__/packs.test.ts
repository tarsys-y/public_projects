import { CONFIG } from '../src/config';
import type { CardDefinition, Rarity } from '../src/models/player';
import { EMPTY_PITY, openPack, type PityState } from '../src/packs/packs';
import { mulberry32 } from '../src/rng';
import { outfield } from './helpers';

/** Pool sintético com cartas de todas as raridades. */
function pool(): CardDefinition[] {
  const cards: CardDefinition[] = [];
  const make = (rarity: Rarity, n: number, version: CardDefinition['version'] = 'base') => {
    for (let i = 0; i < n; i++) {
      cards.push({
        id: `${rarity}-${version}-${i}`,
        basePlayerId: `p-${rarity}-${i}`,
        version,
        rarity,
        attributes: outfield(70),
        frozen: version !== 'base',
      });
    }
  };
  make('common', 200);
  make('rare', 100);
  make('epic', 30);
  make('legendary', 10);
  make('epic', 5, 'epic_moment');
  make('legendary', 3, 'epic_moment');
  make('icon', 8, 'icon');
  return cards;
}

describe('openPack (SPEC 4.5)', () => {
  it('mesma seed ⇒ mesmo pacote', () => {
    const a = openPack(mulberry32(42), pool(), 'basic', EMPTY_PITY);
    const b = openPack(mulberry32(42), pool(), 'basic', EMPTY_PITY);
    expect(a.cards.map((c) => c.id)).toEqual(b.cards.map((c) => c.id));
  });

  it('básico tem 3 cartas com ≥1 rare+; premium 5 com ≥1 epic+', () => {
    const rank = (r: Rarity) => ['common', 'rare', 'epic', 'legendary', 'icon'].indexOf(r);
    for (let seed = 1; seed <= 200; seed++) {
      const basic = openPack(mulberry32(seed), pool(), 'basic', EMPTY_PITY);
      expect(basic.cards).toHaveLength(3);
      expect(Math.max(...basic.cards.map((c) => rank(c.rarity)))).toBeGreaterThanOrEqual(rank('rare'));
      const premium = openPack(mulberry32(seed), pool(), 'premium', EMPTY_PITY);
      expect(premium.cards).toHaveLength(5);
      expect(Math.max(...premium.cards.map((c) => rank(c.rarity)))).toBeGreaterThanOrEqual(rank('epic'));
    }
  });

  it('distribuição de raridades aproxima os pesos do config (10k cartas)', () => {
    const rng = mulberry32(7);
    const counts: Record<string, number> = {};
    let total = 0;
    for (let i = 0; i < 4000; i++) {
      // usa pity zerada para não distorcer a distribuição
      const { cards } = openPack(rng, pool(), 'basic', EMPTY_PITY);
      for (const c of cards) {
        counts[c.rarity] = (counts[c.rarity] ?? 0) + 1;
        total++;
      }
    }
    // a garantia de rare+ no básico infla 'rare'; common deve ficar abaixo do peso
    expect((counts.common ?? 0) / total).toBeLessThanOrEqual(CONFIG.packs.rarityWeights.common);
    expect((counts.common ?? 0) / total).toBeGreaterThan(0.5);
    // legendary e icon permanecem raros e próximos do configurado
    expect((counts.legendary ?? 0) / total).toBeLessThan(0.03);
    expect((counts.icon ?? 0) / total).toBeLessThan(0.005);
  });

  it('pity de legendary: o 40º pacote sem legendary+ garante', () => {
    let pity: PityState = { sinceLegendary: CONFIG.packs.legendaryPity - 1, sinceIcon: 0 };
    // procura uma seed cujo roll natural NÃO daria legendary (a maioria)
    const result = openPack(mulberry32(1), pool(), 'basic', pity);
    const rank = (r: Rarity) => ['common', 'rare', 'epic', 'legendary', 'icon'].indexOf(r);
    expect(Math.max(...result.cards.map((c) => rank(c.rarity)))).toBeGreaterThanOrEqual(rank('legendary'));
    expect(result.pity.sinceLegendary).toBe(0);
  });

  it('pity de icon: o 400º pacote sem icon garante', () => {
    const pity: PityState = { sinceLegendary: 0, sinceIcon: CONFIG.packs.iconPity - 1 };
    const result = openPack(mulberry32(1), pool(), 'basic', pity);
    expect(result.cards.some((c) => c.rarity === 'icon')).toBe(true);
    expect(result.pity.sinceIcon).toBe(0);
  });

  it('contadores de pity incrementam quando não vem legendary/icon', () => {
    // seed 1 do básico com pity zerada dificilmente dá legendary
    const result = openPack(mulberry32(1), pool(), 'basic', EMPTY_PITY);
    const gotLegendary = result.cards.some((c) => ['legendary', 'icon'].includes(c.rarity));
    if (!gotLegendary) {
      expect(result.pity.sinceLegendary).toBe(1);
      expect(result.pity.sinceIcon).toBe(1);
    }
  });

  it('cartas epic_moment só aparecem em raridades epic+', () => {
    const rng = mulberry32(11);
    for (let i = 0; i < 500; i++) {
      const { cards } = openPack(rng, pool(), 'premium', EMPTY_PITY);
      for (const c of cards) {
        if (c.version === 'epic_moment') {
          expect(['epic', 'legendary']).toContain(c.rarity);
        }
      }
    }
  });

  it('pool sem a raridade sorteada desce para a mais próxima', () => {
    const noLegendary = pool().filter((c) => c.rarity !== 'legendary' && c.rarity !== 'icon');
    const pity: PityState = { sinceLegendary: CONFIG.packs.legendaryPity - 1, sinceIcon: 0 };
    const result = openPack(mulberry32(3), noLegendary, 'basic', pity);
    expect(result.cards).toHaveLength(3); // não explode; degrada para epic
  });
});
