// Sweep foil: faixa de luz diagonal que varre a carta em loop (só em cartas
// de topo, fora de listas). Primeiro uso de shared values do Reanimated no app.
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface Props {
  width: number;
  height: number;
  radius?: number;
  intensity?: number; // opacidade de pico da faixa
}

export function FoilSweep({ width, height, radius = 12, intensity = 0.32 }: Props) {
  const stripe = width * 0.55;
  const x = useSharedValue(-stripe * 1.6);

  useEffect(() => {
    x.value = -stripe * 1.6;
    x.value = withRepeat(
      withSequence(
        withTiming(width + stripe * 0.6, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withDelay(2600, withTiming(-stripe * 1.6, { duration: 0 })),
      ),
      -1,
    );
    return () => cancelAnimation(x);
  }, [width, stripe, x]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    >
      <Animated.View style={[{ width: stripe, height }, style]}>
        <Svg width={stripe} height={height}>
          <Defs>
            <LinearGradient id="foil" x1={0} y1={0} x2={1} y2={0.35}>
              <Stop offset={0} stopColor="#ffffff" stopOpacity={0} />
              <Stop offset={0.5} stopColor="#ffffff" stopOpacity={intensity} />
              <Stop offset={1} stopColor="#ffffff" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={stripe} height={height} fill="url(#foil)" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
