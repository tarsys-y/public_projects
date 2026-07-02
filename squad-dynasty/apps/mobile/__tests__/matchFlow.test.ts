// Aceite M4: jogar uma partida inteira contra a IA com todas as interações —
// verificado sobre o matchStore (engine + orquestração), sem emulador.
import { useMatchStore } from '../src/stores/matchStore';
import { toSquad } from '../src/stores/squadLogic';
import { demoCollection, fillDraft } from './helpers';

const store = () => useMatchStore.getState();

function startMatch(seed: number) {
  const collection = demoCollection();
  const draft = fillDraft(collection);
  useMatchStore.getState().reset();
  useMatchStore.getState().startFriendly(toSquad(draft), collection, 'botafogo', seed);
  return collection;
}

/** Avança até acabar; `neutral` decide sempre por opções sem efeito tático. */
function playToEnd(neutral = false, maxDecisions = 10): number {
  let decisions = 0;
  let guard = 0;
  while (store().phase !== 'finished' && guard++ < 500) {
    if (store().phase === 'decision') {
      decisions++;
      if (decisions > maxDecisions) throw new Error('decisões demais');
      const options = store().pendingDecision!.options;
      const choice = neutral ? (options.find((o) => !o.tactics) ?? options[0]!) : options[0]!;
      store().decide(choice.id);
    }
    store().advance(5);
  }
  return decisions;
}

describe('amistoso vs IA (aceite M4)', () => {
  it('inicia com elenco do usuário + adversário automático válido', () => {
    startMatch(42);
    const s = store();
    expect(s.phase).toBe('playing');
    expect(s.result).not.toBeNull();
    expect(s.result!.totalMinutes).toBeGreaterThanOrEqual(91);
    // 22 titulares participando (11 de cada lado)
    const starters = s.result!.participations.filter((p) => p.started);
    expect(starters.filter((p) => p.side === 'home')).toHaveLength(11);
    expect(starters.filter((p) => p.side === 'away')).toHaveLength(11);
    // banco automático preenchido para o usuário
    expect(s.home!.bench.length).toBeGreaterThan(0);
  });

  it('playback avança e pausa em decisões do usuário (IA nunca pausa)', () => {
    // procura uma seed com decisão do lado do usuário
    let found = false;
    for (let seed = 1; seed <= 40 && !found; seed++) {
      startMatch(seed);
      const decisionsHome = store().result!.decisions.filter((d) => d.side === 'home');
      if (decisionsHome.length === 0) continue;
      found = true;
      const first = decisionsHome[0]!;
      expect(first.aiChoiceId).toBeUndefined();
      store().advance(first.minute + 5);
      expect(store().phase).toBe('decision');
      expect(store().pendingDecision?.id).toBe(first.id);
      expect(store().playbackMinute).toBe(first.minute);
    }
    expect(found).toBe(true);
  });

  it('decidir re-simula com a mesma seed preservando o passado', () => {
    let found = false;
    for (let seed = 1; seed <= 40 && !found; seed++) {
      startMatch(seed);
      const decision = store().result!.decisions.find((d) => d.side === 'home');
      const withTactics = decision?.options.find((o) => o.tactics);
      if (!decision || !withTactics) continue;
      found = true;
      const before = store().result!.events.filter((e) => e.minute < decision.minute);
      store().advance(decision.minute + 1);
      expect(store().phase).toBe('decision');
      store().decide(withTactics.id);
      expect(store().phase).toBe('playing');
      const after = store().result!.events.filter((e) => e.minute < decision.minute);
      expect(after).toEqual(before);
      expect(store().interventions).toHaveLength(1);
    }
    expect(found).toBe(true);
  });

  it('substituição do usuário entra no jogo a partir do minuto seguinte', () => {
    startMatch(42);
    store().advance(50); // ~minuto 50
    const minute = Math.floor(store().playbackMinute);
    const onPitch = store().result!.participations.filter(
      (p) => p.side === 'home' && p.started && p.leftMinute === undefined,
    );
    const benchPlayer = store().home!.bench[0]!;
    store().intervene(undefined, [
      { outOwnedCardId: onPitch[5]!.playerId, inOwnedCardId: benchPlayer.ownedCardId },
    ]);
    const entered = store().result!.participations.find(
      (p) => p.playerId === benchPlayer.ownedCardId,
    );
    expect(entered).toBeDefined();
    expect(entered!.enteredMinute).toBe(minute + 1);
    expect(entered!.started).toBe(false);
  });

  it('ajuste tático ao vivo re-simula preservando o prefixo', () => {
    startMatch(7);
    store().advance(30);
    const minute = Math.floor(store().playbackMinute);
    const before = store().result!.events.filter((e) => e.minute <= minute);
    store().intervene({ mentality: 5, pressing: 3 });
    const after = store().result!.events.filter((e) => e.minute <= minute);
    expect(after).toEqual(before);
  });

  it('partida completa termina com placar consistente', () => {
    startMatch(42);
    playToEnd();
    const s = store();
    expect(s.phase).toBe('finished');
    const goalsHome = s.result!.events.filter((e) => e.type === 'goal' && e.side === 'home').length;
    const goalsAway = s.result!.events.filter((e) => e.type === 'goal' && e.side === 'away').length;
    expect(s.result!.score).toEqual([goalsHome, goalsAway]);
    expect(s.playbackMinute).toBe(s.result!.totalMinutes);
  });

  it('modo rápido: mesma partida, mais minutos por tick', () => {
    startMatch(42);
    const eventsBefore = store().result!.events;
    store().setSpeed('fast');
    playToEnd(true); // decisões neutras não geram intervenção
    // velocidade não muda o resultado, só o playback
    expect(store().result!.events).toEqual(eventsBefore);
  });
});
