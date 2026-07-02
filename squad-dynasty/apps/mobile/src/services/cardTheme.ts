// Fonte única do visual das cartas (estilo Ultimate Team): mapa
// (version, rarity) → tema (gradientes, moldura metálica, textura, tipografia,
// brilho) consumido por CardBackground/CardView/PackOpening. Puro e testável.
import type { CardDefinition, CardVersion, Rarity } from '@squad-dynasty/engine';

export type CardSize = 'sm' | 'md' | 'lg';

export interface GradientStop {
  offset: number; // 0..1
  color: string;
  opacity?: number;
}

export type CardTexture = 'none' | 'rays' | 'facets' | 'pinstripe' | 'laurel';

export interface CardTheme {
  key: string; // id estável p/ <Defs> do SVG e testes
  bg: { stops: GradientStop[]; angle: number };
  bgRadial?: { stops: GradientStop[] }; // hot spot atrás do avatar (epic+)
  frame: { stops: GradientStop[]; width: number; innerLine: string };
  texture: CardTexture;
  textureColor: string;
  textureOpacity: number;
  text: { primary: string; secondary: string; overall: string; panel: string };
  sheenOpacity: number; // highlight diagonal estático (todas as cartas)
  animatedSheen: boolean; // sweep foil em loop (só fora de listas)
  glow: string; // sombra externa / raios da cinemática
  cinematic: boolean; // reveal cinematográfico na abertura de pacote
}

/** Dimensões canônicas; TODO layout deriva de scale (md = referência). */
export const CARD_DIMENSIONS: Record<CardSize, { width: number; height: number; scale: number }> = {
  sm: { width: 84, height: 142, scale: 0.8 },
  md: { width: 104, height: 176, scale: 1 },
  lg: { width: 168, height: 284, scale: 1.62 },
};

function stops(...pairs: Array<[number, string, number?]>): GradientStop[] {
  return pairs.map(([offset, color, opacity]) =>
    opacity === undefined ? { offset, color } : { offset, color, opacity },
  );
}

const RARITY_THEMES: Record<Rarity, CardTheme> = {
  common: {
    key: 'common',
    bg: { stops: stops([0, '#3d4452'], [0.55, '#272d39'], [1, '#191e27']), angle: 165 },
    frame: {
      stops: stops([0, '#9aa3b2'], [0.5, '#6b7482'], [1, '#454d5b']),
      width: 2.5,
      innerLine: 'rgba(210,218,230,0.28)',
    },
    texture: 'none',
    textureColor: '#aab3c2',
    textureOpacity: 0,
    text: { primary: '#e8edf4', secondary: '#9aa3b2', overall: '#e8edf4', panel: 'rgba(12,15,21,0.45)' },
    sheenOpacity: 0.06,
    animatedSheen: false,
    glow: '#3a414d',
    cinematic: false,
  },
  rare: {
    key: 'rare',
    bg: { stops: stops([0, '#1d3f8f'], [0.45, '#2557d0'], [1, '#0b1c4a']), angle: 160 },
    frame: {
      stops: stops([0, '#a8ccff'], [0.5, '#3b82f6'], [1, '#163a8a']),
      width: 2.5,
      innerLine: 'rgba(168,204,255,0.4)',
    },
    texture: 'facets',
    textureColor: '#7fb0ff',
    textureOpacity: 0.07,
    text: { primary: '#f0f6ff', secondary: '#a8c4f0', overall: '#f0f6ff', panel: 'rgba(6,14,40,0.5)' },
    sheenOpacity: 0.08,
    animatedSheen: false,
    glow: '#1d4ed8',
    cinematic: false,
  },
  epic: {
    key: 'epic',
    bg: { stops: stops([0, '#5b1e92'], [0.45, '#8b31d9'], [1, '#2a0d55']), angle: 160 },
    bgRadial: { stops: stops([0, '#c084fc', 0.5], [1, '#c084fc', 0]) },
    frame: {
      stops: stops([0, '#e6ccff'], [0.5, '#a855f7'], [1, '#5b1e92']),
      width: 2.5,
      innerLine: 'rgba(230,204,255,0.42)',
    },
    texture: 'facets',
    textureColor: '#d9b8ff',
    textureOpacity: 0.09,
    text: { primary: '#faf5ff', secondary: '#d6b8f5', overall: '#faf5ff', panel: 'rgba(26,6,52,0.5)' },
    sheenOpacity: 0.1,
    animatedSheen: false,
    glow: '#7e22ce',
    cinematic: false,
  },
  legendary: {
    key: 'legendary',
    bg: { stops: stops([0, '#f6e4a6'], [0.45, '#e2b23c'], [1, '#8a5a12']), angle: 165 },
    bgRadial: { stops: stops([0, '#fff6d0', 0.55], [1, '#fff6d0', 0]) },
    frame: {
      stops: stops([0, '#fff6cf'], [0.5, '#f5c34b'], [1, '#6e4708']),
      width: 3,
      innerLine: 'rgba(90,58,8,0.5)',
    },
    texture: 'rays',
    textureColor: '#fff2c0',
    textureOpacity: 0.15,
    text: { primary: '#452006', secondary: '#6e4708', overall: '#452006', panel: 'rgba(255,246,207,0.4)' },
    sheenOpacity: 0.14,
    animatedSheen: true,
    glow: '#f59e0b',
    cinematic: true,
  },
  icon: {
    key: 'icon',
    bg: { stops: stops([0, '#fdfaf0'], [0.5, '#f1e2ba'], [1, '#d5b153']), angle: 165 },
    bgRadial: { stops: stops([0, '#ffffff', 0.7], [1, '#ffffff', 0]) },
    frame: {
      stops: stops([0, '#fffbe8'], [0.5, '#d4af37'], [1, '#96772a']),
      width: 3,
      innerLine: 'rgba(150,119,42,0.55)',
    },
    texture: 'laurel',
    textureColor: '#b8912e',
    textureOpacity: 0.55,
    text: { primary: '#3b2f10', secondary: '#7a6320', overall: '#3b2f10', panel: 'rgba(255,251,232,0.5)' },
    sheenOpacity: 0.16,
    animatedSheen: true,
    glow: '#d4af37',
    cinematic: true,
  },
};

const VERSION_THEMES: Partial<Record<CardVersion, CardTheme>> = {
  inform: {
    key: 'inform',
    bg: { stops: stops([0, '#241708'], [0.5, '#160d05'], [1, '#0a0603']), angle: 165 },
    bgRadial: { stops: stops([0, '#f0c14b', 0.28], [1, '#f0c14b', 0]) },
    frame: {
      stops: stops([0, '#f5d061'], [0.5, '#b8860b'], [1, '#6e4708']),
      width: 3,
      innerLine: 'rgba(240,193,75,0.45)',
    },
    texture: 'rays',
    textureColor: '#f0c14b',
    textureOpacity: 0.12,
    text: { primary: '#f0c14b', secondary: '#c99b3f', overall: '#f0c14b', panel: 'rgba(10,6,3,0.6)' },
    sheenOpacity: 0.12,
    animatedSheen: true,
    glow: '#f0c14b',
    cinematic: false, // TOTW é frequente — a cinemática fica para as raríssimas
  },
  epic_moment: {
    key: 'epic-moment',
    bg: { stops: stops([0, '#5c1030'], [0.45, '#92285a'], [1, '#1e0512']), angle: 160 },
    bgRadial: { stops: stops([0, '#f7a8c0', 0.4], [1, '#f7a8c0', 0]) },
    frame: {
      stops: stops([0, '#f7c9d4'], [0.5, '#dd6f8f'], [1, '#7e2444']),
      width: 3,
      innerLine: 'rgba(247,201,212,0.42)',
    },
    texture: 'rays',
    textureColor: '#f7a8c0',
    textureOpacity: 0.14,
    text: { primary: '#ffe9f0', secondary: '#eeb0c4', overall: '#ffe9f0', panel: 'rgba(30,5,18,0.55)' },
    sheenOpacity: 0.14,
    animatedSheen: true,
    glow: '#e0708a',
    cinematic: true,
  },
  icon: RARITY_THEMES.icon,
};

/** Versões especiais têm identidade própria; carta base segue a raridade. */
export function cardTheme(version: CardVersion, rarity: Rarity): CardTheme {
  return VERSION_THEMES[version] ?? RARITY_THEMES[rarity];
}

/**
 * Flavor text da cinemática: o grande momento/bio curado da carta, com
 * fallback por versão (cobre as TOTW dinâmicas, que nascem sem texto).
 */
export function momentText(card: CardDefinition, playerName: string): string {
  if (card.moment) return card.moment;
  switch (card.version) {
    case 'inform':
      return `${playerName} está Em Alta: destaque do Time da Semana.`;
    case 'icon':
      return 'Uma lenda eterna do futebol.';
    case 'epic_moment':
      return card.label ?? 'Um momento inesquecível.';
    default:
      return 'Uma carta rara de verdade — trate com carinho.';
  }
}
