// Perfil de Técnico (SPEC tela 9): nível/XP, contadores, troféus da carreira
// e conquistas derivadas. Também abriga os toggles de som/haptics e o tutorial.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../constants/theme';
import { getCardById } from '../services/catalog';
import { useCareerStore } from '../stores/careerStore';
import { useCollectionStore } from '../stores/collectionStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import {
  deriveAchievements,
  levelForXp,
  useProfileStore,
  xpForLevel,
} from '../stores/profileStore';
import { useFeedbackSettings } from '../services/feedback';
import { clubById } from '../services/catalog';

export default function ProfileScreen() {
  const profile = useProfileStore();
  const ownedCards = useCollectionStore((s) => s.ownedCards);
  const history = useCareerStore((s) => s.history);
  const { soundOn, hapticsOn, toggleSound, toggleHaptics } = useFeedbackSettings();
  const reopenOnboarding = useOnboardingStore((s) => s.reopen);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.coachName);

  const level = levelForXp(profile.xp);
  const currentBase = xpForLevel(level);
  const nextTarget = xpForLevel(level + 1);
  const progress = Math.min(1, (profile.xp - currentBase) / Math.max(1, nextTarget - currentBase));

  const owned = Object.values(ownedCards);
  const achievements = deriveAchievements(profile, {
    totalCards: owned.length,
    hasLegendary: owned.some((o) => getCardById(o.cardDefId)?.rarity === 'legendary'),
    hasIcon: owned.some((o) => getCardById(o.cardDefId)?.rarity === 'icon'),
  });
  const unlocked = achievements.filter((a) => a.unlocked);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        {editingName ? (
          <TextInput
            style={styles.nameInput}
            value={nameDraft}
            onChangeText={setNameDraft}
            autoFocus
            maxLength={20}
            onSubmitEditing={() => {
              profile.setCoachName(nameDraft);
              setEditingName(false);
            }}
          />
        ) : (
          <Pressable onPress={() => setEditingName(true)}>
            <Text style={styles.h1}>👔 {profile.coachName} ✏️</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.levelText}>Nível {level}</Text>
        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={styles.meta}>
          {profile.xp} XP · faltam {Math.max(0, nextTarget - profile.xp)} para o nível {level + 1}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        {[
          ['Partidas', profile.matches],
          ['Vitórias', profile.wins],
          ['Gols', profile.goals],
          ['Ligas 🏆', profile.leagueTitles],
          ['Copas 🏅', profile.cupTitles],
          ['Temporadas', profile.seasonsPlayed],
          ['Pacotes', profile.packsOpened],
          ['SBCs', profile.sbcsCompleted],
        ].map(([label, value]) => (
          <View key={String(label)} style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {history.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vitrine de temporadas</Text>
          {history.map((s) => (
            <Text key={s.season} style={styles.meta}>
              Temporada {s.season}: {s.placement}º na liga
              {s.placement === 1 ? ' 🏆' : ''} · copa:{' '}
              {s.userWonCup ? 'CAMPEÃO 🏅' : clubById.get(s.cupChampion ?? '')?.shortName ?? '—'}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Conquistas ({unlocked.length}/{achievements.length})
        </Text>
        <View style={styles.achievements}>
          {achievements.map((a) => (
            <View key={a.id} style={[styles.achievement, !a.unlocked && { opacity: 0.3 }]}>
              <Text style={styles.achievementEmoji}>{a.emoji}</Text>
              <Text style={styles.achievementLabel}>{a.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferências</Text>
        <Pressable style={styles.prefRow} onPress={toggleSound}>
          <Text style={styles.prefText}>{soundOn ? '🔊 Sons ligados' : '🔇 Sons desligados'}</Text>
        </Pressable>
        <Pressable style={styles.prefRow} onPress={toggleHaptics}>
          <Text style={styles.prefText}>
            {hapticsOn ? '📳 Vibração ligada' : '📴 Vibração desligada'}
          </Text>
        </Pressable>
        <Pressable style={styles.prefRow} onPress={reopenOnboarding}>
          <Text style={styles.prefText}>🎓 Rever o tutorial</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  h1: { color: colors.text, fontSize: 22, fontWeight: '900' },
  nameInput: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    borderBottomWidth: 1,
    borderColor: colors.accent,
    flex: 1,
  },
  meta: { color: colors.textDim, fontSize: 12 },
  section: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { color: colors.text, fontWeight: '900', fontSize: 13, textTransform: 'uppercase' },
  levelText: { color: colors.accent, fontSize: 24, fontWeight: '900' },
  xpTrack: { height: 8, borderRadius: 4, backgroundColor: colors.bgCard },
  xpFill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: {
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    padding: 10,
    minWidth: '22%',
    flexGrow: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '900' },
  statLabel: { color: colors.textDim, fontSize: 10, fontWeight: '700' },
  achievements: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achievement: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  achievementEmoji: { fontSize: 20 },
  achievementLabel: { color: colors.textDim, fontSize: 9, fontWeight: '700', textAlign: 'center' },
  prefRow: { paddingVertical: 8 },
  prefText: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
