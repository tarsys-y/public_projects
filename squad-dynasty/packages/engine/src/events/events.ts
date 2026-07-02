// Eventos semanais rotativos (UT "promos", offline-first): a semana ISO do
// relógio escolhe o evento do catálogo — determinístico em qualquer aparelho,
// sem servidor. Cada evento define um tema (filtro de pool), um pacote
// especial com odds turbinadas e objetivos que pagam cartas exclusivas.
import type { BasePlayer, Rarity } from '../models/player';

export interface EventTheme {
  leagueIds?: string[];
  nationalities?: string[];
  iconsOnly?: boolean;
}

export interface EventObjective {
  id: string;
  label: string;
  target: number;
  /** play/win/goals contam partidas do usuário durante o evento;
   *  win_theme exige ≥ minThemePlayers titulares do tema do evento. */
  kind: 'play' | 'win' | 'goals' | 'win_theme';
  minThemePlayers?: number;
  rewardCoins?: number;
  rewardGems?: number;
  /** carta exclusiva concedida ao completar (id do catálogo). */
  rewardCardId?: string;
}

export interface GameEvent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  theme: EventTheme;
  pack: {
    costCoins: number;
    costGems: number;
    cards: number;
    guaranteedRarity: Rarity;
    /** multiplica os pesos de epic/legendary/icon no sorteio. */
    epicPlusBoost: number;
  };
  objectives: EventObjective[];
}

export const EVENTS: GameEvent[] = [
  {
    id: 'semana-brasileirao',
    name: 'Semana do Brasileirão',
    emoji: '🇧🇷',
    description: 'Só feras da Série A no pacote. Complete objetivos com seu time canarinho.',
    theme: { leagueIds: ['brasileirao'] },
    pack: { costCoins: 2000, costGems: 0, cards: 3, guaranteedRarity: 'rare', epicPlusBoost: 2 },
    objectives: [
      { id: 'br-win3', label: 'Vença 3 partidas', target: 3, kind: 'win', rewardCoins: 800 },
      {
        id: 'br-theme',
        label: 'Vença 2 com ≥7 titulares do Brasileirão',
        target: 2,
        kind: 'win_theme',
        minThemePlayers: 7,
        rewardCardId: 'neymar-2011',
      },
    ],
  },
  {
    id: 'classicos-europa',
    name: 'Clássicos da Europa',
    emoji: '🏟️',
    description: 'Premier League, La Liga e Serie A em destaque no pacote da semana.',
    theme: { leagueIds: ['premier-league', 'la-liga', 'serie-a-it'] },
    pack: { costCoins: 2500, costGems: 0, cards: 3, guaranteedRarity: 'rare', epicPlusBoost: 2 },
    objectives: [
      { id: 'eu-play4', label: 'Jogue 4 partidas', target: 4, kind: 'play', rewardCoins: 600 },
      {
        id: 'eu-theme',
        label: 'Vença 2 com ≥7 titulares das ligas do evento',
        target: 2,
        kind: 'win_theme',
        minThemePlayers: 7,
        rewardCardId: 'haaland-treble2023',
      },
    ],
  },
  {
    id: 'noite-das-lendas',
    name: 'Noite das Lendas',
    emoji: '👑',
    description: 'O pacote com maior chance de Ícones da temporada.',
    theme: { iconsOnly: true },
    pack: { costCoins: 0, costGems: 40, cards: 3, guaranteedRarity: 'epic', epicPlusBoost: 4 },
    objectives: [
      { id: 'lendas-goals', label: 'Marque 6 gols', target: 6, kind: 'goals', rewardCoins: 1000 },
      {
        id: 'lendas-win',
        label: 'Vença 3 partidas',
        target: 3,
        kind: 'win',
        rewardCardId: 'ronaldinho-2005',
      },
    ],
  },
  {
    id: 'craques-samba',
    name: 'Craques do Samba',
    emoji: '⚽',
    description: 'Brasileiros de todas as ligas brilham no pacote da semana.',
    theme: { nationalities: ['BR'] },
    pack: { costCoins: 2200, costGems: 0, cards: 3, guaranteedRarity: 'rare', epicPlusBoost: 2.5 },
    objectives: [
      { id: 'samba-goals', label: 'Marque 5 gols', target: 5, kind: 'goals', rewardCoins: 700 },
      {
        id: 'samba-theme',
        label: 'Vença 2 com ≥6 brasileiros titulares',
        target: 2,
        kind: 'win_theme',
        minThemePlayers: 6,
        rewardCardId: 'kaka-2007',
      },
    ],
  },
  {
    id: 'gigantes-do-golfo',
    name: 'Gigantes do Golfo & MLS',
    emoji: '🌍',
    description: 'As estrelas da Saudi Pro League e da MLS num pacote só.',
    theme: { leagueIds: ['saudi-pro-league', 'mls'] },
    pack: { costCoins: 1800, costGems: 0, cards: 3, guaranteedRarity: 'rare', epicPlusBoost: 2 },
    objectives: [
      { id: 'golfo-play3', label: 'Jogue 3 partidas', target: 3, kind: 'play', rewardCoins: 500 },
      {
        id: 'golfo-win',
        label: 'Vença 3 partidas',
        target: 3,
        kind: 'win',
        rewardCardId: 'mbappe-wc2018',
      },
    ],
  },
];

/** Semana ISO-8601 (1–53) de uma data. */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Chave estável da semana (para progresso/resgates) e evento vigente. */
export function eventWeekKey(date: Date): string {
  return `${date.getFullYear()}-W${String(isoWeek(date)).padStart(2, '0')}`;
}

export function eventForDate(date: Date): GameEvent {
  const index = (date.getFullYear() * 53 + isoWeek(date)) % EVENTS.length;
  return EVENTS[index]!;
}

/** O jogador pertence ao tema do evento? */
export function matchesTheme(theme: EventTheme, player: BasePlayer): boolean {
  if (theme.iconsOnly) return player.clubId === 'icons';
  if (theme.leagueIds && !theme.leagueIds.includes(player.leagueId)) return false;
  if (theme.nationalities && !theme.nationalities.includes(player.nationality)) return false;
  return true;
}
