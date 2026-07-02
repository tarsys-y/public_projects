// Raios de luz radiais (SVG) para a cinemática e para o hero de cartas
// raríssimas — com rotação lenta opcional (withRepeat linear).
import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

interface Props {
  size: number; // diâmetro do quadrado que contém os raios
  color: string;
  rotate?: boolean;
  opacity?: number;
}

export function LightRays({ size, color, rotate = false, opacity = 0.5 }: Props) {
  const angle = useSharedValue(0);

  useEffect(() => {
    if (!rotate) return;
    angle.value = 0;
    angle.value = withRepeat(withTiming(360, { duration: 14000, easing: Easing.linear }), -1);
    return () => cancelAnimation(angle);
  }, [angle, rotate]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));

  const c = size / 2;
  const r = size * 0.75;
  let d = '';
  for (let i = 0; i < 12; i++) {
    const a1 = (i / 12) * Math.PI * 2;
    const a2 = a1 + Math.PI / 20;
    d += `M${c} ${c} L${c + Math.cos(a1) * r} ${c + Math.sin(a1) * r} L${c + Math.cos(a2) * r} ${c + Math.sin(a2) * r} Z `;
  }

  return (
    <Animated.View pointerEvents="none" style={[{ width: size, height: size, opacity }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="rays-fade" x1={0.5} y1={0.5} x2={0.5} y2={0}>
            <Stop offset={0} stopColor={color} stopOpacity={0.9} />
            <Stop offset={1} stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={d} fill="url(#rays-fade)" />
      </Svg>
    </Animated.View>
  );
}
