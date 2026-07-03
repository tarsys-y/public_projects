// Partida ao Vivo (SPEC tela 4): campo 2D com nota do momento sobre cada
// jogador, narração por texto, bottom sheet com snowflake ao vivo, botões de
// substituição/tática, modal de Momento de Decisão e modo rápido (só texto).
import { useEffect, useMemo, useState } from 'react';
import { Link, useRouter } from 'expo-router';
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
  buildAutoSquad,
  computeRatingsAt,
  fatigueFactor,
  isGkAttributes,
  resolveOwnedCard,
  resolveSquad,
  staminaOf,
  type PlayerParticipation,
  type ResolvedPlayer,
  type ResolvedSquad,
  type Snowflake,
  type Tactics,
} from '@squad-dynasty/engine';
import { GoalOverlay } from '../components/GoalOverlay';
import { LineupPreviewModal, type PreviewSlot } from '../components/LineupPreviewModal';
import { PitchView } from '../components/PitchView';
import { RadarChart } from '../components/RadarChart';
import { TacticsPanel } from '../components/TacticsPanel';
import { ClubCrest, MonogramCrest } from '../components/ClubCrest';
import { categoryLabel, colors } from '../constants/theme';
import { crestPaletteById } from '../constants/crestPalettes';
import { CATALOG, CARDS, clubById, CLUBS, LEAGUES, PLAYERS } from '../services/catalog';
import { ownedCardsMap, useCollectionStore } from '../stores/collectionStore';
import { useProfileStore } from '../stores/profileStore';
import { resolveDraft, toSquad } from '../stores/squadLogic';
import { useSquadStore } from '../stores/squadStore';
import { SPEED_FACTOR, useMatchStore } from '../stores/matchStore';
import { feedback } from '../services/feedback';

const OPPONENTS = CLUBS.filter((c) => c.id !== 'icons' && c.id !== 'master-liga');
const CATEGORIES = Object.keys(categoryLabel) as Array<keyof typeof categoryLabel>;

const ratingColor = (r: number) =>
  r >= 7.5 ? colors.accent : r >= 6 ? colors.text : r >= 5 ? colors.warning : colors.danger;

export default function MatchScreen() {
  const collection = useCollectionStore(ownedCardsMap);
  const draft = useSquadStore((s) => s.draft);
  const teamName = useProfileStore((s) => s.teamName) || 'Meu Time';
  const teamCrestId = useProfileStore((s) => s.teamCrestId);
  const match = useMatchStore();
  const router = useRouter();
  const [opponent, setOpponent] = useState(OPPONENTS[0]!.id);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showTactics, setShowTactics] = useState(false);
  const [showSubs, setShowSubs] = useState(false);
  const [showOpponentPreview, setShowOpponentPreview] = useState(false);
  const [showPreMatch, setShowPreMatch] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(LEAGUES[0]!.id);

  const draftView = useMemo(() => resolveDraft(draft, collection, CATALOG), [draft, collection]);

  const opponentPreview = useMemo((): ResolvedSquad | null => {
    if (!showOpponentPreview && !showPreMatch) return null;
    const clubPlayers = PLAYERS.filter((p) => p.clubId === opponent);
    const ids = new Set(clubPlayers.map((p) => p.id));
    const baseCards = CARDS.filter((c) => c.version === 'base' && ids.has(c.basePlayerId));
    if (clubPlayers.length === 0) return null;
    const { squad, ownedCards } = buildAutoSquad(clubPlayers, baseCards, '4-3-3', { ownerId: `preview-${opponent}` });
    return resolveSquad(squad, new Map(ownedCards.map((o) => [o.id, o])), CATALOG);
  }, [showOpponentPreview, showPreMatch, opponent]);

  const homePreviewSlots: PreviewSlot[] = useMemo(
    () =>
      draftView.slots
        .filter((s) => s.player)
        .map((s) => ({ position: s.position, name: s.player!.basePlayer.name, overall: s.player!.overall })),
    [draftView],
  );
  const homePreviewBench: PreviewSlot[] = useMemo(
    () =>
      draft.bench
        .map((id) => collection.get(id))
        .filter((o): o is NonNullable<typeof o> => Boolean(o))
        .map((owned) => {
          const player = resolveOwnedCard(owned, CATALOG);
          return { position: player.basePlayer.positions[0] ?? '?', name: player.basePlayer.name, overall: player.overall };
        }),
    [draft.bench, collection],
  );
  const awayPreviewSlots: PreviewSlot[] = useMemo(
    () =>
      opponentPreview
        ? opponentPreview.slots.map((s) => ({ position: s.position, name: s.player.basePlayer.name, overall: s.player.overall }))
        : [],
    [opponentPreview],
  );
  const awayPreviewBench: PreviewSlot[] = useMemo(
    () =>
      opponentPreview
        ? opponentPreview.bench.map((b) => ({
            position: b.basePlayer.positions[0] ?? '?',
            name: b.basePlayer.name,
            overall: b.overall,
          }))
        : [],
    [opponentPreview],
  );

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

  // Último gol dentro da janela de playback → overlay + som (M8)
  const lastGoal = useMemo(() => {
    if (!result) return null;
    const goals = result.events.filter((e) => e.type === 'goal' && e.minute <= match.playbackMinute);
    return goals.length > 0 ? goals[goals.length - 1]! : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, minute]);
  const goalKey = lastGoal ? `${lastGoal.minute}-${lastGoal.side}-${lastGoal.playerId}` : null;
  const [seenGoalKey, setSeenGoalKey] = useState<string | null>(null);
  useEffect(() => {
    if (!goalKey || goalKey === seenGoalKey) return;
    setSeenGoalKey(goalKey);
    if (match.phase === 'playing' || match.phase === 'decision') feedback.goal();
  }, [goalKey, seenGoalKey, match.phase]);
  useEffect(() => {
    if (match.phase === 'playing' && match.playbackMinute === 0) feedback.kickoff();
    if (match.phase === 'finished' && result) {
      const [h, a] = result.score;
      if (h > a) feedback.victory();
      else feedback.fulltime();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.phase]);

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {LEAGUES.map((league) => (
            <Pressable
              key={league.id}
              onPress={() => setSelectedLeague(league.id)}
              style={[styles.chip, selectedLeague === league.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, selectedLeague === league.id && styles.chipTextActive]}>
                {league.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.chips}>
          {OPPONENTS.filter((c) => c.leagueId === selectedLeague).map((club) => (
            <Pressable
              key={club.id}
              onPress={() => setOpponent(club.id)}
              style={[styles.chip, opponent === club.id && styles.chipActive, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
            >
              <ClubCrest clubId={club.id} size={16} />
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
          onPress={() => setShowOpponentPreview(true)}
          style={styles.actionButton}
        >
          <Text style={styles.actionText}>Ver Elenco</Text>
        </Pressable>
        <Pressable
          disabled={!draftView.isComplete}
          onPress={() => setShowPreMatch(true)}
          style={[styles.cta, !draftView.isComplete && { opacity: 0.4 }]}
        >
          <Text style={styles.ctaText}>Começar partida</Text>
        </Pressable>
        <Link href="/draft" style={styles.draftLink}>
          <Text style={styles.draftLinkText}>🎲 Modo Draft: monte um XI de sorte e encare a série →</Text>
        </Link>
        <Modal visible={showOpponentPreview} transparent animationType="slide" onRequestClose={() => setShowOpponentPreview(false)}>
          <View style={styles.sheetBackdrop}>
            <View style={[styles.sheet, { maxHeight: '90%' }]}>
              <ScrollView>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <ClubCrest clubId={opponent} size={32} />
                  <Text style={styles.h2}>{clubById.get(opponent)?.name ?? opponent}</Text>
                </View>
                {opponentPreview ? (
                  <>
                    <PitchView
                      formationId={opponentPreview.formation}
                      height={320}
                      slots={opponentPreview.slots.map((s) => ({
                        label: s.player.basePlayer.name.split(' ').slice(-1)[0]!,
                        overall: s.player.overall,
                        filled: true,
                      }))}
                    />
                    <Text style={[styles.label, { marginTop: 8 }]}>Titulares</Text>
                    {opponentPreview.slots.map((s, i) => (
                      <View key={i} style={[styles.subCard, { marginTop: 4 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <Text style={styles.subPos}>{s.position}</Text>
                          <Text style={styles.subName} numberOfLines={1}>{s.player.basePlayer.name}</Text>
                        </View>
                        <Text style={styles.subOverall}>{s.player.overall}</Text>
                      </View>
                    ))}
                    <Text style={[styles.label, { marginTop: 12 }]}>Banco</Text>
                    {opponentPreview.bench.map((b, i) => (
                      <View key={i} style={[styles.subCard, { marginTop: 4 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <Text style={styles.subPos}>{b.basePlayer.positions[0]}</Text>
                          <Text style={styles.subName} numberOfLines={1}>{b.basePlayer.name}</Text>
                        </View>
                        <Text style={styles.subOverall}>{b.overall}</Text>
                      </View>
                    ))}
                  </>
                ) : (
                  <Text style={styles.meta}>Carregando...</Text>
                )}
                <Pressable onPress={() => setShowOpponentPreview(false)} style={[styles.cta, { marginTop: 12 }]}>
                  <Text style={styles.ctaText}>Fechar</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
        <LineupPreviewModal
          visible={showPreMatch}
          confirmLabel="Iniciar Partida"
          onClose={() => setShowPreMatch(false)}
          onConfirm={() => {
            setShowPreMatch(false);
            match.startFriendly(toSquad(draft), collection, opponent);
          }}
          home={{
            crest: (
              <MonogramCrest
                width={34}
                height={44}
                primary={crestPaletteById(teamCrestId).primary}
                secondary={crestPaletteById(teamCrestId).secondary}
                initials={teamName}
              />
            ),
            name: teamName,
            overall: draftView.teamOverall,
            slots: homePreviewSlots,
            bench: homePreviewBench,
          }}
          away={{
            crest: <ClubCrest clubId={opponent} size={44} />,
            name: clubById.get(opponent)?.name ?? opponent,
            overall: awayPreviewSlots.length
              ? Math.round(awayPreviewSlots.reduce((sum, s) => sum + s.overall, 0) / awayPreviewSlots.length)
              : 0,
            slots: awayPreviewSlots,
            bench: awayPreviewBench,
          }}
        />
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
          {teamName} {result.score[0]} x {result.score[1]} {opponentName}
        </Text>
        <Text style={styles.meta}>
          Posse {result.stats.home.possession}% x {result.stats.away.possession}% · Chutes{' '}
          {result.stats.home.shots} x {result.stats.away.shots} · xG {result.stats.home.xg.toFixed(2)} x{' '}
          {result.stats.away.xg.toFixed(2)}
        </Text>
        {match.reward ? (
          <View style={styles.rewardBox}>
            <Text style={styles.rewardText}>
              🪙 +{match.reward.coins.toLocaleString('pt-BR')} coins
            </Text>
            <Text style={styles.meta}>
              {match.reward.base} pelo resultado + {match.reward.performanceBonus} de desempenho
            </Text>
          </View>
        ) : null}
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
        {match.mode === 'career' ? (
          <Pressable
            onPress={() => {
              match.reset();
              router.push('/league');
            }}
            style={styles.cta}
          >
            <Text style={styles.ctaText}>Voltar à Liga</Text>
          </Pressable>
        ) : (
          <Pressable onPress={match.reset} style={styles.cta}>
            <Text style={styles.ctaText}>Jogar outro amistoso</Text>
          </Pressable>
        )}
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
          {teamName} {score[0]} x {score[1]} {opponentName}
        </Text>
        <Text style={styles.minuteText}>{minute}'</Text>
      </View>
      <GoalOverlay trigger={goalKey} isUserGoal={lastGoal?.side === 'home'} />

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionButton} onPress={() => setShowTactics(true)}>
          <Text style={styles.actionText}>Tática</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={() => setShowSubs(true)}>
          <Text style={styles.actionText}>Substituir</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={() => setShowOpponentPreview(true)}>
          <Text style={styles.actionText}>Adversário</Text>
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
              bench={benchAvailable}
              liveRatings={liveRatings}
              minute={minute}
              highPressing={currentTactics.pressing === 3}
            />
          </View>
        </View>
      </Modal>

      {/* Adversário ao vivo */}
      <Modal visible={showOpponentPreview} transparent animationType="slide" onRequestClose={() => setShowOpponentPreview(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { maxHeight: '80%' }]}>
            <ScrollView>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <ClubCrest clubId={match.opponentClubId ?? ''} size={28} />
                <Text style={styles.h2}>{opponentName}</Text>
              </View>
              <Text style={styles.label}>Jogadores em campo</Text>
              {result.participations
                .filter((p) => p.side === 'away' && p.enteredMinute <= minute && (p.leftMinute === undefined || p.leftMinute > minute))
                .map((p) => {
                  const rating = liveRatings.get(p.playerId);
                  return (
                    <View key={p.playerId} style={[styles.subCard, { marginTop: 4 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Text style={styles.subPos}>{p.position}</Text>
                        <Text style={styles.subName} numberOfLines={1}>{p.name}</Text>
                      </View>
                      {rating ? (
                        <Text style={[styles.subRating, { color: ratingColor(rating.rating) }]}>
                          {rating.rating.toFixed(1)}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              <Pressable onPress={() => setShowOpponentPreview(false)} style={[styles.cta, { marginTop: 12 }]}>
                <Text style={styles.ctaText}>Fechar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const staminaColor = (pct: number) =>
  pct > 70 ? '#2ea043' : pct > 40 ? '#d29922' : '#da3633';

function SubPicker({
  onPitch,
  bench,
  liveRatings,
  minute,
  highPressing,
  onDone,
}: {
  onPitch: PlayerParticipation[];
  bench: ResolvedPlayer[];
  liveRatings: Map<string, { rating: number; snowflake: Snowflake }>;
  minute: number;
  highPressing: boolean;
  onDone: () => void;
}) {
  const [outId, setOutId] = useState<string | null>(null);
  const intervene = useMatchStore((s) => s.intervene);
  const home = useMatchStore((s) => s.home);

  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{outId ? 'Quem entra?' : 'Quem sai?'}</Text>
      {outId === null ? (
        <View style={{ gap: 6 }}>
          {onPitch.map((p) => {
            const minutesPlayed = minute - p.enteredMinute;
            const resolvedPlayer = home?.slots.find((s) => s.player.ownedCardId === p.playerId)?.player
              ?? home?.bench.find((b) => b.ownedCardId === p.playerId);
            const stamina = resolvedPlayer ? staminaOf(resolvedPlayer) : 70;
            const energy = Math.round(fatigueFactor(stamina, minutesPlayed, highPressing) * 100);
            const rating = liveRatings.get(p.playerId);
            return (
              <Pressable key={p.playerId} style={styles.subCard} onPress={() => setOutId(p.playerId)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Text style={styles.subPos}>{p.position}</Text>
                  <Text style={styles.subName} numberOfLines={1}>{p.name}</Text>
                  {rating && (
                    <Text style={[styles.subRating, { color: ratingColor(rating.rating) }]}>
                      {rating.rating.toFixed(1)}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.subEnergy, { color: staminaColor(energy) }]}>{energy}%</Text>
                  <View style={styles.staminaBarBg}>
                    <View style={[styles.staminaBarFill, { width: `${energy}%`, backgroundColor: staminaColor(energy) }]} />
                  </View>
                  <Text style={styles.subMinutes}>{minutesPlayed}'</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          {bench.map((b) => {
            const stamina = staminaOf(b);
            return (
              <Pressable
                key={b.ownedCardId}
                style={styles.subCard}
                onPress={() => {
                  intervene(undefined, [{ outOwnedCardId: outId, inOwnedCardId: b.ownedCardId }]);
                  onDone();
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Text style={styles.subPos}>{b.basePlayer.positions[0] ?? '?'}</Text>
                  <Text style={styles.subName} numberOfLines={1}>{b.basePlayer.name}</Text>
                  <Text style={styles.subOverall}>{b.overall}</Text>
                </View>
                <Text style={[styles.subEnergy, { color: staminaColor(Math.round(stamina / 99 * 100)) }]}>
                  STA {stamina}
                </Text>
              </Pressable>
            );
          })}
          {bench.length === 0 ? (
            <Text style={styles.meta}>Banco vazio ou já utilizado.</Text>
          ) : null}
          <Pressable onPress={() => setOutId(null)}>
            <Text style={[styles.meta, { textDecorationLine: 'underline' }]}>Voltar</Text>
          </Pressable>
        </View>
      )}
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
  rewardBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 12,
    gap: 2,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  rewardText: { color: colors.accent, fontWeight: '900', fontSize: 16 },
  draftLink: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  draftLinkText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  subPos: { color: colors.textDim, fontSize: 10, fontWeight: '800', width: 24 },
  subName: { color: colors.text, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  subRating: { fontSize: 14, fontWeight: '900' },
  subOverall: { color: colors.accent, fontSize: 14, fontWeight: '900' },
  subEnergy: { fontSize: 12, fontWeight: '800' },
  subMinutes: { color: colors.textDim, fontSize: 10, fontWeight: '700' },
  staminaBarBg: {
    width: 40,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  staminaBarFill: { height: '100%', borderRadius: 3 },
});
