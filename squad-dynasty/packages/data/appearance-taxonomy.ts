// Taxonomia de aparência dos avatares (fonte única, compartilhada pelo app e
// pelos scripts de dados). É vocabulário de DADOS: os hex/geometria de cada
// valor vivem no catálogo de render (apps/mobile/src/services/avatarTree.ts).
// Aparência não é regra de jogo — fica fora do engine de propósito.

export const FACE_SHAPES = ['oval', 'round', 'square'] as const;
export type FaceShape = (typeof FACE_SHAPES)[number];

export const HAIR_STYLES = [
  'bald', // careca total
  'balding', // calvície padrão (coroa + laterais)
  'buzz', // raspado uniforme
  'buzz-fade', // degradê: laterais quase zero, topo curto
  'crew', // crew cut / social arrumado
  'short-straight', // curto liso
  'wavy-medium', // ondulado médio
  'fringe', // franja caída na testa
  'curly-high', // afro/cacheado alto
  'curly-low', // cacheado baixo
  'braids', // tranças coladas
  'dreads', // dreads médios
  'samurai-bun', // coque samurai
  'ponytail', // rabo de cavalo baixo
  'mohawk', // moicano/topete alto com laterais raspadas
  'long-straight', // longo liso solto
] as const;
export type HairStyle = (typeof HAIR_STYLES)[number];

export const HAIRLINES = ['normal', 'receding'] as const;
export type Hairline = (typeof HAIRLINES)[number];

export const HAIR_COLORS = [
  'black',
  'dark-brown',
  'brown',
  'light-brown',
  'blonde',
  'platinum', // descolorido/platinado
  'red',
  'gray',
  'white',
] as const;
export type HairColor = (typeof HAIR_COLORS)[number];

export const BEARDS = [
  'none',
  'stubble', // rala/por fazer
  'goatee', // cavanhaque
  'circle', // circle beard (bigode + queixo fechados)
  'full-short', // cheia curta
  'full-long', // cheia longa
  'mustache',
  'chinstrap', // costeleta ligada ao queixo
] as const;
export type Beard = (typeof BEARDS)[number];

export const EYE_SHAPES = ['round', 'narrow', 'sharp'] as const;
export type EyeShape = (typeof EYE_SHAPES)[number];

export const EYE_COLORS = ['dark', 'brown', 'green', 'blue'] as const;
export type EyeColor = (typeof EYE_COLORS)[number];

export const NOSES = ['small', 'medium', 'wide'] as const;
export type Nose = (typeof NOSES)[number];

export const MOUTHS = ['neutral', 'smile', 'grin'] as const; // grin = sorriso largo com dentes
export type Mouth = (typeof MOUTHS)[number];

export const ACCESSORIES = ['earring-left', 'earring-right', 'earrings', 'chain', 'headband'] as const;
export type Accessory = (typeof ACCESSORIES)[number];

/** Tons de pele por índice (0 = mais claro). O procedural sorteia só 0..5. */
export const SKIN_TONES = 8;

/** Aparência curada (appearance.json): só o que difere do procedural. */
export interface Appearance {
  playerId: string;
  skinTone?: number;
  faceShape?: FaceShape;
  hair?: { style?: HairStyle; color?: HairColor; hairline?: Hairline };
  beard?: Beard;
  eyes?: { shape?: EyeShape; color?: EyeColor };
  nose?: Nose;
  mouth?: Mouth;
  accessories?: Accessory[];
}
