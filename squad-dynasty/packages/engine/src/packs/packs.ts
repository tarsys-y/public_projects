// Pacotes/gacha (SPEC 4.5): probabilidades por raridade, pity de legendary
// (40 pacotes) e de icon (400), epic_moment só em raridades epic+.
// Determinístico via Rng injetado. No M7 este sorteio migra para Cloud
// Function (SPEC 10.4) — até lá o cliente sorteia offline.
import { CONFIG } from '../config';
import type { CardDefinition, Rarity } from '../models/player';
import type { Rng } from '../rng';
import { pickWeighted } from '../rng';

export type PackType = keyof typeof CONFIG.packs.types;

/** Spec avulsa (pacotes de evento): odds epic+ multiplicadas por boost. */
export interface CustomPackSpec {
  cards: number;
  guaranteedRarity: Rarity;
  /** multiplica os pesos de epic/legendary/icon no roll de raridade. */
  epicPlusBoost?: number;
}

export interface PityState {
  /** Pacotes abertos desde a última legendary/icon (contador visível na UI). */
  sinceLegendary: number;
  sinceIcon: number;
}

export const EMPTY_PITY: PityState = { sinceLegendary: 0, sinceIcon: 0 };

export interface PackOpening {
  cards: CardDefinition[];
  pity: PityState; // novo estado a persistir
  pityTriggered: 'legendary' | 'icon' | null;
}

const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'icon'];
const rarityRank = (r: Rarity) => RARITY_ORDER.indexOf(r);

function rollRarity(rng: Rng, epicPlusBoost = 1): Rarity {
  const weights = CONFIG.packs.rarityWeights;
  const idx = pickWeighted(
    rng,
    RARITY_ORDER.map((r) =>
      rarityRank(r) >= rarityRank('epic') ? weights[r] * epicPlusBoost : weights[r],
    ),
  );
  return RARITY_ORDER[idx]!;
}

/** Sorteia uma carta da raridade pedida; se o pool estiver vazio, desce. */
function drawCardOfRarity(rng: Rng, pool: CardDefinition[], rarity: Rarity): CardDefinition {
  for (let rank = rarityRank(rarity); rank >= 0; rank--) {
    const candidates = pool.filter((c) => c.rarity === RARITY_ORDER[rank]);
    if (candidates.length > 0) {
      return candidates[pickWeighted(rng, candidates.map(() => 1))]!;
    }
  }
  // pool totalmente vazio nas raridades ≤ pedida: sobe (caso patológico)
  const any = pool[pickWeighted(rng, pool.map(() => 1))];
  if (!any) throw new Error('Pool de cartas vazio');
  return any;
}

/**
 * Abre um pacote. `pool` é o catálogo sorteável (cartas base + especiais;
 * epic_moment/icon já têm raridade epic+ e só saem nesses rolls — SPEC 4.5).
 * Aceita um tipo do config ou uma spec customizada (pacotes de evento).
 */
export function openPack(
  rng: Rng,
  pool: CardDefinition[],
  packType: PackType | CustomPackSpec,
  pity: PityState,
): PackOpening {
  const spec: CustomPackSpec =
    typeof packType === 'string' ? CONFIG.packs.types[packType] : packType;
  const boost = spec.epicPlusBoost ?? 1;
  const rarities: Rarity[] = [];
  for (let i = 0; i < spec.cards; i++) rarities.push(rollRarity(rng, boost));

  // Garantia do pacote: pelo menos 1 carta ≥ guaranteedRarity.
  const guaranteed = spec.guaranteedRarity as Rarity;
  if (!rarities.some((r) => rarityRank(r) >= rarityRank(guaranteed))) {
    rarities[rarities.length - 1] = guaranteed;
  }

  // Pity: o N-ésimo pacote sem legendary+/icon garante a raridade.
  let pityTriggered: PackOpening['pityTriggered'] = null;
  const hasIconRoll = rarities.some((r) => r === 'icon');
  const hasLegendaryPlus = rarities.some((r) => rarityRank(r) >= rarityRank('legendary'));
  if (pity.sinceIcon + 1 >= CONFIG.packs.iconPity && !hasIconRoll) {
    rarities[0] = 'icon';
    pityTriggered = 'icon';
  } else if (pity.sinceLegendary + 1 >= CONFIG.packs.legendaryPity && !hasLegendaryPlus) {
    rarities[0] = 'legendary';
    pityTriggered = 'legendary';
  }

  const cards = rarities.map((r) => drawCardOfRarity(rng, pool, r));

  const gotIcon = cards.some((c) => c.rarity === 'icon');
  const gotLegendaryPlus = cards.some((c) => rarityRank(c.rarity) >= rarityRank('legendary'));
  return {
    cards,
    pity: {
      sinceLegendary: gotLegendaryPlus ? 0 : pity.sinceLegendary + 1,
      sinceIcon: gotIcon ? 0 : pity.sinceIcon + 1,
    },
    pityTriggered,
  };
}
