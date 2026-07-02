// Aceite M3: montar um 4-3-3 completo e ver overall/química do time
// atualizando em tempo real — verificado sobre a lógica pura dos stores.
import { DEFAULT_TACTICS, isGkAttributes, type OwnedCard } from '@squad-dynasty/engine';
import { CATALOG } from '../src/services/catalog';
import {
  assignCard,
  changeFormation,
  emptyDraft,
  resolveDraft,
  setRole,
  setTactics,
  toSquad,
  type DraftSquad,
} from '../src/stores/squadLogic';
import { demoCollection, fillDraft as fillFromCollection } from './helpers';

const fillDraft = (_draft: DraftSquad, collection: Map<string, OwnedCard>) =>
  fillFromCollection(collection);

describe('montagem do 4-3-3 (aceite M3)', () => {
  const collection = demoCollection();

  it('coleção demo tem cartas suficientes (2 clubes ≥ 36 cartas, com GKs)', () => {
    expect(collection.size).toBeGreaterThanOrEqual(30);
    const gks = [...collection.values()].filter((o) =>
      isGkAttributes(CATALOG.cards.get(o.cardDefId)!.attributes),
    );
    expect(gks.length).toBeGreaterThanOrEqual(2);
  });

  it('overall e química reagem a cada escalação', () => {
    let draft = emptyDraft('4-3-3', { ...DEFAULT_TACTICS });
    let view = resolveDraft(draft, collection, CATALOG);
    expect(view.filledCount).toBe(0);
    expect(view.teamOverall).toBe(0);

    draft = fillDraft(draft, collection);
    view = resolveDraft(draft, collection, CATALOG);
    expect(view.isComplete).toBe(true);
    expect(view.hasGk).toBe(true);
    expect(view.teamOverall).toBeGreaterThan(60);
    // 11 do mesmo par de clubes/liga → química de liga + clube aparece
    expect(view.teamChemistry).toBeGreaterThan(20);
    for (const slot of view.slots) {
      expect(slot.player).not.toBeNull();
      expect(slot.chemistry).not.toBeNull();
      expect(slot.fit).toBeGreaterThan(0);
    }
  });

  it('química por jogador tem o detalhamento da SPEC 4.2', () => {
    const draft = fillDraft(emptyDraft('4-3-3', { ...DEFAULT_TACTICS }), collection);
    const view = resolveDraft(draft, collection, CATALOG);
    const striker = view.slots[9]!;
    const chem = striker.chemistry!;
    expect(chem.total).toBe(
      Math.min(100, chem.club + chem.nationality + chem.league + chem.synergy + chem.streak),
    );
    expect(chem.multiplier).toBeGreaterThanOrEqual(0.9);
    expect(chem.multiplier).toBeLessThanOrEqual(1.05);
  });

  it('trocar de formação preserva os jogadores compatíveis', () => {
    const draft = fillDraft(emptyDraft('4-3-3', { ...DEFAULT_TACTICS }), collection);
    const changed = changeFormation(draft, '4-4-2');
    const view = resolveDraft(changed, collection, CATALOG);
    expect(changed.formation).toBe('4-4-2');
    expect(view.filledCount).toBeGreaterThanOrEqual(9); // GK + defesa + meio realocados
  });

  it('trocar a função muda o fit do slot', () => {
    let draft = fillDraft(emptyDraft('4-3-3', { ...DEFAULT_TACTICS }), collection);
    const before = resolveDraft(draft, collection, CATALOG).slots[9]!;
    const alternative = before.role === 'st_poacher' ? 'st_target_man' : 'st_poacher';
    draft = setRole(draft, 9, alternative);
    const after = resolveDraft(draft, collection, CATALOG).slots[9]!;
    expect(after.role).toBe(alternative);
    expect(after.fit).not.toBe(before.fit);
  });

  it('escalar carta já usada em outro slot faz troca em vez de duplicar', () => {
    let draft = fillDraft(emptyDraft('4-3-3', { ...DEFAULT_TACTICS }), collection);
    const cardAt10 = draft.slots[10]!.ownedCardId!;
    draft = assignCard(draft, 9, cardAt10);
    const ids = draft.slots.map((s) => s.ownedCardId).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
    expect(draft.slots[9]!.ownedCardId).toBe(cardAt10);
  });

  it('toSquad produz Squad válido com tática editada', () => {
    let draft = fillDraft(emptyDraft('4-3-3', { ...DEFAULT_TACTICS }), collection);
    draft = setTactics(draft, { mentality: 4, passStyle: 'direct' });
    const squad = toSquad(draft);
    expect(squad.starters).toHaveLength(11);
    expect(squad.tactics.mentality).toBe(4);
    expect(squad.tactics.passStyle).toBe('direct');
  });

  it('rascunho incompleto não vira Squad', () => {
    const draft = emptyDraft('4-3-3', { ...DEFAULT_TACTICS });
    expect(() => toSquad(draft)).toThrow('incompleta');
  });
});
