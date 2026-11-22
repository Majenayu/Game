// Bot AI with 5 difficulties (Rookie to Legend). It only reads what a player could see on screen, reacts after a
// delay, and uses a seeded RNG kept in the state, so bots are deterministic and never frame-perfect.

import { matchup } from '../content/elements';
import { POWERS_BY_ELEMENT, RANK_MP_OFF } from '../content/powers';
import { activeOf, aiRnd, fighterById, getMove } from './step';
import { IN, type Fighter, type Match } from './types';

export const DIFFICULTY_NAMES = ['', 'Rookie', 'Fighter', 'Veteran', 'Elite', 'Legend'];

interface Tuning {
  react: number;
  guard: number;
  pg: number;
  power: number;
  aggr: number;
  combo: number;
  swap: number;
  dash: number;
}

// index = difficulty (1 to 5); probabilities are per mille
const T: Tuning[] = [
  { react: 30, guard: 0, pg: 0, power: 0, aggr: 0, combo: 0, swap: 0, dash: 0 },
  { react: 28, guard: 120, pg: 0, power: 120, aggr: 380, combo: 300, swap: 80, dash: 40 },
  { react: 19, guard: 300, pg: 40, power: 240, aggr: 520, combo: 550, swap: 200, dash: 90 },
  { react: 13, guard: 480, pg: 120, power: 360, aggr: 620, combo: 750, swap: 350, dash: 140 },
  { react: 9, guard: 650, pg: 250, power: 460, aggr: 700, combo: 900, swap: 500, dash: 180 },
  { react: 6, guard: 780, pg: 380, power: 540, aggr: 760, combo: 980, swap: 650, dash: 220 },
];

const isRanged = (id: string) => {
  const mv = getMove(id);
  return !!mv?.spawn && (mv.spawn.kind === 'proj' || mv.spawn.atFoe === true);
};

function powerCost(f: Fighter, slot: number): number {
  const p = POWERS_BY_ELEMENT[f.spec.element][slot]!;
  return Math.max(0, (p.mp ?? 0) - RANK_MP_OFF[Math.max(1, f.spec.ranks[slot]!)]!) * 10;
}

function threat(m: Match, f: Fighter, foe: Fighter): boolean {
  if (foe.st === 'move' && foe.move) {
    const mv = getMove(foe.move);
    if (mv && foe.mf <= mv.startup + 2) {
      const reach = mv.box ? (mv.box.x + mv.box.w + 30) * 100 : mv.spawn ? 99999 : 0;
      if (Math.abs(foe.x - f.x) < reach) return true;
    }
  }
  for (const e of m.effects) {
    if (e.team === f.team || e.delay > 20) continue;
    const coming = e.vx === 0 || (e.vx > 0 ? e.x < f.x : e.x > f.x);
    if (coming && Math.abs(e.x - f.x) < 26000 && Math.abs(e.y - f.y) < 16000) return true;
  }
  return false;
}

/** Input bits for the bot controlling `team`'s active fighter this frame. */
export function botInput(m: Match, team: 0 | 1): number {
  const f = activeOf(m, team);
  const foe = activeOf(m, team === 0 ? 1 : 0);
  if (!f || !f.ai || f.down || !foe || m.phase !== 'fight') return 0;
  const ai = f.ai;
  const t = T[Math.max(1, Math.min(5, ai.difficulty))]!;
  const held = ai.hold;
  if (ai.next > 0) {
    ai.next--;
    return held;
  }
  const r = () => aiRnd(ai);
  ai.next = t.react + (r() % 6);
  const dx = foe.x - f.x;
  const dist = Math.abs(dx);
  const toward = dx > 0 ? IN.R : IN.L;
  const away = dx > 0 ? IN.L : IN.R;
  let hold = 0;
  let press = 0;

  // keep a combo going
  if (f.st === 'move' && f.move && f.moveHits.length) {
    if (r() < t.combo) press = IN.ATK;
    if (t.combo > 700 && r() < 300 && f.mp >= powerCost(f, 0)) press = [IN.P1, IN.P2, IN.P3][r() % 3]!;
    ai.next = 4;
  } else if (f.st === 'stun' || f.st === 'down' || f.st === 'gbreak') {
    ai.next = 3;
  } else if (!foe.down && threat(m, f, foe) && r() < t.guard) {
    hold = IN.GRD;
    ai.next = 10 + (r() % 12);
    if (r() < t.dash / 2) {
      hold = 0;
      press = IN.DASH | away;
    }
  } else {
    // swap to a better matchup or to save a hurt avatar
    const bench = m.teams[team].members.map((id) => fighterById(m, id)!).find((o) => o.id !== f.id && !o.down);
    if (bench && f.ground && r() < t.swap / 6) {
      const hurt = f.hp * 100 < f.hpMax * 30 && bench.hp > f.hp * 2;
      const better = matchup(f.spec.element, foe.spec.element) === 'weak' && matchup(bench.spec.element, foe.spec.element) !== 'weak';
      if (hurt || better) press = IN.SWAP;
    }
    if (!press && f.mp >= 200 && r() < t.power / 3) {
      const options = [0, 1, 2].filter((s) => f.spec.ranks[s]! > 0 && f.mp >= powerCost(f, s));
      const ranged = options.filter((s) => isRanged(POWERS_BY_ELEMENT[f.spec.element][s]!.id));
      const melee = options.filter((s) => !ranged.includes(s));
      const pick = dist > 22000 ? ranged : dist < 15000 ? melee.concat(ranged) : options;
      if (pick.length) press = [IN.P1, IN.P2, IN.P3][pick[r() % pick.length]!]!;
    }
    if (!press) {
      if (dist < 9000) {
        if (r() < t.aggr) press = r() < 820 ? IN.ATK : IN.HVY;
        else if (r() < 400) hold = away;
        else hold = IN.GRD;
      } else if (dist < 26000) {
        hold = toward;
        if (r() < t.dash) press = IN.DASH | toward;
        else if (r() < 90) press = IN.U | toward;
      } else hold = toward;
    }
  }
  if (press & (IN.L | IN.R)) hold |= press & (IN.L | IN.R);
  ai.hold = hold;
  return hold | press;
}

/** Bots in Training / tutorial that just stand there use difficulty 0. */
export const NO_INPUT = 0;
