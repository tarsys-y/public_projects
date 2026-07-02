// Pares de funções sinérgicas (SPEC 4.2): conexão de estilos entre vizinhos
// táticos vale +15 de química. A tabela é simétrica.
import type { RoleId } from '../models/squad';

const PAIRS: Array<[RoleId, RoleId]> = [
  // Ataque
  ['st_target_man', 'w_touchline'], // homem-alvo vive de cruzamento
  ['st_poacher', 'am_classic_10'], // o 10 acha o oportunista
  ['st_false9', 'w_inverted'], // falso 9 abre espaço para o ponta que corta
  ['st_pressing_forward', 'am_shadow_striker'], // pressão + chegada de trás
  ['w_inverted', 'fb_wingback'], // ponta por dentro, ala por fora
  // Meio
  ['dm_anchor', 'cm_playmaker'], // contenção libera o armador
  ['dm_anchor', 'am_classic_10'],
  ['dm_deep_playmaker', 'cm_box_to_box'], // saída limpa + chegada
  ['cm_destroyer', 'cm_playmaker'],
  // Defesa
  ['cb_ball_playing', 'dm_deep_playmaker'], // construção em camadas
  ['cb_stopper', 'libero'], // um sobra, o outro combate
  ['gk_sweeper', 'libero'], // linha alta coberta
  ['fb_defensive', 'w_touchline'], // ponta ataca, lateral segura as costas
];

const KEY = (a: RoleId, b: RoleId) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const SET = new Set(PAIRS.map(([a, b]) => KEY(a, b)));

export function areRolesSynergistic(a: RoleId, b: RoleId): boolean {
  return SET.has(KEY(a, b));
}

export const SYNERGY_PAIRS: ReadonlyArray<[RoleId, RoleId]> = PAIRS;
