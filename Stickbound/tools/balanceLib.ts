// Headless bot-vs-bot matches for balance numbers. Pure sim, no rendering.
// Squads are random elements AND random fighting styles, so every element and every style gets measured.
import { ELEMENT_IDS, type ElementId } from '../src/content/elements';
import { ARCHETYPE_IDS, type Archetype } from '../src/content/archetypes';
import { botInput } from '../src/sim/ai';
import { stickSpec } from '../src/sim/stats';
import { createMatch, step } from '../src/sim/step';
import type { Match } from '../src/sim/types';

type Pick = [ElementId, Archetype];
export interface MatchStat {
  a: [Pick, Pick];
  b: [Pick, Pick];
  winner: number;
  rounds: number;
  roundFrames: number[];
  timeouts: number;
  frames: number;
}

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0);
}

export function playOne(seed: number, opts: { level?: number; difficulty?: number; a?: [Pick, Pick]; b?: [Pick, Pick] } = {}): MatchStat {
  const r = lcg(seed * 2654435761);
  const pick = (): Pick => [ELEMENT_IDS[(r() >>> 3) % ELEMENT_IDS.length]!, ARCHETYPE_IDS[(r() >>> 7) % 3]!];
  const a = opts.a ?? [pick(), pick()];
  const b = opts.b ?? [pick(), pick()];
  const level = opts.level ?? 20;
  const d = opts.difficulty ?? 3;
  const m: Match = createMatch({
    mode: 'duel',
    teamA: a.map(([e, s], i) => stickSpec(`A${i}`, e, level, [], false, undefined, s)),
    teamB: b.map(([e, s], i) => stickSpec(`B${i}`, e, level, [], false, undefined, s)),
    seed,
    bots: [d, d],
  });
  const roundFrames: number[] = [];
  let timeouts = 0;
  let roundStart = -1;
  for (let i = 0; i < 60 * 60 * 6 && m.phase !== 'over'; i++) {
    step(m, botInput(m, 0), botInput(m, 1));
    for (const e of m.events) {
      if (e.t === 'fight') roundStart = m.frame;
      if (e.t === 'roundEnd') {
        roundFrames.push(m.frame - roundStart);
        if (e.timeout) timeouts++;
      }
    }
  }
  return { a, b, winner: m.winner, rounds: roundFrames.length, roundFrames, timeouts, frames: m.frame };
}

export interface BalanceReport {
  matches: number;
  winRate: Record<ElementId, number>;
  games: Record<ElementId, number>;
  /** keyed 'element:style' (30 entries) */
  styleRate: Record<string, number>;
  styleGames: Record<string, number>;
  /** the 3 styles over all elements */
  roleRate: Record<Archetype, number>;
  avgRoundSec: number;
  timeoutPct: number;
  draws: number;
  ms: number;
}

/** Win rates count non-mirror appearances: an element (or element:style) on both sides tells nothing about it. */
export async function runBalance(n: number, seed0 = 1, level = 20, difficulty = 3): Promise<BalanceReport> {
  const t0 = performance.now();
  const W = new Map<string, number>();
  const G = new Map<string, number>();
  const add = (k: string, win: boolean) => {
    G.set(k, (G.get(k) ?? 0) + 1);
    if (win) W.set(k, (W.get(k) ?? 0) + 1);
  };
  let roundSum = 0;
  let rounds = 0;
  let timeouts = 0;
  let draws = 0;
  for (let i = 0; i < n; i++) {
    // yield now and then so the test worker can talk to the runner (long sync loops time out its RPC)
    if (i % 100 === 99) await new Promise((r) => setTimeout(r, 0));
    const s = playOne(seed0 + i, { level, difficulty });
    roundSum += s.roundFrames.reduce((x, y) => x + y, 0);
    rounds += s.rounds;
    timeouts += s.timeouts;
    if (s.winner !== 0 && s.winner !== 1) {
      draws++;
      continue;
    }
    const sides = [s.a, s.b];
    for (const t of [0, 1] as const) {
      const mine = sides[t]!;
      const theirs = sides[1 - t]!;
      for (const key of [(p: Pick) => p[0], (p: Pick) => `${p[0]}:${p[1]}`, (p: Pick) => `role:${p[1]}`]) {
        const other = new Set(theirs.map(key));
        for (const k of new Set(mine.map(key))) if (!other.has(k)) add(k, s.winner === t);
      }
    }
  }
  const rate = (k: string) => ((G.get(k) ?? 0) ? (W.get(k) ?? 0) / G.get(k)! : 0);
  const keys = ELEMENT_IDS.flatMap((e) => ARCHETYPE_IDS.map((a) => `${e}:${a}`));
  return {
    matches: n,
    winRate: Object.fromEntries(ELEMENT_IDS.map((e) => [e, rate(e)])) as Record<ElementId, number>,
    games: Object.fromEntries(ELEMENT_IDS.map((e) => [e, G.get(e) ?? 0])) as Record<ElementId, number>,
    styleRate: Object.fromEntries(keys.map((k) => [k, rate(k)])),
    styleGames: Object.fromEntries(keys.map((k) => [k, G.get(k) ?? 0])),
    roleRate: Object.fromEntries(ARCHETYPE_IDS.map((a) => [a, rate(`role:${a}`)])) as Record<Archetype, number>,
    avgRoundSec: rounds ? roundSum / rounds / 60 : 0,
    timeoutPct: rounds ? (timeouts / rounds) * 100 : 0,
    draws,
    ms: performance.now() - t0,
  };
}

export function formatReport(r: BalanceReport): string {
  const pct = (x: number) => `${(x * 100).toFixed(1).padStart(5)}%`;
  const lines = [`${r.matches} matches in ${(r.ms / 1000).toFixed(1)} s · avg round ${r.avgRoundSec.toFixed(1)} s · timeouts ${r.timeoutPct.toFixed(1)}% of rounds · draws ${r.draws}`];
  lines.push(`  styles overall: ${ARCHETYPE_IDS.map((a) => `${a} ${pct(r.roleRate[a])}`).join('  ')}`);
  for (const e of ELEMENT_IDS)
    lines.push(`  ${e.padEnd(10)} ${pct(r.winRate[e])}  (${String(r.games[e]).padStart(4)})   ${ARCHETYPE_IDS.map((a) => `${a.slice(0, 4)} ${pct(r.styleRate[`${e}:${a}`]!)} (${r.styleGames[`${e}:${a}`]})`).join('  ')}`);
  return lines.join('\n');
}
