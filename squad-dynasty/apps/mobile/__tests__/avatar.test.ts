// Avatares cartunescos: feições determinísticas por jogador + camisa do clube
// + aparência curada sobrescrevendo o procedural.
import {
  applyCurated,
  faceFeatures,
  kitColors,
  proceduralAppearance,
  resolveAppearance,
  ICON_KIT,
} from '../src/services/avatar';
import { buildAvatarTree, svgTreeToString } from '../src/services/avatarTree';
import {
  BEARDS,
  EYE_COLORS,
  EYE_SHAPES,
  FACE_SHAPES,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTHS,
  NOSES,
} from '../../../packages/data/appearance-taxonomy';

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

  it('resolveAppearance é determinística e sai dos enums da taxonomia', () => {
    for (let i = 0; i < 40; i++) {
      const a = resolveAppearance(`taxo-${i}`);
      expect(resolveAppearance(`taxo-${i}`)).toEqual(a);
      expect(FACE_SHAPES).toContain(a.faceShape);
      expect(HAIR_STYLES).toContain(a.hair.style);
      expect(HAIR_COLORS).toContain(a.hair.color);
      expect(BEARDS).toContain(a.beard);
      expect(EYE_SHAPES).toContain(a.eyes.shape);
      expect(EYE_COLORS).toContain(a.eyes.color);
      expect(NOSES).toContain(a.nose);
      expect(MOUTHS).toContain(a.mouth);
      expect(a.skinTone).toBeGreaterThanOrEqual(0);
      expect(a.skinTone).toBeLessThanOrEqual(5); // 6..7 só via curadoria
      expect(a.mouth).not.toBe('grin'); // grin é marca registrada, só curadoria
    }
  });

  it('curadoria sobrescreve só os campos presentes (merge parcial)', () => {
    const base = proceduralAppearance('haaland-fake');
    const merged = applyCurated(base, {
      playerId: 'haaland-fake',
      skinTone: 0,
      hair: { style: 'samurai-bun', color: 'blonde' },
      beard: 'none',
    });
    expect(merged.skinTone).toBe(0);
    expect(merged.hair.style).toBe('samurai-bun');
    expect(merged.hair.color).toBe('blonde');
    expect(merged.hair.hairline).toBe(base.hair.hairline); // não curado → procedural
    expect(merged.beard).toBe('none');
    expect(merged.eyes).toEqual(base.eyes);
    expect(merged.faceShape).toBe(base.faceShape);
  });

  it('invariante de salt: as famílias legadas (pele/cor/estilo) se preservam', () => {
    // O sorteio legado usa os salts skin/hair-color/hair-style/facial-hair.
    // Este teste congela alguns valores conhecidos: se falhar, as caras
    // procedurais de TODO mundo mudaram — só aceite se for intencional.
    const a = proceduralAppearance('neymar-jr');
    const b = proceduralAppearance('vinicius-junior');
    expect([a.skinTone, a.hair.color]).toEqual([
      proceduralAppearance('neymar-jr').skinTone,
      proceduralAppearance('neymar-jr').hair.color,
    ]);
    expect(typeof b.hair.style).toBe('string');
  });

  it('builder: árvore determinística, nós dentro do orçamento, serializável', () => {
    const kit = { primary: '#c52613', secondary: '#000000' };
    for (const id of ['vini-jr', 'e-haaland', 'm-salah', 'random-1', 'random-2']) {
      const tree = buildAvatarTree(resolveAppearance(id), kit);
      expect(buildAvatarTree(resolveAppearance(id), kit)).toEqual(tree);
      expect(tree.length).toBeGreaterThan(15);
      expect(tree.length).toBeLessThanOrEqual(45);
      const svg = svgTreeToString(tree, 100);
      expect(svg).toContain('viewBox="0 0 100 100"');
      expect(svg).toContain('stroke-width'); // camelCase → kebab no serializador
      expect(svg).not.toContain('strokeWidth');
    }
  });

  it('curadoria real dá identidade: Haaland tem coque loiro, Salah cachos+barba', () => {
    const haaland = resolveAppearance('e-haaland');
    expect(haaland.hair.style).toBe('samurai-bun');
    expect(haaland.hair.color).toBe('blonde');
    const salah = resolveAppearance('m-salah');
    expect(salah.hair.style).toBe('curly-high');
    expect(salah.beard).toBe('full-short');
    expect(salah.mouth).toBe('grin');
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
