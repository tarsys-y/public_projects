// Mercado entre amigos (M7): leilão assíncrono com lance mínimo e comprar-já.
// Sem Cloud Functions as moedas são locais por aparelho, então a liquidação é
// "no refresh": quem abre o mercado processa o que lhe pertence (crédito de
// venda, reembolso de lance superado, resgate de carta arrematada). Confiança
// entre amigos + regras de segurança; a versão anti-fraude vive em functions/.
import { create } from 'zustand';
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { CONFIG, type CardDefinition, type OwnedCard } from '@squad-dynasty/engine';
import { getCardById } from '../services/catalog';
import { getDb } from '../services/firebase';
import { sellerNet } from '../services/leagueLogic';
import { useAuthStore } from './authStore';
import { useCollectionStore } from './collectionStore';
import { useEconomyStore } from './economyStore';

export interface MarketListing {
  id: string;
  sellerUid: string;
  sellerName: string;
  ownedCard: OwnedCard;
  cardDef: CardDefinition; // embutida p/ resolver em qualquer aparelho
  minBid: number;
  buyNow: number;
  expiresAt: number; // epoch ms
  status: 'active' | 'sold';
  buyerUid: string | null;
  highestBid: { uid: string; name: string; amount: number } | null;
  /** reembolsos pendentes de lances superados: resgatados no refresh. */
  refunds: Array<{ uid: string; amount: number; claimed: boolean }>;
  sellerCollected: boolean;
  buyerClaimed: boolean;
}

interface MarketState {
  listings: MarketListing[];
  busy: boolean;
  error: string | null;
  message: string | null;
  /** Anuncia uma carta (sai da coleção local — escrow). */
  listCard: (ownedId: string, minBid: number, buyNow: number, hours: 6 | 12 | 24) => Promise<boolean>;
  bid: (listingId: string, amount: number) => Promise<boolean>;
  buyNow: (listingId: string) => Promise<boolean>;
  /** Busca anúncios e LIQUIDA o que é meu (créditos/reembolsos/resgates). */
  refresh: () => Promise<void>;
}

function coachName(): string {
  const { useProfileStore } = require('./profileStore') as typeof import('./profileStore');
  return useProfileStore.getState().coachName;
}

export const useMarketStore = create<MarketState>()((set, get) => ({
  listings: [],
  busy: false,
  error: null,
  message: null,

  listCard: async (ownedId, minBid, buyNow, hours) => {
    const uid = useAuthStore.getState().uid;
    const owned = useCollectionStore.getState().ownedCards[ownedId];
    const cardDef = owned ? getCardById(owned.cardDefId) : undefined;
    if (!uid || !owned || !cardDef) return false;
    set({ busy: true, error: null });
    try {
      const ref = doc(collection(getDb(), 'marketListings'));
      await setDoc(ref, {
        sellerUid: uid,
        sellerName: coachName(),
        ownedCard: owned,
        cardDef,
        minBid: Math.max(50, Math.round(minBid)),
        buyNow: Math.max(minBid, Math.round(buyNow)),
        expiresAt: Date.now() + hours * 3600_000,
        status: 'active',
        buyerUid: null,
        highestBid: null,
        refunds: [],
        sellerCollected: false,
        buyerClaimed: false,
        createdAt: serverTimestamp(),
      });
      useCollectionStore.getState().consumeCards([ownedId]); // escrow
      set({ busy: false, message: 'Carta anunciada no mercado.' });
      await get().refresh();
      return true;
    } catch (e) {
      set({ busy: false, error: (e as Error).message });
      return false;
    }
  },

  bid: async (listingId, amount) => {
    const uid = useAuthStore.getState().uid;
    if (!uid) return false;
    if (!useEconomyStore.getState().spend({ coins: amount })) {
      set({ error: 'Coins insuficientes para o lance.' });
      return false;
    }
    try {
      await runTransaction(getDb(), async (tx) => {
        const ref = doc(getDb(), 'marketListings', listingId);
        const snap = await tx.get(ref);
        if (!snap.exists()) throw new Error('Anúncio não existe mais');
        const listing = snap.data() as MarketListing;
        if (listing.status !== 'active' || listing.expiresAt < Date.now()) {
          throw new Error('Leilão encerrado');
        }
        if (listing.sellerUid === uid) throw new Error('Você é o vendedor');
        const current = listing.highestBid?.amount ?? 0;
        if (amount < listing.minBid || amount <= current) throw new Error('Lance abaixo do mínimo/atual');
        const refunds = [...(listing.refunds ?? [])];
        if (listing.highestBid) {
          refunds.push({ uid: listing.highestBid.uid, amount: listing.highestBid.amount, claimed: false });
        }
        tx.update(ref, { highestBid: { uid, name: coachName(), amount }, refunds });
      });
      set({ message: 'Lance registrado!' });
      await get().refresh();
      return true;
    } catch (e) {
      useEconomyStore.getState().earn({ coins: amount }); // estorna o débito local
      set({ error: (e as Error).message });
      return false;
    }
  },

  buyNow: async (listingId) => {
    const uid = useAuthStore.getState().uid;
    if (!uid) return false;
    const listing = get().listings.find((l) => l.id === listingId);
    if (!listing) return false;
    if (!useEconomyStore.getState().spend({ coins: listing.buyNow })) {
      set({ error: 'Coins insuficientes.' });
      return false;
    }
    try {
      await runTransaction(getDb(), async (tx) => {
        const ref = doc(getDb(), 'marketListings', listingId);
        const snap = await tx.get(ref);
        const fresh = snap.data() as MarketListing | undefined;
        if (!fresh || fresh.status !== 'active') throw new Error('Já vendido/encerrado');
        const refunds = [...(fresh.refunds ?? [])];
        if (fresh.highestBid && fresh.highestBid.uid !== uid) {
          refunds.push({ uid: fresh.highestBid.uid, amount: fresh.highestBid.amount, claimed: false });
        }
        tx.update(ref, { status: 'sold', buyerUid: uid, buyerClaimed: true, refunds });
      });
      // carta entra na coleção do comprador imediatamente
      useCollectionStore.getState().grantCard(listing.cardDef.id);
      set({ message: `Comprou ${listing.cardDef.id} por ${listing.buyNow} coins!` });
      await get().refresh();
      return true;
    } catch (e) {
      useEconomyStore.getState().earn({ coins: listing.buyNow });
      set({ error: (e as Error).message });
      return false;
    }
  },

  refresh: async () => {
    const uid = useAuthStore.getState().uid;
    if (!uid) return;
    try {
      const snap = await getDocs(query(collection(getDb(), 'marketListings'), limit(50)));
      const listings = snap.docs.map((d) => ({ ...(d.data() as Omit<MarketListing, 'id'>), id: d.id }));

      // --- liquidação do que é meu -----------------------------------------
      for (const listing of listings) {
        const ref = doc(getDb(), 'marketListings', listing.id);
        // 1. reembolso de lance superado
        const myRefund = (listing.refunds ?? []).find((r) => r.uid === uid && !r.claimed);
        if (myRefund) {
          await runTransaction(getDb(), async (tx) => {
            const fresh = (await tx.get(ref)).data() as MarketListing;
            const refunds = (fresh.refunds ?? []).map((r) =>
              r.uid === uid && !r.claimed ? { ...r, claimed: true } : r,
            );
            tx.update(ref, { refunds });
          });
          useEconomyStore.getState().earn({ coins: myRefund.amount });
        }
        // 2. leilão expirado: finaliza (vencedor leva, sem lance devolve ao vendedor)
        if (listing.status === 'active' && listing.expiresAt < Date.now()) {
          await runTransaction(getDb(), async (tx) => {
            const fresh = (await tx.get(ref)).data() as MarketListing;
            if (fresh.status !== 'active') return;
            if (fresh.highestBid) {
              tx.update(ref, { status: 'sold', buyerUid: fresh.highestBid.uid });
            } else {
              tx.update(ref, { status: 'sold', buyerUid: fresh.sellerUid }); // devolvida
            }
          });
        }
        // 3. sou o comprador vencedor e ainda não resgatei a carta
        if (listing.status === 'sold' && listing.buyerUid === uid && !listing.buyerClaimed && listing.sellerUid !== uid) {
          await runTransaction(getDb(), async (tx) => {
            tx.update(ref, { buyerClaimed: true });
          });
          useCollectionStore.getState().grantCard(listing.cardDef.id);
          set({ message: `Você arrematou ${listing.cardDef.id}!` });
        }
        // 4. sou o vendedor e ainda não recebi (venda ou devolução)
        if (listing.status === 'sold' && listing.sellerUid === uid && !listing.sellerCollected) {
          await runTransaction(getDb(), async (tx) => {
            tx.update(ref, { sellerCollected: true });
          });
          if (listing.buyerUid === uid) {
            useCollectionStore.getState().grantCard(listing.cardDef.id); // sem lances: volta
          } else {
            const amount = listing.highestBid?.amount ?? listing.buyNow;
            useEconomyStore.getState().earn({ coins: sellerNet(amount, CONFIG.economy.marketFeeRate) });
            set({ message: `Venda concluída: +${sellerNet(amount, CONFIG.economy.marketFeeRate)} coins.` });
          }
        }
      }

      set({ listings: listings.filter((l) => l.status === 'active') });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));
