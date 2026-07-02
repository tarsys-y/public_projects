// Modo Draft (UT): entrada em coins, 11 escolhas de 1-entre-5 cartas
// emprestadas e uma série de até 4 partidas — perdeu, acabou. Prêmios por vitória.
import { ScrollView, StyleSheet, Pressable, Text, View } from 'react-native';
import { FORMATIONS } from '@squad-dynasty/engine';
import { CardView } from '../components/CardView';
import { colors } from '../constants/theme';
import { cardOverall, getCardById, playerById } from '../services/catalog';
import { useEconomyStore } from '../stores/economyStore';
import {
  DRAFT_ENTRY_COINS,
  DRAFT_PERFECT_GEMS,
  DRAFT_REWARDS_BY_WINS,
  useDraftStore,
} from '../stores/draftStore';

export default function DraftScreen() {
  const draft = useDraftStore();
  const coins = useEconomyStore((s) => s.coins);
  const formation = FORMATIONS['4-3-3']!;

  if (draft.phase === 'idle') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.h1}>🎲 Modo Draft</Text>
        <Text style={styles.meta}>
          Pague a entrada, monte um XI escolhendo 1 entre 5 cartas por posição (do catálogo
          inteiro, com odds generosas) e encare uma série de 4 partidas cada vez mais difíceis.
          Derrota encerra a série. Prêmios: {DRAFT_REWARDS_BY_WINS.map((v, i) => `${i}V=🪙${v}`).join(' · ')}{' '}
          · 4V também paga 💎{DRAFT_PERFECT_GEMS}.
        </Text>
        <Pressable
          disabled={coins < DRAFT_ENTRY_COINS}
          style={[styles.cta, coins < DRAFT_ENTRY_COINS && { opacity: 0.4 }]}
          onPress={() => draft.startDraft()}
        >
          <Text style={styles.ctaText}>Entrar no Draft (🪙 {DRAFT_ENTRY_COINS})</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (draft.phase === 'picking') {
    const slot = formation.slots[draft.slotIndex]!;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.h1}>
          Escolha {draft.slotIndex + 1}/11 — {slot.position}
        </Text>
        <View style={styles.choices}>
          {draft.choices.map((cardDefId) => {
            const card = getCardById(cardDefId);
            const player = card ? playerById.get(card.basePlayerId) : undefined;
            if (!card || !player) return null;
            return (
              <Pressable key={cardDefId} onPress={() => draft.choose(cardDefId)}>
                <CardView card={card} player={player} overall={cardOverall(card)} />
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.meta}>
          Já escalados: {draft.picks.length} · as cartas do draft são emprestadas (não entram na
          coleção).
        </Text>
      </ScrollView>
    );
  }

  // gauntlet / done
  const wins = draft.results.filter((r) => r.won).length;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>🎲 Série do Draft — {wins} vitória(s)</Text>
      {draft.results.map((r, i) => (
        <View key={i} style={styles.resultRow}>
          <Text style={[styles.resultText, { color: r.won ? colors.accent : colors.danger }]}>
            {r.won ? '✅' : '❌'} Jogo {i + 1} vs {r.opponentLabel}: {r.score[0]} x {r.score[1]}
          </Text>
        </View>
      ))}
      {draft.phase === 'gauntlet' ? (
        <Pressable style={styles.cta} onPress={() => draft.playNextMatch()}>
          <Text style={styles.ctaText}>Jogar partida {draft.results.length + 1}/4</Text>
        </Pressable>
      ) : (
        <Pressable
          style={styles.cta}
          onPress={() => {
            const reward = draft.claimRewards();
            if (!reward) draft.reset();
          }}
        >
          <Text style={styles.ctaText}>
            Resgatar prêmio: 🪙 {DRAFT_REWARDS_BY_WINS[wins] ?? 0}
            {wins === 4 ? ` + 💎 ${DRAFT_PERFECT_GEMS}` : ''}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  h1: { color: colors.text, fontSize: 20, fontWeight: '900' },
  meta: { color: colors.textDim, fontSize: 12 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  cta: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800' },
  resultRow: { backgroundColor: colors.bgElevated, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.border },
  resultText: { fontWeight: '800', fontSize: 13 },
});
