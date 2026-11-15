import type { Rank } from './skills/catalog';

/** Treasure chests. Every chest shows its full contents table before you open it. */
export type ChestKind = 'wood' | 'silver' | 'gold' | 'legend';
export interface ChestDef {
  kind: ChestKind;
  name: string;
  color: number;
  coins: [number, number];
  /** Number of skill cards inside. */
  skills: number;
  /** Percent chance per card for each rank (sums to 100). */
  odds: Partial<Record<Rank, number>>;
  /** Percent chance of a weapon and of an accessory you do not own yet. */
  weapon: number;
  acc: number;
  /** Where to get it. */
  from: string;
}
export const CHESTS: Record<ChestKind, ChestDef> = {
  wood: {
    kind: 'wood',
    name: 'Wooden Chest',
    color: 0xa0703c,
    coins: [40, 90],
    skills: 2,
    odds: { F: 40, E: 30, D: 20, C: 8, B: 2 },
    weapon: 3,
    acc: 8,
    from: 'Every 3rd match win and daily login days 1-6',
  },
  silver: {
    kind: 'silver',
    name: 'Silver Chest',
    color: 0xc0c8d8,
    coins: [120, 250],
    skills: 3,
    odds: { E: 20, D: 30, C: 30, B: 16, A: 4 },
    weapon: 10,
    acc: 20,
    from: 'Ranked wins, campaign first clears and login days 7, 14 and 21',
  },
  gold: {
    kind: 'gold',
    name: 'Gold Chest',
    color: 0xffc93c,
    coins: [300, 600],
    skills: 4,
    odds: { D: 15, C: 30, B: 35, A: 17, S: 3 },
    weapon: 25,
    acc: 35,
    from: 'Boss Tower first clears and login day 28',
  },
  legend: {
    kind: 'legend',
    name: 'Legend Chest',
    color: 0xff4da6,
    coins: [800, 1500],
    skills: 5,
    odds: { B: 30, A: 45, S: 22, U: 3 },
    weapon: 60,
    acc: 60,
    from: 'Login day 30 and beating the champion',
  },
};
export const CHEST_ORDER: ChestKind[] = ['wood', 'silver', 'gold', 'legend'];
export function isChestKind(v: unknown): v is ChestKind {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(CHESTS, v);
}
export function rollChestRank(def: ChestDef, rng: () => number): Rank {
  const entries = Object.entries(def.odds) as Array<[Rank, number]>;
  let r = rng() * 100;
  for (const [rank, p] of entries) {
    r -= p;
    if (r <= 0) return rank;
  }
  return entries[entries.length - 1][0];
}

/** 30 day login calendar: coins every day, chests on milestone days. */
export interface CalendarDay {
  coins: number;
  chest?: ChestKind;
}
export const LOGIN_CALENDAR: CalendarDay[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const coins = 40 + day * 10;
  if (day === 30) return { coins: 1000, chest: 'legend' };
  if (day === 28) return { coins, chest: 'gold' };
  if (day % 7 === 0) return { coins, chest: 'silver' };
  if (day % 3 === 0) return { coins, chest: 'wood' };
  return { coins };
});
