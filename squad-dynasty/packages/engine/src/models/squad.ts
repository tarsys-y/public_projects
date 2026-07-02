// Tipos da SPEC.md seção 3 (squad.ts) — elenco, funções e tática.
import type { GkAttributes, OutfieldAttributes, Position } from './player';

export type RoleId =
  | 'gk_classic'
  | 'gk_sweeper'
  | 'cb_stopper'
  | 'cb_ball_playing'
  | 'libero'
  | 'fb_defensive'
  | 'fb_wingback'
  | 'dm_anchor'
  | 'dm_deep_playmaker'
  | 'cm_box_to_box'
  | 'cm_playmaker'
  | 'cm_destroyer'
  | 'am_classic_10'
  | 'am_shadow_striker'
  | 'w_inverted'
  | 'w_touchline'
  | 'st_target_man'
  | 'st_poacher'
  | 'st_false9'
  | 'st_pressing_forward';

/** Pesos sobre atributos de linha OU de goleiro (funções de GK usam as chaves de GK). */
export type RoleAttributeWeights = Partial<
  Record<keyof OutfieldAttributes | keyof GkAttributes, number>
>;

export interface RoleDefinition {
  id: RoleId;
  name: string; // exibição pt-BR
  validPositions: Position[];
  keyAttributes: RoleAttributeWeights; // pesos p/ fit 0–1
}

export interface SquadSlot {
  position: Position;
  role: RoleId;
  ownedCardId: string;
}

export interface Tactics {
  mentality: 1 | 2 | 3 | 4 | 5; // 1=ultra-defensivo ... 5=ultra-ofensivo
  width: 1 | 2 | 3;
  defensiveLine: 1 | 2 | 3;
  pressing: 1 | 2 | 3;
  passStyle: 'short' | 'direct';
  attackFocus: 'center' | 'flanks';
}

export interface Squad {
  formation: string; // ex: "4-3-3", de formations.ts
  starters: SquadSlot[]; // 11
  bench: string[]; // até 7 ownedCardIds
  tactics: Tactics;
}

export const DEFAULT_TACTICS: Tactics = {
  mentality: 3,
  width: 2,
  defensiveLine: 2,
  pressing: 2,
  passStyle: 'short',
  attackFocus: 'center',
};
