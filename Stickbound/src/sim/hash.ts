// State hash for determinism tests and (later) desync detection in online play.

import type { Match } from './types';

const ST = ['idle', 'walk', 'air', 'dash', 'move', 'stun', 'guard', 'gbreak', 'down', 'swapout', 'swapin', 'ko', 'win', 'bench'];
const PH = ['intro', 'fight', 'ko', 'roundEnd', 'over'];

export function hashMatch(m: Match): number {
  let h = 0x811c9dc5;
  const n = (v: number) => {
    h ^= v | 0;
    h = Math.imul(h, 0x01000193);
    h ^= (v / 4294967296) | 0;
    h = Math.imul(h, 0x01000193);
  };
  const s = (v: string | null) => {
    if (v === null) return n(-1);
    for (let i = 0; i < v.length; i++) n(v.charCodeAt(i));
  };
  n(m.frame);
  n(m.rng);
  n(PH.indexOf(m.phase));
  n(m.pf);
  n(m.timer);
  n(m.round);
  n(m.wave);
  n(m.kills);
  n(m.teams[0].wins);
  n(m.teams[1].wins);
  n(m.teams[0].active);
  n(m.teams[1].active);
  for (const f of m.fighters) {
    n(f.id);
    n(f.x);
    n(f.y);
    n(f.vx);
    n(f.vy);
    n(f.face);
    n(f.hp);
    n(f.mp);
    n(f.gs);
    n(ST.indexOf(f.st));
    n(f.sf);
    s(f.move);
    n(f.mf);
    n(f.stun);
    n(f.hitstop);
    n(f.invuln);
    n(f.combo);
    n(f.onField ? 1 : 0);
    n(f.down ? 1 : 0);
    for (const k of Object.keys(f.status)) n(f.status[k as keyof typeof f.status]);
    if (f.ai) {
      n(f.ai.seed);
      n(f.ai.next);
    }
  }
  for (const e of m.effects) {
    n(e.id);
    n(e.x);
    n(e.y);
    n(e.life);
    n(e.delay);
  }
  for (const p of m.pickups) {
    n(p.id);
    n(p.x);
    n(p.life);
  }
  return h >>> 0;
}
