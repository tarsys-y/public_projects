import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { CATALOG } from '../services/catalog';
import { ownedCardsMap, useCollectionStore } from '../stores/collectionStore';
import { resolveDraft } from '../stores/squadLogic';
import { useSquadStore } from '../stores/squadStore';

export default function HomeScreen() {
  const collection = useCollectionStore(ownedCardsMap);
  const draft = useSquadStore((s) => s.draft);
  const view = resolveDraft(draft, collection, CATALOG);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>SQUAD DYNASTY</Text>
      <Text style={styles.subtitle}>Monte seu elenco. Domine a liga.</Text>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 14 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: 2, marginTop: 8 },
  subtitle: { color: colors.textDim, fontSize: 14, marginBottom: 8 },
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
