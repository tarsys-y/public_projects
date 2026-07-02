// Fundo premium da carta (estilo UT): gradiente + textura procedural
// determinística + hot spot radial + moldura metálica com filete interno +
// sheen diagonal estático. Tudo SVG (react-native-svg) — sem imagens.
import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import type { CardTheme, GradientStop } from '../services/cardTheme';
import { mulberry32 } from '@squad-dynasty/engine';
import { hashString } from '../services/leagueLogic';

interface Props {
  theme: CardTheme;
  width: number;
  height: number;
  radius?: number;
}

/** Ângulo em graus → extremos do gradiente linear na caixa unitária. */
function gradientLine(angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const dx = Math.cos(rad) / 2;
  const dy = Math.sin(rad) / 2;
  return { x1: 0.5 - dx, y1: 0.5 - dy, x2: 0.5 + dx, y2: 0.5 + dy };
}

const renderStops = (stops: GradientStop[]) =>
  stops.map((s, i) => (
    <Stop key={i} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity ?? 1} />
  ));

/** Raios saindo do foco do avatar (estilo carta hero de TCG). */
function raysPath(w: number, h: number): string {
  const cx = w / 2;
  const cy = h * 0.36;
  const r = Math.hypot(w, h);
  let d = '';
  for (let i = 0; i < 12; i++) {
    const a1 = (i / 12) * Math.PI * 2;
    const a2 = a1 + Math.PI / 26;
    d += `M${cx} ${cy} L${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r} L${cx + Math.cos(a2) * r} ${cy + Math.sin(a2) * r} Z `;
  }
  return d;
}

/** Facetas triangulares determinísticas (low-poly sutil). */
function facetsPath(w: number, h: number, key: string): string {
  const rng = mulberry32(hashString(`facets:${key}`));
  let d = '';
  for (let i = 0; i < 9; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const s = w * (0.18 + rng() * 0.3);
    const a = rng() * Math.PI * 2;
    const pts = [0, 1, 2].map((k) => {
      const ang = a + (k * Math.PI * 2) / 3 + rng() * 0.5;
      return `${x + Math.cos(ang) * s},${y + Math.sin(ang) * s}`;
    });
    d += `M${pts[0]} L${pts[1]} L${pts[2]} Z `;
  }
  return d;
}

function pinstripePath(w: number, h: number): string {
  let d = '';
  for (let x = -h; x < w + h; x += 9) {
    d += `M${x} 0 L${x + h} ${h} `;
  }
  return d;
}

/** Ramos de louro simétricos atrás do avatar (cartas de lenda). */
function laurelPath(w: number, h: number): string {
  const cx = w / 2;
  const cy = h * 0.4;
  const R = w * 0.38;
  let d = '';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const ang = Math.PI * 0.95 - (i / 6) * Math.PI * 0.75; // de baixo para o topo
      const bx = cx + side * Math.cos(ang) * R;
      const by = cy + Math.sin(ang) * R * 1.15;
      const leafAng = ang + (side * Math.PI) / 2.6;
      const lx = Math.cos(leafAng) * w * 0.095;
      const ly = Math.sin(leafAng) * w * 0.095;
      d += `M${bx} ${by} q${lx - ly * 0.6} ${ly + lx * 0.6} ${lx * 2} ${ly * 2} q${-lx + ly * 0.6} ${-ly - lx * 0.6} ${-lx * 2} ${-ly * 2} Z `;
    }
  }
  return d;
}

function texturePath(theme: CardTheme, w: number, h: number): string {
  switch (theme.texture) {
    case 'rays':
      return raysPath(w, h);
    case 'facets':
      return facetsPath(w, h, theme.key);
    case 'pinstripe':
      return pinstripePath(w, h);
    case 'laurel':
      return laurelPath(w, h);
    default:
      return '';
  }
}

export const CardBackground = memo(function CardBackground({
  theme,
  width,
  height,
  radius = 12,
}: Props) {
  const id = theme.key; // determinístico: colisões na web referenciam defs idênticos
  const bgLine = gradientLine(theme.bg.angle);
  const inset = theme.frame.width / 2;
  const texture = texturePath(theme, width, height);

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={`${id}-bg`} {...bgLine}>
          {renderStops(theme.bg.stops)}
        </LinearGradient>
        <LinearGradient id={`${id}-frame`} x1={0} y1={0} x2={0.7} y2={1}>
          {renderStops(theme.frame.stops)}
        </LinearGradient>
        {theme.bgRadial ? (
          <RadialGradient id={`${id}-radial`} cx="50%" cy="36%" r="55%">
            {renderStops(theme.bgRadial.stops)}
          </RadialGradient>
        ) : null}
        <LinearGradient id={`${id}-sheen`} x1={0} y1={0} x2={1} y2={1}>
          <Stop offset={0} stopColor="#ffffff" stopOpacity={0} />
          <Stop offset={0.42} stopColor="#ffffff" stopOpacity={theme.sheenOpacity} />
          <Stop offset={0.58} stopColor="#ffffff" stopOpacity={theme.sheenOpacity * 0.55} />
          <Stop offset={1} stopColor="#ffffff" stopOpacity={0} />
        </LinearGradient>
        <ClipPath id={`${id}-clip`}>
          <Rect x={0} y={0} width={width} height={height} rx={radius} />
        </ClipPath>
      </Defs>

      <Rect x={0} y={0} width={width} height={height} rx={radius} fill={`url(#${id}-bg)`} />
      {texture ? (
        <Path
          d={texture}
          fill={theme.texture === 'pinstripe' ? 'none' : theme.textureColor}
          stroke={theme.texture === 'pinstripe' ? theme.textureColor : 'none'}
          strokeWidth={theme.texture === 'pinstripe' ? 1.4 : 0}
          opacity={theme.textureOpacity}
          clipPath={`url(#${id}-clip)`}
        />
      ) : null}
      {theme.bgRadial ? (
        <Ellipse
          cx={width / 2}
          cy={height * 0.36}
          rx={width * 0.62}
          ry={height * 0.34}
          fill={`url(#${id}-radial)`}
          clipPath={`url(#${id}-clip)`}
        />
      ) : null}
      {/* sheen diagonal estático (a "laminação" da carta) */}
      <Path
        d={`M${width * 0.05} 0 L${width * 0.72} 0 L${width * 0.3} ${height} L${-width * 0.37} ${height} Z`}
        fill={`url(#${id}-sheen)`}
        clipPath={`url(#${id}-clip)`}
      />
      {/* moldura metálica + filete interno */}
      <Rect
        x={inset}
        y={inset}
        width={width - theme.frame.width}
        height={height - theme.frame.width}
        rx={radius - inset}
        fill="none"
        stroke={`url(#${id}-frame)`}
        strokeWidth={theme.frame.width}
      />
      <Rect
        x={theme.frame.width + 1}
        y={theme.frame.width + 1}
        width={width - (theme.frame.width + 1) * 2}
        height={height - (theme.frame.width + 1) * 2}
        rx={radius - theme.frame.width}
        fill="none"
        stroke={theme.frame.innerLine}
        strokeWidth={1}
      />
    </Svg>
  );
});
