/** Screen registry and navigation (?page=<name> in the address bar, so every screen has its own link). */
import { ELS, profile, type El } from './save';
import type { G } from './ui';

export type PageName =
  | 'gallery' | 'title' | 'lobby' | 'road' | 'customise' | 'roster' | 'versus' | 'fight' | 'victory' | 'levelup'
  | 'ranked' | 'pause' | 'settings' | 'zombie' | 'bestiary' | 'icons' | 'keyart' | 'poster' | 'register' | 'starter' | 'partner';
export interface Page {
  title: string;
  /** heroes the page needs loaded before it draws */
  heroes?: () => El[];
  /** pictures the page needs before it draws */
  load?(): Promise<void>;
  enter?(): void;
  /** called when another page takes over */
  leave?(next: PageName): void;
  step?(): void;
  draw(g: G, t: number): void;
  key?(e: KeyboardEvent): void;
}
export const pages = {} as Record<PageName, Page>;
export interface Match {
  p1: El;
  p2: El;
  p2Name: string;
  p2Lv: number;
  mode: 'road' | 'ranked' | 'local' | 'quick' | 'training' | 'tutorial';
  /** arena element (gemini/stages/<el>arena); default: the opponent's */
  arena?: El;
}
/** first element after `from` in the element order (skipping `step - 1`) that is not in `avoid` */
function pickEl(from: El, step: number, avoid: El[]): El {
  const i = ELS.indexOf(from);
  for (let k = 0; k < ELS.length; k++) {
    const e = ELS[(i + step + k) % ELS.length];
    if (!avoid.includes(e)) return e;
  }
  return from;
}
/**
 * The benched hero of each side (tag swap). The player brings their squad partner; the tutorial has none yet and
 * the sparring dummy fights alone. Opponents get a fixed partner from their element, so a fight is the same each time.
 */
export function matesOf(m: Match): [El | null, El | null] {
  const solo = m.mode === 'tutorial' || m.mode === 'training';
  let a: El | null = m.mode === 'tutorial' ? null : profile.partner;
  if (a === m.p1) a = null;
  if (a && a === m.p2 && m.mode === 'local') a = pickEl(m.p1, 1, [m.p1, m.p2]);
  if (!a && !solo) a = pickEl(m.p1, 1, [m.p1, m.p2]);
  const b: El | null = solo ? null : pickEl(m.p2, 3, [m.p1, m.p2, ...(a ? [a] : [])]);
  return [a, b];
}
export interface Result {
  winner: 1 | 2;
  mode: Match['mode'];
  xp: number;
  coins: number;
  levelUp: boolean;
  rp?: number;
  score?: number;
  wave?: number;
}
export const nav = {
  name: 'title' as PageName,
  match: { p1: 'fire', p2: 'water', p2Name: 'Root', p2Lv: 22, mode: 'quick' } as Match,
  result: null as Result | null,
  /** the last game frame (pause backdrop) */
  snapshot: null as HTMLCanvasElement | null,
  /** page to return to from pause or settings */
  back: 'lobby' as PageName,
  go: (_name: PageName): void => undefined,
};
