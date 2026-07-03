import { useEffect } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MonogramCrest } from '../components/ClubCrest';
import { colors } from '../constants/theme';
import { crestPaletteById } from '../constants/crestPalettes';
import { getCatalog } from '../services/catalog';
import { ownedCardsMap, useCollectionStore } from '../stores/collectionStore';
import { useEconomyStore } from '../stores/economyStore';
import { levelForXp, useProfileStore } from '../stores/profileStore';
import { useEventsStore } from '../stores/eventsStore';
import { DAILY_OBJECTIVES, useObjectivesStore } from '../stores/objectivesStore';
import { resolveDraft } from '../stores/squadLogic';
import { useSquadStore } from '../stores/squadStore';

export default function HomeScreen() {
  const collection = useCollectionStore(ownedCardsMap);
  const draft = useSquadStore((s) => s.draft);
  const view = resolveDraft(draft, collection, getCatalog());
  const { coins, gems } = useEconomyStore();
  const coachName = useProfileStore((s) => s.coachName);
  const coachLevel = useProfileStore((s) => levelForXp(s.xp));
  const teamName = useProfileStore((s) => s.teamName);
  const teamCrestId = useProfileStore((s) => s.teamCrestId);
  const objectives = useObjectivesStore();
  const events = useEventsStore();
  const event = events.currentEvent();
  useEffect(() => {
    objectives.ensureToday();
    events.ensureWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>SQUAD DYNASTY</Text>
          <Text style={styles.subtitle}>Monte seu elenco. Domine a liga.</Text>
        </View>
      </View>

      {teamName ? (
        <View style={styles.teamRow}>
          <MonogramCrest
            width={34}
            height={44}
            primary={crestPaletteById(teamCrestId).primary}
            secondary={crestPaletteById(teamCrestId).secondary}
            initials={teamName}
          />
          <Text style={styles.teamName}>{teamName}</Text>
        </View>
      ) : null}
      <View style={styles.wallet}>
        <Text style={styles.walletText}>🪙 {coins.toLocaleString('pt-BR')}</Text>
        <Text style={styles.walletText}>💎 {gems}</Text>
        <Link href="/profile" style={{ marginLeft: 'auto' }}>
          <Text style={styles.walletText}>👔 {coachName} · nv {coachLevel}</Text>
        </Link>
      </View>

      {/* Evento da semana */}
      <Link href="/shop" style={styles.eventBanner}>
        <Text style={styles.eventText}>
          {event.emoji} EVENTO DA SEMANA: {event.name} — {event.description} Pacote temático e
          objetivos exclusivos na Loja →
        </Text>
      </Link>

      {/* Objetivos do evento */}
      <View style={styles.objectives}>
        <Text style={styles.objectivesTitle}>
          {event.emoji} Objetivos do evento
        </Text>
        {event.objectives.map((objective) => {
          const progress = Math.min(events.progress[objective.id] ?? 0, objective.target);
          const done = progress >= objective.target;
          const claimed = events.claimed[objective.id] ?? false;
          return (
            <View key={objective.id} style={styles.objectiveRow}>
              <Text style={styles.objectiveLabel}>
                {claimed ? '✅' : done ? '🎁' : '▫️'} {objective.label} ({progress}/{objective.target})
              </Text>
              <Pressable
                disabled={!done || claimed}
                onPress={() => events.claim(objective.id)}
                style={[styles.claimButton, (!done || claimed) && { opacity: 0.35 }]}
              >
                <Text style={styles.claimText}>
                  {claimed
                    ? 'Recebido'
                    : objective.rewardCardId
                      ? '🃏 carta'
                      : `🪙 ${objective.rewardCoins ?? 0}`}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Objetivos diários (SPEC 6) */}
      <View style={styles.objectives}>
        <Text style={styles.objectivesTitle}>Objetivos de hoje</Text>
        {DAILY_OBJECTIVES.map((objective) => {
          const progress = Math.min(objectives.progress[objective.id] ?? 0, objective.target);
          const done = progress >= objective.target;
          const claimed = objectives.claimed[objective.id] ?? false;
          return (
            <View key={objective.id} style={styles.objectiveRow}>
              <Text style={styles.objectiveLabel}>
                {claimed ? '✅' : done ? '🎁' : '▫️'} {objective.label} ({progress}/{objective.target})
              </Text>
              <Pressable
                disabled={!done || claimed}
                onPress={() => objectives.claim(objective.id)}
                style={[styles.claimButton, (!done || claimed) && { opacity: 0.35 }]}
              >
                <Text style={styles.claimText}>
                  {claimed ? 'Recebido' : `🪙 ${objective.rewardCoins}`}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.cards}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{collection.size}</Text>
          <Text style={styles.statLabel}>cartas na coleção</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{view.filledCount}/11</Text>
          <Text style={styles.statLabel}>titulares escalados</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{view.teamOverall || '—'}</Text>
          <Text style={styles.statLabel}>overall do time</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{view.filledCount ? view.teamChemistry : '—'}</Text>
          <Text style={styles.statLabel}>química do time</Text>
        </View>
      </View>

      <Link href="/squad" style={styles.cta}>
        <Text style={styles.ctaText}>
          {view.isComplete ? 'Ajustar Meu Time →' : 'Escalar Meu Time →'}
        </Text>
      </Link>
      <Link href="/match" style={[styles.cta, !view.isComplete && styles.ctaDisabled]}>
        <Text style={styles.ctaText}>Jogar amistoso vs IA →</Text>
      </Link>
      <Link href="/collection" style={styles.ctaSecondary}>
        <Text style={styles.ctaSecondaryText}>Ver coleção →</Text>
      </Link>
      <Link href="/shop" style={styles.ctaSecondary}>
        <Text style={styles.ctaSecondaryText}>Abrir pacotes →</Text>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: 2, marginTop: 8 },
  subtitle: { color: colors.textDim, fontSize: 14, marginBottom: 8 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  wallet: { flexDirection: 'row', gap: 16 },
  walletText: { color: colors.text, fontWeight: '900', fontSize: 16 },
  eventBanner: {
    backgroundColor: '#1d2a3a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2e4a6b',
    overflow: 'hidden',
  },
  eventText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  objectives: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  objectivesTitle: { color: colors.text, fontWeight: '900', fontSize: 13, textTransform: 'uppercase' },
  objectiveRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  objectiveLabel: { color: colors.textDim, fontSize: 13, flex: 1 },
  claimButton: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  claimText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 14,
    minWidth: '46%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.text, fontSize: 26, fontWeight: '900' },
  statLabel: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  ctaSecondary: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  ctaSecondaryText: { color: colors.text, fontWeight: '700', fontSize: 15 },
});
