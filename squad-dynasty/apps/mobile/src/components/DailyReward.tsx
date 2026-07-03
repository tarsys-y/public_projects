// Popup de recompensa diária (4.4): aparece 1x/dia, streak de 7 dias.
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { DAILY_REWARDS, useLoginRewardStore } from '../stores/loginRewardStore';

export function DailyReward() {
  const claimedToday = useLoginRewardStore((s) => s.claimedToday);
  const lastClaimDate = useLoginRewardStore((s) => s.lastClaimDate);
  const currentStreak = useLoginRewardStore((s) => s.currentStreak);
  const ensureToday = useLoginRewardStore((s) => s.ensureToday);
  const claim = useLoginRewardStore((s) => s.claim);

  useEffect(() => {
    ensureToday();
  }, [ensureToday]);

  if (claimedToday) return null;

  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const previewDay = lastClaimDate === yesterday ? (currentStreak % 7) + 1 : 1;
  const reward = DAILY_REWARDS.find((r) => r.day === previewDay) ?? DAILY_REWARDS[0]!;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🎁</Text>
          <Text style={styles.title}>Recompensa do dia {reward.day}</Text>
          <View style={styles.streakRow}>
            {DAILY_REWARDS.map((r) => (
              <View key={r.day} style={[styles.streakDot, r.day === reward.day && styles.streakDotActive]}>
                <Text style={styles.streakDotText}>{r.day}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.rewardLabel}>{reward.label}</Text>
          <Pressable style={styles.cta} onPress={claim}>
            <Text style={styles.ctaText}>Resgatar</Text>
          </Pressable>
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
    gap: 10,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: { fontSize: 44 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900' },
  streakRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  streakDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  streakDotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  streakDotText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  rewardLabel: { color: colors.accent, fontSize: 22, fontWeight: '900', marginTop: 4 },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
