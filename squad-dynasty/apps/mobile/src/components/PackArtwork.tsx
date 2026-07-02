// Arte SVG do pacote fechado (sem imagens): envelope vertical com gradiente,
// raios, monograma SD e serrilha no topo indicando onde rasgar.
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

export type PackArt = 'basic' | 'premium' | 'event';

interface Props {
  art: PackArt;
  width?: number;
  eventEmoji?: string;
  /** 0..1 — o quanto a tira do topo já foi rasgada (esconde a serrilha). */
  tearProgress?: number;
}

const PALETTES: Record<PackArt, { top: string; mid: string; bottom: string; accent: string; band: string }> = {
  basic: { top: '#3c4a63', mid: '#22314d', bottom: '#101a2e', accent: '#9fc1ff', band: '#5b7db8' },
  premium: { top: '#f2d688', mid: '#c9962e', bottom: '#6e4708', accent: '#fff3c8', band: '#8a5a12' },
  event: { top: '#5b2a9a', mid: '#37136b', bottom: '#120434', accent: '#22d3ee', band: '#8b31d9' },
};

export const TEAR_STRIP_RATIO = 0.14; // altura da tira destacável

export function PackArtwork({ art, width = 200, eventEmoji, tearProgress = 0 }: Props) {
  const height = width * 1.4;
  const p = PALETTES[art];
  const strip = height * TEAR_STRIP_RATIO;
  const cx = width / 2;
  const cy = height * 0.52;

  // serrilha (dentes) na linha de rasgo
  let teeth = `M0 ${strip}`;
  const step = width / 16;
  for (let x = 0; x < width; x += step) {
    teeth += ` L${x + step / 2} ${strip - 4} L${x + step} ${strip}`;
  }

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={`pack-${art}`} x1={0} y1={0} x2={0.4} y2={1}>
          <Stop offset={0} stopColor={p.top} />
          <Stop offset={0.5} stopColor={p.mid} />
          <Stop offset={1} stopColor={p.bottom} />
        </LinearGradient>
        <LinearGradient id={`pack-${art}-shine`} x1={0} y1={0} x2={1} y2={1}>
          <Stop offset={0} stopColor="#ffffff" stopOpacity={0} />
          <Stop offset={0.45} stopColor="#ffffff" stopOpacity={0.22} />
          <Stop offset={0.6} stopColor="#ffffff" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* corpo do envelope */}
      <Rect x={0} y={strip * Math.min(tearProgress, 1)} width={width} height={height - strip * Math.min(tearProgress, 1)} rx={14} fill={`url(#pack-${art})`} />

      {/* raios atrás do emblema (premium/event) */}
      {art !== 'basic'
        ? Array.from({ length: 10 }, (_, i) => {
            const a1 = (i / 10) * Math.PI * 2;
            const a2 = a1 + Math.PI / 26;
            const r = width;
            return (
              <Path
                key={i}
                d={`M${cx} ${cy} L${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r} L${cx + Math.cos(a2) * r} ${cy + Math.sin(a2) * r} Z`}
                fill={p.accent}
                opacity={0.12}
              />
            );
          })
        : null}

      {/* faixa diagonal + emblema central */}
      <Path d={`M0 ${height * 0.62} L${width} ${height * 0.42} L${width} ${height * 0.5} L0 ${height * 0.7} Z`} fill={p.band} opacity={0.55} />
      <Circle cx={cx} cy={cy} r={width * 0.21} fill={p.bottom} stroke={p.accent} strokeWidth={3} />
      <SvgText
        x={cx}
        y={cy + width * (eventEmoji ? 0.075 : 0.07)}
        fontSize={width * (eventEmoji ? 0.19 : 0.16)}
        fontWeight="bold"
        fill={p.accent}
        textAnchor="middle"
      >
        {eventEmoji ?? 'SD'}
      </SvgText>

      {/* brilho especular */}
      <Rect x={0} y={strip * Math.min(tearProgress, 1)} width={width} height={height} rx={14} fill={`url(#pack-${art}-shine)`} />

      {/* tira do topo com serrilha (some conforme rasga) */}
      {tearProgress < 1 ? (
        <>
          <Rect x={0} y={0} width={width} height={strip} rx={14} fill={p.mid} opacity={1 - tearProgress * 0.6} />
          <Path d={teeth} stroke={p.accent} strokeWidth={1.5} fill="none" opacity={0.8 * (1 - tearProgress)} />
          <SvgText
            x={cx}
            y={strip * 0.62}
            fontSize={width * 0.055}
            fontWeight="bold"
            fill={p.accent}
            textAnchor="middle"
            opacity={1 - tearProgress}
          >
            ⇢ RASGUE AQUI
          </SvgText>
        </>
      ) : null}
    </Svg>
  );
}
