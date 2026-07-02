// Confete determinístico: UM progress compartilhado anima N partículas via
// interpolate, com trajetórias derivadas de seed (sem Math.random/timers).
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { mulberry32 } from '@squad-dynasty/engine';
import { hashString } from '../services/leagueLogic';

interface Props {
  seed: string;
  colors: string[];
  count?: number;
  duration?: number;
}

interface Particle {
  x0: number; // fração da largura
  drift: number;
  delay: number; // fração do progresso
  size: number;
  spin: number;
  color: string;
}

export function Confetti({ seed, colors, count = 26, duration = 2400 }: Props) {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration, easing: Easing.out(Easing.quad) });
    return () => cancelAnimation(progress);
  }, [duration, progress, seed]);

  const particles: Particle[] = Array.from({ length: count }, (_, i) => {
    const rng = mulberry32(hashString(`${seed}:${i}`));
    return {
      x0: rng(),
      drift: (rng() - 0.5) * 0.4,
      delay: rng() * 0.25,
      size: 6 + rng() * 7,
      spin: (rng() - 0.5) * 1080,
      color: colors[Math.floor(rng() * colors.length)] ?? '#ffffff',
    };
  });

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p, i) => (
        <ConfettiPiece key={i} particle={p} progress={progress} width={width} height={height} />
      ))}
    </Animated.View>
  );
}

function ConfettiPiece({
  particle: p,
  progress,
  width,
  height,
}: {
  particle: Particle;
  progress: SharedValue<number>;
  width: number;
  height: number;
}) {
  const style = useAnimatedStyle(() => {
    const local = interpolate(progress.value, [p.delay, 1], [0, 1], 'clamp');
    return {
      opacity: interpolate(local, [0, 0.1, 0.8, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: (p.x0 + p.drift * local) * width },
        { translateY: interpolate(local, [0, 1], [-30, height * 0.9]) },
        { rotate: `${p.spin * local}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.piece,
        { width: p.size, height: p.size * 0.45, backgroundColor: p.color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0, left: 0, borderRadius: 1.5 },
});
