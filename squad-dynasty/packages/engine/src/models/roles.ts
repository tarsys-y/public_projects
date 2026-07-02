// As 20 funções táticas (SPEC 3 e 4.1). Pesos definem o fit 0–1 de um jogador
// na função; posições válidas fora das quais incide o multiplicador de 0.80.
import type { RoleDefinition, RoleId } from './squad';

const WIDE_ATTACK = ['LW', 'RW', 'LM', 'RM'] as const;

export const ROLES: Record<RoleId, RoleDefinition> = {
  gk_classic: {
    id: 'gk_classic',
    name: 'Goleiro Clássico',
    validPositions: ['GK'],
    keyAttributes: { reflexes: 3, handling: 2.5, gkPositioning: 2.5, composure: 1, consistency: 1 },
  },
  gk_sweeper: {
    id: 'gk_sweeper',
    name: 'Goleiro Líbero',
    validPositions: ['GK'],
    keyAttributes: { rushingOut: 3, kicking: 2.5, reflexes: 2, gkPositioning: 1.5, composure: 1 },
  },
  cb_stopper: {
    id: 'cb_stopper',
    name: 'Zagueiro Stopper',
    validPositions: ['CB'],
    keyAttributes: { marking: 3, tackling: 2.5, strength: 2.5, heading: 2, defPositioning: 2, jumping: 1.5 },
  },
  cb_ball_playing: {
    id: 'cb_ball_playing',
    name: 'Zagueiro Construtor',
    validPositions: ['CB'],
    keyAttributes: { shortPass: 2.5, marking: 2, defPositioning: 2, ballControl: 2, composure: 2, longPass: 2, vision: 1.5 },
  },
  libero: {
    id: 'libero',
    name: 'Líbero',
    validPositions: ['CB'],
    keyAttributes: { defPositioning: 3, interceptions: 2.5, vision: 2, shortPass: 2, composure: 2, dribbling: 1 },
  },
  fb_defensive: {
    id: 'fb_defensive',
    name: 'Lateral Defensivo',
    validPositions: ['LB', 'RB'],
    keyAttributes: { marking: 2.5, tackling: 2.5, defPositioning: 2, interceptions: 2, stamina: 1.5, strength: 1 },
  },
  fb_wingback: {
    id: 'fb_wingback',
    name: 'Ala',
    validPositions: ['LB', 'RB'],
    keyAttributes: { stamina: 3, crossing: 2.5, acceleration: 2, sprintSpeed: 2, dribbling: 1.5, tackling: 1.5 },
  },
  dm_anchor: {
    id: 'dm_anchor',
    name: 'Volante de Contenção',
    validPositions: ['CDM'],
    keyAttributes: { interceptions: 3, defPositioning: 3, tackling: 2.5, marking: 2, strength: 1.5, shortPass: 1 },
  },
  dm_deep_playmaker: {
    id: 'dm_deep_playmaker',
    name: 'Volante Armador',
    validPositions: ['CDM'],
    keyAttributes: { shortPass: 3, longPass: 2.5, vision: 2.5, composure: 2, ballControl: 2, interceptions: 1.5 },
  },
  cm_box_to_box: {
    id: 'cm_box_to_box',
    name: 'Meia Box-to-Box',
    validPositions: ['CM'],
    keyAttributes: { stamina: 3, shortPass: 2, tackling: 1.5, interceptions: 1.5, finishing: 1.5, strength: 1.5, offPositioning: 1 },
  },
  cm_playmaker: {
    id: 'cm_playmaker',
    name: 'Meia Armador',
    validPositions: ['CM'],
    keyAttributes: { vision: 3, shortPass: 3, longPass: 2, ballControl: 2, composure: 1.5, agility: 1 },
  },
  cm_destroyer: {
    id: 'cm_destroyer',
    name: 'Meia Destruidor',
    validPositions: ['CM'],
    keyAttributes: { tackling: 3, interceptions: 2.5, marking: 2, strength: 2, stamina: 2, defPositioning: 2 },
  },
  am_classic_10: {
    id: 'am_classic_10',
    name: 'Camisa 10 Clássico',
    validPositions: ['CAM'],
    keyAttributes: { vision: 3, ballControl: 2.5, shortPass: 2.5, dribbling: 2, composure: 1.5, longPass: 1.5 },
  },
  am_shadow_striker: {
    id: 'am_shadow_striker',
    name: 'Atacante Sombra',
    validPositions: ['CAM'],
    keyAttributes: { offPositioning: 3, finishing: 2.5, acceleration: 1.5, composure: 1.5, dribbling: 1.5, shotPower: 1.5 },
  },
  w_inverted: {
    id: 'w_inverted',
    name: 'Ponta Invertido',
    validPositions: [...WIDE_ATTACK],
    keyAttributes: { dribbling: 3, acceleration: 2.5, finishing: 2, agility: 2, ballControl: 2, shotPower: 1.5 },
  },
  w_touchline: {
    id: 'w_touchline',
    name: 'Ponta de Linha',
    validPositions: [...WIDE_ATTACK],
    keyAttributes: { crossing: 3, sprintSpeed: 2.5, acceleration: 2, dribbling: 2, stamina: 1.5 },
  },
  st_target_man: {
    id: 'st_target_man',
    name: 'Homem-Alvo',
    validPositions: ['ST'],
    keyAttributes: { strength: 3, heading: 3, jumping: 2.5, shotPower: 2, offPositioning: 2, finishing: 2 },
  },
  st_poacher: {
    id: 'st_poacher',
    name: 'Oportunista',
    validPositions: ['ST'],
    keyAttributes: { finishing: 3, offPositioning: 3, acceleration: 2, composure: 2, agility: 1.5 },
  },
  st_false9: {
    id: 'st_false9',
    name: 'Falso 9',
    validPositions: ['ST'],
    keyAttributes: { vision: 2.5, shortPass: 2.5, dribbling: 2.5, ballControl: 2.5, finishing: 2, composure: 1.5 },
  },
  st_pressing_forward: {
    id: 'st_pressing_forward',
    name: 'Atacante de Pressão',
    validPositions: ['ST'],
    keyAttributes: { stamina: 3, acceleration: 2, strength: 2, interceptions: 2, finishing: 2, sprintSpeed: 1.5 },
  },
};

export const ROLE_IDS = Object.keys(ROLES) as RoleId[];

/** Funções elegíveis para um slot (posição do slot entre as validPositions). */
export function rolesForPosition(position: string): RoleDefinition[] {
  return ROLE_IDS.map((id) => ROLES[id]).filter((r) =>
    (r.validPositions as string[]).includes(position),
  );
}
