// Liga de Amigos (M7): criar/entrar por código, calendário DERIVADO dos
// membros (leagueLogic — mesmo em todos os aparelhos), partidas assíncronas:
// quem joga primeiro simula contra o snapshot do adversário e grava o
// resultado; o outro assiste ao replay (mesma seed ⇒ mesma partida).
import { create } from 'zustand';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  buildCatalog,
  computeStandings,
  mulberry32,
  resolveSquad,
  simulateMatch,
  type CardDefinition,
  type Fixture,
  type LeagueMatchResult,
  type OwnedCard,
  type Squad,
} from '@squad-dynasty/engine';
import { getAllCards, PLAYERS } from '../services/catalog';
import { getDb } from '../services/firebase';
import { friendFixtures, generateInviteCode, matchSeed } from '../services/leagueLogic';
import { ownedCardsMap, useCollectionStore } from './collectionStore';
import { useAuthStore } from './authStore';
import { toSquad } from './squadLogic';
import { useSquadStore } from './squadStore';

export interface MemberSnapshot {
  name: string;
  squad: Squad;
  ownedCards: OwnedCard[];
  /** defs dinâmicas (informs) usadas pelo elenco — resolvíveis em outro aparelho */
  cardDefs: CardDefinition[];
}

export interface FriendLeague {
  id: string;
  name: string;
  code: string;
  ownerUid: string;
  seed: number;
  season: number;
  memberUids: string[];
  members: Record<string, MemberSnapshot>;
}

export interface FriendResult extends LeagueMatchResult {
  round: number;
  seed: number;
  reportedBy: string;
}

interface FriendsLeagueState {
  league: FriendLeague | null;
  results: FriendResult[];
  busy: boolean;
  error: string | null;
  createLeague: (name: string) => Promise<boolean>;
  joinLeague: (code: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  /** Joga (simula) o confronto da rodada contra o snapshot do adversário. */
  playFixture: (fixture: Fixture) => Promise<FriendResult | null>;
  fixtures: () => Fixture[];
  standings: () => ReturnType<typeof computeStandings>;
  leaveLeague: () => void;
}

/** Snapshot do elenco atual do usuário (para os adversários simularem contra). */
function mySnapshot(): MemberSnapshot | null {
  try {
    const squad = toSquad(useSquadStore.getState().draft);
    const owned = ownedCardsMap(useCollectionStore.getState());
    const usedIds = [...squad.starters.map((s) => s.ownedCardId), ...squad.bench];
    const ownedCards = usedIds
      .map((id) => owned.get(id))
      .filter((o): o is OwnedCard => Boolean(o));
    const allCards = getAllCards();
    const usedDefs = new Set(ownedCards.map((o) => o.cardDefId));
    const cardDefs = allCards.filter((c) => usedDefs.has(c.id));
    return {
      name: usePlayerName(),
      squad,
      ownedCards,
      cardDefs,
    };
  } catch {
    return null; // escalação incompleta
  }
}

function usePlayerName(): string {
  // import cíclico evitado: profile é leve
  const { useProfileStore } = require('./profileStore') as typeof import('./profileStore');
  return useProfileStore.getState().coachName;
}

function resolveMember(member: MemberSnapshot) {
  const catalog = buildCatalog(PLAYERS, [...getAllCards(), ...member.cardDefs]);
  return resolveSquad(member.squad, new Map(member.ownedCards.map((o) => [o.id, o])), catalog);
}

export const useFriendsLeagueStore = create<FriendsLeagueState>()((set, get) => ({
  league: null,
  results: [],
  busy: false,
  error: null,

  createLeague: async (name) => {
    const uid = useAuthStore.getState().uid;
    const snapshot = mySnapshot();
    if (!uid || !snapshot) {
      set({ error: 'Conecte-se e complete seu 11 antes de criar a liga.' });
      return false;
    }
    set({ busy: true, error: null });
    try {
      const seed = Math.floor(Date.now() % 2147483647);
      const code = generateInviteCode(mulberry32(seed));
      const ref = doc(collection(getDb(), 'leagues'));
      await setDoc(ref, {
        name,
        code,
        ownerUid: uid,
        seed,
        season: 1,
        memberUids: [uid],
        members: { [uid]: snapshot },
        createdAt: serverTimestamp(),
      });
      set({
        league: { id: ref.id, name, code, ownerUid: uid, seed, season: 1, memberUids: [uid], members: { [uid]: snapshot } },
        results: [],
        busy: false,
      });
      return true;
    } catch (e) {
      set({ busy: false, error: (e as Error).message });
      return false;
    }
  },

  joinLeague: async (code) => {
    const uid = useAuthStore.getState().uid;
    const snapshot = mySnapshot();
    if (!uid || !snapshot) {
      set({ error: 'Conecte-se e complete seu 11 antes de entrar na liga.' });
      return false;
    }
    set({ busy: true, error: null });
    try {
      const found = await getDocs(
        query(collection(getDb(), 'leagues'), where('code', '==', code.toUpperCase())),
      );
      const docSnap = found.docs[0];
      if (!docSnap) {
        set({ busy: false, error: 'Liga não encontrada para esse código.' });
        return false;
      }
      await runTransaction(getDb(), async (tx) => {
        const fresh = await tx.get(docSnap.ref);
        const data = fresh.data()!;
        const memberUids: string[] = data.memberUids ?? [];
        if (!memberUids.includes(uid)) memberUids.push(uid);
        tx.update(docSnap.ref, {
          memberUids,
          [`members.${uid}`]: snapshot,
        });
      });
      await get().refresh();
      set({ busy: false });
      return true;
    } catch (e) {
      set({ busy: false, error: (e as Error).message });
      return false;
    }
  },

  refresh: async () => {
    const current = get().league;
    const uid = useAuthStore.getState().uid;
    if (!uid) return;
    try {
      let leagueDocId = current?.id ?? null;
      if (!leagueDocId) {
        const mine = await getDocs(
          query(collection(getDb(), 'leagues'), where('memberUids', 'array-contains', uid)),
        );
        leagueDocId = mine.docs[0]?.id ?? null;
      }
      if (!leagueDocId) return;
      const snap = await getDoc(doc(getDb(), 'leagues', leagueDocId));
      if (!snap.exists()) return;
      const data = snap.data();
      const league: FriendLeague = {
        id: snap.id,
        name: data.name,
        code: data.code,
        ownerUid: data.ownerUid,
        seed: data.seed,
        season: data.season ?? 1,
        memberUids: data.memberUids ?? [],
        members: data.members ?? {},
      };
      const resultsSnap = await getDocs(collection(getDb(), 'leagues', snap.id, 'results'));
      const results = resultsSnap.docs.map((d) => d.data() as FriendResult);
      set({ league, results });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  fixtures: () => {
    const league = get().league;
    if (!league) return [];
    return friendFixtures(league.memberUids, league.seed);
  },

  playFixture: async (fixture) => {
    const state = get();
    const league = state.league;
    const uid = useAuthStore.getState().uid;
    if (!league || !uid) return null;
    const opponentUid = fixture.homeClubId === uid ? fixture.awayClubId : fixture.homeClubId;
    const opponent = league.members[opponentUid];
    const me = mySnapshot();
    if (!opponent || !me) {
      set({ error: 'Adversário sem elenco publicado ou seu 11 está incompleto.' });
      return null;
    }
    const seed = matchSeed(league.id, league.season, fixture.round, fixture.homeClubId, fixture.awayClubId);
    const iAmHome = fixture.homeClubId === uid;
    const home = iAmHome ? resolveMember(me) : resolveMember(opponent);
    const away = iAmHome ? resolveMember(opponent) : resolveMember(me);
    const result = simulateMatch({ home, away, seed, homeController: 'ai', awayController: 'ai' });
    const entry: FriendResult = {
      round: fixture.round,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      homeGoals: result.score[0],
      awayGoals: result.score[1],
      seed,
      reportedBy: uid,
    };
    try {
      const id = `s${league.season}r${fixture.round}-${fixture.homeClubId.slice(0, 6)}-${fixture.awayClubId.slice(0, 6)}`;
      const ref = doc(getDb(), 'leagues', league.id, 'results', id);
      await runTransaction(getDb(), async (tx) => {
        const existing = await tx.get(ref);
        if (existing.exists()) return; // primeiro a jogar define o resultado
        tx.set(ref, { ...entry, createdAt: serverTimestamp() });
      });
      await get().refresh();
      return entry;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  standings: () => {
    const s = get();
    if (!s.league) return [];
    return computeStandings(s.league.memberUids, s.results);
  },

  leaveLeague: () => set({ league: null, results: [] }),
}));
