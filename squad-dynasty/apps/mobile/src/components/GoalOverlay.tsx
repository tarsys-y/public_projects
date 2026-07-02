// Overlay "GOOOL!" (M8): aparece quando um gol entra no playback da partida.
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { colors } from '../constants/theme';

interface Props {
  /** muda a cada gol novo (ex: `${minute}-${side}`); null = escondido. */
  trigger: string | null;
  isUserGoal: boolean;
}

export function GoalOverlay({ trigger, isUserGoal }: Props) {
  const [visible, setVisible] = useState<string | null>(null);
  useEffect(() => {
    if (!trigger) return;
    setVisible(trigger);
    const timeout = setTimeout(() => setVisible(null), 2200);
    return () => clearTimeout(timeout);
  }, [trigger]);

  if (!visible) return null;
  return (
    <Animated.View
      pointerEvents="none"
      entering={ZoomIn.springify().damping(9)}
      exiting={FadeOut.duration(400)}
      style={styles.overlay}
    >
      <Text style={[styles.text, { color: isUserGoal ? colors.accent : colors.danger }]}>
        {isUserGoal ? 'GOOOOOL!' : 'Gol do adversário…'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    zIndex: 50,
    backgroundColor: 'rgba(4,6,10,0.85)',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  text: { fontSize: 34, fontWeight: '900', letterSpacing: 2 },
});
