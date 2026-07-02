// CLI de simulação (aceite M2):
//   npm run sim -- --home cli/fixtures/squadA.json --away cli/fixtures/squadB.json --seed 42
//   npm run sim -- --home ... --away ... --seed 1 --runs 1000   (distribuição V/E/D)
//
// Formato do arquivo de elenco:
//   { "club": "flamengo", "formation": "4-3-3" }            → XI automático do clube
//   { "formation": "4-3-3", "tactics": {...}, "players": [{"playerId","role"?}×11], "bench": [...] }
// Os jogadores vêm de packages/data (players.json + players-filler.json, cartas base).
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  buildAutoSquad,
  buildCatalog,
  computeRoleFit,
  FORMATIONS,
  resolveSquad,
  rolesForPosition,
  simulateMatch,
  DEFAULT_TACTICS,
  type BasePlayer,
  type CardDefinition,
  type MatchResult,
  type OwnedCard,
  type ResolvedSquad,
  type RoleId,
  type Squad,
  type Tactics,
} from '../src';

interface SquadFile {
  club?: string;
  formation?: string;
  tactics?: Partial<Tactics>;
  players?: Array<{ playerId: string; role?: RoleId }>;
  bench?: string[];
}

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--')) {
      args[arg.slice(2)] = argv[i + 1] ?? '';
      i++;
    }
  }
  return args;
}

/** Resolve caminho relativo ao diretório de onde o npm foi invocado (INIT_CWD). */
function resolveInput(file: string): string {
  if (path.isAbsolute(file)) return file;
  const candidates = [
    path.resolve(process.env.INIT_CWD ?? process.cwd(), file),
    path.resolve(process.cwd(), file),
    path.resolve(__dirname, file),
  ];
  return candidates.find((c) => fs.existsSync(c)) ?? candidates[0]!;
}

function loadData(dataDir: string): { players: BasePlayer[]; cards: CardDefinition[] } {
  const read = <T>(file: string, optional = false): T => {
    const full = path.join(dataDir, file);
    if (optional && !fs.existsSync(full)) return [] as T;
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  };
  const players = [
    ...read<BasePlayer[]>('players.json'),
    ...read<BasePlayer[]>('players-filler.json', true),
  ];
  const cards = read<CardDefinition[]>('cards.json');
  if (cards.length === 0) {
    console.error('cards.json não encontrado — rode `npm run data:generate` primeiro.');
    process.exit(1);
  }
  return { players, cards };
}

function buildFromFile(
  file: string,
  players: BasePlayer[],
  cards: CardDefinition[],
): ResolvedSquad {
  const spec: SquadFile = JSON.parse(fs.readFileSync(resolveInput(file), 'utf8'));
  const formationId = spec.formation ?? '4-3-3';
  const baseCards = cards.filter((c) => c.version === 'base');

  if (spec.club) {
    const clubPlayers = players.filter((p) => p.clubId === spec.club);
    if (clubPlayers.length < 18) {
      console.error(`Clube "${spec.club}" tem só ${clubPlayers.length} jogadores no pool.`);
      process.exit(1);
    }
    const ids = new Set(clubPlayers.map((p) => p.id));
    const { squad, ownedCards } = buildAutoSquad(
      clubPlayers,
      baseCards.filter((c) => ids.has(c.basePlayerId)),
      formationId,
      { tactics: spec.tactics ? { ...DEFAULT_TACTICS, ...spec.tactics } : undefined },
    );
    return resolveSquad(squad, new Map(ownedCards.map((o) => [o.id, o])), buildCatalog(players, cards));
  }

  if (!spec.players || spec.players.length !== 11) {
    console.error(`${file}: informe "club" ou exatamente 11 "players" na ordem dos slots.`);
    process.exit(1);
  }
  const formation = FORMATIONS[formationId];
  if (!formation) {
    console.error(`Formação desconhecida: ${formationId}`);
    process.exit(1);
  }
  const cardByPlayer = new Map(baseCards.map((c) => [c.basePlayerId, c]));
  const ownedCards: OwnedCard[] = [];
  const own = (playerId: string): OwnedCard => {
    const card = cardByPlayer.get(playerId);
    if (!card) {
      console.error(`Jogador sem carta base: ${playerId}`);
      process.exit(1);
    }
    const owned: OwnedCard = {
      id: `cli-${playerId}`,
      ownerId: 'cli',
      cardDefId: card.id,
      age: 27,
      attributeDeltas: {},
      evolutionLevel: 0,
      starterStreak: 0,
      acquiredAt: 0,
    };
    ownedCards.push(owned);
    return owned;
  };

  const starters = spec.players.map((entry, i) => {
    const slot = formation.slots[i]!;
    const owned = own(entry.playerId);
    const card = cardByPlayer.get(entry.playerId)!;
    const role =
      entry.role ??
      rolesForPosition(slot.position)
        .map((r) => ({ id: r.id, fit: computeRoleFit(card.attributes, r.id) }))
        .sort((a, b) => b.fit - a.fit)[0]!.id;
    return { position: slot.position, role, ownedCardId: owned.id };
  });
  const bench = (spec.bench ?? []).slice(0, 7).map((id) => own(id).id);

  const squad: Squad = {
    formation: formationId,
    starters,
    bench,
    tactics: { ...DEFAULT_TACTICS, ...spec.tactics },
  };
  return resolveSquad(squad, new Map(ownedCards.map((o) => [o.id, o])), buildCatalog(players, cards));
}

function printMatch(result: MatchResult, home: ResolvedSquad, away: ResolvedSquad): void {
  const nameOf = (squad: ResolvedSquad) =>
    squad.slots[0]?.player.basePlayer.clubId ?? 'time';
  console.log(`\n=== ${nameOf(home)} ${result.score[0]} x ${result.score[1]} ${nameOf(away)}  (seed ${result.seed}) ===\n`);
  for (const event of result.events) {
    if (['tackle', 'interception'].includes(event.type)) continue; // ruído no terminal
    console.log(`${String(event.minute).padStart(3)}' ${event.detail}`);
  }
  console.log('\n--- Estatísticas (casa x fora) ---');
  const s = result.stats;
  console.log(`Posse: ${s.home.possession}% x ${s.away.possession}%`);
  console.log(`Chutes (no gol): ${s.home.shots} (${s.home.shotsOnTarget}) x ${s.away.shots} (${s.away.shotsOnTarget})`);
  console.log(`xG: ${s.home.xg.toFixed(2)} x ${s.away.xg.toFixed(2)}`);
  console.log(`Faltas: ${s.home.fouls} x ${s.away.fouls} | Amarelos: ${s.home.yellowCards} x ${s.away.yellowCards} | Vermelhos: ${s.home.redCards} x ${s.away.redCards}`);
  console.log('\n--- Notas ---');
  const sorted = [...result.ratings].sort((a, b) => b.rating - a.rating);
  for (const r of sorted) {
    console.log(`  ${r.rating.toFixed(1)}  ${r.name} (${r.side === 'home' ? 'casa' : 'fora'})`);
  }
  if (result.decisions.length > 0) {
    console.log('\n--- Momentos de decisão ---');
    for (const d of result.decisions) {
      console.log(`  ${d.minute}' [${d.side}] ${d.description}${d.aiChoiceId ? ` → IA: ${d.aiChoiceId}` : ''}`);
    }
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.home || !args.away) {
    console.error('Uso: npm run sim -- --home squadA.json --away squadB.json --seed 42 [--runs N]');
    process.exit(1);
  }
  const dataDir = args.data ?? path.resolve(__dirname, '../../data');
  const { players, cards } = loadData(dataDir);
  const home = buildFromFile(args.home, players, cards);
  const away = buildFromFile(args.away, players, cards);
  const seed = Number(args.seed ?? 42);
  const runs = Number(args.runs ?? 1);

  if (runs <= 1) {
    const result = simulateMatch({ home, away, seed, homeController: 'ai', awayController: 'ai' });
    printMatch(result, home, away);
    return;
  }

  let w = 0;
  let d = 0;
  let l = 0;
  let goalsHome = 0;
  let goalsAway = 0;
  for (let i = 0; i < runs; i++) {
    const result = simulateMatch({
      home,
      away,
      seed: seed + i,
      homeController: 'ai',
      awayController: 'ai',
    });
    const [gh, ga] = result.score;
    goalsHome += gh;
    goalsAway += ga;
    if (gh > ga) w++;
    else if (gh === ga) d++;
    else l++;
  }
  console.log(`${runs} partidas (seeds ${seed}–${seed + runs - 1}):`);
  console.log(`  Casa ${((100 * w) / runs).toFixed(1)}% V | ${((100 * d) / runs).toFixed(1)}% E | ${((100 * l) / runs).toFixed(1)}% D`);
  console.log(`  Gols médios: ${(goalsHome / runs).toFixed(2)} x ${(goalsAway / runs).toFixed(2)}`);
}

main();
