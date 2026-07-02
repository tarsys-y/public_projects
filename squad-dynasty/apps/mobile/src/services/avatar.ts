// Avatar cartunesco determinístico por jogador: sem fonte de fotos
// licenciável/acessível, as feições derivam do hash do id do jogador — a mesma
// cara em qualquer aparelho, sem asset externo — e a camisa usa as cores reais
// do clube (ícones vestem o uniforme dourado das lendas).
import { mulberry32 } from '@squad-dynasty/engine';
import { hashString } from './leagueLogic';

export type HairStyle = 'bald' | 'buzz' | 'short' | 'curly' | 'long' | 'topknot';
export type FacialHair = 'none' | 'stubble' | 'mustache' | 'beard';

export interface FaceFeatures {
  skin: string;
  skinShade: string; // nariz/boca/contornos
  hairColor: string;
  hairStyle: HairStyle;
  facialHair: FacialHair;
}

export interface KitColors {
  primary: string;
  secondary: string;
}

const SKIN_TONES: Array<{ skin: string; shade: string }> = [
  { skin: '#f5d0a9', shade: '#c08a55' },
  { skin: '#eab98a', shade: '#b57e4a' },
  { skin: '#d9985f', shade: '#a86f3e' },
  { skin: '#b97a45', shade: '#84512a' },
  { skin: '#8d5a34', shade: '#5c371c' },
  { skin: '#6b4226', shade: '#3f2412' },
];

const HAIR_COLORS: Array<[string, number]> = [
  ['#141414', 34], // preto
  ['#2b1a10', 22], // castanho escuro
  ['#4a2c17', 16], // castanho
  ['#6f4a26', 10], // castanho claro
  ['#d1a14a', 8], // loiro
  ['#8c3b22', 5], // ruivo
  ['#9aa0a6', 5], // grisalho
];

const HAIR_STYLES: Array<[HairStyle, number]> = [
  ['short', 34],
  ['buzz', 18],
  ['curly', 16],
  ['long', 12],
  ['topknot', 12],
  ['bald', 8],
];

const FACIAL_HAIR: Array<[FacialHair, number]> = [
  ['none', 45],
  ['stubble', 25],
  ['beard', 20],
  ['mustache', 10],
];

export const ICON_KIT: KitColors = { primary: '#d4af37', secondary: '#1c1917' };
const FALLBACK_KIT: KitColors = { primary: '#334155', secondary: '#cbd5e1' };

/** Sorteio 0..1 independente por feição — inserir/remover feições não muda as demais. */
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

export function faceFeatures(playerId: string): FaceFeatures {
  const tone = SKIN_TONES[Math.floor(roll(playerId, 'skin') * SKIN_TONES.length)]!;
  return {
    skin: tone.skin,
    skinShade: tone.shade,
    hairColor: pickWeighted(playerId, 'hair-color', HAIR_COLORS),
    hairStyle: pickWeighted(playerId, 'hair-style', HAIR_STYLES),
    facialHair: pickWeighted(playerId, 'facial-hair', FACIAL_HAIR),
  };
}

export function kitColors(
  club: { primaryColor: string; secondaryColor: string } | undefined,
  isIcon = false,
): KitColors {
  if (isIcon) return ICON_KIT;
  if (!club) return FALLBACK_KIT;
  return { primary: club.primaryColor, secondary: club.secondaryColor };
}
