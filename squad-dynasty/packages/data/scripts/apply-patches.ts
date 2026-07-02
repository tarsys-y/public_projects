// Aplica os patches de patches/*.json sobre players-real.json (estilo
// Brasfoot, SPEC §8): mantém a base gerada do FC26 atualizável sem tocar no
// import. Roda DEPOIS do import-fc26 no encadeamento do data:generate.
//
// Formato: { description, ops: [
//   { op: 'move',   playerId, toClubId, note? }
//   { op: 'adjust', playerId, attributes: {parcial}, note? }
//   { op: 'remove', playerId, note? }
//   { op: 'add',    player: BasePlayer, note? }
// ]}
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { BasePlayer, Club } from '@squad-dynasty/engine';

const DATA_DIR = path.resolve(__dirname, '..');
const PATCHES_DIR = path.join(DATA_DIR, 'patches');
const TARGET = path.join(DATA_DIR, 'players-real.json');

interface PatchOp {
  op: 'move' | 'adjust' | 'remove' | 'add';
  playerId?: string;
  toClubId?: string;
  attributes?: Record<string, number>;
  player?: BasePlayer;
  note?: string;
}

interface PatchFile {
  description?: string;
  ops: PatchOp[];
}

if (!fs.existsSync(PATCHES_DIR)) {
  console.log('✓ patches: nenhum diretório de patches; nada a aplicar');
  process.exit(0);
}

const players: BasePlayer[] = JSON.parse(fs.readFileSync(TARGET, 'utf8'));
const clubs: Club[] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'clubs.json'), 'utf8'));
const clubById = new Map(clubs.map((c) => [c.id, c]));
const byId = new Map(players.map((p) => [p.id, p]));

let applied = 0;
let skipped = 0;
const warnings: string[] = [];

const patchFiles = fs
  .readdirSync(PATCHES_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort();

for (const file of patchFiles) {
  const patch: PatchFile = JSON.parse(fs.readFileSync(path.join(PATCHES_DIR, file), 'utf8'));
  for (const op of patch.ops ?? []) {
    switch (op.op) {
      case 'move': {
        const player = byId.get(op.playerId ?? '');
        const club = clubById.get(op.toClubId ?? '');
        if (!player) {
          warnings.push(`${file}: move de "${op.playerId}" ignorado (jogador não existe)`);
          skipped++;
          break;
        }
        if (!club) {
          warnings.push(`${file}: move de "${op.playerId}" ignorado (clube "${op.toClubId}" não existe)`);
          skipped++;
          break;
        }
        player.clubId = club.id;
        player.leagueId = club.leagueId;
        applied++;
        break;
      }
      case 'adjust': {
        const player = byId.get(op.playerId ?? '');
        if (!player || !op.attributes) {
          skipped++;
          break;
        }
        const attrs = player.attributes as unknown as Record<string, number>;
        for (const [key, value] of Object.entries(op.attributes)) {
          if (key in attrs && typeof value === 'number') {
            attrs[key] = Math.max(0, Math.min(99, Math.round(value)));
          }
        }
        applied++;
        break;
      }
      case 'remove': {
        if (byId.delete(op.playerId ?? '')) applied++;
        else skipped++;
        break;
      }
      case 'add': {
        if (!op.player?.id || byId.has(op.player.id)) {
          warnings.push(`${file}: add ignorado (id ausente ou duplicado: ${op.player?.id})`);
          skipped++;
          break;
        }
        if (!clubById.has(op.player.clubId)) {
          warnings.push(`${file}: add de "${op.player.id}" ignorado (clube inexistente)`);
          skipped++;
          break;
        }
        byId.set(op.player.id, op.player);
        applied++;
        break;
      }
    }
  }
}

const out = [...byId.values()].sort(
  (a, b) => a.clubId.localeCompare(b.clubId) || a.id.localeCompare(b.id),
);
fs.writeFileSync(TARGET, JSON.stringify(out, null, 2) + '\n');
console.log(`✓ patches: ${applied} ops aplicadas, ${skipped} ignoradas (${patchFiles.length} arquivo(s))`);
for (const w of warnings) console.warn(`  ⚠ ${w}`);
