// Envelhecimento (SPEC 4.4). A aplicação por virada de temporada chega no M6;
// as faixas e a projeção já existem para a tela de Detalhe da Carta (M3).
import { CONFIG } from '../config';

export interface AgingBracket {
  minAge: number;
  maxAge: number; // inclusivo
  label: string;
  description: string;
  trend: 'up' | 'flat' | 'down' | 'retirement';
}

export const AGING_BRACKETS: AgingBracket[] = [
  {
    minAge: 0,
    maxAge: 21,
    label: 'Promessa',
    description: '+1 a +3 em 2–4 atributos por temporada (viés nos atributos-chave)',
    trend: 'up',
  },
  {
    minAge: 22,
    maxAge: 24,
    label: 'Em desenvolvimento',
    description: '+0 a +2 por temporada',
    trend: 'up',
  },
  { minAge: 25, maxAge: 29, label: 'Auge', description: 'Sem mudanças', trend: 'flat' },
  {
    minAge: 30,
    maxAge: 32,
    label: 'Início do declínio',
    description: '−1 a −2 em Ritmo/Físico por temporada',
    trend: 'down',
  },
  {
    minAge: 33,
    maxAge: 35,
    label: 'Veterano',
    description: '−2 a −4 em Ritmo/Físico, −1 técnico; mentais intactos',
    trend: 'down',
  },
  {
    minAge: 36,
    maxAge: 99,
    label: 'Beira da aposentadoria',
    description: 'Chance de aposentar: 25% aos 36, +15% por ano',
    trend: 'retirement',
  },
];

export function agingBracketFor(age: number): AgingBracket {
  return AGING_BRACKETS.find((b) => age >= b.minAge && age <= b.maxAge) ?? AGING_BRACKETS[2]!;
}

/** Probabilidade de aposentadoria na virada da temporada para a idade dada. */
export function retirementChance(age: number): number {
  const a = CONFIG.aging;
  if (age < a.retirementBaseAge) return 0;
  return Math.min(1, a.retirementBaseChance + (age - a.retirementBaseAge) * a.retirementChancePerYear);
}
