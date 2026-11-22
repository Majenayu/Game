// Champion Road walkthrough bot: a fresh profile plays the whole road with the real progression rules (XP, levels,
// perks, rewards, element unlocks). The player side is an Elite bot (difficulty 4). After 3 losses in a row on one
// champion it "trains" with 3 practice fights (like a player doing quests or Zombie runs), then tries again.
// Passes if every champion and Null are beaten, nothing softlocks, and the total stays within a sane play budget.
import { expect, it } from 'vitest';
import { championTeam } from '../src/content/championFight';
import { ALL_CHAMPIONS } from '../src/content/champions';
import { applyMatch, chooseStarter, choosePerk, newProfile, pendingPerk, specFor, squadAvatars, unlockElement, type MatchSummary } from '../src/meta/profile';
import { PERKS } from '../src/sim/stats';
import { botInput } from '../src/sim/ai';
import { createMatch, step } from '../src/sim/step';

function summary(mode: MatchSummary['mode'], win: boolean): MatchSummary {
  return { mode, win, roundsWon: win ? 2 : 0, kos: 0, falls: 0, hits: 0, powers: 0, perfect: 0, swaps: 0, damage: 0, powerUse: {} };
}

it('a fresh profile clears all 41 Champion Road fights', async () => {
  const p = newProfile('Walker', 0);
  chooseStarter(p, 'fire');
  p.tutorialDone = true;
  let fights = 0;
  let practice = 0;
  const attemptsPer: number[] = [];
  let seed = 1;
  for (let i = 0; i < ALL_CHAMPIONS.length; i++) {
    const c = ALL_CHAMPIONS[i]!;
    let attempts = 0;
    let streak = 0;
    for (;;) {
      await new Promise((r) => setTimeout(r, 0));
      expect(attempts, `stuck on ${c.name}`).toBeLessThan(80);
      attempts++;
      fights++;
      const squad = squadAvatars(p);
      const m = createMatch({ mode: 'duel', teamA: squad.map((a) => specFor(a)), teamB: championTeam(c), seed: seed++, bots: [4, c.difficulty] });
      for (let f = 0; f < 60 * 60 * 6 && m.phase !== 'over'; f++) step(m, botInput(m, 0), botInput(m, 1));
      const win = m.winner === 0;
      const first = win && !p.champion.cleared.includes(i);
      applyMatch(p, summary('champion', win), squad, { coinsBonus: first ? c.coins : 0 });
      for (const a of squad) {
        const t = pendingPerk(a);
        if (t !== null) choosePerk(a, t, PERKS.find((x) => x.tier === t)!.id);
      }
      if (win) {
        p.champion.cleared.push(i);
        if (c.unlock) unlockElement(p, c.unlock, false);
        break;
      }
      if (++streak >= 3) {
        streak = 0;
        for (let k = 0; k < 3; k++) applyMatch(p, summary('practice', true), squadAvatars(p));
        practice += 3;
      }
    }
    attemptsPer.push(attempts);
  }
  const lv = squadAvatars(p).map((a) => a.level);
  console.log(`walkthrough: ${fights} champion fights + ${practice} practice fights, squad levels ${lv.join(' / ')}, unlocked ${p.unlocked.join(', ')}`);
  console.log(`attempts per champion: ${attemptsPer.join(' ')}`);
  expect(p.champion.cleared.length).toBe(41);
  expect(p.unlocked.length).toBeGreaterThanOrEqual(8);
  // about 3 minutes per fight: the road should take at most ~40 hours of play including practice
  expect(fights + practice).toBeLessThan(800);
}, 3_600_000);
