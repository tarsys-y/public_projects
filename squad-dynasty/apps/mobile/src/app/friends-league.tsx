// Liga de Amigos + Mercado (M7). Só funciona com o Firebase configurado no
// .env (docs/SETUP-FIREBASE.md); sem config, mostra as instruções.
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { isOnlineEnabled } from '../services/firebase';
import { colors } from '../constants/theme';
import { useAuthStore } from '../stores/authStore';
import { useFriendsLeagueStore } from '../stores/friendsLeagueStore';
import { useMarketStore } from '../stores/marketStore';
import { ownedCardsMap, useCollectionStore } from '../stores/collectionStore';
import { getCardById, playerById, cardOverall } from '../services/catalog';
import { useEconomyStore } from '../stores/economyStore';

export default function FriendsLeagueScreen() {
  const online = isOnlineEnabled();
  const auth = useAuthStore();
  const league = useFriendsLeagueStore();
  const market = useMarketStore();
  const coins = useEconomyStore((s) => s.coins);
  const collection = useCollectionStore(ownedCardsMap);
  const [leagueName, setLeagueName] = useState('Liga dos Amigos');
  const [joinCode, setJoinCode] = useState('');
  const [sellId, setSellId] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status === 'signedIn') {
      void league.refresh();
      void market.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status]);

  const uid = auth.uid;
  const fixtures = league.fixtures();
  const played = useMemo(
    () =>
      new Set(
        league.results.map((r) => `${r.round}-${r.homeClubId.slice(0, 6)}-${r.awayClubId.slice(0, 6)}`),
      ),
    [league.results],
  );
  const myNext = uid
    ? fixtures.find(
        (f) =>
          (f.homeClubId === uid || f.awayClubId === uid) &&
          !played.has(`${f.round}-${f.homeClubId.slice(0, 6)}-${f.awayClubId.slice(0, 6)}`),
      )
    : undefined;

  if (!online) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.h1}>🌐 Liga de Amigos</Text>
        <Text style={styles.meta}>
          O modo online está desativado. Para ligar: crie um projeto no Firebase, ative o login
          anônimo e o Firestore, e cole a configuração no arquivo .env do app — o passo a passo
          completo está em squad-dynasty/docs/SETUP-FIREBASE.md. Depois é só reiniciar o app:
          esta tela vira a liga entre amigos com mercado de transferências.
        </Text>
      </ScrollView>
    );
  }

  if (auth.status !== 'signedIn') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.h1}>🌐 Liga de Amigos</Text>
        <Pressable style={styles.cta} onPress={() => auth.connect()}>
          <Text style={styles.ctaText}>
            {auth.status === 'signingIn' ? 'Conectando…' : 'Conectar (login anônimo)'}
          </Text>
        </Pressable>
        {auth.error ? <Text style={styles.fail}>{auth.error}</Text> : null}
      </ScrollView>
    );
  }

  // ---------- sem liga: criar/entrar ----------
  if (!league.league) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.h1}>🌐 Liga de Amigos</Text>
        {league.error ? <Text style={styles.fail}>{league.error}</Text> : null}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Criar liga</Text>
          <TextInput style={styles.input} value={leagueName} onChangeText={setLeagueName} />
          <Pressable style={styles.cta} onPress={() => league.createLeague(leagueName)}>
            <Text style={styles.ctaText}>{league.busy ? '…' : 'Criar e gerar código'}</Text>
          </Pressable>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entrar com código</Text>
          <TextInput
            style={styles.input}
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="characters"
            placeholder="EX: A7K2MP"
            placeholderTextColor={colors.textDim}
          />
          <Pressable style={styles.cta} onPress={() => league.joinLeague(joinCode)}>
            <Text style={styles.ctaText}>{league.busy ? '…' : 'Entrar na liga'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ---------- liga ativa ----------
  const standings = league.standings();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>🌐 {league.league.name}</Text>
      <Text style={styles.meta}>
        Código de convite: <Text style={styles.code}>{league.league.code}</Text> ·{' '}
        {league.league.memberUids.length} técnico(s)
      </Text>
      {league.error ? <Text style={styles.fail}>{league.error}</Text> : null}

      {myNext ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sua próxima partida (rodada {myNext.round})</Text>
          <Text style={styles.meta}>
            vs{' '}
            {league.league.members[myNext.homeClubId === uid ? myNext.awayClubId : myNext.homeClubId]
              ?.name ?? 'adversário'}
          </Text>
          <Pressable style={styles.cta} onPress={() => league.playFixture(myNext)}>
            <Text style={styles.ctaText}>Jogar agora (simula vs elenco dele)</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.meta}>
          {league.league.memberUids.length < 2
            ? 'Convide amigos com o código para o calendário nascer!'
            : 'Sem partidas pendentes — aguarde os amigos jogarem.'}
        </Text>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Classificação</Text>
        {standings.map((row, i) => (
          <Text key={row.clubId} style={[styles.meta, row.clubId === uid && { color: colors.accent }]}>
            {i + 1}. {league.league!.members[row.clubId]?.name ?? row.clubId.slice(0, 6)} — {row.points} pts
            ({row.wins}V {row.draws}E {row.losses}D, SG {row.goalDiff})
          </Text>
        ))}
      </View>

      {/* ---------- mercado ---------- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Mercado (🪙 {coins.toLocaleString('pt-BR')})</Text>
        {market.message ? <Text style={styles.success}>{market.message}</Text> : null}
        {market.error ? <Text style={styles.fail}>{market.error}</Text> : null}
        {market.listings.map((listing) => {
          const player = playerById.get(listing.cardDef.basePlayerId);
          return (
            <View key={listing.id} style={styles.listing}>
              <Text style={styles.meta}>
                {player?.name ?? listing.cardDef.id} ({cardOverall(listing.cardDef)}) · vendedor{' '}
                {listing.sellerName} · lance atual {listing.highestBid?.amount ?? '—'} · mín{' '}
                {listing.minBid}
              </Text>
              {listing.sellerUid !== uid ? (
                <View style={styles.listingActions}>
                  <Pressable
                    style={styles.smallCta}
                    onPress={() =>
                      market.bid(listing.id, Math.max(listing.minBid, (listing.highestBid?.amount ?? 0) + 100))
                    }
                  >
                    <Text style={styles.smallCtaText}>Lance +100</Text>
                  </Pressable>
                  <Pressable style={styles.smallCta} onPress={() => market.buyNow(listing.id)}>
                    <Text style={styles.smallCtaText}>Comprar 🪙{listing.buyNow}</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.meta}>(seu anúncio)</Text>
              )}
            </View>
          );
        })}
        {market.listings.length === 0 ? <Text style={styles.meta}>Nenhum anúncio ativo.</Text> : null}

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Vender uma carta</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[...collection.values()].slice(0, 25).map((owned) => {
            const card = getCardById(owned.cardDefId);
            const player = card ? playerById.get(card.basePlayerId) : undefined;
            if (!card || !player) return null;
            const selected = sellId === owned.id;
            return (
              <Pressable
                key={owned.id}
                style={[styles.sellChip, selected && styles.sellChipActive]}
                onPress={() => setSellId(selected ? null : owned.id)}
              >
                <Text style={styles.smallCtaText}>
                  {player.name} {cardOverall(card)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {sellId ? (
          <Pressable
            style={styles.cta}
            onPress={() => {
              void market.listCard(sellId, 200, 1000, 12);
              setSellId(null);
            }}
          >
            <Text style={styles.ctaText}>Anunciar (mín 🪙200 · compre-já 🪙1.000 · 12h)</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        style={styles.refresh}
        onPress={() => {
          void league.refresh();
          void market.refresh();
        }}
      >
        <Text style={styles.refreshText}>🔄 Atualizar liga e mercado</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  h1: { color: colors.text, fontSize: 20, fontWeight: '900' },
  meta: { color: colors.textDim, fontSize: 12 },
  code: { color: colors.accent, fontWeight: '900', letterSpacing: 2 },
  success: { color: colors.accent, fontWeight: '700', fontSize: 12 },
  fail: { color: colors.danger, fontWeight: '700', fontSize: 12 },
  section: {
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { color: colors.text, fontWeight: '900', fontSize: 13, textTransform: 'uppercase' },
  input: {
    color: colors.text,
    backgroundColor: colors.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    fontWeight: '700',
  },
  cta: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800' },
  listing: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 6, gap: 4 },
  listingActions: { flexDirection: 'row', gap: 8 },
  smallCta: {
    backgroundColor: colors.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  smallCtaText: { color: colors.text, fontSize: 11, fontWeight: '700' },
  sellChip: {
    backgroundColor: colors.bgCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
  },
  sellChipActive: { borderColor: colors.accent, backgroundColor: '#153021' },
  refresh: { alignItems: 'center', paddingVertical: 6 },
  refreshText: { color: colors.textDim, fontWeight: '700', fontSize: 12 },
});
