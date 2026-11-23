/** Screen registry and navigation (?page=<name> in the address bar, so every screen has its own link). */
import type { El } from './save';
import type { G } from './ui';

export type PageName =
  | 'gallery' | 'title' | 'lobby' | 'road' | 'customise' | 'roster' | 'versus' | 'fight' | 'victory' | 'levelup'
  | 'shop' | 'ranked' | 'pause' | 'settings' | 'zombie' | 'bestiary' | 'icons' | 'keyart' | 'poster';
export interface Page {
  title: string;
  /** heroes the page needs loaded before it draws */
  heroes?: () => El[];
  /** pictures the page needs before it draws */
  load?(): Promise<void>;
  enter?(): void;
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
  mode: 'road' | 'ranked' | 'local' | 'quick' | 'training';
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
