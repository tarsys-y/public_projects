// Aparência dos jogadores: curadoria real (packages/data/appearance.json,
// ~250 famosos) mesclada sobre o procedural determinístico por hash do id.
// Invariante: cada feição tem seu próprio salt — adicionar feições novas não
// muda as caras procedurais existentes; os salts antigos (skin, hair-color,
// hair-style, facial-hair) continuam decidindo os mesmos slots.
import { mulberry32 } from '@squad-dynasty/engine';
import type {
  Accessory,
  Appearance,
  Beard,
  EyeColor,
  EyeShape,
  FaceShape,
  HairColor,
  Hairline,
  HairStyle,
  Mouth,
  Nose,
} from '../../../../packages/data/appearance-taxonomy';
import appearanceJson from '../../../../packages/data/appearance.json';
import { hashString } from './leagueLogic';

export interface ResolvedAppearance {
  skinTone: number; // índice 0..7 (0 mais claro)
  faceShape: FaceShape;
  hair: { style: HairStyle; color: HairColor; hairline: Hairline };
  beard: Beard;
  eyes: { shape: EyeShape; color: EyeColor };
  nose: Nose;
  mouth: Mouth;
  accessories: Accessory[];
}

export interface KitColors {
  primary: string;
  secondary: string;
}

const CURATED = new Map<string, Appearance>(
  (appearanceJson as Appearance[]).map((a) => [a.playerId, a]),
);

/** Sorteio 0..1 independente por feição (salt) — ver invariante no topo. */
function roll(playerId: string, salt: string): number {
  return mulberry32(hashString(`${playerId}:${salt}`))();
}

function pickWeighted<T>(playerId: string, salt: string, options: Array<[T, number]>): T {
  const total = options.reduce((sum, [, weight]) => sum + weight, 0);
  let r = roll(playerId, salt) * total;
  for (const [value, weight] of options) {
    r -= weight;
    if (r <= 0) return value;
  }
  return options[options.length - 1]![0];
}

// Salts LEGADOS (não renomear — preservam as caras já conhecidas):
// 'skin', 'hair-color', 'hair-style', 'facial-hair'.
const HAIR_COLOR_WEIGHTS: Array<[HairColor, number]> = [
  ['black', 34],
  ['dark-brown', 22],
  ['brown', 16],
  ['light-brown', 10],
  ['blonde', 8],
  ['red', 5],
  ['gray', 5],
  // platinum/white só via curadoria — mantém o sorteio legado intacto
];

// Mapeia 1:1 os 6 estilos legados (mesma ordem/pesos do sorteio original)
// e agrega os novos com pesos pequenos no fim (salt novo, não perturba).
const LEGACY_HAIR_WEIGHTS: Array<[HairStyle, number]> = [
  ['short-straight', 34], // era 'short'
  ['buzz', 18],
  ['curly-high', 16], // era 'curly'
  ['long-straight', 12], // era 'long'
  ['samurai-bun', 12], // era 'topknot'
  ['bald', 8],
];

const EXTRA_HAIR_WEIGHTS: Array<[HairStyle | null, number]> = [
  [null, 58], // mantém o estilo legado
  ['buzz-fade', 9],
  ['crew', 7],
  ['wavy-medium', 6],
  ['curly-low', 5],
  ['fringe', 4],
  ['braids', 4],
  ['dreads', 3],
  ['ponytail', 2],
  ['mohawk', 1],
  ['balding', 1],
];

const BEARD_WEIGHTS: Array<[Beard, number]> = [
  ['none', 45],
  ['stubble', 25],
  ['full-short', 20], // era 'beard'
  ['mustache', 10],
];

const EXTRA_BEARD_WEIGHTS: Array<[Beard | null, number]> = [
  [null, 72], // mantém o sorteio legado
  ['goatee', 10],
  ['circle', 9],
  ['full-long', 5],
  ['chinstrap', 4],
];

export function proceduralAppearance(playerId: string): ResolvedAppearance {
  const legacyHair = pickWeighted(playerId, 'hair-style', LEGACY_HAIR_WEIGHTS);
  const extraHair = pickWeighted(playerId, 'hair-style-2', EXTRA_HAIR_WEIGHTS);
  const legacyBeard = pickWeighted(playerId, 'facial-hair', BEARD_WEIGHTS);
  const extraBeard = pickWeighted(playerId, 'facial-hair-2', EXTRA_BEARD_WEIGHTS);
  return {
    skinTone: Math.floor(roll(playerId, 'skin') * 6), // 0..5 (6..7 só curadoria)
    faceShape: pickWeighted(playerId, 'face-shape', [
      ['oval', 5],
      ['round', 3],
      ['square', 3],
    ]),
    hair: {
      style: extraHair ?? legacyHair,
      color: pickWeighted(playerId, 'hair-color', HAIR_COLOR_WEIGHTS),
      hairline: pickWeighted(playerId, 'hairline', [
        ['normal', 9],
        ['receding', 1],
      ]),
    },
    beard: extraBeard ?? legacyBeard,
    eyes: {
      shape: pickWeighted(playerId, 'eye-shape', [
        ['round', 5],
        ['narrow', 3],
        ['sharp', 2],
      ]),
      color: pickWeighted(playerId, 'eye-color', [
        ['dark', 5],
        ['brown', 3],
        ['green', 1],
        ['blue', 1],
      ]),
    },
    nose: pickWeighted(playerId, 'nose', [
      ['small', 3],
      ['medium', 5],
      ['wide', 2],
    ]),
    mouth: pickWeighted(playerId, 'mouth', [
      ['neutral', 6],
      ['smile', 4],
      // grin só via curadoria — é marca registrada, não sorteio
    ]),
    accessories: [
      ...(roll(playerId, 'acc-earring') < 0.08
        ? [pickWeighted<Accessory>(playerId, 'acc-earring-side', [
            ['earring-left', 1],
            ['earring-right', 1],
            ['earrings', 1],
          ])]
        : []),
      ...(roll(playerId, 'acc-chain') < 0.04 ? (['chain'] as Accessory[]) : []),
      ...(roll(playerId, 'acc-headband') < 0.02 ? (['headband'] as Accessory[]) : []),
    ],
  };
}

/** Merge: cada campo curado (traço real) sobrescreve o procedural. */
export function applyCurated(base: ResolvedAppearance, curated: Appearance): ResolvedAppearance {
  return {
    skinTone: curated.skinTone ?? base.skinTone,
    faceShape: curated.faceShape ?? base.faceShape,
    hair: {
      style: curated.hair?.style ?? base.hair.style,
      color: curated.hair?.color ?? base.hair.color,
      hairline: curated.hair?.hairline ?? base.hair.hairline,
    },
    beard: curated.beard ?? base.beard,
    eyes: {
      shape: curated.eyes?.shape ?? base.eyes.shape,
      color: curated.eyes?.color ?? base.eyes.color,
    },
    nose: curated.nose ?? base.nose,
    mouth: curated.mouth ?? base.mouth,
    // curado sem accessories = SEM acessórios: brinco/faixa sorteados são
    // traço forte demais para cair por acaso num rosto famoso
    accessories: curated.accessories ?? [],
  };
}

/** Aparência final: curadoria (appearance.json) sobre o procedural. */
export function resolveAppearance(playerId: string): ResolvedAppearance {
  const base = proceduralAppearance(playerId);
  const curated = CURATED.get(playerId);
  return curated ? applyCurated(base, curated) : base;
}

/** Quantos jogadores têm aparência curada (para testes/diagnóstico). */
export function curatedCount(): number {
  return CURATED.size;
}

export const ICON_KIT: KitColors = { primary: '#d4af37', secondary: '#1c1917' };
const FALLBACK_KIT: KitColors = { primary: '#334155', secondary: '#cbd5e1' };

export function kitColors(
  club: { primaryColor: string; secondaryColor: string } | undefined,
  isIcon = false,
): KitColors {
  if (isIcon) return ICON_KIT;
  if (!club) return FALLBACK_KIT;
  return { primary: club.primaryColor, secondary: club.secondaryColor };
}

