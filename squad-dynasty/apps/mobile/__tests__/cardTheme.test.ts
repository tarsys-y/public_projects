// Temas visuais das cartas (estilo UT) + flavor text + bandeiras emoji.
import type { AnyAttributes, CardDefinition, CardVersion, Rarity } from '@squad-dynasty/engine';
import { CARD_DIMENSIONS, cardTheme, momentText } from '../src/services/cardTheme';
import { flagEmoji } from '../src/services/flags';

const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'icon'];
const VERSIONS: CardVersion[] = ['base', 'inform', 'epic_moment', 'icon'];

describe('cardTheme', () => {
  it('versão especial vence a raridade; base segue a raridade', () => {
    expect(cardTheme('inform', 'rare').key).toBe('inform');
    expect(cardTheme('inform', 'legendary').key).toBe('inform');
    expect(cardTheme('epic_moment', 'legendary').key).toBe('epic-moment');
    expect(cardTheme('icon', 'icon').key).toBe('icon');
    for (const rarity of RARITIES) {
      expect(cardTheme('base', rarity).key).toBe(rarity);
    }
  });

  it('toda combinação tem gradientes válidos e cores hex/rgba', () => {
    const hexOrRgba = /^(#[0-9a-f]{6}|rgba?\([\d ,.]+\))$/i;
    for (const version of VERSIONS) {
      for (const rarity of RARITIES) {
        const t = cardTheme(version, rarity);
        expect(t.bg.stops.length).toBeGreaterThanOrEqual(2);
        for (const s of [...t.bg.stops, ...t.frame.stops, ...(t.bgRadial?.stops ?? [])]) {
          expect(s.color).toMatch(hexOrRgba);
          expect(s.offset).toBeGreaterThanOrEqual(0);
          expect(s.offset).toBeLessThanOrEqual(1);
        }
        expect(t.frame.innerLine).toMatch(hexOrRgba);
        expect(t.glow).toMatch(hexOrRgba);
        expect(t.sheenOpacity).toBeGreaterThan(0);
      }
    }
  });

  it('cinemática é exclusiva de legendary, icon e epic_moment', () => {
    const cinematic = new Set<string>();
    for (const version of VERSIONS) {
      for (const rarity of RARITIES) {
        if (cardTheme(version, rarity).cinematic) cinematic.add(cardTheme(version, rarity).key);
      }
    }
    expect([...cinematic].sort()).toEqual(['epic-moment', 'icon', 'legendary']);
    expect(cardTheme('inform', 'legendary').cinematic).toBe(false);
  });

  it('sweep animado só nas versões/raridades de topo', () => {
    expect(cardTheme('base', 'common').animatedSheen).toBe(false);
    expect(cardTheme('base', 'rare').animatedSheen).toBe(false);
    expect(cardTheme('base', 'epic').animatedSheen).toBe(false);
    expect(cardTheme('base', 'legendary').animatedSheen).toBe(true);
    expect(cardTheme('icon', 'icon').animatedSheen).toBe(true);
    expect(cardTheme('inform', 'rare').animatedSheen).toBe(true);
    expect(cardTheme('epic_moment', 'legendary').animatedSheen).toBe(true);
  });

  it('dimensões mantêm proporção e escala coerentes', () => {
    const { sm, md, lg } = CARD_DIMENSIONS;
    expect(md).toEqual({ width: 104, height: 176, scale: 1 });
    for (const size of [sm, md, lg]) {
      expect(size.width / md.width).toBeCloseTo(size.scale, 1);
      expect(size.height / size.width).toBeGreaterThan(1.4); // retrato
    }
    expect(lg.width).toBeGreaterThan(md.width);
  });
});

describe('momentText', () => {
  const card = (over: Partial<CardDefinition>): CardDefinition => ({
    id: 'x',
    basePlayerId: 'x',
    version: 'base',
    rarity: 'legendary',
    attributes: {} as AnyAttributes,
    frozen: false,
    ...over,
  });

  it('usa o moment curado quando existe', () => {
    expect(momentText(card({ moment: 'O milagre de Istambul.' }), 'Gerrard')).toBe(
      'O milagre de Istambul.',
    );
  });

  it('fallbacks por versão cobrem cartas sem texto (TOTW dinâmica etc.)', () => {
    expect(momentText(card({ version: 'inform' }), 'Pedro')).toContain('Pedro');
    expect(momentText(card({ version: 'icon' }), 'Pelé')).toContain('lenda');
    expect(momentText(card({ version: 'epic_moment', label: 'Copa 1970' }), 'Pelé')).toBe('Copa 1970');
    expect(momentText(card({}), 'Alguém').length).toBeGreaterThan(10);
  });
});

describe('flagEmoji', () => {
  it('ISO2 vira regional indicators', () => {
    expect(flagEmoji('BR')).toBe('🇧🇷');
    expect(flagEmoji('ar')).toBe('🇦🇷');
    expect(flagEmoji('FR')).toBe('🇫🇷');
  });

  it('home nations usam tag sequences; NI cai no Reino Unido', () => {
    expect(flagEmoji('EN')).toBe('🏴󠁧󠁢󠁥󠁮󠁧󠁿');
    expect(flagEmoji('SC')).toBe('🏴󠁧󠁢󠁳󠁣󠁴󠁿');
    expect(flagEmoji('WL')).toBe('🏴󠁧󠁢󠁷󠁬󠁳󠁿');
    expect(flagEmoji('NI')).toBe('🇬🇧');
  });

  it('entrada inválida retorna vazio', () => {
    expect(flagEmoji('')).toBe('');
    expect(flagEmoji('BRA')).toBe('');
    expect(flagEmoji('1X')).toBe('');
  });
});
