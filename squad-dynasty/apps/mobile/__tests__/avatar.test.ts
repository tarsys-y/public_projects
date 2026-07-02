// Avatares cartunescos: feições determinísticas por jogador + camisa do clube.
import { faceFeatures, kitColors, ICON_KIT } from '../src/services/avatar';

describe('avatar (artes das cartas)', () => {
  it('mesmo jogador ⇒ mesma cara, sempre', () => {
    expect(faceFeatures('neymar-jr')).toEqual(faceFeatures('neymar-jr'));
    expect(faceFeatures('vinicius-junior')).toEqual(faceFeatures('vinicius-junior'));
  });

  it('jogadores diferentes variam nas feições (sem cara clonada em massa)', () => {
    const sample = Array.from({ length: 200 }, (_, i) => faceFeatures(`player-${i}`));
    expect(new Set(sample.map((f) => f.hairStyle)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(sample.map((f) => f.skin)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(sample.map((f) => f.hairColor)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(sample.map((f) => f.facialHair)).size).toBeGreaterThanOrEqual(3);
  });

  it('feições sempre saem dos catálogos válidos', () => {
    const hairStyles = ['bald', 'buzz', 'short', 'curly', 'long', 'topknot'];
    const facial = ['none', 'stubble', 'mustache', 'beard'];
    for (let i = 0; i < 50; i++) {
      const f = faceFeatures(`check-${i}`);
      expect(hairStyles).toContain(f.hairStyle);
      expect(facial).toContain(f.facialHair);
      expect(f.skin).toMatch(/^#[0-9a-f]{6}$/);
      expect(f.hairColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(f.skinShade).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('camisa usa as cores reais do clube; ícones vestem o kit dourado', () => {
    const club = { primaryColor: '#c52613', secondaryColor: '#000000' }; // Flamengo
    expect(kitColors(club)).toEqual({ primary: '#c52613', secondary: '#000000' });
    expect(kitColors(club, true)).toEqual(ICON_KIT);
    expect(kitColors(undefined, true)).toEqual(ICON_KIT);
    const fallback = kitColors(undefined);
    expect(fallback.primary).toMatch(/^#/);
    expect(fallback.primary).not.toBe(fallback.secondary);
  });
});
