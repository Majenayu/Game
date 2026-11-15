import {
  BULLET_FX,
  CHARACTERS,
  COLORS,
  LEVELS,
  SKILLS,
  TRAILS,
  sanitizeLoadout,
  type CosmeticDef,
  type LevelDef,
} from '@orb/shared';
import type { Platform } from '../platform/crazygames';
import { SAVE_KEY, defaultSave, parseSave, type QuestState, type SaveData } from './save';

// ---- tables -----------------------------------------------------------------

export type QuestType = 'kills' | 'wins' | 'coins' | 'skills' | 'pickups' | 'rounds' | 'hold' | 'levels';

export interface QuestDef {
  id: string;
  text: string;
  type: QuestType;
  target: number;
  coins: number;
  xp: number;
}

export const DAILY_POOL: QuestDef[] = [
  { id: 'd_kills10', text: 'Defeat 10 orbs', type: 'kills', target: 10, coins: 60, xp: 40 },
  { id: 'd_kills25', text: 'Defeat 25 orbs', type: 'kills', target: 25, coins: 120, xp: 80 },
  { id: 'd_wins1', text: 'Win 1 round', type: 'wins', target: 1, coins: 80, xp: 60 },
  { id: 'd_wins3', text: 'Win 3 rounds', type: 'wins', target: 3, coins: 160, xp: 120 },
  { id: 'd_coins20', text: 'Collect 20 coins in Coin Rush', type: 'coins', target: 20, coins: 80, xp: 50 },
  { id: 'd_skills8', text: 'Use skills 8 times', type: 'skills', target: 8, coins: 60, xp: 40 },
  { id: 'd_pick5', text: 'Grab 5 powerups', type: 'pickups', target: 5, coins: 60, xp: 40 },
  { id: 'd_rounds3', text: 'Play 3 rounds', type: 'rounds', target: 3, coins: 50, xp: 40 },
  { id: 'd_hold20', text: 'Hold the hill for 20 seconds', type: 'hold', target: 20, coins: 80, xp: 50 },
];

export const WEEKLY_POOL: QuestDef[] = [
  { id: 'w_kills100', text: 'Defeat 100 orbs', type: 'kills', target: 100, coins: 400, xp: 300 },
  { id: 'w_wins10', text: 'Win 10 rounds', type: 'wins', target: 10, coins: 500, xp: 350 },
  { id: 'w_pick40', text: 'Grab 40 powerups', type: 'pickups', target: 40, coins: 350, xp: 250 },
  { id: 'w_levels3', text: 'Clear 3 campaign levels', type: 'levels', target: 3, coins: 450, xp: 300 },
  {
    id: 'w_coins150',
    text: 'Collect 150 coins in Coin Rush',
    type: 'coins',
    target: 150,
    coins: 400,
    xp: 250,
  },
  { id: 'w_rounds25', text: 'Play 25 rounds', type: 'rounds', target: 25, coins: 350, xp: 250 },
];

export const DAILY_REWARDS = [50, 75, 100, 150, 200, 300, 500];

export interface WheelSegment {
  label: string;
  weight: number;
  kind: 'coins' | 'cosmetic';
  value: number;
  color: string;
}

export const WHEEL: WheelSegment[] = [
  { label: '25', weight: 24, kind: 'coins', value: 25, color: '#2a3a7a' },
  { label: '50', weight: 22, kind: 'coins', value: 50, color: '#1f5f8f' },
  { label: 'Skin', weight: 8, kind: 'cosmetic', value: 0, color: '#7a2a6a' },
  { label: '100', weight: 16, kind: 'coins', value: 100, color: '#2a3a7a' },
  { label: '150', weight: 12, kind: 'coins', value: 150, color: '#1f5f8f' },
  { label: '250', weight: 8, kind: 'coins', value: 250, color: '#2f7a4a' },
  { label: '500', weight: 3, kind: 'coins', value: 500, color: '#8a6a1f' },
  { label: '1000', weight: 1, kind: 'coins', value: 1000, color: '#a02a2a' },
];

export const EXTRA_SPIN_COST = 150;
export const MAX_LEVEL = 50;

// ---- helpers ----------------------------------------------------------------

export function dateKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function weekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, '0')}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

function seededPick<T>(pool: T[], seed: string, n: number): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rng = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const left = [...pool];
  const out: T[] = [];
  while (out.length < n && left.length) out.push(left.splice(Math.floor(rng() * left.length), 1)[0]);
  return out;
}

export function xpToNext(level: number): number {
  return 100 + 50 * (level - 1);
}

export interface LevelInfo {
  level: number;
  into: number;
  need: number;
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  let left = xp;
  while (level < MAX_LEVEL && left >= xpToNext(level)) {
    left -= xpToNext(level);
    level++;
  }
  return { level, into: level >= MAX_LEVEL ? 0 : left, need: level >= MAX_LEVEL ? 1 : xpToNext(level) };
}

export type ShopKind = 'char' | 'skill' | 'color' | 'trail' | 'bfx';

export interface MatchResult {
  mode: string;
  kills: number;
  deaths: number;
  score: number;
  won: boolean;
}

export interface Reward {
  coins: number;
  xp: number;
  levelsGained: number[];
}

// ---- progress store -----------------------------------------------------------

export class Progress {
  data: SaveData = defaultSave();
  private listeners: Array<() => void> = [];
  private timer = 0;

  constructor(private platform: Platform) {}

  async init(): Promise<void> {
    let local: SaveData | null = null;
    try {
      local = parseSave(localStorage.getItem(SAVE_KEY));
    } catch {
      /* storage blocked */
    }
    const remote = parseSave(await this.platform.loadData(SAVE_KEY));
    this.data =
      [local, remote].filter((x): x is SaveData => !!x).sort((a, b) => b.updated - a.updated)[0] ??
      defaultSave();
    this.data.loadout = sanitizeLoadout(this.data.loadout);
    this.ensureQuests();
    this.commit();
  }

  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  commit(): void {
    this.data.updated = Date.now();
    this.listeners.forEach((l) => l());
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.flush(), 400);
  }

  flush(): void {
    const json = JSON.stringify(this.data);
    try {
      localStorage.setItem(SAVE_KEY, json);
    } catch {
      /* storage blocked */
    }
    this.platform.saveData(SAVE_KEY, json);
  }

  get level(): LevelInfo {
    return levelFromXp(this.data.xp);
  }

  addCoins(n: number): void {
    this.data.coins = Math.max(0, this.data.coins + Math.floor(n));
  }

  /** Adds XP and returns the levels gained. Each level also pays coins. */
  addXp(n: number): number[] {
    const before = this.level.level;
    this.data.xp += Math.max(0, Math.floor(n));
    const after = this.level.level;
    const gained: number[] = [];
    for (let l = before + 1; l <= after; l++) {
      gained.push(l);
      this.addCoins(50 + 10 * l);
    }
    return gained;
  }

  // ---- shop ---------------------------------------------------------------

  private defOf(kind: ShopKind, id: string | number): { price: number; level: number; name: string } | null {
    switch (kind) {
      case 'char':
        return CHARACTERS[id as string] ?? null;
      case 'skill':
        return SKILLS[id as string] ?? null;
      case 'color':
        return COLORS[id as number] ?? null;
      case 'trail':
        return TRAILS[id as number] ?? null;
      case 'bfx':
        return BULLET_FX[id as number] ?? null;
    }
  }

  owns(kind: ShopKind, id: string | number): boolean {
    const o = this.data.owned as unknown as Record<string, Array<string | number>>;
    const key = { char: 'chars', skill: 'skills', color: 'colors', trail: 'trails', bfx: 'bfx' }[kind];
    return o[key].includes(id);
  }

  private grant(kind: ShopKind, id: string | number): void {
    const o = this.data.owned as unknown as Record<string, Array<string | number>>;
    const key = { char: 'chars', skill: 'skills', color: 'colors', trail: 'trails', bfx: 'bfx' }[kind];
    if (!o[key].includes(id)) o[key].push(id);
  }

  buy(kind: ShopKind, id: string | number): { ok: boolean; reason?: string } {
    const def = this.defOf(kind, id);
    if (!def) return { ok: false, reason: 'Unknown item' };
    if (this.owns(kind, id)) return { ok: false, reason: 'Already owned' };
    if (this.level.level < def.level) return { ok: false, reason: `Reach level ${def.level}` };
    if (this.data.coins < def.price) return { ok: false, reason: 'Not enough coins' };
    this.addCoins(-def.price);
    this.grant(kind, id);
    this.commit();
    return { ok: true };
  }

  equip(kind: ShopKind, id: string | number, slot = 0): boolean {
    if (!this.owns(kind, id)) return false;
    const l = this.data.loadout;
    if (kind === 'char') l.char = id as string;
    else if (kind === 'color') l.color = id as number;
    else if (kind === 'trail') l.trail = id as number;
    else if (kind === 'bfx') l.bfx = id as number;
    else if (kind === 'skill') {
      const other = l.skills[slot === 0 ? 1 : 0];
      if (other === id) l.skills[slot === 0 ? 1 : 0] = l.skills[slot];
      l.skills[slot] = id as string;
    }
    this.data.loadout = sanitizeLoadout(l);
    this.commit();
    return true;
  }

  // ---- daily reward ---------------------------------------------------------

  dailyStatus(): { canClaim: boolean; nextDay: number; streak: number } {
    const today = dateKey();
    const d = this.data.daily;
    const canClaim = d.last !== today;
    const continuing = d.last === yesterdayKey() || d.last === today;
    const streak = canClaim ? (continuing ? d.streak : 0) : d.streak;
    return { canClaim, nextDay: canClaim ? (streak % 7) + 1 : (d.streak % 7) + 1, streak };
  }

  claimDaily(): { coins: number; day: number; levels: number[] } | null {
    const st = this.dailyStatus();
    if (!st.canClaim) return null;
    const day = st.nextDay;
    const coins = DAILY_REWARDS[day - 1];
    this.data.daily = { last: dateKey(), streak: st.streak + 1 };
    this.addCoins(coins);
    const levels = this.addXp(30);
    this.commit();
    return { coins, day, levels };
  }

  // ---- quests ---------------------------------------------------------------

  ensureQuests(): void {
    const q = this.data.quests;
    const today = dateKey();
    const week = weekKey();
    if (q.day !== today) {
      q.day = today;
      q.list = seededPick(DAILY_POOL, today, 3).map((d) => ({ id: d.id, progress: 0, claimed: false }));
    }
    if (q.week !== week) {
      q.week = week;
      q.weekList = seededPick(WEEKLY_POOL, week, 2).map((d) => ({ id: d.id, progress: 0, claimed: false }));
    }
  }

  questDef(id: string): QuestDef | undefined {
    return DAILY_POOL.find((q) => q.id === id) ?? WEEKLY_POOL.find((q) => q.id === id);
  }

  track(type: QuestType, n = 1): void {
    this.ensureQuests();
    for (const q of [...this.data.quests.list, ...this.data.quests.weekList]) {
      const def = this.questDef(q.id);
      if (def && def.type === type && !q.claimed) q.progress = Math.min(def.target, q.progress + n);
    }
  }

  claimQuest(q: QuestState): { coins: number; levels: number[] } | null {
    const def = this.questDef(q.id);
    if (!def || q.claimed || q.progress < def.target) return null;
    q.claimed = true;
    this.addCoins(def.coins);
    const levels = this.addXp(def.xp);
    this.commit();
    return { coins: def.coins, levels };
  }

  // ---- lucky draw -----------------------------------------------------------

  spinStatus(): { free: boolean; cost: number } {
    return { free: this.data.spin.last !== dateKey(), cost: EXTRA_SPIN_COST };
  }

  /** Picks the result of a spin without paying. Returns the wheel index. */
  rollSpin(rng: () => number = Math.random): number {
    const total = WHEEL.reduce((s, w) => s + w.weight, 0);
    let r = rng() * total;
    for (let i = 0; i < WHEEL.length; i++) {
      r -= WHEEL[i].weight;
      if (r <= 0) return i;
    }
    return 0;
  }

  /** Pays for a spin. Returns false when a paid spin cannot be afforded. */
  payForSpin(): boolean {
    if (this.spinStatus().free) {
      this.data.spin.last = dateKey();
      this.commit();
      return true;
    }
    if (this.data.coins < EXTRA_SPIN_COST) return false;
    this.addCoins(-EXTRA_SPIN_COST);
    this.commit();
    return true;
  }

  /** Grants the prize of the segment. Returns a text describing it. */
  grantPrize(index: number, rng: () => number = Math.random): string {
    const seg = WHEEL[index];
    if (seg.kind === 'coins') {
      this.addCoins(seg.value);
      this.commit();
      return `${seg.value} coins`;
    }
    const locked: Array<{ kind: ShopKind; id: number; name: string }> = [];
    for (const c of COLORS)
      if (!this.owns('color', c.id)) locked.push({ kind: 'color', id: c.id, name: `${c.name} color` });
    for (const t of TRAILS)
      if (!this.owns('trail', t.id)) locked.push({ kind: 'trail', id: t.id, name: `${t.name} trail` });
    for (const b of BULLET_FX)
      if (!this.owns('bfx', b.id)) locked.push({ kind: 'bfx', id: b.id, name: `${b.name} bullets` });
    if (!locked.length) {
      this.addCoins(200);
      this.commit();
      return '200 coins (you own every skin!)';
    }
    const pick = locked[Math.floor(rng() * locked.length)];
    this.grant(pick.kind, pick.id);
    this.commit();
    return pick.name;
  }

  // ---- matches and campaign ----------------------------------------------------

  recordMatch(r: MatchResult, scale = 1): Reward {
    let coins = 5 + r.kills * 2 + (r.won ? 25 : 0);
    let xp = 10 + r.kills * 3 + (r.won ? 40 : 0);
    if (r.mode === 'coins') coins += Math.floor(r.score / 3);
    if (r.mode === 'hill') coins += Math.floor(r.score / 5);
    coins = Math.round(Math.min(coins, 150) * scale);
    xp = Math.round(Math.min(xp, 200) * scale);
    const s = this.data.stats;
    s.matches += 1;
    s.kills += r.kills;
    s.deaths += r.deaths;
    if (r.won) s.wins += 1;
    this.track('rounds', 1);
    if (r.won) this.track('wins', 1);
    if (r.mode === 'hill') this.track('hold', r.score);
    this.addCoins(coins);
    const levelsGained = this.addXp(xp);
    this.commit();
    return { coins, xp, levelsGained };
  }

  /** Applies a campaign result. Returns coins paid (full on first clear, 20% on replays). */
  finishLevel(level: LevelDef, stars: number): Reward {
    const key = String(level.id);
    const prev = this.data.campaign[key] ?? 0;
    let coins = Math.round(level.reward * (prev === 0 ? 1 : 0.2));
    if (stars > prev) coins += (stars - prev) * 30;
    if (stars > prev) this.data.campaign[key] = stars;
    if (prev === 0) this.track('levels', 1);
    this.addCoins(coins);
    const xp = prev === 0 ? 80 + level.id * 10 : 20;
    const levelsGained = this.addXp(xp);
    this.commit();
    return { coins, xp, levelsGained };
  }

  levelUnlocked(level: LevelDef): boolean {
    return level.id === 1 || (this.data.campaign[String(level.id - 1)] ?? 0) > 0;
  }

  totalStars(): number {
    return Object.values(this.data.campaign).reduce((s, n) => s + n, 0);
  }

  discover(puId: number): boolean {
    if (this.data.dex.includes(puId)) return false;
    this.data.dex.push(puId);
    this.commit();
    return true;
  }
}

export function cosmeticList(kind: 'color' | 'trail' | 'bfx'): CosmeticDef[] {
  return kind === 'color' ? COLORS : kind === 'trail' ? TRAILS : BULLET_FX;
}

export const LEVEL_COUNT = LEVELS.length;
