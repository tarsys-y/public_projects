// Gerador de jogadores de preenchimento (SPEC seção 8): completa os elencos
// do BRASILEIRÃO (única liga sem dados licenciados do FC26) com nomes
// plausíveis. Determinístico (seed fixa) — rodar duas vezes produz o mesmo
// players-filler.json. As bases curadas nunca são tocadas.
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  mulberry32,
  randInt,
  chance,
  pickWeighted,
  OUTFIELD_OVERALL_WEIGHTS,
  type BasePlayer,
  type Club,
  type GkAttributes,
  type OutfieldAttributes,
  type Position,
  type Rng,
  GK_ATTRIBUTE_KEYS,
  OUTFIELD_ATTRIBUTE_KEYS,
} from '@squad-dynasty/engine';

const SEED = 20260702;
const TARGET_SQUAD_SIZE = 18;
const DATA_DIR = path.resolve(__dirname, '..');

// --- nomes por nacionalidade ---
const FIRST: Record<string, string[]> = {
  BR: ['Gabriel', 'Lucas', 'Matheus', 'João', 'Pedro', 'Rafael', 'Bruno', 'Thiago', 'Vinícius', 'Caio', 'Diego', 'Felipe', 'Éverton', 'Wesley', 'Igor', 'Yuri', 'Danilo', 'Renan', 'Marcos', 'Alex'],
  AR: ['Juan', 'Nicolás', 'Santiago', 'Matías', 'Franco', 'Lucas', 'Agustín', 'Emiliano', 'Gonzalo', 'Lautaro', 'Facundo', 'Ramiro'],
  UY: ['Diego', 'Federico', 'Sebastián', 'Nicolás', 'Matías', 'Agustín', 'Facundo', 'Bruno'],
  CO: ['Juan', 'Carlos', 'Andrés', 'Santiago', 'Camilo', 'Yerson', 'Duván', 'Jhon'],
  PY: ['Óscar', 'Miguel', 'Derlis', 'Gustavo', 'Ángel', 'Junior'],
  GB: ['Harry', 'Jack', 'Oliver', 'James', 'Callum', 'Mason', 'Reece', 'Jordan', 'Lewis', 'Kyle', 'Marcus', 'Ben'],
  ES: ['Álvaro', 'Sergio', 'Pablo', 'Iker', 'Mikel', 'Dani', 'Javi', 'Marco', 'Adrián', 'Unai'],
  FR: ['Lucas', 'Hugo', 'Théo', 'Kylian', 'Antoine', 'Jules', 'Aurélien', 'Mathis', 'Enzo', 'Rayan'],
  DE: ['Leon', 'Niklas', 'Jonas', 'Florian', 'Maximilian', 'Felix', 'Tim', 'Luca', 'Jamal', 'Nico'],
  IT: ['Alessandro', 'Lorenzo', 'Matteo', 'Federico', 'Davide', 'Nicolò', 'Andrea', 'Riccardo'],
  NL: ['Daan', 'Sem', 'Luuk', 'Jesse', 'Thijs', 'Ryan', 'Kenzo', 'Milan'],
  PT: ['João', 'Diogo', 'Rúben', 'Gonçalo', 'Tiago', 'Rafael', 'Vitinha', 'Nuno'],
  BE: ['Thibaut', 'Youri', 'Arthur', 'Loïs', 'Maxim', 'Senne'],
  HR: ['Luka', 'Mateo', 'Ivan', 'Marko', 'Josip', 'Ante'],
  MA: ['Achraf', 'Youssef', 'Hamza', 'Ayoub', 'Amine', 'Sofyan'],
  SN: ['Sadio', 'Idrissa', 'Ismaïla', 'Boulaye', 'Pape', 'Cheikhou'],
};
const LAST: Record<string, string[]> = {
  BR: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Almeida', 'Ribeiro', 'Carvalho', 'Gomes', 'Martins', 'Araújo', 'Barbosa', 'Rocha', 'Dias', 'Moraes', 'Teixeira', 'Cardoso', 'Farias', 'Nunes'],
  AR: ['González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Romero', 'Acuña', 'Molina', 'Correa', 'Paredes', 'Herrera', 'Sosa'],
  UY: ['Núñez', 'Olivera', 'Vecino', 'Araújo', 'Cáceres', 'Torres', 'Viña', 'Piquerez'],
  CO: ['Díaz', 'Mina', 'Uribe', 'Cuadrado', 'Arias', 'Lerma', 'Mosquera', 'Sinisterra'],
  PY: ['Almirón', 'Sanabria', 'Romero', 'Villasanti', 'Balbuena', 'Gómez'],
  GB: ['Smith', 'Jones', 'Taylor', 'Walker', 'Wright', 'Robinson', 'White', 'Turner', 'Palmer', 'Barnes', 'Gibbs', 'Chilwell'],
  ES: ['García', 'Fernández', 'Torres', 'Navas', 'Moreno', 'Vázquez', 'Gil', 'Merino', 'Llorente', 'Fornals'],
  FR: ['Martin', 'Bernard', 'Dubois', 'Moreau', 'Fofana', 'Konaté', 'Camavinga', 'Thuram', 'Diaby', 'Coman'],
  DE: ['Müller', 'Schmidt', 'Fischer', 'Weber', 'Wagner', 'Becker', 'Hofmann', 'Schlotterbeck', 'Wirtz', 'Gnabry'],
  IT: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Romano', 'Gatti', 'Scalvini', 'Ricci'],
  NL: ['de Jong', 'de Vries', 'van Dijk', 'Bakker', 'Visser', 'Timber', 'Geertruida', 'Simons'],
  PT: ['Silva', 'Santos', 'Ferreira', 'Costa', 'Neves', 'Semedo', 'Mendes', 'Ramos'],
  BE: ['Peeters', 'Janssens', 'Maertens', 'Claes', 'Openda', 'Doku'],
  HR: ['Kovačić', 'Perišić', 'Brozović', 'Gvardiol', 'Šutalo', 'Baturina'],
  MA: ['El Idrissi', 'Benali', 'Aguerd', 'Ounahi', 'Ezzalzouli', 'Saibari'],
  SN: ['Diallo', 'Ndiaye', 'Sarr', 'Gueye', 'Koulibaly', 'Camara'],
};

/** Mix de nacionalidades por país do clube (pesos). */
const NATIONALITY_MIX: Record<string, Array<[string, number]>> = {
  BR: [['BR', 70], ['AR', 8], ['UY', 8], ['CO', 6], ['PY', 4], ['PT', 4]],
  GB: [['GB', 45], ['FR', 10], ['BR', 8], ['ES', 8], ['PT', 7], ['NL', 7], ['BE', 5], ['SN', 5], ['HR', 5]],
  ES: [['ES', 50], ['BR', 10], ['AR', 10], ['FR', 10], ['PT', 8], ['MA', 6], ['UY', 6]],
  IT: [['IT', 50], ['AR', 12], ['BR', 10], ['FR', 8], ['HR', 8], ['NL', 6], ['SN', 6]],
  DE: [['DE', 55], ['FR', 12], ['NL', 10], ['IT', 8], ['BR', 8], ['MA', 7]],
  FR: [['FR', 55], ['BR', 10], ['SN', 10], ['MA', 10], ['PT', 8], ['BE', 7]],
};

/** Estrutura-alvo do elenco por posição. */
const SQUAD_TEMPLATE: Array<[Position, number]> = [
  ['GK', 2],
  ['CB', 3],
  ['LB', 2],
  ['RB', 2],
  ['CDM', 2],
  ['CM', 2],
  ['CAM', 1],
  ['LW', 1],
  ['RW', 1],
  ['ST', 2],
];

const SECONDARY_POSITION: Partial<Record<Position, Position>> = {
  CB: 'CDM',
  CDM: 'CM',
  CM: 'CAM',
  CAM: 'CM',
  LW: 'LM',
  RW: 'RM',
  LM: 'LW',
  RM: 'RW',
  ST: 'CAM',
  LB: 'LM',
  RB: 'RM',
};

/** Tier médio de atributo por liga (fillers são coadjuvantes, não estrelas). */
const LEAGUE_TIER: Record<string, number> = {
  brasileirao: 72,
  'premier-league': 78,
  'la-liga': 78,
  'serie-a-it': 77,
  bundesliga: 77,
  'ligue-1': 76,
};

function pickFrom<T>(rng: Rng, arr: T[]): T {
  return arr[randInt(rng, 0, arr.length - 1)] as T;
}

function pickNationality(rng: Rng, clubCountry: string): string {
  const mix = NATIONALITY_MIX[clubCountry] ?? [['BR', 1]];
  const idx = pickWeighted(rng, mix.map(([, w]) => w));
  return mix[idx]?.[0] ?? 'BR';
}

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function outfieldAttrs(rng: Rng, position: Exclude<Position, 'GK'>, tier: number): OutfieldAttributes {
  const weights = OUTFIELD_OVERALL_WEIGHTS[position];
  const out: Record<string, number> = {};
  for (const key of OUTFIELD_ATTRIBUTE_KEYS) {
    const w = weights[key] ?? 0;
    let value: number;
    if (w >= 2) value = tier + randInt(rng, 0, 8);
    else if (w > 0) value = tier - randInt(rng, 0, 8);
    else value = tier - randInt(rng, 14, 32);
    out[key] = clamp(value, 25, 92);
  }
  return out as unknown as OutfieldAttributes;
}

function gkAttrs(rng: Rng, tier: number): GkAttributes {
  const out: Record<string, number> = {};
  for (const key of GK_ATTRIBUTE_KEYS) {
    const core = key === 'reflexes' || key === 'handling' || key === 'gkPositioning';
    const value = core ? tier + randInt(rng, 0, 6) : tier - randInt(rng, 2, 12);
    out[key] = clamp(value, 30, 92);
  }
  return out as unknown as GkAttributes;
}

// --- geração ---
const rng = mulberry32(SEED);
const clubs: Club[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'clubs.json'), 'utf8'));
const readJson = (file: string): BasePlayer[] =>
  fs.existsSync(path.join(DATA_DIR, file))
    ? JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'))
    : [];
const curated: BasePlayer[] = [
  ...readJson('players.json'),
  ...readJson('players-br.json'),
  ...readJson('players-real.json'),
];

const usedIds = new Set(curated.map((p) => p.id));
const fillers: BasePlayer[] = [];

for (const club of clubs.filter((c) => c.leagueId === 'brasileirao')) {
  const clubPlayers = curated.filter((p) => p.clubId === club.id);
  const missing = TARGET_SQUAD_SIZE - clubPlayers.length;
  if (missing <= 0) continue;

  // Preenche primeiro as posições em falta do template, depois repete o ciclo.
  const have = new Map<Position, number>();
  for (const p of clubPlayers) {
    const main = p.positions[0] as Position;
    have.set(main, (have.get(main) ?? 0) + 1);
  }
  const needed: Position[] = [];
  while (needed.length < missing) {
    let added = false;
    for (const [position, count] of SQUAD_TEMPLATE) {
      if (needed.length >= missing) break;
      const current = (have.get(position) ?? 0) + needed.filter((p) => p === position).length;
      if (current < count) {
        needed.push(position);
        added = true;
      }
    }
    if (!added) {
      // template satisfeito: profundidade extra em posições aleatórias de linha
      const linePositions = SQUAD_TEMPLATE.filter(([p]) => p !== 'GK').map(([p]) => p);
      needed.push(pickFrom(rng, linePositions));
    }
  }

  const tier = (LEAGUE_TIER[club.leagueId] ?? 72) + randInt(rng, -2, 2);
  for (const position of needed) {
    const nationality = pickNationality(rng, club.country);
    const name = `${pickFrom(rng, FIRST[nationality] ?? FIRST.BR!)} ${pickFrom(rng, LAST[nationality] ?? LAST.BR!)}`;
    let id = slugify(name);
    let suffix = 2;
    while (usedIds.has(id)) id = `${slugify(name)}-${suffix++}`;
    usedIds.add(id);

    const positions: Position[] = [position];
    const secondary = SECONDARY_POSITION[position];
    if (position !== 'GK' && secondary && chance(rng, 0.3)) positions.push(secondary);

    fillers.push({
      id,
      name,
      nationality,
      clubId: club.id,
      leagueId: club.leagueId,
      birthYear: randInt(rng, 1992, 2007),
      positions,
      attributes:
        position === 'GK'
          ? gkAttrs(rng, tier)
          : outfieldAttrs(rng, position as Exclude<Position, 'GK'>, tier + randInt(rng, -3, 3)),
    });
  }
}

const outFile = path.join(DATA_DIR, 'players-filler.json');
fs.writeFileSync(outFile, JSON.stringify(fillers, null, 2) + '\n');
console.log(`✓ ${fillers.length} jogadores de preenchimento gerados em players-filler.json (seed ${SEED})`);
