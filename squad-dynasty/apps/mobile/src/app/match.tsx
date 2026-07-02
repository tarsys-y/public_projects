// Partida ao Vivo (SPEC tela 4): campo 2D com nota do momento sobre cada
// jogador, narração por texto, bottom sheet com snowflake ao vivo, botões de
// substituição/tática, modal de Momento de Decisão e modo rápido (só texto).
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  computeRatingsAt,
  isGkAttributes,
  type PlayerParticipation,
  type Snowflake,
  type Tactics,
} from '@squad-dynasty/engine';
import { PitchView } from '../components/PitchView';
import { RadarChart } from '../components/RadarChart';
import { TacticsPanel } from '../components/TacticsPanel';
import { categoryLabel, colors } from '../constants/theme';
import { CATALOG, clubById, CLUBS } from '../services/catalog';
import { ownedCardsMap, useCollectionStore } from '../stores/collectionStore';
import { resolveDraft, toSquad } from '../stores/squadLogic';
import { useSquadStore } from '../stores/squadStore';
import { SPEED_FACTOR, useMatchStore } from '../stores/matchStore';

const OPPONENTS = CLUBS.filter((c) => c.id !== 'icons');
const CATEGORIES = Object.keys(categoryLabel) as Array<keyof typeof categoryLabel>;

const ratingColor = (r: number) =>
  r >= 7.5 ? colors.accent : r >= 6 ? colors.text : r >= 5 ? colors.warning : colors.danger;

export default function MatchScreen() {
  const collection = useCollectionStore(ownedCardsMap);
  const draft = useSquadStore((s) => s.draft);
  const match = useMatchStore();
  const [opponent, setOpponent] = useState(OPPONENTS[0]!.id);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showTactics, setShowTactics] = useState(false);
  const [showSubs, setShowSubs] = useState(false);

  const draftView = useMemo(() => resolveDraft(draft, collection, CATALOG), [draft, collection]);

  // Relógio do playback.
  useEffect(() => {
    if (match.phase !== 'playing') return;
    const interval = setInterval(() => {
      useMatchStore.getState().advance(SPEED_FACTOR[useMatchStore.getState().speed] * 0.5);
    }, 500);
    return () => clearInterval(interval);
  }, [match.phase]);

  const minute = Math.floor(match.playbackMinute);
  const result = match.result;

  const visibleEvents = useMemo(
    () =>
      result
        ? result.events
            .filter((e) => e.minute <= match.playbackMinute)
            .slice()
            .reverse()
            .slice(0, 40)
        : [],
    [result, minute], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const liveRatings = useMemo(() => {
    if (!result) return new Map<string, { rating: number; snowflake: Snowflake }>();
    return new Map(
      computeRatingsAt(result.events, result.participations, match.playbackMinute).map((r) => [
        r.playerId,
        { rating: r.rating, snowflake: r.snowflake },
      ]),
    );
  }, [result, minute]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Jogador em campo por slot (lado do usuário) no minuto atual. */
  const onPitchBySlot = useMemo(() => {
    const map = new Map<number, PlayerParticipation>();
    if (!result) return map;
    for (const p of result.participations) {
      if (p.side !== 'home') continue;
      const active =
        p.enteredMinute <= match.playbackMinute &&
        (p.leftMinute === undefined || p.leftMinute > match.playbackMinute);
      if (active) map.set(p.slotIndex, p);
    }
    return map;
  }, [result, minute]); // eslint-disable-line react-hooks/exhaustive-deps

  const score = useMemo(() => {
    if (!result) return [0, 0] as const;
    let h = 0;
    let a = 0;
    for (const e of result.events) {
      if (e.type !== 'goal' || e.minute > match.playbackMinute) continue;
      if (e.side === 'home') h++;
      else a++;
    }
    return [h, a] as const;
  }, [result, minute]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentTactics: Tactics = useMemo(() => {
    let tactics = { ...draft.tactics };
    for (const i of match.interventions) {
      if (i.tactics && i.minute <= match.playbackMinute) tactics = { ...tactics, ...i.tactics };
    }
    return tactics;
  }, [draft.tactics, match.interventions, minute]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- fase: idle ----------
  if (match.phase === 'idle' || !result) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Amistoso vs IA</Text>
        {!draftView.isComplete ? (
          <Text style={styles.warn}>Complete seu 11 em “Meu Time” para jogar.</Text>
        ) : null}
        <Text style={styles.label}>Adversário</Text>
        <View style={styles.chips}>
          {OPPONENTS.map((club) => (
            <Pressable
              key={club.id}
              onPress={() => setOpponent(club.id)}
              style={[styles.chip, opponent === club.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, opponent === club.id && styles.chipTextActive]}>
                {club.shortName}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Velocidade</Text>
        <View style={styles.chips}>
          {(['normal', 'fast'] as const).map((speed) => (
            <Pressable
              key={speed}
              onPress={() => match.setSpeed(speed)}
              style={[styles.chip, match.speed === speed && styles.chipActive]}
            >
              <Text style={[styles.chipText, match.speed === speed && styles.chipTextActive]}>
                {speed === 'normal' ? 'Ao vivo (~4 min)' : 'Rápido (~30s, só texto)'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          disabled={!draftView.isComplete}
          onPress={() => match.startFriendly(toSquad(draft), collection, opponent)}
          style={[styles.cta, !draftView.isComplete && { opacity: 0.4 }]}
        >
          <Text style={styles.ctaText}>Começar partida</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const opponentName = clubById.get(match.opponentClubId ?? '')?.name ?? 'Adversário';

  // ---------- fase: finished ----------
  if (match.phase === 'finished') {
    const finalRatings = [...liveRatings.entries()]
      .map(([playerId, r]) => ({
        playerId,
        rating: r.rating,
        participation: result.participations.find((p) => p.playerId === playerId)!,
      }))
      .sort((a, b) => b.rating - a.rating);
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Fim de jogo</Text>
        <Text style={styles.bigScore}>
          Meu Time {result.score[0]} x {result.score[1]} {opponentName}
        </Text>
        <Text style={styles.meta}>
          Posse {result.stats.home.possession}% x {result.stats.away.possession}% · Chutes{' '}
          {result.stats.home.shots} x {result.stats.away.shots} · xG {result.stats.home.xg.toFixed(2)} x{' '}
          {result.stats.away.xg.toFixed(2)}
        </Text>
        <View style={styles.section}>
          <Text style={styles.label}>Notas finais</Text>
          {finalRatings.map(({ playerId, rating, participation }) => (
            <View key={playerId} style={styles.ratingRow}>
              <Text style={[styles.ratingValue, { color: ratingColor(rating) }]}>
                {rating.toFixed(1)}
              </Text>
              <Text style={styles.ratingName}>
                {participation.name} {participation.side === 'away' ? `(${opponentName})` : ''}
              </Text>
            </View>
          ))}
        </View>
        <Pressable onPress={match.reset} style={styles.cta}>
          <Text style={styles.ctaText}>Jogar outro amistoso</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ---------- fase: playing / decision ----------
  const selectedRating = selectedPlayerId ? liveRatings.get(selectedPlayerId) : null;
  const selectedParticipation = selectedPlayerId
    ? result.participations.find((p) => p.playerId === selectedPlayerId)
    : null;
  const benchAvailable = match.home
    ? match.home.bench.filter(
        (b) => !result.participations.some((p) => p.playerId === b.ownedCardId),
      )
    : [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.scoreboard}>
        <Text style={styles.scoreText}>
          Meu Time {score[0]} x {score[1]} {opponentName}
        </Text>
        <Text style={styles.minuteText}>{minute}'</Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionButton} onPress={() => setShowTactics(true)}>
          <Text style={styles.actionText}>Tática</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={() => setShowSubs(true)}>
          <Text style={styles.actionText}>Substituir</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => match.setSpeed(match.speed === 'normal' ? 'fast' : 'normal')}
        >
          <Text style={styles.actionText}>{match.speed === 'normal' ? '⏩ Rápido' : '▶️ Ao vivo'}</Text>
        </Pressable>
      </View>

      {match.speed === 'normal' ? (
        <PitchView
          formationId={draft.formation}
          height={340}
          onPressSlot={(i) => {
            const p = onPitchBySlot.get(i);
            if (p) setSelectedPlayerId(p.playerId);
          }}
          slots={Array.from({ length: 11 }, (_, i) => {
            const p = onPitchBySlot.get(i);
            const rating = p ? liveRatings.get(p.playerId)?.rating : undefined;
            return {
              label: p ? p.name.split(' ').slice(-1)[0]! : '—',
              filled: Boolean(p),
              detail: rating !== undefined ? rating.toFixed(1) : undefined,
              highlight: rating !== undefined ? ratingColor(rating) : undefined,
            };
          })}
        />
      ) : null}

      <View style={styles.section}>
        <Text style={styles.label}>Narração</Text>
        <FlatList
          data={visibleEvents}
          scrollEnabled={false}
          keyExtractor={(e, i) => `${e.minute}-${e.type}-${i}`}
          renderItem={({ item }) => (
            <Text style={[styles.eventLine, item.type === 'goal' && styles.eventGoal]}>
              <Text style={styles.eventMinute}>{item.minute}' </Text>
              {item.detail}
            </Text>
          )}
        />
      </View>

      {/* Momento de Decisão (SPEC 5.4) */}
      <Modal visible={match.phase === 'decision'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.h2}>Momento de decisão</Text>
            <Text style={styles.meta}>{match.pendingDecision?.description}</Text>
            {match.pendingDecision?.options.map((option) => (
              <Pressable key={option.id} style={styles.cta} onPress={() => match.decide(option.id)}>
                <Text style={styles.ctaText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Bottom sheet do jogador: snowflake ao vivo (SPEC 5.3) */}
      <Modal
        visible={selectedPlayerId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPlayerId(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setSelectedPlayerId(null)}>
          <View style={styles.sheet}>
            <Text style={styles.h2}>{selectedParticipation?.name}</Text>
            <Text style={styles.meta}>
              Nota do momento:{' '}
              <Text style={{ color: ratingColor(selectedRating?.rating ?? 6), fontWeight: '900' }}>
                {(selectedRating?.rating ?? 6).toFixed(1)}
              </Text>
            </Text>
            {selectedRating ? (
              <View style={{ alignItems: 'center' }}>
                <RadarChart
                  size={200}
                  labels={CATEGORIES.map((c) => categoryLabel[c].slice(0, 3).toUpperCase())}
                  series={[
                    {
                      values: CATEGORIES.map((c) => Math.min(1, Math.max(0, selectedRating.snowflake[c]) / 1.2)),
                      stroke: colors.accent,
                      fill: 'rgba(46,160,67,0.3)',
                    },
                    {
                      values: CATEGORIES.map((c) => Math.min(1, Math.max(0, -selectedRating.snowflake[c]) / 1.2)),
                      stroke: colors.danger,
                      fill: 'rgba(248,81,73,0.3)',
                    },
                  ]}
                />
                <Text style={styles.metaSmall}>verde = impacto positivo · vermelho = negativo</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </Modal>

      {/* Tática ao vivo */}
      <Modal visible={showTactics} transparent animationType="slide" onRequestClose={() => setShowTactics(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.h2}>Ajuste tático (a partir de {minute + 1}')</Text>
            <TacticsPanel
              tactics={currentTactics}
              onChange={(t) => {
                match.intervene(t);
              }}
            />
            <Pressable style={styles.cta} onPress={() => setShowTactics(false)}>
              <Text style={styles.ctaText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Substituições */}
      <Modal visible={showSubs} transparent animationType="slide" onRequestClose={() => setShowSubs(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.h2}>Substituição</Text>
            <SubPicker
              onDone={() => setShowSubs(false)}
              onPitch={[...onPitchBySlot.values()]}
              bench={benchAvailable.map((b) => ({
                id: b.ownedCardId,
                name: b.basePlayer.name,
                gk: isGkAttributes(b.attributes),
              }))}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function SubPicker({
  onPitch,
  bench,
  onDone,
}: {
  onPitch: PlayerParticipation[];
  bench: Array<{ id: string; name: string; gk: boolean }>;
  onDone: () => void;
}) {
  const [outId, setOutId] = useState<string | null>(null);
  const intervene = useMatchStore((s) => s.intervene);
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{outId ? 'Quem entra?' : 'Quem sai?'}</Text>
      <View style={styles.chips}>
        {(outId === null ? onPitch.map((p) => ({ id: p.playerId, name: p.name })) : bench).map(
          (p) => (
            <Pressable
              key={p.id}
              style={styles.chip}
              onPress={() => {
                if (outId === null) {
                  setOutId(p.id);
                } else {
                  intervene(undefined, [{ outOwnedCardId: outId, inOwnedCardId: p.id }]);
                  onDone();
                }
              }}
            >
              <Text style={styles.chipText}>{p.name}</Text>
            </Pressable>
          ),
        )}
        {outId !== null && bench.length === 0 ? (
          <Text style={styles.meta}>Banco vazio ou já utilizado.</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  h1: { color: colors.text, fontSize: 22, fontWeight: '900' },
  h2: { color: colors.text, fontSize: 16, fontWeight: '900' },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  meta: { color: colors.textDim, fontSize: 12 },
  metaSmall: { color: colors.textDim, fontSize: 10 },
  warn: { color: colors.warning, fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.bgCard,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  cta: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800' },
  scoreboard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreText: { color: colors.text, fontSize: 16, fontWeight: '900' },
  minuteText: { color: colors.accent, fontSize: 18, fontWeight: '900' },
  bigScore: { color: colors.text, fontSize: 20, fontWeight: '900' },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionButton: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  section: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventLine: { color: colors.text, fontSize: 12, paddingVertical: 3 },
  eventGoal: { color: colors.accent, fontWeight: '800' },
  eventMinute: { color: colors.textDim, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  ratingValue: { fontSize: 14, fontWeight: '900', width: 34 },
  ratingName: { color: colors.text, fontSize: 13 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
