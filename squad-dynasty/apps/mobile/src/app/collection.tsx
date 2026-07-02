// Coleção/Clube (SPEC tela 6): grid com filtros por posição, raridade,
// versão, clube e nação; duplicatas agrupadas com contador.
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import {
  isGkAttributes,
  type CardVersion,
  type Position,
  type Rarity,
} from '@squad-dynasty/engine';
import { CardView } from '../components/CardView';
import { colors, rarityLabel } from '../constants/theme';
import { getCardById, cardOverall, LEAGUES, playerById } from '../services/catalog';
import { useCollectionStore } from '../stores/collectionStore';

const POSITIONS: Array<Position | 'all'> = ['all', 'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
const RARITIES: Array<Rarity | 'all'> = ['all', 'common', 'rare', 'epic', 'legendary', 'icon'];
const VERSIONS: Array<CardVersion | 'all'> = ['all', 'base', 'epic_moment', 'icon'];

function Chips<T extends string>({
  options,
  value,
  onChange,
  labelOf,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labelOf?: (v: T) => string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.map((option) => (
        <Pressable
          key={option}
          onPress={() => onChange(option)}
          style={[styles.chip, value === option && styles.chipActive]}
        >
          <Text style={[styles.chipText, value === option && styles.chipTextActive]}>
            {labelOf ? labelOf(option) : option === 'all' ? 'Todas' : option}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export default function CollectionScreen() {
  const ownedCards = useCollectionStore((s) => s.ownedCards);
  const [position, setPosition] = useState<(typeof POSITIONS)[number]>('all');
  const [rarity, setRarity] = useState<(typeof RARITIES)[number]>('all');
  const [version, setVersion] = useState<(typeof VERSIONS)[number]>('all');
  const [league, setLeague] = useState<string>('all');

  // Agrupa por definição de carta (duplicatas → contador, SPEC tela 6).
  const groups = useMemo(() => {
    const byDef = new Map<string, { ownedIds: string[] }>();
    for (const owned of Object.values(ownedCards)) {
      const entry = byDef.get(owned.cardDefId) ?? { ownedIds: [] };
      entry.ownedIds.push(owned.id);
      byDef.set(owned.cardDefId, entry);
    }
    return [...byDef.entries()]
      .map(([cardDefId, { ownedIds }]) => {
        const card = getCardById(cardDefId);
        const player = card ? playerById.get(card.basePlayerId) : undefined;
        if (!card || !player) return null;
        return { card, player, count: ownedIds.length, firstOwnedId: ownedIds[0]!, overall: cardOverall(card) };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .filter((g) => {
        if (position !== 'all') {
          if (position === 'GK' ? !isGkAttributes(g.card.attributes) : !g.player.positions.includes(position)) {
            return false;
          }
        }
        if (rarity !== 'all' && g.card.rarity !== rarity) return false;
        if (version !== 'all' && g.card.version !== version) return false;
        if (league !== 'all' && g.player.leagueId !== league) return false;
        return true;
      })
      .sort((a, b) => b.overall - a.overall);
  }, [ownedCards, position, rarity, version, league]);

  return (
    <View style={styles.screen}>
      <Chips
        options={['all', ...LEAGUES.map((l) => l.id)]}
        value={league}
        onChange={setLeague}
        labelOf={(id) => (id === 'all' ? 'Todas' : LEAGUES.find((l) => l.id === id)?.name ?? id)}
      />
      <Chips options={POSITIONS} value={position} onChange={setPosition} />
      <Chips
        options={RARITIES}
        value={rarity}
        onChange={setRarity}
        labelOf={(r) => (r === 'all' ? 'Todas' : rarityLabel[r as Rarity])}
      />
      <Chips
        options={VERSIONS}
        value={version}
        onChange={setVersion}
        labelOf={(v) => (v === 'all' ? 'Todas' : v === 'base' ? 'Base' : v === 'epic_moment' ? 'Momento Épico' : 'Lenda')}
      />
      <FlatList
        data={groups}
        keyExtractor={(g) => g.card.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/card/[id]', params: { id: item.firstOwnedId } }} asChild>
            <Pressable>
              <CardView
                card={item.card}
                player={item.player}
                overall={item.overall}
                badge={item.count > 1 ? `x${item.count}` : undefined}
              />
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma carta com esses filtros.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingTop: 8 },
  chips: { gap: 6, paddingHorizontal: 10, paddingBottom: 6 },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: colors.bgCard,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  grid: { padding: 10, gap: 10 },
  row: { gap: 10, justifyContent: 'flex-start' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 40 },
});
