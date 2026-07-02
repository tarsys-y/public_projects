// Cinemática de carta ultra-rara (legendary/icon/epic_moment): takeover
// escuro, raios de luz girando, flash + impacto, carta lg com foil em zoom
// lento e o texto do grande momento do jogador. Toque pula/fecha.
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { BasePlayer, CardDefinition } from '@squad-dynasty/engine';
import { CardView } from './CardView';
import { Confetti } from './Confetti';
import { LightRays } from './LightRays';
import { cardTheme, momentText } from '../services/cardTheme';
import { versionLabel } from '../constants/theme';
import { clubById } from '../services/catalog';
import { feedback } from '../services/feedback';

interface Props {
  card: CardDefinition;
  player: BasePlayer;
  overall: number;
  onDone: () => void;
}

export function CinematicReveal({ card, player, overall, onDone }: Props) {
  const { width } = useWindowDimensions();
  const [landed, setLanded] = useState(false); // carta já "chegou" (flash dado)
  const theme = cardTheme(card.version, card.rarity);
  const club = clubById.get(player.clubId);
  const flash = useSharedValue(0);
  const scale = useSharedValue(0.88);
  const tilt = useSharedValue(6);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.push(
      setTimeout(() => {
        feedback.cinematicHit();
        flash.value = withSequence(withTiming(1, { duration: 110 }), withTiming(0, { duration: 500 }));
        scale.value = withTiming(1, { duration: 3500, easing: Easing.out(Easing.cubic) });
        tilt.value = withTiming(0, { duration: 3500, easing: Easing.out(Easing.cubic) });
        setLanded(true);
      }, 700),
    );
    const t = timers.current;
    return () => {
      t.forEach(clearTimeout);
      cancelAnimation(flash);
      cancelAnimation(scale);
      cancelAnimation(tilt);
    };
  }, [flash, scale, tilt]);

  const skip = () => {
    if (!landed) {
      // pula o build-up: aterrissa na hora
      timers.current.forEach(clearTimeout);
      flash.value = 0;
      scale.value = 1;
      tilt.value = 0;
      setLanded(true);
      return;
    }
    onDone();
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { scale: scale.value }, { rotateX: `${tilt.value}deg` }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <Pressable style={styles.takeover} onPress={skip}>
      <View style={styles.raysWrap}>
        <LightRays size={width * 1.6} color={theme.glow} rotate opacity={0.4} />
      </View>

      {landed ? (
        <>
          <Animated.View entering={FadeIn.duration(250)} style={cardStyle}>
            <CardView card={card} player={player} overall={overall} size="lg" animateSheen />
          </Animated.View>
          <View style={styles.textBlock}>
            <Animated.Text entering={FadeInDown.delay(500).duration(500)} style={styles.name}>
              {player.name}
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(800).duration(500)} style={styles.meta}>
              {player.positions[0]} · {club?.name ?? 'Lendas'}
            </Animated.Text>
            <Animated.Text
              entering={FadeInDown.delay(1200).duration(600)}
              style={[styles.moment, { color: theme.glow }]}
            >
              “{momentText(card, player.name)}”
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(1600).duration(500)} style={styles.version}>
              {card.label ?? versionLabel[card.version] ?? card.rarity.toUpperCase()}
            </Animated.Text>
            <Animated.Text entering={FadeIn.delay(2200)} style={styles.hint}>
              Toque para continuar
            </Animated.Text>
          </View>
          <Confetti seed={card.id} colors={[theme.glow, ...theme.frame.stops.map((s) => s.color)]} count={32} />
        </>
      ) : (
        <Text style={styles.hint}>…</Text>
      )}

      <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  takeover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#03050a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  raysWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { alignItems: 'center', gap: 5, paddingHorizontal: 30 },
  name: { color: '#f5f7fa', fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  meta: { color: '#8b949e', fontSize: 13, fontWeight: '700' },
  moment: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginTop: 8, lineHeight: 21 },
  version: { color: '#8b949e', fontSize: 11, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', marginTop: 6 },
  hint: { color: '#565e68', fontSize: 12, fontWeight: '600', marginTop: 10 },
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
  },
});
