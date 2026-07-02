// Liga / Carreira PvE (M6): escolha do clube, calendário, tabela com escudos,
// jogar/simular rodada e resumo da virada de temporada (premiação + envelhecimento).
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ClubCrest } from '../components/ClubCrest';
import { colors } from '../constants/theme';
import { clubById, CLUBS, LEAGUES } from '../services/catalog';
import { useCareerStore } from '../stores/careerStore';
import { ownedCardsMap, useCollectionStore } from '../stores/collectionStore';
import { resolveDraft } from '../stores/squadLogic';
import { useSquadStore } from '../stores/squadStore';
import { getCatalog } from '../services/catalog';

export default function LeagueScreen() {
  const career = useCareerStore();
  const router = useRouter();
  const [pickLeague, setPickLeague] = useState('brasileirao');
  const collection = useCollectionStore(ownedCardsMap);
  const draft = useSquadStore((s) => s.draft);
  const squadReady = useMemo(
    () => resolveDraft(draft, collection, getCatalog()).isComplete,
    [draft, collection],
  );

  // ---------- sem carreira: escolher clube ----------
  if (!career.active) {
    const clubs = CLUBS.filter((c) => c.leagueId === pickLeague);
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Modo Carreira</Text>
        <Text style={styles.meta}>
          Assuma um clube e dispute a liga contra a IA. Ao fim da temporada suas cartas envelhecem
          e você recebe a premiação da colocação.
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {LEAGUES.filter((l) => l.id !== 'legends').map((l) => (
            <Pressable
              key={l.id}
              onPress={() => setPickLeague(l.id)}
              style={[styles.chip, pickLeague === l.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, pickLeague === l.id && styles.chipTextActive]}>{l.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.clubGrid}>
          {clubs.map((club) => (
            <Pressable key={club.id} style={styles.clubPick} onPress={() => career.startCareer(club.id)}>
              <ClubCrest clubId={club.id} size={34} />
              <Text numberOfLines={1} style={styles.clubPickName}>
                {club.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  }

  // ---------- carreira ativa ----------
  const match = career.currentMatch();
  const standings = career.standings();
  const userRow = standings.findIndex((r) => r.clubId === career.userClubId) + 1;
  const totalRounds = career.fixtures.length > 0 ? Math.max(...career.fixtures.map((f) => f.round)) : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <ClubCrest clubId={career.userClubId!} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>{clubById.get(career.userClubId!)?.name}</Text>
          <Text style={styles.meta}>
            Temporada {career.season} · Rodada {career.round}/{totalRounds} · {userRow}º lugar
          </Text>
        </View>
      </View>

      {match ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {match.type === 'cup'
              ? `🏆 Copa — ${match.stageName}`
              : `Próximo jogo (rodada ${career.round})`}
          </Text>
          {match.isDerby ? (
            <Text style={styles.derby}>🔥 CLÁSSICO{match.derbyName ? `: ${match.derbyName}` : ''} (+{250} coins na vitória)</Text>
          ) : null}
          <View style={styles.fixtureRow}>
            <View style={styles.fixtureSide}>
              <ClubCrest clubId={match.fixture.homeClubId} size={30} />
              <Text style={styles.fixtureName}>{clubById.get(match.fixture.homeClubId)?.shortName}</Text>
            </View>
            <Text style={styles.vs}>×</Text>
            <View style={styles.fixtureSide}>
              <ClubCrest clubId={match.fixture.awayClubId} size={30} />
              <Text style={styles.fixtureName}>{clubById.get(match.fixture.awayClubId)?.shortName}</Text>
            </View>
          </View>
          {!squadReady ? (
            <Text style={styles.warn}>Complete seu 11 em “Meu Time” para jogar.</Text>
          ) : null}
          <View style={styles.actionsRow}>
            <Pressable
              disabled={!squadReady}
              style={[styles.cta, { flex: 1 }, !squadReady && { opacity: 0.4 }]}
              onPress={() => {
                if (career.playUserMatch()) router.push('/match');
              }}
            >
              <Text style={styles.ctaText}>Jogar ao vivo</Text>
            </Pressable>
            <Pressable
              style={[styles.ctaSecondary, { flex: 1 }]}
              onPress={() => career.simulateUserMatch()}
            >
              <Text style={styles.ctaSecondaryText}>Simular rodada</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {career.cup && !career.cup.champion ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Copa</Text>
          <Text style={styles.meta}>
            {career.cup.userAlive
              ? `Você está vivo! Próxima fase: ${career.cup.stage < 4 ? ['Oitavas', 'Quartas', 'Semifinal', 'Final'][career.cup.stage] : '—'} (após a rodada ${[8, 16, 24, 32][career.cup.stage] ?? '—'} da liga)`
              : 'Você foi eliminado — a copa segue sem o seu clube.'}
          </Text>
        </View>
      ) : null}
      {career.cup?.champion ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Copa encerrada</Text>
          <Text style={styles.meta}>
            Campeão: {clubById.get(career.cup.champion)?.name}
            {career.cup.champion === career.userClubId ? ' — É SEU! 🎉' : ''}
          </Text>
        </View>
      ) : null}

      {career.lastSummary ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Temporada {career.lastSummary.season} encerrada</Text>
          <Text style={styles.meta}>
            {career.lastSummary.placement}º lugar · campeão:{' '}
            {clubById.get(career.lastSummary.champion)?.name} · 🪙 +{career.lastSummary.prizeCoins}
            {career.lastSummary.prizeGems ? ` · 💎 +${career.lastSummary.prizeGems}` : ''}
          </Text>
          {career.lastSummary.cupChampion ? (
            <Text style={styles.meta}>
              Copa: {clubById.get(career.lastSummary.cupChampion)?.name}
              {career.lastSummary.userWonCup ? ' — conquistada por você! 🏆' : ''}
            </Text>
          ) : null}
          {career.lastSummary.aging.length > 0 ? (
            <>
              <Text style={[styles.meta, { marginTop: 4 }]}>Envelhecimento do elenco:</Text>
              {career.lastSummary.aging.slice(0, 12).map((entry) => (
                <Text key={entry.ownedId} style={styles.agingLine}>
                  {entry.retired ? '🏁' : Object.values(entry.changes).some((v) => v > 0) ? '📈' : '📉'}{' '}
                  {entry.name} ({entry.newAge} anos){' '}
                  {entry.retired
                    ? '— aposentou-se!'
                    : Object.entries(entry.changes)
                        .map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`)
                        .join(', ')}
                </Text>
              ))}
            </>
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Classificação</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 1 }]}>Clube</Text>
          <Text style={styles.th}>J</Text>
          <Text style={styles.th}>SG</Text>
          <Text style={styles.th}>Pts</Text>
        </View>
        {standings.map((row, i) => (
          <View
            key={row.clubId}
            style={[styles.tr, row.clubId === career.userClubId && styles.trUser]}
          >
            <Text style={styles.pos}>{i + 1}</Text>
            <ClubCrest clubId={row.clubId} size={18} />
            <Text numberOfLines={1} style={[styles.td, { flex: 1 }]}>
              {clubById.get(row.clubId)?.shortName ?? row.clubId}
            </Text>
            <Text style={styles.td}>{row.played}</Text>
            <Text style={styles.td}>{row.goalDiff}</Text>
            <Text style={[styles.td, { fontWeight: '900' }]}>{row.points}</Text>
          </View>
        ))}
      </View>

      <Pressable style={styles.abandon} onPress={career.abandonCareer}>
        <Text style={styles.abandonText}>Abandonar carreira</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  h1: { color: colors.text, fontSize: 20, fontWeight: '900' },
  meta: { color: colors.textDim, fontSize: 12 },
  derby: { color: colors.warning, fontSize: 12, fontWeight: '900' },
  agingLine: { color: colors.textDim, fontSize: 11, paddingLeft: 4 },
  warn: { color: colors.warning, fontSize: 12, fontWeight: '700' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chips: { gap: 6 },
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
  clubGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  clubPick: {
    width: '31%',
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  clubPickName: { color: colors.text, fontSize: 10, fontWeight: '700', maxWidth: '90%' },
  section: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { color: colors.text, fontWeight: '900', fontSize: 13, textTransform: 'uppercase' },
  fixtureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingVertical: 6 },
  fixtureSide: { alignItems: 'center', gap: 4 },
  fixtureName: { color: colors.text, fontWeight: '800', fontSize: 13 },
  vs: { color: colors.textDim, fontSize: 18, fontWeight: '900' },
  actionsRow: { flexDirection: 'row', gap: 8 },
  cta: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800' },
  ctaSecondary: {
    backgroundColor: colors.bgCard,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctaSecondaryText: { color: colors.text, fontWeight: '800' },
  tableHeader: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  th: { color: colors.textDim, fontSize: 10, fontWeight: '800', width: 28, textAlign: 'right' },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3, paddingHorizontal: 4, borderRadius: 6 },
  trUser: { backgroundColor: colors.bgCard },
  pos: { color: colors.textDim, fontSize: 11, width: 18, textAlign: 'right' },
  td: { color: colors.text, fontSize: 12, width: 28, textAlign: 'right' },
  abandon: { alignItems: 'center', paddingVertical: 8 },
  abandonText: { color: colors.danger, fontWeight: '700', fontSize: 12 },
});
