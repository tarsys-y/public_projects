// Desafios de Montagem de Elenco (SBC, estilo UT): monte um 11 que cumpra as
// restrições; as cartas entregues são CONSUMIDAS em troca da recompensa.
// A montagem usa um rascunho próprio — nunca o Meu Time.
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  isGkAttributes,
  mulberry32,
  openPack,
  resolveOwnedCard,
  SBC_CHALLENGES,
  validateSbc,
  type ResolvedSlot,
  type SbcChallenge,
} from '@squad-dynasty/engine';
import { PitchView } from '../components/PitchView';
import { colors } from '../constants/theme';
import { getAllCards, getCatalog } from '../services/catalog';
import { useCollectionStore, ownedCardsMap } from '../stores/collectionStore';
import { useEconomyStore } from '../stores/economyStore';
import { usePacksStore } from '../stores/packsStore';
import { useSquadStore } from '../stores/squadStore';
import { assignCard, emptyDraft, resolveDraft, type DraftSquad } from '../stores/squadLogic';
import { DEFAULT_TACTICS, FORMATIONS } from '@squad-dynasty/engine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Desafios não-repetíveis já concluídos. */
export const useSbcStore = create<{ completed: Record<string, boolean>; markDone: (id: string) => void }>()(
  persist(
    (set) => ({
      completed: {},
      markDone: (id) => set((s) => ({ completed: { ...s.completed, [id]: true } })),
    }),
    { name: 'squad-dynasty/sbc', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export default function SbcScreen() {
  const collection = useCollectionStore(ownedCardsMap);
  const retired = useCollectionStore((s) => s.retired);
  const consumeCards = useCollectionStore((s) => s.consumeCards);
  const grantCard = useCollectionStore((s) => s.grantCard);
  const mainSquadIds = useSquadStore((s) => new Set(s.draft.slots.map((x) => x.ownedCardId)));
  const { completed, markDone } = useSbcStore();
  const [challenge, setChallenge] = useState<SbcChallenge | null>(null);
  const [draft, setDraft] = useState<DraftSquad | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const view = useMemo(
    () => (draft ? resolveDraft(draft, collection, getCatalog()) : null),
    [draft, collection],
  );

  const validation = useMemo(() => {
    if (!challenge || !draft || !view || !view.isComplete) return null;
    const slots: ResolvedSlot[] = view.slots.map((s, i) => ({
      position: s.position as ResolvedSlot['position'],
      role: draft.slots[i]!.role,
      player: s.player!,
    }));
    return validateSbc(challenge.formation, slots, challenge.requirements);
  }, [challenge, draft, view]);

  const candidates = useMemo(() => {
    if (!draft || selectedSlot === null) return [];
    const position = FORMATIONS[draft.formation]!.slots[selectedSlot]!.position;
    const inUse = new Set(draft.slots.map((s) => s.ownedCardId).filter(Boolean));
    return [...collection.values()]
      .filter((o) => !retired[o.id] && !inUse.has(o.id))
      .map((o) => {
        const player = resolveOwnedCard(o, getCatalog());
        const gkCard = isGkAttributes(player.attributes);
        if (gkCard !== (position === 'GK')) return null;
        if (!player.basePlayer.positions.includes(position)) return null;
        return { owned: o, player, inMainSquad: mainSquadIds.has(o.id) };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => a.player.overall - b.player.overall) // baratas primeiro: SBC consome!
      .slice(0, 30);
  }, [draft, selectedSlot, collection, retired, mainSquadIds]);

  const submit = () => {
    if (!challenge || !draft || !validation?.ok) return;
    const ids = draft.slots.map((s) => s.ownedCardId!).filter(Boolean);
    Alert.alert(
      'Entregar cartas?',
      `As ${ids.length} cartas escaladas serão CONSUMIDAS permanentemente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Entregar',
          style: 'destructive',
          onPress: () => {
            consumeCards(ids);
            const r = challenge.reward;
            if (r.coins || r.gems) {
              useEconomyStore.getState().earn({ coins: r.coins ?? 0, gems: r.gems ?? 0 });
            }
            if (r.cardId) grantCard(r.cardId);
            let packNote = '';
            if (r.pack) {
              const packs = usePacksStore.getState();
              const opening = openPack(
                mulberry32(Math.floor(Date.now() % 2147483647)),
                getAllCards(),
                { cards: r.pack.cards, guaranteedRarity: r.pack.guaranteedRarity, epicPlusBoost: r.pack.epicPlusBoost },
                packs.pity,
              );
              usePacksStore.setState((s) => ({ pity: opening.pity, totalOpened: s.totalOpened + 1 }));
              for (const card of opening.cards) grantCard(card.id);
              packNote = ` Pacote: ${opening.cards.map((c) => c.rarity).join(', ')}.`;
            }
            if (!challenge.repeatable) markDone(challenge.id);
            setMessage(`✅ ${challenge.name} concluído!${packNote}`);
            setChallenge(null);
            setDraft(null);
          },
        },
      ],
    );
  };

  // ---------- lista de desafios ----------
  if (!challenge || !draft) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Desafios de Montagem</Text>
        <Text style={styles.meta}>
          Entregue um 11 que cumpra as regras e troque cartas paradas por pacotes e recompensas.
        </Text>
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {SBC_CHALLENGES.map((c) => {
          const done = completed[c.id] && !c.repeatable;
          return (
            <Pressable
              key={c.id}
              disabled={done}
              style={[styles.challenge, done && { opacity: 0.45 }]}
              onPress={() => {
                setMessage(null);
                setChallenge(c);
                setDraft(emptyDraft(c.formation, { ...DEFAULT_TACTICS }));
                setSelectedSlot(null);
              }}
            >
              <Text style={styles.challengeName}>
                {c.emoji} {c.name} {done ? '✅' : ''}
              </Text>
              <Text style={styles.meta}>{c.description}</Text>
              <Text style={styles.rewardLine}>
                Prêmio:{' '}
                {[
                  c.reward.coins ? `🪙 ${c.reward.coins}` : null,
                  c.reward.gems ? `💎 ${c.reward.gems}` : null,
                  c.reward.pack ? `📦 pacote ${c.reward.pack.guaranteedRarity}+` : null,
                  c.reward.cardId ? '🃏 carta exclusiva' : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  // ---------- montagem ----------
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>
            {challenge.emoji} {challenge.name}
          </Text>
          <Text style={styles.meta}>{challenge.description}</Text>
        </View>
        <Pressable
          onPress={() => {
            setChallenge(null);
            setDraft(null);
          }}
        >
          <Text style={styles.cancel}>sair</Text>
        </Pressable>
      </View>

      {validation ? (
        validation.ok ? (
          <Text style={styles.success}>
            ✅ Requisitos cumpridos (overall {validation.teamOverall}, química {validation.teamChemistry})
          </Text>
        ) : (
          validation.failures.map((f) => (
            <Text key={f} style={styles.fail}>
              ✗ {f}
            </Text>
          ))
        )
      ) : (
        <Text style={styles.meta}>Escale 11 jogadores ({view?.filledCount ?? 0}/11).</Text>
      )}

      <PitchView
        formationId={draft.formation}
        height={330}
        selectedIndex={selectedSlot}
        onPressSlot={(i) => setSelectedSlot(selectedSlot === i ? null : i)}
        slots={(view?.slots ?? []).map((slot) => ({
          label: slot.player ? slot.player.basePlayer.name.split(' ').slice(-1)[0]! : slot.position,
          overall: slot.player?.overall,
          chemistry: slot.chemistry?.total,
          filled: slot.player !== null,
        }))}
      />

      {selectedSlot !== null ? (
        <View style={styles.candidates}>
          {candidates.map(({ owned, player, inMainSquad }) => (
            <Pressable
              key={owned.id}
              style={styles.candidate}
              onPress={() => setDraft(assignCard(draft, selectedSlot, owned.id))}
            >
              <Text style={styles.candidateOverall}>{player.overall}</Text>
              <Text numberOfLines={1} style={styles.candidateName}>
                {player.basePlayer.name}
              </Text>
              {inMainSquad ? <Text style={styles.warn}>no seu time!</Text> : null}
            </Pressable>
          ))}
          {candidates.length === 0 ? (
            <Text style={styles.meta}>Nenhuma carta compatível disponível.</Text>
          ) : null}
        </View>
      ) : null}

      <Pressable
        disabled={!validation?.ok}
        style={[styles.cta, !validation?.ok && { opacity: 0.4 }]}
        onPress={submit}
      >
        <Text style={styles.ctaText}>Entregar 11 e receber o prêmio</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, gap: 10, paddingBottom: 40 },
  h1: { color: colors.text, fontSize: 20, fontWeight: '900' },
  meta: { color: colors.textDim, fontSize: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cancel: { color: colors.danger, fontWeight: '700', fontSize: 12 },
  challenge: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  challengeName: { color: colors.text, fontWeight: '900', fontSize: 15 },
  rewardLine: { color: colors.warning, fontSize: 12, fontWeight: '700' },
  success: { color: colors.accent, fontWeight: '800', fontSize: 13 },
  fail: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  warn: { color: colors.warning, fontSize: 9, fontWeight: '800' },
  candidates: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  candidate: {
    width: 104,
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
  },
  candidateOverall: { color: colors.text, fontSize: 16, fontWeight: '900' },
  candidateName: { color: colors.text, fontSize: 11, fontWeight: '700' },
  cta: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800' },
});
