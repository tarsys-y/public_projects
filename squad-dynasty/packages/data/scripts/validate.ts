// Validador da base de dados (SPEC seção 8): schema + faixas 0–99 + integridade
// referencial. Roda com `npm run data:validate`; sai com código 1 em erro.
// Valida também players-filler.json e cards.json quando existem.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import {
  appearanceSchema,
  basePlayerSchema,
  cardDefinitionSchema,
  clubSchema,
  epicMomentSchema,
} from './schema';

const DATA_DIR = path.resolve(__dirname, '..');
const errors: string[] = [];

function readJson(file: string): unknown | undefined {
  const full = path.join(DATA_DIR, file);
  if (!fs.existsSync(full)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    errors.push(`${file}: JSON inválido — ${(e as Error).message}`);
    return undefined;
  }
}

function validateArray<T>(file: string, data: unknown, schema: z.ZodType<T>): T[] {
  if (data === undefined) return [];
  if (!Array.isArray(data)) {
    errors.push(`${file}: esperado um array`);
    return [];
  }
  const out: T[] = [];
  data.forEach((item, i) => {
    const result = schema.safeParse(item);
    if (result.success) {
      out.push(result.data);
    } else {
      const id = (item as { id?: string })?.id ?? `#${i}`;
      for (const issue of result.error.issues) {
        errors.push(`${file} [${id}] ${issue.path.join('.')}: ${issue.message}`);
      }
    }
  });
  return out;
}

function checkUnique(file: string, ids: string[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${file}: id duplicado "${id}"`);
    seen.add(id);
  }
}

// --- carga e validação de schema ---
const clubs = validateArray('clubs.json', readJson('clubs.json'), clubSchema);
const icons = validateArray('players.json', readJson('players.json'), basePlayerSchema);
const curatedBr = validateArray('players-br.json', readJson('players-br.json'), basePlayerSchema);
const real = validateArray('players-real.json', readJson('players-real.json'), basePlayerSchema);
const filler = validateArray('players-filler.json', readJson('players-filler.json'), basePlayerSchema);
const epicMoments = validateArray('epic-moments.json', readJson('epic-moments.json'), epicMomentSchema);
const cards = validateArray('cards.json', readJson('cards.json'), cardDefinitionSchema);
const appearances = validateArray('appearance.json', readJson('appearance.json'), appearanceSchema);

const players = [...icons, ...curatedBr, ...real, ...filler];

checkUnique('clubs.json', clubs.map((c) => c.id));
checkUnique('players(4 arquivos)', players.map((p) => p.id));
checkUnique('epic-moments.json', epicMoments.map((e) => e.id));
checkUnique('cards.json', cards.map((c) => c.id));
checkUnique('appearance.json', appearances.map((a) => a.playerId));

// --- integridade referencial ---
const clubIds = new Set(clubs.map((c) => c.id));
const clubLeague = new Map(clubs.map((c) => [c.id, c.leagueId]));
const playerIds = new Set(players.map((p) => p.id));

for (const p of players) {
  if (!clubIds.has(p.clubId)) errors.push(`players: ${p.id} referencia clube inexistente "${p.clubId}"`);
  else if (clubLeague.get(p.clubId) !== p.leagueId)
    errors.push(`players: ${p.id} leagueId "${p.leagueId}" difere da liga do clube "${p.clubId}"`);
}
for (const e of epicMoments) {
  if (!playerIds.has(e.basePlayerId))
    errors.push(`epic-moments: ${e.id} referencia jogador inexistente "${e.basePlayerId}"`);
}
for (const c of cards) {
  if (!playerIds.has(c.basePlayerId))
    errors.push(`cards: ${c.id} referencia jogador inexistente "${c.basePlayerId}"`);
  if ((c.version === 'epic_moment' || c.version === 'icon') && !c.frozen)
    errors.push(`cards: ${c.id} versão ${c.version} deveria ser frozen`);
}
for (const a of appearances) {
  if (!playerIds.has(a.playerId))
    errors.push(`appearance: referencia jogador inexistente "${a.playerId}"`);
}

// --- resultado ---
if (errors.length > 0) {
  console.error(`✗ Validação falhou com ${errors.length} erro(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `✓ Base válida: ${clubs.length} clubes, ${icons.length} ícones + ${curatedBr.length} BR curados + ${real.length} reais (FC26)` +
    (filler.length ? ` + ${filler.length} fillers` : '') +
    `, ${epicMoments.length} epic moments` +
    (cards.length ? `, ${cards.length} cartas no catálogo` : '') +
    (appearances.length ? `, ${appearances.length} aparências curadas` : ''),
);
