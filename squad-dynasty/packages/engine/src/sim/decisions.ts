// Momentos de Decisão (SPEC 5.4): o engine detecta padrões e insere
// DecisionPoints com 2–3 opções que mapeiam para ajustes táticos temporários.
// Em lados controlados por IA a heurística decide na hora (aiChoiceId).
import type { DecisionKind, DecisionOption, DecisionPoint, Side } from '../models/match';
import type { Tactics } from '../models/squad';

const clampMentality = (m: number) => Math.max(1, Math.min(5, m)) as Tactics['mentality'];

export function optionsFor(kind: DecisionKind, tactics: Tactics): DecisionOption[] {
  switch (kind) {
    case 'no_shots_20min':
      return [
        {
          id: 'ousadia',
          label: 'Mais ousadia: subir a mentalidade',
          tactics: { mentality: clampMentality(tactics.mentality + 1) },
        },
        { id: 'jogo-direto', label: 'Jogo direto: bolas longas', tactics: { passStyle: 'direct' } },
        { id: 'manter', label: 'Manter o plano' },
      ];
    case 'dribbled_repeatedly':
      return [
        {
          id: 'dobrar-marcacao',
          label: 'Dobrar a marcação no ponta',
          tactics: { pressing: Math.min(3, tactics.pressing + 1) as Tactics['pressing'] },
        },
        { id: 'recuar-linha', label: 'Recuar a linha defensiva', tactics: { defensiveLine: 1 } },
        { id: 'manter', label: 'Confiar no meu lateral' },
      ];
    case 'red_card':
      return [
        {
          id: 'fechar',
          label: 'Fechar o time com um a menos',
          tactics: { mentality: clampMentality(tactics.mentality - 1), defensiveLine: 1 },
        },
        { id: 'manter-postura', label: 'Manter a postura' },
      ];
    case 'losing_late':
      return [
        {
          id: 'tudo-ou-nada',
          label: 'Tudo ou nada: pressão total',
          tactics: { mentality: 5, pressing: 3 },
        },
        { id: 'manter', label: 'Paciência, seguir o plano' },
      ];
    case 'winning_late':
      return [
        {
          id: 'onibus',
          label: 'Estacionar o ônibus',
          tactics: { mentality: 1, defensiveLine: 1 },
        },
        { id: 'seguir-jogando', label: 'Seguir jogando no campo deles' },
      ];
  }
}

export function describe(kind: DecisionKind, minute: number, context?: string): string {
  switch (kind) {
    case 'no_shots_20min':
      return `${minute}': seu time não finaliza há mais de 20 minutos. O que fazer?`;
    case 'dribbled_repeatedly':
      return `${minute}': ${context ?? 'o ponta adversário'} já driblou sua defesa três vezes. Reagir?`;
    case 'red_card':
      return `${minute}': expulsão! ${context ?? 'Seu jogador'} deixa o time com um a menos.`;
    case 'losing_late':
      return `${minute}': o placar é adverso e o tempo está acabando.`;
    case 'winning_late':
      return `${minute}': vitória parcial. Como administrar a reta final?`;
  }
}

/** Heurística da IA para o lado ausente (SPEC 5.4): simples e determinística. */
export function aiChoice(point: DecisionPoint, tactics: Tactics): DecisionOption {
  const options = point.options;
  if (point.kind === 'winning_late') {
    return options.find((o) => o.id === 'onibus') ?? options[0]!;
  }
  if (point.kind === 'no_shots_20min' && tactics.mentality >= 4) {
    return options.find((o) => o.id === 'jogo-direto') ?? options[0]!;
  }
  return options[0]!;
}

export interface DecisionTracker {
  count: number;
  lastMinute: number;
  firedKinds: Set<`${Side}:${DecisionKind}`>;
}

export function newDecisionTracker(): DecisionTracker {
  return { count: 0, lastMinute: -999, firedKinds: new Set() };
}

/** Aplica cap global e espaçamento mínimo entre decisões; cada kind 1× por lado. */
export function canFire(
  tracker: DecisionTracker,
  side: Side,
  kind: DecisionKind,
  minute: number,
  max: number,
  minGap: number,
): boolean {
  if (tracker.count >= max) return false;
  if (minute - tracker.lastMinute < minGap) return false;
  if (tracker.firedKinds.has(`${side}:${kind}`)) return false;
  return true;
}

export function markFired(
  tracker: DecisionTracker,
  side: Side,
  kind: DecisionKind,
  minute: number,
): void {
  tracker.count++;
  tracker.lastMinute = minute;
  tracker.firedKinds.add(`${side}:${kind}`);
}
