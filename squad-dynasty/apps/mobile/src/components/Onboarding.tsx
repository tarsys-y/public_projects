// Tutorial de primeiro uso (M8): modal paginado, dispensável, reabrível.
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { ONBOARDING_STEPS, useOnboardingStore } from '../stores/onboardingStore';

export function Onboarding() {
  const done = useOnboardingStore((s) => s.done);
  const markDone = useOnboardingStore((s) => s.markDone);
  const [step, setStep] = useState(0);
  if (done) return null;
  const current = ONBOARDING_STEPS[step]!;
  const isLast = step === ONBOARDING_STEPS.length - 1;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>{current.emoji}</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.text}>{current.text}</Text>
          <View style={styles.dots}>
            {ONBOARDING_STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>
          <Pressable
            style={styles.cta}
            onPress={() => {
              if (isLast) {
                markDone();
                setStep(0);
              } else {
                setStep(step + 1);
              }
            }}
          >
            <Text style={styles.ctaText}>{isLast ? 'Bora jogar! ⚽' : 'Próximo →'}</Text>
          </Pressable>
          {!isLast ? (
            <Pressable onPress={markDone}>
              <Text style={styles.skip}>pular tutorial</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: 18,
    padding: 24,
    gap: 12,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: { fontSize: 44 },
  title: { color: colors.text, fontSize: 20, fontWeight: '900' },
  text: { color: colors.textDim, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 4,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  skip: { color: colors.textDim, fontSize: 12, marginTop: 4 },
});
