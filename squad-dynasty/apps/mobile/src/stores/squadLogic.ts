// Lógica pura de escalação (sem React/Zustand): testável em Node.
// O aceite do M3 — montar um 4-3-3 e ver overall/química reagirem — é
// verificado em cima destas funções.
import {
  computeOverall,
  computeRoleFit,
  computeSquadChemistry,
  FORMATIONS,
  positionGroup,
  resolveOwnedCard,
  rolesForPosition,
  isGkAttributes,
  type Catalog,
  type ChemistryBreakdown,
  type OwnedCard,
  type ResolvedPlayer,
  type ResolvedSlot,
  type RoleId,
  type Squad,
  type Tactics,
} from '@squad-dynasty/engine';

/** Escalação em edição: slots podem estar vazios (null). */
export interface DraftSquad {
  formation: string;
  slots: Array<{ role: RoleId; ownedCardId: string | null }>;
  bench: string[];
  tactics: Tactics;
}

export function emptyDraft(formationId: string, tactics: Tactics): DraftSquad {
  const formation = FORMATIONS[formationId];
  if (!formation) throw new Error(`Formação desconhecida: ${formationId}`);
  return {
    formation: formationId,
    slots: formation.slots.map((slot) => ({
      role: rolesForPosition(slot.position)[0]!.id,
      ownedCardId: null,
    })),
    bench: [],
    tactics,
  };
}

/**
 * Troca de formação preservando o máximo do 11: cartas são realocadas por
 * posição igual, depois por grupo, depois ficam de fora.
 */
export function changeFormation(draft: DraftSquad, formationId: string): DraftSquad {
  const target = FORMATIONS[formationId];
  const source = FORMATIONS[draft.formation];
  if (!target || !source) throw new Error('Formação desconhecida');
  const next = emptyDraft(formationId, draft.tactics);
  next.bench = [...draft.bench];

  const pending = draft.slots
    .map((slot, i) => ({ ...slot, position: source.slots[i]!.position }))
    .filter((s) => s.ownedCardId !== null);

  // 1ª passada: mesma posição; 2ª: qualquer slot livre.
  for (const pass of [0, 1] as const) {
    for (const entry of pending) {
      if (entry.ownedCardId === null) continue;
      const idx = next.slots.findIndex(
        (s, i) =>
          s.ownedCardId === null &&
          (pass === 1 || target.slots[i]!.position === entry.position),
      );
      if (idx >= 0) {
        const role = rolesForPosition(target.slots[idx]!.position).some((r) => r.id === entry.role)
          ? entry.role
          : rolesForPosition(target.slots[idx]!.position)[0]!.id;
        next.slots[idx] = { role, ownedCardId: entry.ownedCardId };
        entry.ownedCardId = null;
      }
    }
  }
  return next;
}

/** Escala uma carta num slot; se ela já estiver em outro slot, faz a troca. */
export function assignCard(draft: DraftSquad, slotIndex: number, ownedCardId: string): DraftSquad {
  const slots = draft.slots.map((s) => ({ ...s }));
  const previousIndex = slots.findIndex((s) => s.ownedCardId === ownedCardId);
  const displaced = slots[slotIndex]?.ownedCardId ?? null;
  if (previousIndex >= 0) slots[previousIndex]!.ownedCardId = displaced;
  slots[slotIndex]!.ownedCardId = ownedCardId;
  return { ...draft, slots, bench: draft.bench.filter((id) => id !== ownedCardId) };
}

export function clearSlot(draft: DraftSquad, slotIndex: number): DraftSquad {
  const slots = draft.slots.map((s, i) => (i === slotIndex ? { ...s, ownedCardId: null } : s));
  return { ...draft, slots };
}

export function setRole(draft: DraftSquad, slotIndex: number, role: RoleId): DraftSquad {
  const slots = draft.slots.map((s, i) => (i === slotIndex ? { ...s, role } : s));
  return { ...draft, slots };
}

export function setTactics(draft: DraftSquad, tactics: Partial<Tactics>): DraftSquad {
  return { ...draft, tactics: { ...draft.tactics, ...tactics } };
}

export function setBench(draft: DraftSquad, bench: string[]): DraftSquad {
  const starters = new Set(draft.slots.map((s) => s.ownedCardId));
  return { ...draft, bench: bench.filter((id) => !starters.has(id)).slice(0, 7) };
}

/**
 * Preenche cada slot com o melhor jogador disponível da coleção (overall,
 * com desconto fora de posição), a função de melhor fit por slot.
 * `collection` já deve vir filtrada (ex.: sem cartas aposentadas).
 */
export function autoFillDraft(
  draft: DraftSquad,
  collection: Map<string, OwnedCard>,
  catalog: Catalog,
): DraftSquad {
  const formation = FORMATIONS[draft.formation];
  if (!formation) throw new Error(`Formação desconhecida: ${draft.formation}`);

  const pool = [...collection.values()]
    .map((owned) => {
      const card = catalog.cards.get(owned.cardDefId);
      const player = card && catalog.players.get(card.basePlayerId);
      if (!card || !player) return null;
      const overall = computeOverall(card.attributes, player.positions[0] ?? 'ST');
      return { owned, card, player, overall, gk: isGkAttributes(card.attributes) };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const used = new Set<string>();
  let next: DraftSquad = { ...draft, slots: draft.slots.map((s) => ({ ...s })) };
  const slotOrder = formation.slots
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (a.s.position === 'GK' ? -1 : 0) - (b.s.position === 'GK' ? -1 : 0));

  for (const { s, i } of slotOrder) {
    let best: (typeof pool)[number] | null = null;
    let bestScore = -1;
    for (const entry of pool) {
      if (used.has(entry.owned.id)) continue;
      if (entry.gk !== (s.position === 'GK')) continue;
      const natural = entry.player.positions.includes(s.position);
      const sameGroup =
        !natural && positionGroup(entry.player.positions[0] ?? 'ST') === positionGroup(s.position);
      const score = entry.overall * (natural ? 1 : sameGroup ? 0.8 : 0.55);
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }
    if (best) {
      used.add(best.owned.id);
      next = assignCard(next, i, best.owned.id);
      const roles = rolesForPosition(s.position);
      let bestRole = roles[0]!.id;
      let bestFit = -1;
      for (const role of roles) {
        const fit = computeRoleFit(best.card.attributes, role.id);
        if (fit > bestFit) {
          bestFit = fit;
          bestRole = role.id;
        }
      }
      next = setRole(next, i, bestRole);
    }
  }
  return next;
}

// --- derivados (sempre calculados, nunca persistidos — SPEC 10.3) -----------

export interface DraftView {
  slots: Array<{
    position: string;
    role: RoleId;
    player: ResolvedPlayer | null;
    fit: number; // 0..1 na função do slot
    chemistry: ChemistryBreakdown | null;
  }>;
  filledCount: number;
  teamOverall: number; // média dos escalados
  teamChemistry: number; // média 0–100
  isComplete: boolean;
  hasGk: boolean;
}

export function resolveDraft(
  draft: DraftSquad,
  owned: Map<string, OwnedCard>,
  catalog: Catalog,
): DraftView {
  const formation = FORMATIONS[draft.formation]!;
  const resolvedSlots: Array<ResolvedSlot | null> = draft.slots.map((slot, i) => {
    if (!slot.ownedCardId) return null;
    const card = owned.get(slot.ownedCardId);
    if (!card) return null;
    return {
      position: formation.slots[i]!.position,
      role: slot.role,
      player: resolveOwnedCard(card, catalog),
    };
  });

  const { perSlot, teamAverage } = computeSquadChemistry({
    formation: draft.formation,
    slots: resolvedSlots,
  });

  const slots = resolvedSlots.map((resolved, i) => ({
    position: formation.slots[i]!.position,
    role: draft.slots[i]!.role,
    player: resolved?.player ?? null,
    fit: resolved ? computeRoleFit(resolved.player.attributes, draft.slots[i]!.role) : 0,
    chemistry: perSlot[i] ?? null,
  }));

  const filled = slots.filter((s) => s.player !== null);
  const teamOverall =
    filled.length === 0
      ? 0
      : Math.round(filled.reduce((sum, s) => sum + (s.player?.overall ?? 0), 0) / filled.length);
  const gkSlotIndex = formation.slots.findIndex((s) => s.position === 'GK');
  const gkPlayer = slots[gkSlotIndex]?.player;

  return {
    slots,
    filledCount: filled.length,
    teamOverall,
    teamChemistry: teamAverage,
    isComplete: filled.length === formation.slots.length,
    hasGk: Boolean(gkPlayer && isGkAttributes(gkPlayer.attributes)),
  };
}

/** Converte o rascunho completo num Squad persistível/simulável. */
export function toSquad(draft: DraftSquad): Squad {
  const formation = FORMATIONS[draft.formation]!;
  if (draft.slots.some((s) => s.ownedCardId === null)) {
    throw new Error('Escalação incompleta');
  }
  return {
    formation: draft.formation,
    starters: draft.slots.map((slot, i) => ({
      position: formation.slots[i]!.position,
      role: slot.role,
      ownedCardId: slot.ownedCardId!,
    })),
    bench: draft.bench,
    tactics: draft.tactics,
  };
}
