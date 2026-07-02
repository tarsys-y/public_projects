// Gera apps/mobile/src/services/crests.ts a partir de assets/crests/:
// - PNGs viram require() estáticos (exigência do Metro)
// - SVGs são embutidos como string (react-native-svg SvgXml)
// Clubes sem arquivo usam o monograma do componente ClubCrest.
import * as fs from 'node:fs';
import * as path from 'node:path';

const DATA_DIR = path.resolve(__dirname, '..');
const CRESTS_DIR = path.join(DATA_DIR, 'assets', 'crests');
const OUT_FILE = path.resolve(
  DATA_DIR,
  '..',
  '..',
  'apps',
  'mobile',
  'src',
  'services',
  'crests.ts',
);

const files = fs.existsSync(CRESTS_DIR) ? fs.readdirSync(CRESTS_DIR).sort() : [];
const pngs = files.filter((f) => f.endsWith('.png'));
const svgs = files.filter((f) => f.endsWith('.svg'));

const pngEntries = pngs
  .map((f) => {
    const id = f.replace(/\.png$/, '');
    return `  '${id}': require('../../../../packages/data/assets/crests/${f}'),`;
  })
  .join('\n');

const svgEntries = svgs
  .map((f) => {
    const id = f.replace(/\.svg$/, '');
    const xml = fs
      .readFileSync(path.join(CRESTS_DIR, f), 'utf8')
      .replace(/`/g, '\\`')
      .replace(/\$\{/g, '\\${');
    return `  '${id}': \`${xml}\`,`;
  })
  .join('\n');

const content = `// GERADO por packages/data/scripts/generate-crest-index.ts — NÃO EDITAR.
// Escudos reais: PNG (require estático p/ Metro) e SVG (string p/ SvgXml).

export const crestPngs: Record<string, number> = {
${pngEntries}
};

export const crestSvgs: Record<string, string> = {
${svgEntries}
};
`;

fs.writeFileSync(OUT_FILE, content);
console.log(`✓ crests.ts: ${pngs.length} PNGs + ${svgs.length} SVGs`);
