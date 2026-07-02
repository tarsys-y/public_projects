// Detalhe da Carta (SPEC tela 3): arte por raridade, atributos por categoria,
// radar estático (snowflake de atributos), idade + projeção de envelhecimento
// e nível de evolução.
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  agingBracketFor,
  GK_ATTRIBUTE_KEYS,
  isGkAttributes,
  OUTFIELD_ATTRIBUTE_KEYS,
  OUTFIELD_CATEGORY,
  resolveOwnedCard,
  retirementChance,
  type AttributeCategory,
} from '@squad-dynasty/engine';
import { CardView } from '../../components/CardView';
import { RadarChart } from '../../components/RadarChart';
import { categoryLabel, colors, rarityColors, rarityLabel } from '../../constants/theme';
import { CATALOG, clubById } from '../../services/catalog';
import { useCollectionStore } from '../../stores/collectionStore';

const CATEGORY_ORDER: AttributeCategory[] = [
  'pace',
  'finishing',
  'passing',
  'dribbling',
  'defense',
  'physical',
  'mental',
];

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const owned = useCollectionStore((s) => (id ? s.ownedCards[id] : undefined));
  if (!owned) {
    return (
      <View style={styles.screen}>
        <Text style={styles.meta}>Carta não encontrada.</Text>
      </View>
    );
  }

  const resolved = resolveOwnedCard(owned, CATALOG);
  const { card, basePlayer, attributes } = resolved;
  const gk = isGkAttributes(attributes);
  const values = attributes as unknown as Record<string, number>;

  // Média por categoria para o radar (goleiro tem eixos próprios).
  const radarLabels = gk
    ? ['REF', 'MÃO', 'SAÍDA', 'PÉS', 'POS', 'MEN']
    : CATEGORY_ORDER.map((c) => categoryLabel[c].slice(0, 3).toUpperCase());
  const radarValues = gk
    ? [
        values.reflexes!,
        values.handling!,
        values.rushingOut!,
        values.kicking!,
        values.gkPositioning!,
        (values.composure! + values.consistency! + values.bigGame!) / 3,
      ].map((v) => v / 99)
    : CATEGORY_ORDER.map((category) => {
        const keys = OUTFIELD_ATTRIBUTE_KEYS.filter((k) => OUTFIELD_CATEGORY[k] === category);
        return keys.reduce((sum, k) => sum + values[k]!, 0) / keys.length / 99;
      });

  const bracket = agingBracketFor(owned.age);
  const retirement = retirementChance(owned.age + 1);
  const rarity = rarityColors[card.rarity];
  const club = clubById.get(basePlayer.clubId);

  const attributeGroups = gk
    ? [{ title: 'Goleiro', keys: GK_ATTRIBUTE_KEYS as readonly string[] }]
    : CATEGORY_ORDER.map((category) => ({
        title: categoryLabel[category],
        keys: OUTFIELD_ATTRIBUTE_KEYS.filter((k) => OUTFIELD_CATEGORY[k] === category) as readonly string[],
      }));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <CardView card={card} player={basePlayer} overall={resolved.overall} />
        <View style={styles.heroInfo}>
          <Text style={styles.playerName}>{basePlayer.name}</Text>
          <Text style={styles.meta}>
            {club?.name ?? basePlayer.clubId} · {basePlayer.nationality} ·{' '}
            {basePlayer.positions.join('/')}
          </Text>
          <Text style={[styles.rarity, { color: rarity.frame }]}>
            {rarityLabel[card.rarity]}
            {card.label ? ` · ${card.label}` : ''}
            {card.frozen ? ' · congelada' : ''}
          </Text>
          <Text style={styles.meta}>Idade {owned.age} · Evolução nível {owned.evolutionLevel}/6</Text>
          <Text style={styles.meta}>Entrosamento: {owned.starterStreak} jogos seguidos</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Radar</Text>
        <View style={styles.radarWrap}>
          <RadarChart
            labels={radarLabels}
            series={[{ values: radarValues, stroke: colors.accent, fill: 'rgba(46,160,67,0.25)' }]}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Projeção de envelhecimento</Text>
        <Text style={styles.agingLabel}>
          {bracket.label}
          {bracket.trend === 'up' ? ' 📈' : bracket.trend === 'down' ? ' 📉' : bracket.trend === 'retirement' ? ' 🏁' : ' ⏸'}
        </Text>
        <Text style={styles.meta}>{bracket.description}</Text>
        {card.frozen ? (
          <Text style={styles.meta}>Carta congelada: não envelhece nem recebe patch.</Text>
        ) : retirement > 0 ? (
          <Text style={[styles.meta, { color: colors.warning }]}>
            Chance de aposentadoria na próxima temporada: {Math.round(retirement * 100)}%
          </Text>
        ) : null}
      </View>

      {attributeGroups.map((group) => (
        <View key={group.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{group.title}</Text>
          {group.keys.map((key) => {
            const value = values[key]!;
            const color = value >= 80 ? colors.accent : value >= 65 ? colors.warning : colors.danger;
            return (
              <View key={key} style={styles.attrRow}>
                <Text style={styles.attrName}>{key}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${value}%`, backgroundColor: color }]} />
                </View>
                <Text style={styles.attrValue}>{value}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, gap: 14, paddingBottom: 40 },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  heroInfo: { flex: 1, gap: 3 },
  playerName: { color: colors.text, fontSize: 20, fontWeight: '900' },
  meta: { color: colors.textDim, fontSize: 12 },
  rarity: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  section: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { color: colors.text, fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  radarWrap: { alignItems: 'center' },
  agingLabel: { color: colors.text, fontSize: 15, fontWeight: '800' },
  attrRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attrName: { color: colors.textDim, fontSize: 11, width: 96 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.bgCard },
  barFill: { height: 6, borderRadius: 3 },
  attrValue: { color: colors.text, fontSize: 12, fontWeight: '800', width: 26, textAlign: 'right' },
});
