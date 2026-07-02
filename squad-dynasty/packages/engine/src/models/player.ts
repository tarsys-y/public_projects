// Tipos da SPEC.md seção 3 — fonte de verdade dos dados de jogador/carta.

export type Position =
  | 'GK'
  | 'CB'
  | 'LB'
  | 'RB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'LM'
  | 'RM'
  | 'LW'
  | 'RW'
  | 'ST';

export interface OutfieldAttributes {
  // Ritmo
  acceleration: number;
  sprintSpeed: number;
  // Finalização
  finishing: number;
  shotPower: number;
  heading: number;
  offPositioning: number;
  // Passe
  shortPass: number;
  longPass: number;
  crossing: number;
  vision: number;
  // Drible
  dribbling: number;
  ballControl: number;
  agility: number;
  // Defesa
  marking: number;
  tackling: number;
  interceptions: number;
  defPositioning: number;
  // Físico
  strength: number;
  stamina: number;
  jumping: number;
  // Mental (TODOS visíveis — não há atributos ocultos)
  composure: number;
  consistency: number;
  bigGame: number;
}

export interface GkAttributes {
  reflexes: number;
  handling: number;
  rushingOut: number;
  kicking: number;
  gkPositioning: number;
  composure: number;
  consistency: number;
  bigGame: number;
}

export type AnyAttributes = OutfieldAttributes | GkAttributes;

export function isGkAttributes(attrs: AnyAttributes): attrs is GkAttributes {
  return 'reflexes' in attrs;
}

// Jogador do mundo real (base de dados editável — packages/data/players.json)
export interface BasePlayer {
  id: string; // slug estável, ex: "vinicius-junior"
  name: string;
  nationality: string; // código ISO, ex: "BR"
  clubId: string; // ref a clubs.json
  leagueId: string;
  birthYear: number;
  positions: Position[]; // primeira é a principal
  attributes: AnyAttributes;
}

export interface Club {
  id: string;
  name: string;
  shortName: string; // ex: "FLA"
  leagueId: string;
  country: string; // código ISO
  primaryColor: string; // hex, para a UI
  secondaryColor: string;
}

export type CardVersion = 'base' | 'inform' | 'epic_moment' | 'icon';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'icon';

// Definição de uma carta (catálogo — o que pode vir em pacote)
export interface CardDefinition {
  id: string; // ex: "mbappe-wc2018"
  basePlayerId: string;
  version: CardVersion;
  rarity: Rarity;
  label?: string; // ex: "Copa 2018", "Champions 2015"
  attributes: AnyAttributes; // snapshot (versões especiais congelam o auge)
  frozen: boolean; // true para epic_moment e icon (não envelhecem nem recebem patch)
}

// Carta que um usuário possui (instância)
export interface OwnedCard {
  id: string; // uuid
  ownerId: string;
  cardDefId: string;
  age: number; // avança com as temporadas do jogo (se !frozen)
  attributeDeltas: Partial<OutfieldAttributes>; // acumulado de evolução + envelhecimento
  evolutionLevel: number; // 0–6
  starterStreak: number; // partidas consecutivas como titular (entrosamento)
  acquiredAt: number;
}

// Overall: calculado, nunca armazenado como fonte de verdade (ver overall.ts).

/** Categorias de atributo — base do snowflake, do envelhecimento e da UI. */
export type AttributeCategory =
  | 'pace'
  | 'finishing'
  | 'passing'
  | 'dribbling'
  | 'defense'
  | 'physical'
  | 'mental';

export const OUTFIELD_CATEGORY: Record<keyof OutfieldAttributes, AttributeCategory> = {
  acceleration: 'pace',
  sprintSpeed: 'pace',
  finishing: 'finishing',
  shotPower: 'finishing',
  heading: 'finishing',
  offPositioning: 'finishing',
  shortPass: 'passing',
  longPass: 'passing',
  crossing: 'passing',
  vision: 'passing',
  dribbling: 'dribbling',
  ballControl: 'dribbling',
  agility: 'dribbling',
  marking: 'defense',
  tackling: 'defense',
  interceptions: 'defense',
  defPositioning: 'defense',
  strength: 'physical',
  stamina: 'physical',
  jumping: 'physical',
  composure: 'mental',
  consistency: 'mental',
  bigGame: 'mental',
};

export const OUTFIELD_ATTRIBUTE_KEYS = Object.keys(OUTFIELD_CATEGORY) as Array<
  keyof OutfieldAttributes
>;

export const GK_ATTRIBUTE_KEYS: Array<keyof GkAttributes> = [
  'reflexes',
  'handling',
  'rushingOut',
  'kicking',
  'gkPositioning',
  'composure',
  'consistency',
  'bigGame',
];
