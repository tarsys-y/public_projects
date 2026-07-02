// Cloud Functions do Squad Dynasty (M7 completo — SPEC 10.4: sorteios
// sensíveis rodam no servidor). Deploy exige o plano Blaze:
//   cd functions && npm install && npm run deploy
// Depois ative no app com EXPO_PUBLIC_USE_FUNCTIONS=1.
//
// Estas funções são a versão anti-fraude dos caminhos que hoje rodam no
// cliente (M7 "lite"): abertura de pacote, resultado oficial de partida da
// liga de amigos e liquidação de leilão do mercado.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

/** mulberry32 — o mesmo PRNG do engine (determinismo compartilhado). */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RARITY_WEIGHTS: Array<[string, number]> = [
  ['common', 0.7],
  ['rare', 0.22],
  ['epic', 0.065],
  ['legendary', 0.014],
  ['icon', 0.001],
];

/**
 * Sorteio de pacote server-side: o cliente manda o packType; o servidor
 * sorteia raridades com seed secreta, grava auditoria em packOpenings e
 * devolve as raridades — o cliente materializa as cartas do pool local.
 */
export const openPackSecure = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Login necessário');
  const packType = String(request.data?.packType ?? 'basic');
  const cards = packType === 'premium' ? 5 : 3;

  const seed = Math.floor(Math.random() * 2147483647); // servidor decide
  const rng = mulberry32(seed);
  const rarities: string[] = [];
  for (let i = 0; i < cards; i++) {
    let roll = rng();
    for (const [rarity, weight] of RARITY_WEIGHTS) {
      roll -= weight;
      if (roll < 0) {
        rarities.push(rarity);
        break;
      }
    }
    if (rarities.length < i + 1) rarities.push('common');
  }

  await db.collection('packOpenings').add({
    uid,
    packType,
    seed,
    rarities,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { seed, rarities };
});

/**
 * Resultado oficial de partida da liga de amigos: o servidor valida que o
 * autor é membro e participante do confronto e grava de forma imutável.
 * (A simulação continua determinística pela seed derivada — qualquer cliente
 * reproduz os mesmos eventos.)
 */
export const resolveLeagueMatch = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Login necessário');
  const { leagueId, resultId, result } = request.data ?? {};
  if (!leagueId || !resultId || !result) throw new HttpsError('invalid-argument', 'Payload incompleto');

  const leagueRef = db.collection('leagues').doc(String(leagueId));
  const league = await leagueRef.get();
  if (!league.exists) throw new HttpsError('not-found', 'Liga não existe');
  const memberUids: string[] = league.get('memberUids') ?? [];
  if (!memberUids.includes(uid)) throw new HttpsError('permission-denied', 'Não é membro');
  if (result.homeClubId !== uid && result.awayClubId !== uid) {
    throw new HttpsError('permission-denied', 'Não participa do confronto');
  }

  const resultRef = leagueRef.collection('results').doc(String(resultId));
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(resultRef);
    if (existing.exists) throw new HttpsError('already-exists', 'Resultado já registrado');
    tx.set(resultRef, { ...result, reportedBy: uid, createdAt: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});

/** Liquidação de leilão server-side: encerra anúncios expirados com validação. */
export const finalizeAuction = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Login necessário');
  const listingId = String(request.data?.listingId ?? '');
  const ref = db.collection('marketListings').doc(listingId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Anúncio não existe');
    const listing = snap.data()!;
    if (listing.status !== 'active') return { status: listing.status };
    if (listing.expiresAt > Date.now()) throw new HttpsError('failed-precondition', 'Leilão ainda ativo');
    const buyerUid = listing.highestBid?.uid ?? listing.sellerUid;
    tx.update(ref, { status: 'sold', buyerUid, finalizedBy: uid });
    return { status: 'sold', buyerUid };
  });
});
