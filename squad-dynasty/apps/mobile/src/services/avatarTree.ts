// Builder PURO do avatar caricatura big-head: recebe a aparência resolvida e
// devolve uma árvore SVG neutra (sem React) — o PlayerAvatar renderiza com
// react-native-svg e a prévia headless serializa a MESMA árvore para HTML.
// Estilo: cabeça ~60% do busto, contorno grosso, olhos grandes, cores chapadas.
import type {
  Beard,
  EyeColor,
  FaceShape,
  HairColor,
  HairStyle,
} from '../../../../packages/data/appearance-taxonomy';
import type { KitColors, ResolvedAppearance } from './avatar';

export interface SvgNode {
  tag: 'path' | 'circle' | 'ellipse' | 'rect';
  props: Record<string, string | number>;
}

export const OUTLINE = '#10131c';
const STROKE = { stroke: OUTLINE, strokeWidth: 2.5, strokeLinejoin: 'round' } as const;
const THIN = { stroke: OUTLINE, strokeWidth: 1.6, strokeLinecap: 'round' } as const;

/** Catálogo de render: hex por enum (retunável sem tocar a curadoria). */
export const SKIN_HEX: Array<{ base: string; shade: string }> = [
  { base: '#f6d7b3', shade: '#d9a877' },
  { base: '#efc296', shade: '#cf9663' },
  { base: '#e0a06b', shade: '#b97c46' },
  { base: '#c07f4c', shade: '#96602f' },
  { base: '#96613a', shade: '#6f4423' },
  { base: '#734a2b', shade: '#513118' },
  { base: '#59371f', shade: '#3a2211' },
  { base: '#412613', shade: '#28150a' },
];

export const HAIR_HEX: Record<HairColor, { base: string; shade: string }> = {
  black: { base: '#1b1b1f', shade: '#0d0d10' },
  'dark-brown': { base: '#3a2415', shade: '#24140a' },
  brown: { base: '#5c3a1e', shade: '#3d2512' },
  'light-brown': { base: '#8a5f33', shade: '#61401f' },
  blonde: { base: '#dbb257', shade: '#b08a3a' },
  platinum: { base: '#ece4d4', shade: '#c4b89f' },
  red: { base: '#a34a28', shade: '#753118' },
  gray: { base: '#a7adb5', shade: '#7d838c' },
  white: { base: '#e9ebee', shade: '#c2c6cc' },
};

const EYE_HEX: Record<EyeColor, string> = {
  dark: '#2a2a32',
  brown: '#5b3a1e',
  green: '#3e7a4e',
  blue: '#3b6fae',
};

const GOLD = '#f5c34b';

/* ---------------- geometria por feição ---------------- */

const HEAD_PATHS: Record<FaceShape, string> = {
  oval: 'M50 14 C68 14 78 27 78 45 C78 63 66 75 50 75 C34 75 22 63 22 45 C22 27 32 14 50 14 Z',
  round: 'M50 15 C69 15 80 28 80 46 C80 64 67 76 50 76 C33 76 20 64 20 46 C20 28 31 15 50 15 Z',
  square:
    'M50 14 C67 14 77 24 77 40 L77 56 C77 69 65 75 50 75 C35 75 23 69 23 56 L23 40 C23 24 33 14 50 14 Z',
};

function node(tag: SvgNode['tag'], props: SvgNode['props']): SvgNode {
  return { tag, props };
}

function hairNodes(a: ResolvedAppearance): { behind: SvgNode[]; front: SvgNode[] } {
  const hair = HAIR_HEX[a.hair.color];
  const fill = { fill: hair.base, ...STROKE };
  const behind: SvgNode[] = [];
  const front: SvgNode[] = [];

  switch (a.hair.style) {
    case 'bald':
      break;
    case 'balding':
      front.push(
        node('path', {
          d: 'M22 46 C22 34 25 27 30 22 L33 26 C28 31 26 38 26 46 Z',
          ...fill,
        }),
        node('path', {
          d: 'M78 46 C78 34 75 27 70 22 L67 26 C72 31 74 38 74 46 Z',
          ...fill,
        }),
      );
      break;
    case 'buzz':
      front.push(
        node('path', {
          d: 'M23 42 C23 19 35 11.5 50 11.5 C65 11.5 77 19 77 42 C77 29 66 22 50 22 C34 22 23 29 23 42 Z',
          ...fill,
        }),
      );
      break;
    case 'buzz-fade':
      front.push(
        node('path', {
          d: 'M28 31 C30 15 40 10.5 50 10.5 C60 10.5 70 15 72 31 C66 22.5 58 20 50 20 C42 20 34 22.5 28 31 Z',
          ...fill,
        }),
      );
      break;
    case 'crew':
      front.push(
        node('path', {
          d: 'M24 38 C24 18 34 10 50 10 C66 10 76 18 76 38 C76 27 66 23.5 50 23.5 C34 23.5 24 27 24 38 Z',
          ...fill,
        }),
      );
      break;
    case 'short-straight':
      front.push(
        node('path', {
          d: 'M23 42 C23 17 34 10 50 10 C66 10 77 17 77 42 C77 30 70 25 62 24.5 C54 24 46 24 38 24.5 C30 25 23 30 23 42 Z',
          ...fill,
        }),
      );
      break;
    case 'wavy-medium':
      front.push(
        node('path', {
          d: 'M22 44 C22 16 33 8.5 50 8.5 C67 8.5 78 16 78 44 C78 34 74 30 70 31 C68 26 62 24 58 27 C54 22 46 22 42 27 C38 24 32 26 30 31 C26 30 22 34 22 44 Z',
          ...fill,
        }),
      );
      break;
    case 'fringe':
      front.push(
        node('path', {
          d: 'M23 42 C23 16 34 9 50 9 C66 9 77 16 77 42 C77 31 73 26 68 26 L64 31 L58 25.5 L50 31 L42 25.5 L36 31 L32 26 C27 26 23 31 23 42 Z',
          ...fill,
        }),
      );
      break;
    case 'curly-high': {
      front.push(
        node('path', {
          d: 'M23 40 C23 20 34 12 50 12 C66 12 77 20 77 40 C77 29 66 23 50 23 C34 23 23 29 23 40 Z',
          ...fill,
        }),
      );
      const bumps: Array<[number, number, number]> = [
        [28, 24, 7],
        [37, 15, 8],
        [50, 11, 9],
        [63, 15, 8],
        [72, 24, 7],
      ];
      for (const [cx, cy, r] of bumps) front.push(node('circle', { cx, cy, r, ...fill }));
      break;
    }
    case 'curly-low':
      front.push(
        node('path', {
          d: 'M23 40 C23 18 34 10.5 50 10.5 C66 10.5 77 18 77 40 C75 31 71 28 67 29.5 C64 25 58 24.5 55 27.5 C52 23.5 48 23.5 45 27.5 C42 24.5 36 25 33 29.5 C29 28 25 31 23 40 Z',
          ...fill,
        }),
      );
      break;
    case 'braids': {
      front.push(
        node('path', {
          d: 'M23 41 C23 18 34 10.5 50 10.5 C66 10.5 77 18 77 41 C77 29 68 23 50 23 C32 23 23 29 23 41 Z',
          ...fill,
        }),
      );
      for (const x of [32, 41, 50, 59, 68]) {
        front.push(
          node('path', {
            d: `M${x} ${x === 50 ? 12 : x === 32 || x === 68 ? 17.5 : 13.5} Q${x} 19 ${x} 23`,
            stroke: hair.shade,
            strokeWidth: 2.2,
            strokeLinecap: 'round',
            fill: 'none',
          }),
        );
      }
      break;
    }
    case 'dreads': {
      behind.push(
        node('path', {
          d: 'M22 50 C20 34 30 24 40 22 L60 22 C70 24 80 34 78 50 L74 58 L26 58 Z',
          ...fill,
        }),
      );
      for (const [x, len] of [
        [25, 56],
        [31, 61],
        [69, 61],
        [75, 56],
      ] as Array<[number, number]>) {
        behind.push(
          node('path', {
            d: `M${x - 2.4} 40 L${x - 2.4} ${len} Q${x} ${len + 4} ${x + 2.4} ${len} L${x + 2.4} 40 Z`,
            ...fill,
          }),
        );
      }
      front.push(
        node('path', {
          d: 'M24 40 C24 18 35 11 50 11 C65 11 76 18 76 40 C76 28 66 22.5 50 22.5 C34 22.5 24 28 24 40 Z',
          ...fill,
        }),
      );
      break;
    }
    case 'samurai-bun':
      front.push(
        node('path', {
          d: 'M25 36 C27 16 38 10.5 50 10.5 C62 10.5 73 16 75 36 C69 25 60 21.5 50 21.5 C40 21.5 31 25 25 36 Z',
          ...fill,
        }),
        node('circle', { cx: 50, cy: 8.5, r: 6.5, ...fill }),
      );
      break;
    case 'ponytail':
      behind.push(
        node('path', {
          d: 'M72 30 C82 36 84 50 78 62 Q74 56 73 48 Q73 38 72 30 Z',
          ...fill,
        }),
      );
      front.push(
        node('path', {
          d: 'M23 40 C23 17 34 10 50 10 C66 10 77 17 77 40 C77 28 68 23 50 23 C32 23 23 28 23 40 Z',
          ...fill,
        }),
      );
      break;
    case 'mohawk':
      front.push(
        node('path', {
          d: 'M42 17 C42 6 46 2.5 50 2.5 C54 2.5 58 6 58 17 L58 21 C55 17.5 45 17.5 42 21 Z',
          ...fill,
        }),
      );
      break;
    case 'long-straight':
      behind.push(
        node('path', {
          d: 'M20 78 C15 62 18 26 50 26 C82 26 85 62 80 78 C80 84 74 86 71 82 L70 50 C64 40 36 40 30 50 L29 82 C26 86 20 84 20 78 Z',
          ...fill,
        }),
      );
      front.push(
        node('path', {
          d: 'M23 42 C23 16 34 9.5 50 9.5 C66 9.5 77 16 77 42 C77 30 70 24.5 50 24.5 C30 24.5 23 30 23 42 Z',
          ...fill,
        }),
      );
      break;
  }

  // entradas (hairline recuada): dois recortes na cor da pele sobre a testa
  if (a.hair.hairline === 'receding' && !['bald', 'balding', 'mohawk'].includes(a.hair.style)) {
    const skin = SKIN_HEX[a.skinTone] ?? SKIN_HEX[2]!;
    front.push(
      node('path', { d: 'M29 26 Q35 21 41 24 Q36 29 32 31 Z', fill: skin.base }),
      node('path', { d: 'M71 26 Q65 21 59 24 Q64 29 68 31 Z', fill: skin.base }),
    );
  }

  return { behind, front };
}

function beardNodes(beard: Beard, hairColor: HairColor): SvgNode[] {
  const hair = HAIR_HEX[hairColor];
  const fill = { fill: hair.base, ...STROKE };
  switch (beard) {
    case 'none':
      return [];
    case 'stubble':
      return [
        node('path', {
          d: 'M26 50 C27 66 36 73.5 50 73.5 C64 73.5 73 66 74 50 C71 62 62 68 50 68 C38 68 29 62 26 50 Z',
          fill: hair.base,
          fillOpacity: 0.32,
        }),
      ];
    case 'goatee':
      return [
        node('path', {
          d: 'M45.5 58.8 Q50 61 54.5 58.8 Q52.5 57.2 50 57.4 Q47.5 57.2 45.5 58.8 Z',
          fill: hair.base,
        }),
        node('path', { d: 'M45.5 68 C46.5 73.5 53.5 73.5 54.5 68 C52.5 70.3 47.5 70.3 45.5 68 Z', fill: hair.base }),
      ];
    case 'circle':
      return [
        node('path', {
          d: 'M43 60 C43 69.5 57 69.5 57 60',
          stroke: hair.base,
          strokeWidth: 3.2,
          strokeLinecap: 'round',
          fill: 'none',
        }),
        node('path', {
          d: 'M44.5 59.2 Q50 61.6 55.5 59.2 Q52.8 57 50 57.2 Q47.2 57 44.5 59.2 Z',
          fill: hair.base,
        }),
      ];
    case 'full-short':
      return [
        node('path', {
          d: 'M25 48 C25 67 35 76 50 76 C65 76 75 67 75 48 C73 60 70 66 62 68.5 L61 61 L39 61 L38 68.5 C30 66 27 60 25 48 Z',
          ...fill,
        }),
      ];
    case 'full-long':
      return [
        node('path', {
          d: 'M25 48 C24 72 32 88 50 88 C68 88 76 72 75 48 C73 62 70 69 62 71 L61 61 L39 61 L38 71 C30 69 27 62 25 48 Z',
          ...fill,
        }),
      ];
    case 'mustache':
      return [
        node('path', {
          d: 'M40.5 60 Q45 55.5 50 58 Q55 55.5 59.5 60 Q55 62.8 50 60.6 Q45 62.8 40.5 60 Z',
          ...fill,
        }),
      ];
    case 'chinstrap':
      return [
        node('path', {
          d: 'M26 50 C28 66 37 73 50 73 C63 73 72 66 74 50',
          stroke: hair.base,
          strokeWidth: 3.4,
          strokeLinecap: 'round',
          fill: 'none',
        }),
      ];
  }
}

/* ---------------- builder principal ---------------- */

export function buildAvatarTree(a: ResolvedAppearance, kit: KitColors): SvgNode[] {
  const skin = SKIN_HEX[a.skinTone] ?? SKIN_HEX[2]!;
  const eyeColor = EYE_HEX[a.eyes.color];
  const hairHex = HAIR_HEX[a.hair.color];
  const nodes: SvgNode[] = [];
  const hair = hairNodes(a);

  // cabelo atrás da cabeça (long, dreads, ponytail)
  nodes.push(...hair.behind);

  // camisa + gola
  nodes.push(
    node('path', {
      d: 'M13 100 C15 84 30 78.5 50 78.5 C70 78.5 85 84 87 100 Z',
      fill: kit.primary,
      ...STROKE,
    }),
    node('path', { d: 'M42 80 L50 88 L58 80 L54 78.8 L50 83.5 L46 78.8 Z', fill: kit.secondary }),
    node('path', { d: 'M13 100 C14 89 19 83.5 26 81 L29 100 Z', fill: kit.secondary, fillOpacity: 0.85 }),
    node('path', { d: 'M87 100 C86 89 81 83.5 74 81 L71 100 Z', fill: kit.secondary, fillOpacity: 0.85 }),
  );

  // pescoço
  nodes.push(node('path', { d: 'M42 66 L58 66 L58 80 Q50 84 42 80 Z', fill: skin.base, ...STROKE }));
  nodes.push(node('path', { d: 'M42 66 L58 66 L58 71 Q50 74 42 71 Z', fill: skin.shade }));

  // orelhas
  nodes.push(
    node('circle', { cx: 21, cy: 47, r: 5.4, fill: skin.base, ...STROKE }),
    node('circle', { cx: 79, cy: 47, r: 5.4, fill: skin.base, ...STROKE }),
  );

  // cabeça
  nodes.push(node('path', { d: HEAD_PATHS[a.faceShape], fill: skin.base, ...STROKE }));
  // sombra do queixo
  nodes.push(
    node('path', {
      d: 'M40 71 Q50 75.5 60 71 Q50 79 40 71 Z',
      fill: skin.shade,
      fillOpacity: 0.55,
    }),
  );

  // barba (antes da boca — a boca desenha por cima)
  nodes.push(...beardNodes(a.beard, a.hair.color));

  // cabelo da frente
  nodes.push(...hair.front);

  // headband por cima do cabelo
  if (a.accessories.includes('headband')) {
    nodes.push(
      node('path', {
        d: 'M23 29 C33 22.5 67 22.5 77 29 L77 35.5 C67 29 33 29 23 35.5 Z',
        fill: kit.secondary,
        ...STROKE,
      }),
    );
  }

  // sobrancelhas (grossas; 'sharp' inclina para o centro)
  const browTilt = a.eyes.shape === 'sharp' ? 2.4 : 0;
  nodes.push(
    node('path', {
      d: `M31 ${38.5 + browTilt * 0} Q38.5 ${35.4 - browTilt * 0} 46 ${38.2 + browTilt} L46 ${40.8 + browTilt} Q38.5 ${38} 31 ${41} Z`,
      fill: hairHex.shade,
    }),
    node('path', {
      d: `M69 ${38.5} Q61.5 ${35.4} 54 ${38.2 + browTilt} L54 ${40.8 + browTilt} Q61.5 ${38} 69 ${41} Z`,
      fill: hairHex.shade,
    }),
  );

  // olhos grandes: branco + íris + pupila + brilho
  const eyeRy = a.eyes.shape === 'narrow' ? 3.4 : a.eyes.shape === 'sharp' ? 4.2 : 5.2;
  for (const cx of [39, 61]) {
    nodes.push(
      node('ellipse', { cx, cy: 47, rx: 5.4, ry: eyeRy, fill: '#ffffff', stroke: OUTLINE, strokeWidth: 1.6 }),
      node('circle', { cx, cy: 47, r: Math.min(2.8, eyeRy - 0.4), fill: eyeColor }),
      node('circle', { cx, cy: 47, r: 1.35, fill: OUTLINE }),
      node('circle', { cx: cx - 1.1, cy: 45.9, r: 0.85, fill: '#ffffff' }),
    );
  }

  // nariz
  const noseD =
    a.nose === 'small'
      ? 'M50 51 Q51.6 55.5 50 57.2'
      : a.nose === 'wide'
        ? 'M50 50 Q53.4 56.5 50.8 58.6 M50.8 58.6 Q48 59.4 46.6 57.4'
        : 'M50 50 Q52.4 56 50.4 58.4 Q48.6 59.2 47.4 57.8';
  nodes.push(node('path', { d: noseD, ...THIN, fill: 'none' }));

  // boca
  if (a.mouth === 'grin') {
    nodes.push(
      node('path', {
        d: 'M39.5 60.5 Q50 63.5 60.5 60.5 Q58 70.5 50 70.5 Q42 70.5 39.5 60.5 Z',
        fill: '#ffffff',
        stroke: OUTLINE,
        strokeWidth: 2,
        strokeLinejoin: 'round',
      }),
      node('path', { d: 'M42 64.6 Q50 66.6 58 64.6', stroke: '#d8dade', strokeWidth: 1.2, fill: 'none' }),
    );
  } else if (a.mouth === 'smile') {
    nodes.push(
      node('path', { d: 'M42.5 62 Q50 68.5 57.5 62', stroke: OUTLINE, strokeWidth: 2.4, strokeLinecap: 'round', fill: 'none' }),
    );
  } else {
    nodes.push(
      node('path', { d: 'M44 63.5 Q50 65.8 56 63.5', stroke: OUTLINE, strokeWidth: 2.2, strokeLinecap: 'round', fill: 'none' }),
    );
  }

  // acessórios
  if (a.accessories.includes('earring-left') || a.accessories.includes('earrings')) {
    nodes.push(node('circle', { cx: 20, cy: 52.5, r: 1.8, fill: GOLD, stroke: OUTLINE, strokeWidth: 1 }));
  }
  if (a.accessories.includes('earring-right') || a.accessories.includes('earrings')) {
    nodes.push(node('circle', { cx: 80, cy: 52.5, r: 1.8, fill: GOLD, stroke: OUTLINE, strokeWidth: 1 }));
  }
  if (a.accessories.includes('chain')) {
    nodes.push(
      node('path', { d: 'M35 85 Q50 94 65 85', stroke: GOLD, strokeWidth: 2.4, strokeLinecap: 'round', fill: 'none' }),
    );
  }

  return nodes;
}

/** Serializa a árvore para markup SVG (prévia headless — mesmo desenho). */
export function svgTreeToString(nodes: SvgNode[], size: number): string {
  const kebab = (key: string) => key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
  const body = nodes
    .map(
      (n) =>
        `<${n.tag} ${Object.entries(n.props)
          .map(([k, v]) => `${kebab(k)}="${v}"`)
          .join(' ')}/>`,
    )
    .join('\n  ');
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100">\n  ${body}\n</svg>`;
}
