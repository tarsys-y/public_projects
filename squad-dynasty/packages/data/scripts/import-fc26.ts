// Importa o dataset EA FC 26 (sources/fc26-trimmed.csv, temporada 2025/26)
// para players-real.json — as 9 ligas licenciadas do jogo. NUNCA editar o
// players-real.json à mão: rode este script. O Brasileirão não tem licença no
// FC26 (jogadores fictícios), por isso é curado à parte em players-br.json.
//
// Cap de 24 jogadores por clube (por overall do dataset), garantindo ≥2 GKs.
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { BasePlayer, GkAttributes, OutfieldAttributes, Position } from '@squad-dynasty/engine';

const DATA_DIR = path.resolve(__dirname, '..');
const SOURCE = path.join(DATA_DIR, 'sources', 'fc26-trimmed.csv');
const MAX_PER_CLUB = 24;
const MIN_GK_PER_CLUB = 2;

/** league_id do FC26 → leagueId do jogo (nomes de liga colidem; id é a verdade). */
const LEAGUE_BY_ID: Record<string, string> = {
  '13': 'premier-league',
  '53': 'la-liga',
  '31': 'serie-a-it',
  '19': 'bundesliga',
  '16': 'ligue-1',
  '308': 'primeira-liga',
  '10': 'eredivisie',
  '39': 'mls',
  '350': 'saudi-pro-league',
};

/**
 * nationality_name → código de 2 letras. Home nations usam códigos de jogo
 * (EN/SC/WL/NI) para a química diferenciá-las; demais seguem ISO 3166-1.
 */
const NATIONALITY: Record<string, string> = {
  England: 'EN', Scotland: 'SC', Wales: 'WL', 'Northern Ireland': 'NI',
  'Republic of Ireland': 'IE', Brazil: 'BR', Argentina: 'AR', Uruguay: 'UY',
  Colombia: 'CO', Chile: 'CL', Paraguay: 'PY', Peru: 'PE', Ecuador: 'EC',
  Venezuela: 'VE', Bolivia: 'BO', Mexico: 'MX', 'United States': 'US',
  Canada: 'CA', 'Costa Rica': 'CR', Panama: 'PA', Honduras: 'HN',
  Jamaica: 'JM', 'Trinidad and Tobago': 'TT', Spain: 'ES', Portugal: 'PT',
  France: 'FR', Germany: 'DE', Italy: 'IT', Netherlands: 'NL', Belgium: 'BE',
  Switzerland: 'CH', Austria: 'AT', Denmark: 'DK', Sweden: 'SE', Norway: 'NO',
  Finland: 'FI', Iceland: 'IS', Poland: 'PL', 'Czech Republic': 'CZ', Czechia: 'CZ',
  Slovakia: 'SK', Hungary: 'HU', Romania: 'RO', Bulgaria: 'BG', Greece: 'GR',
  Croatia: 'HR', Serbia: 'RS', 'Bosnia and Herzegovina': 'BA', Slovenia: 'SI',
  'North Macedonia': 'MK', Albania: 'AL', Montenegro: 'ME', Kosovo: 'XK',
  Ukraine: 'UA', Russia: 'RU', Belarus: 'BY', Georgia: 'GE', Armenia: 'AM',
  Azerbaijan: 'AZ', Turkey: 'TR', Türkiye: 'TR', Israel: 'IL', Cyprus: 'CY',
  Malta: 'MT', Luxembourg: 'LU', Estonia: 'EE', Latvia: 'LV', Lithuania: 'LT',
  Morocco: 'MA', Algeria: 'DZ', Tunisia: 'TN', Egypt: 'EG', Libya: 'LY',
  Senegal: 'SN', 'Ivory Coast': 'CI', "Côte d'Ivoire": 'CI', Ghana: 'GH',
  Nigeria: 'NG', Cameroon: 'CM', Mali: 'ML', 'Burkina Faso': 'BF', Guinea: 'GN',
  'Guinea Bissau': 'GW', 'Guinea-Bissau': 'GW', Gambia: 'GM', 'Cabo Verde': 'CV', Togo: 'TG', Benin: 'BJ', Gabon: 'GA',
  'Congo DR': 'CD', 'DR Congo': 'CD', Congo: 'CG', Angola: 'AO', Mozambique: 'MZ',
  'Cape Verde Islands': 'CV', 'Cape Verde': 'CV', 'South Africa': 'ZA',
  Zimbabwe: 'ZW', Zambia: 'ZM', Kenya: 'KE', Tanzania: 'TZ', Uganda: 'UG',
  'Equatorial Guinea': 'GQ', Madagascar: 'MG', Comoros: 'KM', Burundi: 'BI',
  'Central African Republic': 'CF', Chad: 'TD', Niger: 'NE', Mauritania: 'MR',
  Ethiopia: 'ET', Eritrea: 'ER', Sudan: 'SD', 'Sierra Leone': 'SL', Liberia: 'LR',
  'Saudi Arabia': 'SA', 'United Arab Emirates': 'AE', Qatar: 'QA', Kuwait: 'KW',
  Bahrain: 'BH', Oman: 'OM', Yemen: 'YE', Jordan: 'JO', Lebanon: 'LB',
  Syria: 'SY', Iraq: 'IQ', Iran: 'IR', Japan: 'JP', 'Korea Republic': 'KR',
  'South Korea': 'KR', 'Korea DPR': 'KP', China: 'CN', 'China PR': 'CN',
  Australia: 'AU', 'New Zealand': 'NZ', India: 'IN', Uzbekistan: 'UZ',
  Kazakhstan: 'KZ', Tajikistan: 'TJ', Kyrgyzstan: 'KG', Turkmenistan: 'TM',
  Philippines: 'PH', Indonesia: 'ID', Thailand: 'TH', Vietnam: 'VN',
  Malaysia: 'MY', Singapore: 'SG', 'Hong Kong': 'HK', 'Chinese Taipei': 'TW',
  Grenada: 'GD', Guadeloupe: 'GP', Martinique: 'MQ', Curacao: 'CW', Curaçao: 'CW',
  Suriname: 'SR', Guyana: 'GY', Haiti: 'HT', 'Dominican Republic': 'DO',
  Cuba: 'CU', 'Puerto Rico': 'PR', 'El Salvador': 'SV', Guatemala: 'GT',
  Nicaragua: 'NI', Belize: 'BZ', Bermuda: 'BM', 'Saint Kitts and Nevis': 'KN',
  'Antigua and Barbuda': 'AG', 'Saint Lucia': 'LC', Barbados: 'BB',
  'New Caledonia': 'NC', Fiji: 'FJ', 'Papua New Guinea': 'PG',
  'Faroe Islands': 'FO', Gibraltar: 'GI', Andorra: 'AD', 'San Marino': 'SM',
  Liechtenstein: 'LI', Moldova: 'MD', Kosovan: 'XK', Palestine: 'PS',
};

const POSITION_MAP: Record<string, Position> = {
  GK: 'GK', CB: 'CB', LB: 'LB', RB: 'RB', LWB: 'LB', RWB: 'RB',
  CDM: 'CDM', CM: 'CM', CAM: 'CAM', LM: 'LM', RM: 'RM',
  LW: 'LW', RW: 'RW', ST: 'ST', CF: 'ST',
};

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const clamp = (v: number, lo = 1, hi = 99) => Math.max(lo, Math.min(hi, Math.round(v)));

/** Parser CSV minimalista com suporte a campos entre aspas. */
function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          quoted = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ',') {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };
  const header = parseLine(lines[0]!);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    return Object.fromEntries(header.map((h, i) => [h, values[i] ?? '']));
  });
}

interface Row extends Record<string, string> {}

const num = (row: Row, key: string, fallback = 50): number => {
  const v = Number(row[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

function outfieldFrom(row: Row): OutfieldAttributes {
  const reactions = num(row, 'movement_reactions');
  const composure = num(row, 'mentality_composure');
  const reputation = num(row, 'international_reputation', 1);
  const marking = num(row, 'defending_marking_awareness');
  const interceptions = num(row, 'mentality_interceptions');
  return {
    acceleration: clamp(num(row, 'movement_acceleration')),
    sprintSpeed: clamp(num(row, 'movement_sprint_speed')),
    finishing: clamp(num(row, 'attacking_finishing')),
    shotPower: clamp(num(row, 'power_shot_power')),
    heading: clamp(num(row, 'attacking_heading_accuracy')),
    offPositioning: clamp(num(row, 'mentality_positioning')),
    shortPass: clamp(num(row, 'attacking_short_passing')),
    longPass: clamp(num(row, 'skill_long_passing')),
    crossing: clamp(num(row, 'attacking_crossing')),
    vision: clamp(num(row, 'mentality_vision')),
    dribbling: clamp(num(row, 'skill_dribbling')),
    ballControl: clamp(num(row, 'skill_ball_control')),
    agility: clamp(num(row, 'movement_agility')),
    marking: clamp(marking),
    tackling: clamp(
      (num(row, 'defending_standing_tackle') * 2 + num(row, 'defending_sliding_tackle')) / 3,
    ),
    interceptions: clamp(interceptions),
    defPositioning: clamp((marking + interceptions) / 2),
    strength: clamp(num(row, 'power_strength')),
    stamina: clamp(num(row, 'power_stamina')),
    jumping: clamp(num(row, 'power_jumping')),
    composure: clamp(composure),
    // FC26 não tem consistency/bigGame: reactions é o melhor proxy de
    // regularidade; decisão em jogo grande cresce com reputação internacional.
    consistency: clamp(reactions),
    bigGame: clamp(composure * 0.5 + reactions * 0.3 + reputation * 4 + 6),
  };
}

function gkFrom(row: Row): GkAttributes {
  const reactions = num(row, 'movement_reactions');
  const composure = num(row, 'mentality_composure');
  const reputation = num(row, 'international_reputation', 1);
  return {
    reflexes: clamp(num(row, 'goalkeeping_reflexes')),
    handling: clamp(num(row, 'goalkeeping_handling')),
    rushingOut: clamp(num(row, 'goalkeeping_diving')),
    kicking: clamp(num(row, 'goalkeeping_kicking')),
    gkPositioning: clamp(num(row, 'goalkeeping_positioning')),
    composure: clamp(composure),
    consistency: clamp(reactions),
    bigGame: clamp(composure * 0.5 + reactions * 0.3 + reputation * 4 + 6),
  };
}

function positionsFrom(row: Row): Position[] {
  const seen = new Set<Position>();
  for (const raw of row.player_positions!.split(',').map((p) => p.trim())) {
    const mapped = POSITION_MAP[raw];
    if (mapped && !seen.has(mapped)) seen.add(mapped);
  }
  return seen.size > 0 ? [...seen].slice(0, 3) : ['CM'];
}

function birthYearFrom(row: Row): number {
  const match = /(\d{4})/.exec(row.dob ?? '');
  if (match) return Number(match[1]);
  return 2026 - num(row, 'age', 26);
}

function main(): void {
  const rows = parseCsv(fs.readFileSync(SOURCE, 'utf8'));
  const candidates: Array<{ row: Row; clubId: string; leagueId: string; overall: number }> = [];
  const unknownNationalities = new Set<string>();

  // agrupa por clube para aplicar o cap
  const byClub = new Map<string, Row[]>();
  for (const row of rows) {
    const leagueId = LEAGUE_BY_ID[row.league_id ?? ''];
    if (!leagueId) continue;
    const key = `${slugify(row.club_name!)}|${leagueId}`;
    if (!byClub.has(key)) byClub.set(key, []);
    byClub.get(key)!.push(row);
  }

  for (const [key, clubRows] of [...byClub.entries()].sort()) {
    const [clubId, leagueId] = key.split('|') as [string, string];
    const sorted = clubRows.slice().sort((a, b) => num(b, 'overall') - num(a, 'overall'));
    const isGkRow = (r: Row) => r.player_positions!.startsWith('GK');
    const picked = sorted.slice(0, MAX_PER_CLUB);
    // garante GKs suficientes dentro do cap
    const gks = picked.filter(isGkRow).length;
    if (gks < MIN_GK_PER_CLUB) {
      const extraGks = sorted.filter(isGkRow).slice(gks, MIN_GK_PER_CLUB);
      const nonGk = picked.filter((r) => !isGkRow(r));
      picked.length = 0;
      picked.push(...nonGk.slice(0, MAX_PER_CLUB - MIN_GK_PER_CLUB - gks + gks), ...sorted.filter(isGkRow).slice(0, MIN_GK_PER_CLUB));
      while (picked.length > MAX_PER_CLUB) picked.pop();
      void extraGks;
    }

    for (const row of picked) {
      candidates.push({ row, clubId, leagueId, overall: num(row, 'overall') });
    }
  }

  // Slugs: em colisão de nomes (ex: os irmãos Bellingham), o slug limpo vai
  // para o jogador de maior overall; os demais ganham sufixo do player_id.
  const byBaseSlug = new Map<string, typeof candidates>();
  for (const c of candidates) {
    const base = slugify(c.row.short_name!) || `player-${c.row.player_id}`;
    if (!byBaseSlug.has(base)) byBaseSlug.set(base, []);
    byBaseSlug.get(base)!.push(c);
  }
  const players: BasePlayer[] = [];
  for (const [base, group] of byBaseSlug) {
    group.sort((a, b) => b.overall - a.overall);
    group.forEach(({ row, clubId, leagueId }, i) => {
      const id = i === 0 ? base : `${base}-${row.player_id}`;
      const nationality = NATIONALITY[row.nationality_name!] ?? 'XX';
      if (nationality === 'XX') unknownNationalities.add(row.nationality_name!);
      const positions = positionsFrom(row);
      players.push({
        id,
        name: row.short_name!,
        nationality,
        clubId,
        leagueId,
        birthYear: birthYearFrom(row),
        positions,
        attributes: positions[0] === 'GK' ? gkFrom(row) : outfieldFrom(row),
      });
    });
  }

  players.sort((a, b) => a.clubId.localeCompare(b.clubId) || a.id.localeCompare(b.id));
  fs.writeFileSync(
    path.join(DATA_DIR, 'players-real.json'),
    JSON.stringify(players, null, 2) + '\n',
  );
  const leagues = new Map<string, number>();
  for (const p of players) leagues.set(p.leagueId, (leagues.get(p.leagueId) ?? 0) + 1);
  console.log(`✓ players-real.json: ${players.length} jogadores de ${byClub.size} clubes`);
  for (const [league, n] of [...leagues.entries()].sort()) console.log(`   ${league}: ${n}`);
  if (unknownNationalities.size > 0) {
    console.warn(`⚠ nacionalidades sem mapeamento (usando XX): ${[...unknownNationalities].join(', ')}`);
  }
}

main();
