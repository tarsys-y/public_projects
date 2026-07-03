import { EVENTS, eventForDate, eventWeekKey, isoWeek, matchesTheme } from '../src/events/events';
import { openPack, EMPTY_PITY } from '../src/packs/packs';
import { mulberry32 } from '../src/rng';
import type { CardDefinition, Rarity } from '../src/models/player';
import { basePlayer, outfield } from './helpers';

describe('eventos semanais (rotação determinística)', () => {
  it('semana ISO correta e estável', () => {
    expect(isoWeek(new Date('2026-01-01T12:00:00Z'))).toBe(1);
    expect(isoWeek(new Date('2026-07-02T12:00:00Z'))).toBe(27);
    expect(eventWeekKey(new Date('2026-07-02T12:00:00Z'))).toBe('2026-W27');
  });

  it('mesma semana ⇒ mesmo evento; semanas seguidas rotacionam', () => {
    const monday = new Date('2026-07-06T09:00:00Z');
    const friday = new Date('2026-07-10T22:00:00Z');
    expect(eventForDate(monday).id).toBe(eventForDate(friday).id);
    const nextWeek = new Date('2026-07-13T09:00:00Z');
    expect(eventForDate(nextWeek).id).not.toBe(eventForDate(monday).id);
  });

  it('todos os eventos têm pacote e objetivos válidos', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(5);
    for (const event of EVENTS) {
      expect(event.pack.cards).toBeGreaterThan(0);
      // custos zerados no período de teste (Bloco 0) — economia real será definida depois
      expect(event.pack.costCoins + event.pack.costGems).toBeGreaterThanOrEqual(0);
      expect(event.objectives.length).toBeGreaterThanOrEqual(2);
      for (const o of event.objectives) {
        expect(o.target).toBeGreaterThan(0);
        expect(o.rewardCoins || o.rewardGems || o.rewardCardId).toBeTruthy();
      }
    }
  });

  it('matchesTheme filtra por liga, nação e ícones', () => {
    const brazilian = basePlayer({ leagueId: 'brasileirao', nationality: 'BR', clubId: 'flamengo' });
    const icon = basePlayer({ clubId: 'icons', leagueId: 'legends', nationality: 'BR' });
    const european = basePlayer({ leagueId: 'premier-league', nationality: 'EN', clubId: 'arsenal-fc' });
    expect(matchesTheme({ leagueIds: ['brasileirao'] }, brazilian)).toBe(true);
    expect(matchesTheme({ leagueIds: ['brasileirao'] }, european)).toBe(false);
    expect(matchesTheme({ iconsOnly: true }, icon)).toBe(true);
    expect(matchesTheme({ iconsOnly: true }, brazilian)).toBe(false);
    expect(matchesTheme({ nationalities: ['BR'] }, brazilian)).toBe(true);
    expect(matchesTheme({ nationalities: ['BR'] }, european)).toBe(false);
  });
});

describe('pacote com boost epic+ (pacote de evento)', () => {
  function pool(): CardDefinition[] {
    const cards: CardDefinition[] = [];
    const make = (rarity: Rarity, n: number) => {
      for (let i = 0; i < n; i++) {
        cards.push({
          id: `${rarity}-${i}`,
          basePlayerId: `p-${rarity}-${i}`,
          version: 'base',
          rarity,
          attributes: outfield(70),
          frozen: false,
        });
      }
    };
    make('common', 100);
    make('rare', 60);
    make('epic', 20);
    make('legendary', 8);
    make('icon', 5);
    return cards;
  }

  it('boost 4× rende significativamente mais epic+ que o pacote normal', () => {
    const rngA = mulberry32(1);
    const rngB = mulberry32(1);
    let normal = 0;
    let boosted = 0;
    const isEpicPlus = (r: Rarity) => ['epic', 'legendary', 'icon'].includes(r);
    for (let i = 0; i < 1500; i++) {
      for (const c of openPack(rngA, pool(), { cards: 3, guaranteedRarity: 'common' }, EMPTY_PITY).cards) {
        if (isEpicPlus(c.rarity)) normal++;
      }
      for (const c of openPack(
        rngB,
        pool(),
        { cards: 3, guaranteedRarity: 'common', epicPlusBoost: 4 },
        EMPTY_PITY,
      ).cards) {
        if (isEpicPlus(c.rarity)) boosted++;
      }
    }
    expect(boosted).toBeGreaterThan(normal * 2);
  });
});
