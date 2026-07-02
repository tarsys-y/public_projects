// Radar genérico (SVG) para 7 eixos: usado no Detalhe da Carta (atributos por
// categoria) e no snowflake ao vivo (M4: polígono verde positivo + vermelho
// negativo sobre o mesmo eixo).
import { View } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { colors } from '../constants/theme';

interface Series {
  values: number[]; // 0..1 por eixo
  stroke: string;
  fill: string;
}

interface Props {
  labels: string[];
  series: Series[];
  size?: number;
}

export function RadarChart({ labels, series, size = 220 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const n = labels.length;

  const point = (axis: number, value: number): [number, number] => {
    const angle = (Math.PI * 2 * axis) / n - Math.PI / 2;
    return [cx + Math.cos(angle) * radius * value, cy + Math.sin(angle) * radius * value];
  };

  const ringLevels = [0.33, 0.66, 1];

  return (
    <View>
      <Svg width={size} height={size}>
        {ringLevels.map((level) => (
          <Polygon
            key={level}
            points={labels.map((_, i) => point(i, level).join(',')).join(' ')}
            stroke={colors.border}
            strokeWidth={1}
            fill="none"
          />
        ))}
        {labels.map((_, i) => {
          const [x, y] = point(i, 1);
          return <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={colors.border} strokeWidth={1} />;
        })}
        {series.map((s, si) => (
          <Polygon
            key={si}
            points={labels
              .map((_, i) => point(i, Math.max(0, Math.min(1, s.values[i] ?? 0))).join(','))
              .join(' ')}
            stroke={s.stroke}
            strokeWidth={2}
            fill={s.fill}
          />
        ))}
        <Circle cx={cx} cy={cy} r={2} fill={colors.textDim} />
        {labels.map((label, i) => {
          const [x, y] = point(i, 1.22);
          return (
            <SvgText
              key={label}
              x={x}
              y={y + 3}
              fontSize={10}
              fontWeight="700"
              fill={colors.textDim}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
