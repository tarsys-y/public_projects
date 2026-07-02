// Meu Time (SPEC tela 2): campo 2D com slots, seletor de formação, função por
// slot com % de fit, painel de tática e química por jogador/time — tudo
// derivado em tempo real da coleção + rascunho persistido.
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  computeRoleFit,
  FORMATION_IDS,
  ROLES,
  rolesForPosition,
  isGkAttributes,
  resolveOwnedCard,
  type Position,
} from '@squad-dynasty/engine';
import { PitchView } from '../components/PitchView';
import { TacticsPanel } from '../components/TacticsPanel';
import { colors } from '../constants/theme';
import { CATALOG } from '../services/catalog';
import { ownedCardsMap, useCollectionStore } from '../stores/collectionStore';
import { resolveDraft } from '../stores/squadLogic';
import { useSquadStore } from '../stores/squadStore';

export default function SquadScreen() {
  const collection = useCollectionStore(ownedCardsMap);
  const retired = useCollectionStore((s) => s.retired);
  const { draft, setFormation, assign, clear, changeRole, updateTactics } = useSquadStore();
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showTactics, setShowTactics] = useState(false);

  const view = useMemo(() => resolveDraft(draft, collection, CATALOG), [draft, collection]);

  const slotPosition: Position | null =
    selectedSlot !== null ? (view.slots[selectedSlot]?.position as Position) : null;

  // Candidatos para o slot: cartas da coleção ordenadas por adequação.
  const candidates = useMemo(() => {
    if (selectedSlot === null || !slotPosition) return [];
    const inUse = new Set(draft.slots.map((s) => s.ownedCardId).filter(Boolean));
    return [...collection.values()]
      .filter((owned) => !retired[owned.id]) // aposentados não são escaláveis (SPEC 4.4)
      .map((owned) => {
        const player = resolveOwnedCard(owned, CATALOG);
        const gkCard = isGkAttributes(player.attributes);
        if (gkCard !== (slotPosition === 'GK')) return null;
        const natural = player.basePlayer.positions.includes(slotPosition);
        return {
          owned,
          player,
          natural,
          inUse: inUse.has(owned.id),
          score: player.overall * (natural ? 1 : 0.8),
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => Number(a.inUse) - Number(b.inUse) || b.score - a.score)
      .slice(0, 30);
  }, [selectedSlot, slotPosition, collection, draft.slots, retired]);

  const selected = selectedSlot !== null ? view.slots[selectedSlot] : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Cabeçalho: overall + química do time em tempo real (aceite M3) */}
      <View style={styles.headerRow}>
        <View style={styles.headerStat}>
          <Text style={styles.headerValue}>{view.teamOverall || '—'}</Text>
          <Text style={styles.headerLabel}>Overall</Text>
        </View>
        <View style={styles.headerStat}>
          <Text style={[styles.headerValue, { color: view.teamChemistry >= 60 ? colors.accent : colors.warning }]}>
            {view.filledCount ? view.teamChemistry : '—'}
          </Text>
          <Text style={styles.headerLabel}>Química</Text>
        </View>
        <View style={styles.headerStat}>
          <Text style={styles.headerValue}>{view.filledCount}/11</Text>
          <Text style={styles.headerLabel}>Escalados</Text>
        </View>
        <Pressable style={styles.tacticsButton} onPress={() => setShowTactics((v) => !v)}>
          <Text style={styles.tacticsButtonText}>{showTactics ? 'Campo' : 'Tática'}</Text>
        </Pressable>
      </View>

      {/* Seletor de formação */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formations}>
        {FORMATION_IDS.map((id) => (
          <Pressable
            key={id}
            onPress={() => {
              setSelectedSlot(null);
              setFormation(id);
            }}
            style={[styles.formationChip, draft.formation === id && styles.formationChipActive]}
          >
            <Text style={[styles.formationText, draft.formation === id && styles.formationTextActive]}>{id}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {showTactics ? (
        <TacticsPanel tactics={draft.tactics} onChange={updateTactics} />
      ) : (
        <PitchView
          formationId={draft.formation}
          selectedIndex={selectedSlot}
          onPressSlot={(i) => setSelectedSlot(selectedSlot === i ? null : i)}
          slots={view.slots.map((slot) => ({
            label: slot.player ? slot.player.basePlayer.name.split(' ').slice(-1)[0]! : slot.position,
            overall: slot.player?.overall,
            chemistry: slot.chemistry?.total,
            filled: slot.player !== null,
          }))}
        />
      )}

      {/* Painel do slot selecionado */}
      {selected && selectedSlot !== null && !showTactics ? (
        <View style={styles.slotPanel}>
          <View style={styles.slotHeader}>
            <Text style={styles.slotTitle}>
              {selected.position} · {selected.player ? selected.player.basePlayer.name : 'vazio'}
            </Text>
            {selected.player ? (
              <Pressable onPress={() => clear(selectedSlot)}>
                <Text style={styles.removeText}>remover</Text>
              </Pressable>
            ) : null}
          </View>

          {selected.chemistry && selected.player ? (
            <Text style={styles.chemLine}>
              Química {selected.chemistry.total} — clube +{selected.chemistry.club} · nação +
              {selected.chemistry.nationality} · liga +{selected.chemistry.league} · sinergia +
              {selected.chemistry.synergy} · entrosamento +{selected.chemistry.streak}
            </Text>
          ) : null}

          {/* Função do slot com % de fit */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roles}>
            {rolesForPosition(selected.position).map((role) => {
              const active = selected.role === role.id;
              const fit = selected.player
                ? Math.round(computeRoleFit(selected.player.attributes, role.id) * 100)
                : null;
              return (
                <Pressable
                  key={role.id}
                  onPress={() => changeRole(selectedSlot, role.id)}
                  style={[styles.roleChip, active && styles.roleChipActive]}
                >
                  <Text style={[styles.roleText, active && styles.roleTextActive]}>
                    {ROLES[role.id].name}
                    {fit !== null ? ` ${fit}%` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Candidatos da coleção */}
          <FlatList
            horizontal
            data={candidates}
            keyExtractor={(c) => c.owned.id}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => assign(selectedSlot, item.owned.id)}
                style={[styles.candidate, item.inUse && styles.candidateInUse]}
              >
                <Text style={styles.candidateOverall}>{item.player.overall}</Text>
                <Text numberOfLines={1} style={styles.candidateName}>
                  {item.player.basePlayer.name}
                </Text>
                <Text style={styles.candidateMeta}>
                  {item.player.basePlayer.positions.join('/')}
                  {item.inUse ? ' · escalado' : ''}
                  {!item.natural ? ' · fora de posição' : ''}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.empty}>Nenhuma carta compatível na coleção.</Text>}
          />
        </View>
      ) : null}

      {!view.hasGk && view.filledCount > 0 ? (
        <Text style={styles.warning}>⚠️ Escale um goleiro de verdade no gol.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 12, gap: 10, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  headerStat: {
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerValue: { color: colors.text, fontSize: 18, fontWeight: '900' },
  headerLabel: { color: colors.textDim, fontSize: 10, fontWeight: '700' },
  tacticsButton: {
    marginLeft: 'auto',
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  tacticsButtonText: { color: '#fff', fontWeight: '800' },
  formations: { gap: 6 },
  formationChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.bgCard,
  },
  formationChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  formationText: { color: colors.textDim, fontWeight: '700', fontSize: 12 },
  formationTextActive: { color: '#fff' },
  slotPanel: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotTitle: { color: colors.text, fontWeight: '800', fontSize: 14 },
  removeText: { color: colors.danger, fontWeight: '700', fontSize: 12 },
  chemLine: { color: colors.textDim, fontSize: 11 },
  roles: { gap: 6 },
  roleChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.bgCard,
  },
  roleChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  roleText: { color: colors.textDim, fontSize: 11, fontWeight: '700' },
  roleTextActive: { color: '#fff' },
  candidate: {
    width: 120,
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    marginRight: 8,
  },
  candidateInUse: { opacity: 0.55 },
  candidateOverall: { color: colors.text, fontSize: 18, fontWeight: '900' },
  candidateName: { color: colors.text, fontSize: 11, fontWeight: '700' },
  candidateMeta: { color: colors.textDim, fontSize: 10 },
  empty: { color: colors.textDim, fontSize: 12, padding: 8 },
  warning: { color: colors.warning, fontSize: 12, fontWeight: '700' },
});
