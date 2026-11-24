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
  /** today's Daily Quest counters (QuestId to count) and the quests already claimed today */
  qc: Partial<Record<QuestId, number>>;
  qDone: QuestId[];
  /** last day the Daily Streak reward was claimed */
  claimed: string;
  /** days claimed in the current 7-day Daily Streak chain */
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
  /** class the player chose for each hero on the roster (unset: the hero's own class) */
  cls: Partial<Record<El, string>>;
  music: number;
  sfx: number;
  graphics: 'high' | 'medium' | 'low';
  reduced: boolean;
  shake: boolean;
  colorblind: boolean;
  best: number;
}
const KEY = 'ek.screens.player';
const fresh = (): Profile => ({
  registered: false,
  tutorial: false,
  name: '',
  hero: 'fire',
  partner: null,
  day: '',
  qc: {},
  qDone: [],
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
  cls: {},
  music: 0.8,
  sfx: 0.9,
  graphics: 'high',
  reduced: false,
  shake: true,
  colorblind: false,
  best: 0,
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
/** the day before `day` (yyyy-mm-dd), local time */
export function dayBefore(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const p = new Date(y, m - 1, d - 1);
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, '0')}-${String(p.getDate()).padStart(2, '0')}`;
}
/** starts the daily counters again on a new day */
export function rollDay(): void {
  const t = today();
  if (profile.day === t) return;
  profile.day = t;
  profile.qc = {};
  profile.qDone = [];
  save();
}

// ---------------------------------------------------------------- Daily Quests
/** a quest kind: what it counts (a daily counter in profile.qc), the goal and its reward */
export interface QuestDef {
  id: QuestId;
  text: string;
  goal: number;
  coins: number;
  xp: number;
}
export type QuestId = 'win' | 'hits' | 'zombie' | 'powers' | 'ult' | 'swap' | 'road' | 'ko' | 'combo' | 'train';
export const QUEST_POOL: QuestDef[] = [
  { id: 'win', text: 'Win 3 fights', goal: 3, coins: 300, xp: 400 },
  { id: 'hits', text: 'Land 50 hits', goal: 50, coins: 200, xp: 250 },
  { id: 'zombie', text: 'Play a Zombie Survival run', goal: 1, coins: 150, xp: 200 },
  { id: 'powers', text: 'Use 15 powers', goal: 15, coins: 200, xp: 250 },
  { id: 'ult', text: 'Fire 2 ultimates', goal: 2, coins: 250, xp: 300 },
  { id: 'swap', text: 'Tag swap 5 times in fights', goal: 5, coins: 150, xp: 200 },
  { id: 'road', text: 'Beat a Champion Road champion', goal: 1, coins: 300, xp: 350 },
  { id: 'ko', text: 'Knock out 4 heroes', goal: 4, coins: 250, xp: 300 },
  { id: 'combo', text: 'Land a 5-hit combo', goal: 1, coins: 200, xp: 250 },
  { id: 'train', text: 'Land 30 hits in Training', goal: 30, coins: 100, xp: 150 },
];
/** today's three quests: picked from the pool by the date, so they are the same all day and change each day */
export function todaysQuests(): QuestDef[] {
  rollDay();
  let h = 2166136261;
  for (const c of profile.day) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const pool = [...QUEST_POOL];
  const out: QuestDef[] = [];
  for (let i = 0; i < 3; i++) {
    h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0;
    out.push(pool.splice(h % pool.length, 1)[0]);
  }
  return out;
}
/** counts something the quests track (today only) */
export function questCount(id: QuestId, n = 1): void {
  rollDay();
  profile.qc[id] = (profile.qc[id] ?? 0) + n;
}
/** a quest's counter for a value that only needs to be reached once (combo length) */
export function questBest(id: QuestId, v: number, goal: number): void {
  rollDay();
  if (v >= goal) profile.qc[id] = Math.max(profile.qc[id] ?? 0, 1);
}
export const questProgress = (q: QuestDef): number => Math.min(q.goal, profile.qc[q.id] ?? 0);
export const questReady = (q: QuestDef): boolean => questProgress(q) >= q.goal && !profile.qDone.includes(q.id);
/** quests finished but not yet claimed (the red dot on the lobby tile) */
export const questsToClaim = (): number => todaysQuests().filter(questReady).length;
/** pays a finished quest once; returns whether the player levelled up, or null if it cannot be claimed */
export function claimQuest(q: QuestDef): { levelUp: boolean } | null {
  if (!questReady(q)) return null;
  profile.qDone.push(q.id);
  profile.coins += q.coins;
  return { levelUp: addXp(q.xp) };
}

// ---------------------------------------------------------------- Daily Streak
/** the 7-day reward chain; day 7 is the chest */
export const STREAK_REWARDS: Array<{ coins: number; xp: number }> = [
  { coins: 100, xp: 0 },
  { coins: 150, xp: 100 },
  { coins: 200, xp: 0 },
  { coins: 250, xp: 200 },
  { coins: 300, xp: 0 },
  { coins: 400, xp: 300 },
  { coins: 1000, xp: 600 },
];
/**
 * The streak state today: `done` days of the current 7-day chain are claimed. Missing a day breaks the chain
 * (back to day 1); after day 7 a new chain starts.
 */
export function streakState(): { done: number; today: number; canClaim: boolean; broken: boolean } {
  const t = today();
  if (profile.claimed === t) {
    const done = ((profile.daily - 1) % 7) + 1;
    return { done, today: done, canClaim: false, broken: false };
  }
  const kept = profile.claimed !== '' && profile.claimed === dayBefore(t);
  const broken = profile.claimed !== '' && !kept;
  const done = kept ? profile.daily % 7 : 0;
  return { done, today: done + 1, canClaim: true, broken };
}
/** claims today's Daily Streak reward */
export function dailyClaim(): { ok: boolean; coins: number; xp: number; day: number; levelUp: boolean } {
  const s = streakState();
  if (!s.canClaim) return { ok: false, coins: 0, xp: 0, day: s.today, levelUp: false };
  const r = STREAK_REWARDS[s.today - 1];
  profile.daily = s.done + 1;
  profile.claimed = today();
  profile.coins += r.coins;
  const levelUp = r.xp > 0 ? addXp(r.xp) : (save(), false);
  return { ok: true, coins: r.coins, xp: r.xp, day: s.today, levelUp };
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
