// Baixa os escudos reais mapeados em crest-map.json para assets/crests/
// (usa curl para respeitar o proxy do ambiente). Clubes sem entrada no mapa
// ficam com o monograma gerado pelo app (ClubCrest). Idempotente: pula
// arquivos já baixados; --force rebaixa tudo.
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DATA_DIR = path.resolve(__dirname, '..');
const CRESTS_DIR = path.join(DATA_DIR, 'assets', 'crests');
const MAP_FILE = path.join(__dirname, 'crest-map.json');

interface CrestEntry {
  format: 'png' | 'svg';
  url: string;
}

const force = process.argv.includes('--force');
const map: Record<string, CrestEntry> = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
fs.mkdirSync(CRESTS_DIR, { recursive: true });

let ok = 0;
let skipped = 0;
const failed: string[] = [];

for (const [clubId, entry] of Object.entries(map)) {
  const dest = path.join(CRESTS_DIR, `${clubId}.${entry.format}`);
  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 100) {
    skipped++;
    continue;
  }
  try {
    execFileSync('curl', ['-sS', '--fail', '-o', dest, entry.url], { timeout: 30_000 });
    const size = fs.statSync(dest).size;
    if (size < 100) throw new Error(`arquivo suspeito (${size}b)`);
    ok++;
  } catch (e) {
    failed.push(`${clubId}: ${(e as Error).message}`);
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
  }
}

console.log(`✓ escudos: ${ok} baixados, ${skipped} já existiam, ${failed.length} falhas`);
for (const f of failed) console.warn(`  ✗ ${f}`);
if (failed.length > 0) process.exit(1);
