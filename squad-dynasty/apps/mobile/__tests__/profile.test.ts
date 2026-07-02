// M8: Perfil do Técnico — XP/nível, contadores e conquistas derivadas.
import { deriveAchievements, levelForXp, useProfileStore, xpForLevel } from '../src/stores/profileStore';
import { useFeedbackSettings } from '../src/services/feedback';
import type { MatchResult } from '@squad-dynasty/engine';

const fakeResult = (home: number, away: number): MatchResult =>
  ({
    score: [home, away],
    events: [],
    ratings: [],
    stats: {} as MatchResult['stats'],
    decisions: [],
    participations: [],
    totalMinutes: 93,
    seed: 1,
  }) as MatchResult;

describe('profileStore (M8)', () => {
  beforeEach(() => useProfileStore.getState().reset());

  it('nível cresce com a raiz do XP', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(400)).toBe(3);
    expect(xpForLevel(3)).toBe(400);
  });

  it('vitória com gols paga mais XP que derrota', () => {
    useProfileStore.getState().recordMatch(fakeResult(3, 1), 'home');
    const afterWin = useProfileStore.getState();
    expect(afterWin.matches).toBe(1);
    expect(afterWin.wins).toBe(1);
    expect(afterWin.goals).toBe(3);
    const winXp = afterWin.xp;
    useProfileStore.getState().reset();
    useProfileStore.getState().recordMatch(fakeResult(0, 2), 'home');
    expect(useProfileStore.getState().xp).toBeLessThan(winXp);
    expect(useProfileStore.getState().wins).toBe(0);
  });

  it('temporada campeã de liga+copa acumula títulos e XP', () => {
    useProfileStore.getState().recordSeason(true, true);
    const s = useProfileStore.getState();
    expect(s.leagueTitles).toBe(1);
    expect(s.cupTitles).toBe(1);
    expect(s.seasonsPlayed).toBe(1);
    expect(s.xp).toBe(350);
  });

  it('conquistas derivam dos contadores e da coleção', () => {
    useProfileStore.getState().recordMatch(fakeResult(1, 0), 'home');
    const achievements = deriveAchievements(useProfileStore.getState(), {
      totalCards: 120,
      hasLegendary: true,
      hasIcon: false,
    });
    const byId = Object.fromEntries(achievements.map((a) => [a.id, a.unlocked]));
    expect(byId['first-win']).toBe(true);
    expect(byId['ten-wins']).toBe(false);
    expect(byId.colecionador).toBe(true);
    expect(byId.lendaria).toBe(true);
    expect(byId.icone).toBe(false);
  });

  it('toggle de som/vibração persiste no store', () => {
    const before = useFeedbackSettings.getState().soundOn;
    useFeedbackSettings.getState().toggleSound();
    expect(useFeedbackSettings.getState().soundOn).toBe(!before);
    useFeedbackSettings.getState().toggleSound();
  });
});
