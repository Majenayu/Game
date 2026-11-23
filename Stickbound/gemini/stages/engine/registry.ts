/**
 * Every arena folder's definition, loaded on demand. Used by the Lightning lab (engine/main.ts, one page per arena
 * folder) and by the Trial Ground (gemini/trial/), so an arena is written once and shows up in both.
 */
import type { ArenaDef } from './arena';
type Load = () => Promise<ArenaDef>;
const as = (d: unknown) => d as ArenaDef;
export const ARENA_DEFS: Record<string, Load> = {
  lightningarena: async () => as((await import('../lightningarena/arena')).lightning),
  firearena: async () => as((await import('../firearena/arena')).fire),
  waterarena: async () => as((await import('../waterarena/arena')).water),
  icearena: async () => as((await import('../icearena/arena')).ice),
  windarena: async () => as((await import('../windarena/arena')).wind),
  eartharena: async () => as((await import('../eartharena/arena')).earth),
  leafarena: async () => as((await import('../leafarena/arena')).leaf),
  lightarena: async () => as((await import('../lightarena/arena')).light),
  shadowarena: async () => as((await import('../shadowarena/arena')).shadow),
  gravityarena: async () => as((await import('../gravityarena/arena')).gravity),
  timearena: async () => as((await import('../timearena/arena')).time),
};
