// Gera o catálogo de cartas (cards.json) a partir da base de jogadores:
//   - 1 carta base por jogador (exceto ícones), rarity derivada do overall
//   - epic moments curadas (epic-moments.json) → frozen
//   - 1 carta icon por lenda do pseudo-clube "icons" → frozen, rarity icon
// Overall nunca é gravado na carta — continua derivado (SPEC 10.3).
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  baseRarityForOverall,
  computeOverall,
  type AnyAttributes,
  type BasePlayer,
  type CardDefinition,
} from '@squad-dynasty/engine';

const DATA_DIR = path.resolve(__dirname, '..');

function readJson<T>(file: string, optional = false): T {
  const full = path.join(DATA_DIR, file);
  if (optional && !fs.existsSync(full)) return [] as T;
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

interface EpicMoment {
  id: string;
  basePlayerId: string;
  label: string;
  rarity: 'epic' | 'legendary';
  attributes: AnyAttributes;
}

const icons = readJson<BasePlayer[]>('players.json');
const curatedBr = readJson<BasePlayer[]>('players-br.json', true);
const real = readJson<BasePlayer[]>('players-real.json', true);
const filler = readJson<BasePlayer[]>('players-filler.json', true);
const epicMoments = readJson<EpicMoment[]>('epic-moments.json');
const players = [...icons, ...curatedBr, ...real, ...filler];

const cards: CardDefinition[] = [];

for (const player of players) {
  if (player.clubId === 'icons') continue; // lendas só existem como carta icon
  const overall = computeOverall(player.attributes, player.positions[0] ?? 'ST');
  cards.push({
    id: `${player.id}-base`,
    basePlayerId: player.id,
    version: 'base',
    rarity: baseRarityForOverall(overall),
    attributes: player.attributes,
    frozen: false,
  });
}

for (const moment of epicMoments) {
  cards.push({
    id: moment.id,
    basePlayerId: moment.basePlayerId,
    version: 'epic_moment',
    rarity: moment.rarity,
    label: moment.label,
    attributes: moment.attributes,
    frozen: true,
  });
}

for (const legend of players.filter((p) => p.clubId === 'icons')) {
  cards.push({
    id: `${legend.id}-icon`,
    basePlayerId: legend.id,
    version: 'icon',
    rarity: 'icon',
    label: 'Lenda',
    attributes: legend.attributes,
    frozen: true,
  });
}

const byRarity = cards.reduce<Record<string, number>>((acc, c) => {
  acc[c.rarity] = (acc[c.rarity] ?? 0) + 1;
  return acc;
}, {});

fs.writeFileSync(path.join(DATA_DIR, 'cards.json'), JSON.stringify(cards, null, 2) + '\n');
console.log(
  `✓ cards.json: ${cards.length} cartas (${Object.entries(byRarity)
    .map(([r, n]) => `${r} ${n}`)
    .join(', ')})`,
);
