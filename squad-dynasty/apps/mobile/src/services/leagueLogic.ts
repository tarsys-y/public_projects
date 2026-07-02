// Lógica PURA da Liga de Amigos (testável em Node, sem Firebase):
// código de convite, calendário derivado dos membros e seed determinística de
// cada confronto — dois aparelhos calculam exatamente a mesma partida.
import { generateFixtures, mulberry32, type Fixture, type Rng } from '@squad-dynasty/engine';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I

export function generateInviteCode(rng: Rng): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)]!;
  }
  return code;
}

/** Hash determinístico de string → uint32 (FNV-1a). */
export function hashString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export const BYE = '__bye__';

/**
 * Calendário da liga de amigos derivado (NUNCA persistido): membros ordenados
 * por uid + seed da liga ⇒ o mesmo calendário em qualquer aparelho.
 * Nº ímpar de membros ganha um "bye" (rodada de folga, filtrada da lista).
 */
export function friendFixtures(memberUids: string[], leagueSeed: number): Fixture[] {
  const members = [...memberUids].sort();
  if (members.length < 2) return [];
  if (members.length % 2 !== 0) members.push(BYE);
  return generateFixtures(members, mulberry32(leagueSeed)).filter(
    (f) => f.homeClubId !== BYE && f.awayClubId !== BYE,
  );
}

/** Seed da partida: idêntica para os dois jogadores do confronto. */
export function matchSeed(
  leagueId: string,
  season: number,
  round: number,
  homeUid: string,
  awayUid: string,
): number {
  return hashString(`${leagueId}|${season}|${round}|${homeUid}|${awayUid}`) % 2147483647;
}

/** Taxa do mercado (SPEC 6): valor líquido que o vendedor recebe. */
export function sellerNet(amount: number, feeRate: number): number {
  return Math.max(0, Math.round(amount * (1 - feeRate)));
}
