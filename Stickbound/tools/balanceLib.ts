// Headless bot-vs-bot matches for balance numbers. Pure sim, no rendering.
import { ELEMENT_IDS, type ElementId } from '../src/content/elements';
import { botInput } from '../src/sim/ai';
import { stickSpec } from '../src/sim/stats';
import { createMatch, step } from '../src/sim/step';
import type { Match } from '../src/sim/types';

export interface MatchStat {
  a: [ElementId, ElementId];
  b: [ElementId, ElementId];
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

export function playOne(seed: number, opts: { level?: number; difficulty?: number; a?: [ElementId, ElementId]; b?: [ElementId, ElementId] } = {}): MatchStat {
  const r = lcg(seed * 2654435761);
  const pick = () => ELEMENT_IDS[r() % ELEMENT_IDS.length]!;
  const a = opts.a ?? [pick(), pick()];
  const b = opts.b ?? [pick(), pick()];
  const level = opts.level ?? 20;
  const d = opts.difficulty ?? 3;
  const m: Match = createMatch({
    mode: 'duel',
    teamA: a.map((e, i) => stickSpec(`A${i}`, e, level)),
    teamB: b.map((e, i) => stickSpec(`B${i}`, e, level)),
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
  avgRoundSec: number;
  timeoutPct: number;
  draws: number;
  ms: number;
}

/** Each element's win rate counts every match a squad with that element played (a squad of two of the same counts once). */
export async function runBalance(n: number, seed0 = 1, level = 20, difficulty = 3): Promise<BalanceReport> {
  const t0 = performance.now();
  const wins = Object.fromEntries(ELEMENT_IDS.map((e) => [e, 0])) as Record<ElementId, number>;
  const games = Object.fromEntries(ELEMENT_IDS.map((e) => [e, 0])) as Record<ElementId, number>;
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
    const teams = [new Set(s.a), new Set(s.b)];
    // the same element on both sides is a mirror: it tells nothing about that element
    for (const t of [0, 1] as const) {
      for (const e of teams[t]!) {
        if (teams[1 - t]!.has(e)) continue;
        games[e]++;
        if (s.winner === t) wins[e]++;
      }
    }
  }
  const winRate = Object.fromEntries(ELEMENT_IDS.map((e) => [e, games[e] ? wins[e] / games[e] : 0])) as Record<ElementId, number>;
  return { matches: n, winRate, games, avgRoundSec: rounds ? roundSum / rounds / 60 : 0, timeoutPct: rounds ? (timeouts / rounds) * 100 : 0, draws, ms: performance.now() - t0 };
}

export function formatReport(r: BalanceReport): string {
  const lines = [`${r.matches} matches in ${(r.ms / 1000).toFixed(1)} s · avg round ${r.avgRoundSec.toFixed(1)} s · timeouts ${r.timeoutPct.toFixed(1)}% of rounds · draws ${r.draws}`];
  for (const e of ELEMENT_IDS) lines.push(`  ${e.padEnd(10)} ${(r.winRate[e] * 100).toFixed(1).padStart(5)}%  (${r.games[e]} games)`);
  return lines.join('\n');
}
