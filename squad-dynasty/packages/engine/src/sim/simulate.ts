// Simulador de partida (SPEC seção 5): determinístico (mulberry32 na seed),
// puro e síncrono; emite eventos minuto a minuto para a UI reproduzir ao vivo.
// Tick de 1 minuto, 90 + acréscimos. Toda constante de tuning vem de config.ts.
import { CONFIG } from '../config';
import { chemistryMultiplier, computeSquadChemistry } from '../chemistry/chemistry';
import { fitMultiplier } from '../fit';
import type {
  Controller,
  DecisionKind,
  DecisionPoint,
  Intervention,
  MatchEvent,
  MatchInput,
  MatchResult,
  PlayerParticipation,
  RatingImpact,
  Side,
  SimOptions,
  TeamStats,
} from '../models/match';
import type { AttributeCategory, Position } from '../models/player';
import { isGkAttributes } from '../models/player';
import type { RoleId, Tactics } from '../models/squad';
import type { ResolvedPlayer, ResolvedSquad } from '../resolve';
import { computeRatingsAt } from '../ratings/ratings';
import { mulberry32, pickWeighted, randInt, type Rng } from '../rng';
import {
  aiChoice,
  canFire,
  describe,
  markFired,
  newDecisionTracker,
  optionsFor,
} from './decisions';
import {
  atkComposite,
  creationWeight,
  defComposite,
  dribbleWeight,
  fatigueFactor,
  finishWeight,
  GROUP_SECTOR_WEIGHTS,
  midComposite,
  positionGroup,
  staminaOf,
} from './effective';
import { narrate } from './narrate';

interface ActivePlayer {
  id: string; // ownedCardId
  name: string;
  side: Side;
  slotIndex: number;
  position: Position;
  role: RoleId;
  player: ResolvedPlayer;
  staticMult: number; // fit × química (recalculado em substituições)
  enteredMinute: number;
  leftMinute?: number;
  sentOff: boolean;
  started: boolean;
  injuryPenalty: number; // 1 = sem lesão; <1 segue em campo lesionado
  yellow: boolean;
}

interface TeamState {
  side: Side;
  controller: Controller;
  squad: ResolvedSquad;
  tactics: Tactics;
  onPitch: ActivePlayer[];
  bench: ResolvedPlayer[];
  everyone: ActivePlayer[];
  subsUsed: number;
  windowsUsed: number;
  lastShotMinute: number;
  stats: TeamStats;
  /** Dribles sofridos por atacante adversário (para o momento de decisão). */
  dribbledBy: Map<string, number>;
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const otherSide = (side: Side): Side => (side === 'home' ? 'away' : 'home');

function emptyStats(): TeamStats {
  return {
    possession: 0,
    shots: 0,
    shotsOnTarget: 0,
    goals: 0,
    xg: 0,
    tackles: 0,
    interceptions: 0,
    fouls: 0,
    yellowCards: 0,
    redCards: 0,
  };
}

/** Fit × química por slot do elenco atual (SPEC 4.3, recalculado em subs). */
function computeStaticMults(squad: ResolvedSquad): number[] {
  const { perSlot } = computeSquadChemistry(squad);
  return squad.slots.map((slot, i) => {
    const fit = fitMultiplier(slot.player.attributes, slot.role, slot.position);
    return fit * chemistryMultiplier(perSlot[i]?.total ?? 0);
  });
}

function initTeam(side: Side, squad: ResolvedSquad, controller: Controller): TeamState {
  const staticMults = computeStaticMults(squad);
  const onPitch = squad.slots.map((slot, i) => ({
    id: slot.player.ownedCardId,
    name: slot.player.basePlayer.name,
    side,
    slotIndex: i,
    position: slot.position,
    role: slot.role,
    player: slot.player,
    staticMult: staticMults[i] ?? 1,
    enteredMinute: 0,
    sentOff: false,
    started: true,
    injuryPenalty: 1,
    yellow: false,
  }));
  return {
    side,
    controller,
    squad,
    tactics: { ...squad.tactics },
    onPitch,
    bench: [...squad.bench],
    everyone: [...onPitch],
    subsUsed: 0,
    windowsUsed: 0,
    lastShotMinute: 0,
    stats: emptyStats(),
    dribbledBy: new Map(),
  };
}

/** Multiplicador dinâmico: estático × forma × fadiga × lesão. */
function dynMult(p: ActivePlayer, minute: number, tactics: Tactics): number {
  const highPressing = tactics.pressing === 3;
  return (
    p.staticMult *
    (p.player.formMultiplier ?? 1) *
    p.injuryPenalty *
    fatigueFactor(staminaOf(p.player), minute - p.enteredMinute, highPressing)
  );
}

/** Forças por setor (SPEC 5.2.1), normalizadas pelos 10 de linha do início. */
function sectorStrengths(team: TeamState, minute: number): { def: number; mid: number; atk: number } {
  let def = 0;
  let mid = 0;
  let atk = 0;
  for (const p of team.onPitch) {
    const mult = dynMult(p, minute, team.tactics);
    const group = positionGroup(p.position);
    if (group === 'GK') {
      def += defComposite(p.player) * mult * 0.5;
      continue;
    }
    const weights = GROUP_SECTOR_WEIGHTS[group];
    def += defComposite(p.player) * weights.def * mult;
    mid += midComposite(p.player) * weights.mid * mult;
    atk += atkComposite(p.player) * weights.atk * mult;
  }
  return { def: def / 10, mid: mid / 10, atk: atk / 10 };
}

function pickPlayer(
  rng: Rng,
  candidates: ActivePlayer[],
  weightOf: (p: ActivePlayer) => number,
): ActivePlayer | undefined {
  if (candidates.length === 0) return undefined;
  const idx = pickWeighted(rng, candidates.map(weightOf));
  return candidates[idx];
}

const impact = (
  playerId: string,
  delta: number,
  category: AttributeCategory,
): RatingImpact => ({ playerId, delta, category });

export function simulateMatch(input: MatchInput, options: SimOptions = {}): MatchResult {
  const c = CONFIG.sim;
  const r = CONFIG.ratings.impacts;
  const rng = mulberry32(input.seed);
  const teams: Record<Side, TeamState> = {
    home: initTeam('home', input.home, input.homeController ?? 'user'),
    away: initTeam('away', input.away, input.awayController ?? 'ai'),
  };
  const events: MatchEvent[] = [];
  const decisions: DecisionPoint[] = [];
  const tracker = newDecisionTracker();
  const interventions = [...(options.interventions ?? [])].sort((a, b) => a.minute - b.minute);
  const score: Record<Side, number> = { home: 0, away: 0 };
  const totalMinutes = c.regularMinutes + randInt(rng, c.stoppageMin, c.stoppageMax);
  let possessionTicks: Record<Side, number> = { home: 0, away: 0 };

  const emit = (event: MatchEvent) => events.push(event);
  const scoreString = () => `${score.home} x ${score.away}`;

  emit({
    minute: 0,
    side: 'home',
    type: 'kickoff',
    detail: input.isDerby
      ? `🔥 DIA DE CLÁSSICO${input.derbyName ? ` — ${input.derbyName}` : ''}! O estádio ferve. A bola vai rolar!`
      : narrate.kickoff(),
    ratingImpacts: [],
  });

  // --- substituições ---------------------------------------------------------
  function applySubstitution(
    team: TeamState,
    minute: number,
    outId: string,
    inId: string,
  ): boolean {
    if (team.subsUsed >= c.substitutionsMax) return false;
    const leaving = team.onPitch.find((p) => p.id === outId && !p.sentOff);
    const enteringPlayer = team.bench.find((p) => p.ownedCardId === inId);
    if (!leaving || !enteringPlayer) return false;

    leaving.leftMinute = minute;
    team.bench = team.bench.filter((p) => p.ownedCardId !== inId);
    const entering: ActivePlayer = {
      id: enteringPlayer.ownedCardId,
      name: enteringPlayer.basePlayer.name,
      side: team.side,
      slotIndex: leaving.slotIndex,
      position: leaving.position,
      role: leaving.role,
      player: enteringPlayer,
      staticMult: 1, // recalculado abaixo
      enteredMinute: minute,
      sentOff: false,
      started: false,
      injuryPenalty: 1,
      yellow: false,
    };
    team.onPitch = team.onPitch.filter((p) => p.id !== outId);
    team.onPitch.push(entering);
    team.everyone.push(entering);
    team.subsUsed++;

    // Recalcula fit × química do time com o novo 11 (SPEC 5.5).
    const slots = team.squad.slots.map((slot, i) => {
      const current = team.onPitch.find((p) => p.slotIndex === i);
      return current
        ? { position: current.position, role: current.role, player: current.player }
        : slot; // slot vazio (expulsão): mantém o original só para o cálculo
    });
    const pseudoSquad: ResolvedSquad = { ...team.squad, slots };
    const mults = computeStaticMults(pseudoSquad);
    for (const p of team.onPitch) p.staticMult = mults[p.slotIndex] ?? 1;

    emit({
      minute,
      side: team.side,
      type: 'substitution',
      playerId: entering.id,
      assistId: leaving.id,
      detail: narrate.substitution(entering.name, leaving.name),
      ratingImpacts: [],
    });
    return true;
  }

  /** Janela de substituições (1..N trocas de uma vez = 1 janela). */
  function applySubWindow(
    team: TeamState,
    minute: number,
    subs: Array<{ outOwnedCardId: string; inOwnedCardId: string }>,
  ): void {
    if (team.windowsUsed >= c.substitutionWindows) return;
    let applied = 0;
    for (const sub of subs) {
      if (applySubstitution(team, minute, sub.outOwnedCardId, sub.inOwnedCardId)) applied++;
    }
    if (applied > 0) team.windowsUsed++;
  }

  /** IA: troca o jogador de linha mais cansado por um reserva compatível. */
  function aiAutoSubs(team: TeamState, minute: number): void {
    if (team.controller !== 'ai') return;
    if (!(c.aiSubMinutes as readonly number[]).includes(minute)) return;
    if (team.windowsUsed >= c.substitutionWindows || team.subsUsed >= c.substitutionsMax) return;

    const candidates = team.onPitch
      .filter((p) => positionGroup(p.position) !== 'GK' && p.started)
      .sort((a, b) => staminaOf(a.player) - staminaOf(b.player));
    const tired = candidates[0];
    if (!tired) return;
    const replacement = team.bench.find(
      (b) =>
        !isGkAttributes(b.attributes) &&
        (b.basePlayer.positions.includes(tired.position) ||
          b.basePlayer.positions.some((pos) => positionGroup(pos) === positionGroup(tired.position))),
    );
    if (!replacement) return;
    applySubWindow(team, minute, [
      { outOwnedCardId: tired.id, inOwnedCardId: replacement.ownedCardId },
    ]);
  }

  // --- momentos de decisão ---------------------------------------------------
  function fireDecision(side: Side, kind: DecisionKind, minute: number, context?: string): void {
    if (!canFire(tracker, side, kind, minute, c.decisionsMax, c.decisionsMinGap)) return;
    const team = teams[side];
    const point: DecisionPoint = {
      id: `${side}-${kind}-${minute}`,
      minute,
      side,
      kind,
      description: describe(kind, minute, context),
      options: optionsFor(kind, team.tactics),
    };
    if (team.controller === 'ai') {
      const choice = aiChoice(point, team.tactics);
      point.aiChoiceId = choice.id;
      if (choice.tactics) team.tactics = { ...team.tactics, ...choice.tactics };
    }
    decisions.push(point);
    markFired(tracker, side, kind, minute);
  }

  // --- resolução de chance (SPEC 5.2.4) ---------------------------------------
  function resolveChance(side: Side, minute: number): void {
    const team = teams[side];
    const opp = teams[otherSide(side)];
    const outfield = team.onPitch.filter((p) => positionGroup(p.position) !== 'GK');
    if (outfield.length === 0) return;

    // Peso quadrático + fator por grupo: quem vive de gol finaliza muito mais.
    const finisher = pickPlayer(rng, outfield, (p) => {
      const group = positionGroup(p.position) as 'DEF' | 'MID' | 'ATT';
      const base = finishWeight(p.player) * dynMult(p, minute, team.tactics);
      return base * base * c.finisherGroupFactor[group];
    });
    if (!finisher) return;
    const hasAssist = rng() < c.assistProb;
    const creator = hasAssist
      ? pickPlayer(
          rng,
          outfield.filter((p) => p.id !== finisher.id),
          (p) => creationWeight(p.player) * dynMult(p, minute, team.tactics),
        )
      : undefined;

    // Defensor mais próximo do setor: foco nos flancos → laterais; centro → zagueiros.
    const oppDefenders = opp.onPitch.filter((p) => ['DEF', 'MID'].includes(positionGroup(p.position)));
    const defender = pickPlayer(rng, oppDefenders, (p) => {
      const base = defComposite(p.player) * dynMult(p, minute, opp.tactics);
      const isWide = p.position === 'LB' || p.position === 'RB';
      const isCentral = p.position === 'CB';
      const focusBoost =
        team.tactics.attackFocus === 'flanks' ? (isWide ? 1.6 : 1) : isCentral ? 1.6 : 1;
      const groupBoost = positionGroup(p.position) === 'DEF' ? 1.5 : 0.6;
      return base * focusBoost * groupBoost;
    });

    let quality =
      c.chanceQualityBias +
      atkComposite(finisher.player) * dynMult(finisher, minute, team.tactics) -
      (defender ? defComposite(defender.player) * dynMult(defender, minute, opp.tactics) : 55);

    // bigGame com placar empatado no fim (SPEC 5.2.4); em clássico, sempre.
    if (input.isDerby || (score.home === score.away && minute >= c.bigGameFromMinute)) {
      quality += (finisher.player.attributes.bigGame - 60) / c.bigGameQualityDiv;
    }

    // Goleiro reduz a qualidade via reflexes/gkPositioning.
    const gk = opp.onPitch.find((p) => positionGroup(p.position) === 'GK');
    if (gk) {
      quality -= (defComposite(gk.player) * dynMult(gk, minute, opp.tactics) - c.gkQualityRef) / c.gkQualityDiv;
    } else {
      quality += 15; // gol sem goleiro
    }

    const xg = Math.max(c.xgMin, Math.min(c.xgMax, c.xgScale * sigmoid(quality / c.xgSlope)));
    team.stats.xg += xg;
    team.stats.shots++;
    team.lastShotMinute = minute;

    const roll = rng();
    if (roll < xg) {
      team.stats.shotsOnTarget++;
      team.stats.goals++;
      score[side]++;
      const impacts: RatingImpact[] = [impact(finisher.id, r.goal, 'finishing')];
      if (creator) impacts.push(impact(creator.id, r.assist, 'passing'));
      for (const p of opp.onPitch) {
        const g = positionGroup(p.position);
        if (g === 'DEF' || g === 'GK') impacts.push(impact(p.id, r.goalConcededDefGk, 'defense'));
      }
      emit({
        minute,
        side,
        type: 'goal',
        playerId: finisher.id,
        assistId: creator?.id,
        detail: narrate.goal(rng, finisher.name, creator?.name),
        ratingImpacts: impacts,
      });
      return;
    }

    // Sem gol: defesa do goleiro, bloqueio ou pra fora (SPEC 5.2.4).
    const split = rng();
    if (gk && split < c.missSplitSave) {
      team.stats.shotsOnTarget++;
      const impacts = [
        impact(gk.id, r.gkSave, 'defense'),
        impact(finisher.id, r.shotOnTarget, 'finishing'),
      ];
      if (creator) impacts.push(impact(creator.id, r.keyPass, 'passing'));
      emit({
        minute,
        side,
        type: 'save',
        playerId: gk.id,
        assistId: finisher.id,
        detail: narrate.save(rng, gk.name, finisher.name),
        ratingImpacts: impacts,
      });
    } else if (defender && split < c.missSplitSave + c.missSplitBlock) {
      emit({
        minute,
        side,
        type: 'block',
        playerId: defender.id,
        assistId: finisher.id,
        detail: narrate.block(rng, defender.name, finisher.name),
        ratingImpacts: [impact(defender.id, r.shotBlockedDefender, 'defense')],
      });
    } else {
      emit({
        minute,
        side,
        type: 'miss',
        playerId: finisher.id,
        detail: narrate.miss(rng, finisher.name),
        ratingImpacts: [impact(finisher.id, r.shotOff, 'finishing')],
      });
    }
  }

  // --- eventos secundários (SPEC 5.2.5) ---------------------------------------
  function secondaryEvent(possessionSide: Side, minute: number): void {
    const atkTeam = teams[possessionSide];
    const defTeam = teams[otherSide(possessionSide)];
    const kinds = ['none', 'tackle', 'interception', 'dribble', 'foul', 'injury'] as const;
    const probs = [
      0, // preenchido abaixo
      c.tackleEventProb,
      c.interceptionEventProb,
      c.dribbleEventProb,
      c.foulEventProb,
      c.injuryEventProb,
    ];
    const rest = probs.reduce((s, p) => s + p, 0);
    probs[0] = Math.max(0, 1 - rest);
    const kind = kinds[pickWeighted(rng, probs)]!;
    if (kind === 'none') return;

    const defenders = defTeam.onPitch.filter((p) => positionGroup(p.position) !== 'GK');
    const attackers = atkTeam.onPitch.filter((p) => positionGroup(p.position) !== 'GK');
    if (defenders.length === 0 || attackers.length === 0) return;

    if (kind === 'tackle') {
      const defender = pickPlayer(rng, defenders, (p) => defComposite(p.player))!;
      defTeam.stats.tackles++;
      emit({
        minute,
        side: defTeam.side,
        type: 'tackle',
        playerId: defender.id,
        detail: narrate.tackle(rng, defender.name),
        ratingImpacts: [impact(defender.id, r.tackle, 'defense')],
      });
      return;
    }
    if (kind === 'interception') {
      const defender = pickPlayer(rng, defenders, (p) => defComposite(p.player))!;
      defTeam.stats.interceptions++;
      emit({
        minute,
        side: defTeam.side,
        type: 'interception',
        playerId: defender.id,
        detail: narrate.interception(rng, defender.name),
        ratingImpacts: [impact(defender.id, r.interception, 'defense')],
      });
      return;
    }
    if (kind === 'dribble') {
      const attacker = pickPlayer(rng, attackers, (p) => dribbleWeight(p.player))!;
      const victim = pickPlayer(rng, defenders, (p) => 100 - defComposite(p.player))!;
      emit({
        minute,
        side: atkTeam.side,
        type: 'dribble',
        playerId: attacker.id,
        assistId: victim.id,
        detail: narrate.dribble(rng, attacker.name, victim.name),
        ratingImpacts: [
          impact(attacker.id, r.dribbleWon, 'dribbling'),
          impact(victim.id, r.dribbledPast, 'defense'),
        ],
      });
      const count = (defTeam.dribbledBy.get(attacker.id) ?? 0) + 1;
      defTeam.dribbledBy.set(attacker.id, count);
      if (count >= c.dribbledRepeatedlyCount) {
        fireDecision(defTeam.side, 'dribbled_repeatedly', minute, attacker.name);
      }
      return;
    }
    if (kind === 'foul') {
      const offender = pickPlayer(rng, defenders, (p) => 100 - defComposite(p.player))!;
      const victim = pickPlayer(rng, attackers, (p) => dribbleWeight(p.player))!;
      defTeam.stats.fouls++;
      emit({
        minute,
        side: defTeam.side,
        type: 'foul',
        playerId: offender.id,
        assistId: victim.id,
        detail: narrate.foul(rng, offender.name, victim.name),
        ratingImpacts: [impact(offender.id, r.foul, 'mental')],
      });
      const cardRoll = rng();
      if (cardRoll < c.straightRedOnFoulProb) {
        sendOff(defTeam, offender, minute, narrate.red(offender.name));
      } else if (cardRoll < c.straightRedOnFoulProb + c.yellowOnFoulProb) {
        if (offender.yellow) {
          defTeam.stats.yellowCards++;
          sendOff(defTeam, offender, minute, narrate.secondYellow(offender.name));
        } else {
          offender.yellow = true;
          defTeam.stats.yellowCards++;
          emit({
            minute,
            side: defTeam.side,
            type: 'yellow_card',
            playerId: offender.id,
            detail: narrate.yellow(offender.name),
            ratingImpacts: [impact(offender.id, r.yellowCard, 'mental')],
          });
        }
      }
      return;
    }
    // lesão leve (raro): tenta substituir; sem opção, joga no sacrifício.
    const everyone = [...attackers, ...defenders];
    const hurt = everyone[randInt(rng, 0, everyone.length - 1)]!;
    const hurtTeam = teams[hurt.side];
    emit({
      minute,
      side: hurt.side,
      type: 'injury',
      playerId: hurt.id,
      detail: narrate.injury(hurt.name),
      ratingImpacts: [],
    });
    const replacement = hurtTeam.bench.find((b) =>
      isGkAttributes(hurt.player.attributes)
        ? isGkAttributes(b.attributes)
        : !isGkAttributes(b.attributes),
    );
    if (
      replacement &&
      hurtTeam.subsUsed < c.substitutionsMax &&
      hurtTeam.windowsUsed < c.substitutionWindows
    ) {
      applySubWindow(hurtTeam, minute, [
        { outOwnedCardId: hurt.id, inOwnedCardId: replacement.ownedCardId },
      ]);
    } else {
      hurt.injuryPenalty = 0.85;
    }
  }

  function sendOff(team: TeamState, player: ActivePlayer, minute: number, detail: string): void {
    team.stats.redCards++;
    player.sentOff = true;
    player.leftMinute = minute;
    team.onPitch = team.onPitch.filter((p) => p.id !== player.id);
    emit({
      minute,
      side: team.side,
      type: 'red_card',
      playerId: player.id,
      detail,
      ratingImpacts: [impact(player.id, r.redCard, 'mental')],
    });
    fireDecision(team.side, 'red_card', minute, player.name);
  }

  // --- loop principal ----------------------------------------------------------
  for (let minute = 1; minute <= totalMinutes; minute++) {
    // Intervenções do usuário neste minuto (tática e/ou substituições).
    for (const intervention of interventions.filter((i) => i.minute === minute)) {
      const team = teams[intervention.side];
      if (intervention.tactics) team.tactics = { ...team.tactics, ...intervention.tactics };
      if (intervention.substitutions?.length) {
        applySubWindow(team, minute, intervention.substitutions);
      }
    }
    aiAutoSubs(teams.home, minute);
    aiAutoSubs(teams.away, minute);

    // Decisões situacionais de reta final.
    if (minute === 75 && score.home !== score.away) {
      fireDecision(score.home < score.away ? 'home' : 'away', 'losing_late', minute);
    }
    if (minute === 80 && score.home !== score.away) {
      fireDecision(score.home > score.away ? 'home' : 'away', 'winning_late', minute);
    }
    for (const side of ['home', 'away'] as const) {
      const team = teams[side];
      if (minute - Math.max(team.lastShotMinute, 5) >= c.noShotsWindow && minute <= 82) {
        fireDecision(side, 'no_shots_20min', minute);
      }
    }

    // Posse do tick (SPEC 5.2.2).
    const strengthsHome = sectorStrengths(teams.home, minute);
    const strengthsAway = sectorStrengths(teams.away, minute);
    const midHome = Math.pow(Math.max(1, strengthsHome.mid), c.possessionExponent);
    const midAway = Math.pow(Math.max(1, strengthsAway.mid), c.possessionExponent);
    let pHome = midHome / (midHome + midAway);
    pHome += c.possessionPressingShift * (teams.home.tactics.pressing - teams.away.tactics.pressing);
    pHome += c.possessionMentalityShift * (teams.home.tactics.mentality - teams.away.tactics.mentality);
    pHome = Math.max(c.possessionClamp, Math.min(1 - c.possessionClamp, pHome));
    const side: Side = rng() < pHome ? 'home' : 'away';
    possessionTicks[side]++;
    const team = teams[side];
    const opp = teams[otherSide(side)];
    const oppStrengths = side === 'home' ? strengthsAway : strengthsHome;
    const ownStrengths = side === 'home' ? strengthsHome : strengthsAway;

    // Chance criada? (SPEC 5.2.3)
    let chanceProb = c.baseChanceProb;
    chanceProb *= 1 + (c.mentalityChanceSwing / 2) * (team.tactics.mentality - 3);
    if (team.tactics.passStyle === 'direct' && opp.tactics.pressing === 3)
      chanceProb *= c.directVsHighPressBonus;
    if (team.tactics.passStyle === 'short' && opp.tactics.pressing === 3)
      chanceProb *= c.shortVsHighPressPenalty;
    if (team.tactics.passStyle === 'short' && opp.tactics.pressing === 1)
      chanceProb *= c.shortVsLowPressBonus;
    if (team.tactics.attackFocus === 'flanks' && opp.tactics.width === 1)
      chanceProb *= c.focusMismatchBonus;
    if (team.tactics.attackFocus === 'center' && opp.tactics.width === 3)
      chanceProb *= c.focusMismatchBonus;
    const ratio = Math.max(
      c.strengthRatioMin,
      Math.min(c.strengthRatioMax, Math.pow(ownStrengths.atk / Math.max(1, oppStrengths.def), c.strengthRatioExponent)),
    );
    chanceProb *= ratio;

    if (rng() < chanceProb) {
      resolveChance(side, minute);
    } else {
      secondaryEvent(side, minute);
    }

    if (minute === 45) {
      emit({ minute, side: 'home', type: 'halftime', detail: narrate.halftime(scoreString()), ratingImpacts: [] });
    }
  }

  emit({
    minute: totalMinutes,
    side: 'home',
    type: 'fulltime',
    detail: narrate.fulltime(scoreString()),
    ratingImpacts: [],
  });

  // --- consolidação -------------------------------------------------------------
  const totalTicks = possessionTicks.home + possessionTicks.away;
  teams.home.stats.possession = Math.round((possessionTicks.home / Math.max(1, totalTicks)) * 100);
  teams.away.stats.possession = 100 - teams.home.stats.possession;

  const participations: PlayerParticipation[] = (['home', 'away'] as const).flatMap((side) =>
    teams[side].everyone.map((p) => ({
      playerId: p.id,
      name: p.name,
      side,
      slotIndex: p.slotIndex,
      position: p.position,
      role: p.role,
      started: p.started,
      enteredMinute: p.enteredMinute,
      leftMinute: p.leftMinute,
      sentOff: p.sentOff,
    })),
  );

  return {
    score: [score.home, score.away],
    events,
    ratings: computeRatingsAt(events, participations, Number.POSITIVE_INFINITY),
    stats: { home: teams.home.stats, away: teams.away.stats },
    decisions,
    participations,
    totalMinutes,
    seed: input.seed,
  };
}

/** Atualização de starterStreak pós-partida (SPEC 5.5), para o app aplicar. */
export function starterStreakUpdates(
  result: MatchResult,
): Array<{ playerId: string; update: 'increment' | 'reset' | 'keep' }> {
  return result.participations.map((p) => {
    if (!p.started) return { playerId: p.playerId, update: 'reset' as const };
    const minutes = (p.leftMinute ?? result.totalMinutes) - p.enteredMinute;
    return {
      playerId: p.playerId,
      update: minutes >= CONFIG.sim.starterStreakMinutes ? ('increment' as const) : ('keep' as const),
    };
  });
}
