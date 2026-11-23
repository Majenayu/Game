/**
 * The player profile for the screens (local only, in localStorage): coins, XP and level, rank points, the picked
 * hero, owned and equipped cosmetics, Champion Road progress and the settings. No real money anywhere.
 */
export type El = 'fire' | 'water' | 'ice' | 'lightning' | 'wind' | 'earth' | 'leaf' | 'light' | 'gravity' | 'time';
export const ELS: El[] = ['fire', 'water', 'ice', 'lightning', 'wind', 'earth', 'leaf', 'light', 'gravity', 'time'];
export interface Profile {
  /** set once the player has typed a name and picked a starting hero */
  registered: boolean;
  /** the first tutorial is finished */
  tutorial: boolean;
  name: string;
  /** squad leader (the hero the player fights with) */
  hero: El;
  /** second hero in the squad, picked after the tutorial */
  partner: El | null;
  /** day of the daily counters below (yyyy-mm-dd) */
  day: string;
  /** today: fights won, hits landed, Zombie Survival runs */
  qWins: number;
  qHits: number;
  qZombie: number;
  /** last day the Daily Streak reward was claimed */
  claimed: string;
  /** days the Daily Streak reward was claimed */
  daily: number;
  coins: number;
  embers: number;
  xp: number;
  level: number;
  rp: number;
  streak: number;
  wins: number;
  road: number;
  owned: string[];
  equipped: Record<string, string>;
  squad: El[];
  heroLv: Record<El, number>;
  music: number;
  sfx: number;
  graphics: 'high' | 'medium' | 'low';
  reduced: boolean;
  shake: boolean;
  colorblind: boolean;
  best: number;
  quests: [number, number, number];
}
const KEY = 'ek.screens.player';
const fresh = (): Profile => ({
  registered: false,
  tutorial: false,
  name: '',
  hero: 'fire',
  partner: null,
  day: '',
  qWins: 0,
  qHits: 0,
  qZombie: 0,
  claimed: '',
  daily: 0,
  coins: 1000,
  embers: 0,
  xp: 0,
  level: 1,
  rp: 750,
  streak: 0,
  wins: 0,
  road: 0,
  owned: [],
  equipped: {},
  squad: [],
  heroLv: { fire: 1, water: 1, ice: 1, lightning: 1, wind: 1, earth: 1, leaf: 1, light: 1, gravity: 1, time: 1 },
  music: 0.8,
  sfx: 0.9,
  graphics: 'high',
  reduced: false,
  shake: true,
  colorblind: false,
  best: 0,
  quests: [0.7, 0.45, 0.3],
});
export const profile: Profile = (() => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    /* fresh profile */
  }
  return fresh();
})();
export function save(): void {
  localStorage.setItem(KEY, JSON.stringify(profile));
}
/** today's date, local time */
export const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** starts the daily counters again on a new day */
export function rollDay(): void {
  const t = today();
  if (profile.day === t) return;
  profile.day = t;
  profile.qWins = profile.qHits = profile.qZombie = 0;
  save();
}
/** the three Daily Quests: label, progress, goal */
export const QUESTS = (): Array<[string, number, number]> => {
  rollDay();
  return [
    ['Win 3 fights', profile.qWins, 3],
    ['Land 50 hits', profile.qHits, 50],
    ['Play Zombie Survival', profile.qZombie, 1],
  ];
};
/** Daily Streak: day 1 to 7 of the reward chain; claimable once a day */
export function dailyClaim(): { ok: boolean; coins: number; day: number } {
  const t = today();
  const day = (profile.daily % 7) + 1;
  if (profile.claimed === t) return { ok: false, coins: 0, day: profile.daily % 7 || 7 };
  const coins = 100 * day;
  profile.claimed = t;
  profile.daily++;
  profile.coins += coins;
  save();
  return { ok: true, coins, day };
}
/** XP needed for the next level */
export const xpNeed = (lv: number) => 800 + lv * 40;
/** adds XP; returns true when the player levelled up */
export function addXp(n: number): boolean {
  profile.xp += n;
  let up = false;
  while (profile.xp >= xpNeed(profile.level)) {
    profile.xp -= xpNeed(profile.level);
    profile.level++;
    profile.heroLv[profile.hero] = (profile.heroLv[profile.hero] ?? 1) + 1;
    up = true;
  }
  save();
  return up;
}
export const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion'] as const;
export type Tier = (typeof TIERS)[number];
export function tierOf(rp: number): { tier: Tier; div: number } {
  const i = Math.max(0, Math.min(5, Math.floor((rp - 750) / 300)));
  const div = 3 - Math.min(2, Math.floor((((rp - 750) % 300) + 300) % 300 / 100));
  return { tier: TIERS[i], div };
}
