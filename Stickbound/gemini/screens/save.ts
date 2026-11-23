/**
 * The player profile for the screens (local only, in localStorage): coins, XP and level, rank points, the picked
 * hero, owned and equipped cosmetics, Champion Road progress and the settings. No real money anywhere.
 */
export type El = 'fire' | 'water' | 'ice' | 'lightning' | 'wind' | 'earth' | 'leaf' | 'light' | 'gravity' | 'time';
export const ELS: El[] = ['fire', 'water', 'ice', 'lightning', 'wind', 'earth', 'leaf', 'light', 'gravity', 'time'];
export interface Profile {
  name: string;
  hero: El;
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
const KEY = 'ek.screens.profile';
const fresh = (): Profile => ({
  name: 'Nytor',
  hero: 'fire',
  coins: 1000,
  embers: 2367,
  xp: 620,
  level: 24,
  rp: 1450,
  streak: 3,
  wins: 0,
  road: 7,
  owned: ['aura:fire', 'trail:comet', 'head:headband'],
  equipped: { aura: 'aura:fire', trail: 'trail:comet', head: 'head:headband' },
  squad: ['fire', 'lightning'],
  heroLv: { fire: 24, water: 18, ice: 18, lightning: 18, wind: 18, earth: 24, leaf: 18, light: 29, gravity: 14, time: 18 },
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
