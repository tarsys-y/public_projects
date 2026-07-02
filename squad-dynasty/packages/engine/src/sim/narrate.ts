// Narração pt-BR dos eventos. Variações são sorteadas com o RNG da partida
// para manter o determinismo (mesma seed ⇒ mesma narração).
import type { Rng } from '../rng';
import { randInt } from '../rng';

const pick = (rng: Rng, options: string[]): string => options[randInt(rng, 0, options.length - 1)]!;

export const narrate = {
  kickoff: () => 'A bola vai rolar!',
  halftime: (score: string) => `Fim do primeiro tempo: ${score}.`,
  fulltime: (score: string) => `Apita o árbitro: fim de jogo! Placar final ${score}.`,
  goal: (rng: Rng, scorer: string, assister?: string) =>
    assister
      ? pick(rng, [
          `⚽ GOL! ${scorer} completa o passe açucarado de ${assister}!`,
          `⚽ GOL! ${assister} enxerga ${scorer} livre e não tem erro!`,
          `⚽ GOL DE ${scorer.toUpperCase()}! Assistência de ${assister}.`,
        ])
      : pick(rng, [
          `⚽ GOL! ${scorer} resolve sozinho numa jogada individual!`,
          `⚽ GOL DE ${scorer.toUpperCase()}! Que pintura!`,
        ]),
  save: (rng: Rng, gk: string, shooter: string) =>
    pick(rng, [
      `${shooter} finaliza forte e ${gk} faz grande defesa!`,
      `Que defesa de ${gk}! ${shooter} não acreditou.`,
      `${gk} voa para espalmar o chute de ${shooter}.`,
    ]),
  block: (rng: Rng, defender: string, shooter: string) =>
    pick(rng, [
      `${shooter} arrisca, mas ${defender} se joga na frente e bloqueia!`,
      `Bloqueio providencial de ${defender} no chute de ${shooter}.`,
    ]),
  miss: (rng: Rng, shooter: string) =>
    pick(rng, [
      `${shooter} finaliza… pra fora! Perdeu uma boa chance.`,
      `Passou perto! ${shooter} manda à esquerda da meta.`,
      `${shooter} pega mal na bola e desperdiça.`,
    ]),
  tackle: (rng: Rng, defender: string) =>
    pick(rng, [
      `${defender} chega firme e recupera a bola.`,
      `Belo desarme de ${defender}.`,
    ]),
  interception: (rng: Rng, defender: string) =>
    pick(rng, [
      `${defender} lê a jogada e intercepta o passe.`,
      `Antecipação perfeita de ${defender}.`,
    ]),
  dribble: (rng: Rng, attacker: string, defender: string) =>
    pick(rng, [
      `${attacker} dá um drible desconcertante em ${defender}!`,
      `${attacker} passa por ${defender} como se ele não existisse.`,
    ]),
  foul: (rng: Rng, offender: string, victim: string) =>
    pick(rng, [
      `${offender} chega atrasado e derruba ${victim}. Falta.`,
      `Falta dura de ${offender} em ${victim}.`,
    ]),
  yellow: (player: string) => `🟨 Cartão amarelo para ${player}.`,
  secondYellow: (player: string) => `🟨🟥 Segundo amarelo e expulsão de ${player}!`,
  red: (player: string) => `🟥 VERMELHO DIRETO! ${player} deixa o campo mais cedo.`,
  injury: (player: string) => `${player} sente uma fisgada e pede atendimento.`,
  substitution: (playerIn: string, playerOut: string) =>
    `Substituição: entra ${playerIn} na vaga de ${playerOut}.`,
};
