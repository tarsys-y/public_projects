// Desafios de Montagem de Elenco (SBC, estilo UT): o usuário entrega um 11
// que satisfaz restrições e CONSOME as cartas em troca de recompensas.
// Validação pura sobre slots resolvidos — reutiliza química e overall derivados.
import { computeSquadChemistry } from '../chemistry/chemistry';
import type { Rarity } from '../models/player';
import type { ResolvedSlot } from '../resolve';

export interface SbcRequirements {
  minTeamOverall?: number;
  minChemistry?: number; // média do time 0–100
  /** todos os 11 desta liga */
  leagueId?: string;
  /** pelo menos N titulares de uma mesma liga (qualquer uma) */
  minSameLeague?: number;
  /** pelo menos N titulares de uma mesma nacionalidade (qualquer uma) */
  minSameNation?: number;
  /** no máximo N titulares do mesmo clube */
  maxSameClub?: number;
  /** pelo menos N cartas com raridade ≥ rarity */
  minRarity?: { rarity: Rarity; count: number };
}

export interface SbcReward {
  coins?: number;
  gems?: number;
  /** pacote-prêmio (spec custom aberta na hora do resgate) */
  pack?: { cards: number; guaranteedRarity: Rarity; epicPlusBoost?: number };
  cardId?: string;
}

export interface SbcChallenge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  formation: string; // formação exigida para o envio (ex: '4-3-3')
  requirements: SbcRequirements;
  reward: SbcReward;
  repeatable: boolean;
}

const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'icon'];
const rank = (r: Rarity) => RARITY_ORDER.indexOf(r);

export interface SbcValidation {
  ok: boolean;
  failures: string[];
  teamOverall: number;
  teamChemistry: number;
}

/** Valida um 11 completo contra as restrições do desafio. */
export function validateSbc(
  formation: string,
  slots: ResolvedSlot[],
  requirements: SbcRequirements,
): SbcValidation {
  const failures: string[] = [];
  if (slots.length !== 11 || slots.some((s) => !s.player)) {
    return { ok: false, failures: ['Escale 11 jogadores'], teamOverall: 0, teamChemistry: 0 };
  }

  const teamOverall = Math.round(
    slots.reduce((sum, s) => sum + s.player.overall, 0) / slots.length,
  );
  const { teamAverage: teamChemistry } = computeSquadChemistry({ formation, slots });

  const r = requirements;
  if (r.minTeamOverall && teamOverall < r.minTeamOverall) {
    failures.push(`Overall do time ${teamOverall} < ${r.minTeamOverall}`);
  }
  if (r.minChemistry && teamChemistry < r.minChemistry) {
    failures.push(`Química ${teamChemistry} < ${r.minChemistry}`);
  }
  if (r.leagueId) {
    const outsiders = slots.filter((s) => s.player.basePlayer.leagueId !== r.leagueId).length;
    if (outsiders > 0) failures.push(`${outsiders} jogador(es) fora da liga exigida`);
  }
  const countBy = (fn: (s: ResolvedSlot) => string) => {
    const counts = new Map<string, number>();
    for (const s of slots) counts.set(fn(s), (counts.get(fn(s)) ?? 0) + 1);
    return counts;
  };
  if (r.minSameLeague) {
    const max = Math.max(...countBy((s) => s.player.basePlayer.leagueId).values());
    if (max < r.minSameLeague) failures.push(`Máximo de ${max} da mesma liga (< ${r.minSameLeague})`);
  }
  if (r.minSameNation) {
    const max = Math.max(...countBy((s) => s.player.basePlayer.nationality).values());
    if (max < r.minSameNation) failures.push(`Máximo de ${max} da mesma nação (< ${r.minSameNation})`);
  }
  if (r.maxSameClub) {
    const max = Math.max(...countBy((s) => s.player.basePlayer.clubId).values());
    if (max > r.maxSameClub) failures.push(`${max} do mesmo clube (máx ${r.maxSameClub})`);
  }
  if (r.minRarity) {
    const count = slots.filter((s) => rank(s.player.card.rarity) >= rank(r.minRarity!.rarity)).length;
    if (count < r.minRarity.count) {
      failures.push(`${count} carta(s) ${r.minRarity.rarity}+ (< ${r.minRarity.count})`);
    }
  }

  return { ok: failures.length === 0, failures, teamOverall, teamChemistry };
}

/** Catálogo inicial de desafios. */
export const SBC_CHALLENGES: SbcChallenge[] = [
  {
    id: 'aco-brasileiro',
    name: 'Aço Brasileiro',
    emoji: '🇧🇷',
    description: '11 do Brasileirão com overall ≥72 e química ≥50.',
    formation: '4-3-3',
    requirements: { leagueId: 'brasileirao', minTeamOverall: 72, minChemistry: 50 },
    reward: { coins: 1200, pack: { cards: 3, guaranteedRarity: 'rare' } },
    repeatable: true,
  },
  {
    id: 'muralha-europeia',
    name: 'Muralha Europeia',
    emoji: '🏰',
    description: '≥8 da mesma liga europeia, overall ≥76.',
    formation: '4-4-2',
    requirements: { minSameLeague: 8, minTeamOverall: 76 },
    reward: { coins: 1800, pack: { cards: 3, guaranteedRarity: 'epic' } },
    repeatable: true,
  },
  {
    id: 'hibrido-de-nacoes',
    name: 'Híbrido de Nações',
    emoji: '🌎',
    description: '≥5 da mesma nação, máx. 2 por clube, química ≥55.',
    formation: '4-2-3-1',
    requirements: { minSameNation: 5, maxSameClub: 2, minChemistry: 55 },
    reward: { coins: 2200, pack: { cards: 3, guaranteedRarity: 'epic', epicPlusBoost: 1.5 } },
    repeatable: true,
  },
  {
    id: 'elite-mundial',
    name: 'Elite Mundial',
    emoji: '⭐',
    description: 'Overall ≥82 com ≥3 cartas épicas+.',
    formation: '4-3-3',
    requirements: { minTeamOverall: 82, minRarity: { rarity: 'epic', count: 3 } },
    reward: { gems: 30, pack: { cards: 4, guaranteedRarity: 'epic', epicPlusBoost: 2 } },
    repeatable: true,
  },
  {
    id: 'caminho-da-lenda',
    name: 'Caminho da Lenda',
    emoji: '👑',
    description: 'O supremo: overall ≥85 e química ≥60. Paga um pacote com Ícone garantido.',
    formation: '4-3-3',
    requirements: { minTeamOverall: 85, minChemistry: 60 },
    reward: { pack: { cards: 3, guaranteedRarity: 'icon' } },
    repeatable: false,
  },
  {
    id: 'gigantes-sauditas',
    name: 'Gigantes Sauditas',
    emoji: '🌙',
    description: '11 da Saudi Pro League, overall ≥74.',
    formation: '4-4-2',
    requirements: { leagueId: 'saudi-pro-league', minTeamOverall: 74 },
    reward: { coins: 1500, pack: { cards: 3, guaranteedRarity: 'rare', epicPlusBoost: 1.5 } },
    repeatable: true,
  },
  {
    id: 'sonho-americano',
    name: 'Sonho Americano',
    emoji: '🗽',
    description: '11 da MLS com química ≥45.',
    formation: '4-1-4-1',
    requirements: { leagueId: 'mls', minChemistry: 45 },
    reward: { coins: 1400, pack: { cards: 3, guaranteedRarity: 'rare' } },
    repeatable: true,
  },
  {
    id: 'jogo-bonito',
    name: 'Jogo Bonito',
    emoji: '🎩',
    description: '≥6 brasileiros de qualquer liga, overall ≥78.',
    formation: '4-1-2-1-2',
    requirements: { minSameNation: 6, minTeamOverall: 78 },
    reward: { coins: 2000, cardId: 'neymar-2011' },
    repeatable: false,
  },
];
