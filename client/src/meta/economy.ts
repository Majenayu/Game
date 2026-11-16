import {
  ACCESSORIES,
  BOSS_LEVELS,
  BULLET_FX,
  CHESTS,
  LOGIN_CALENDAR,
  classById,
  isChestKind,
  luckyRank,
  rollChestRank,
  totalPassives,
  type ChestKind,
  type Passives,
  CHAMPION_LEVEL_ID,
  CHARACTERS,
  RANKS,
  UNIQUES,
  WEAPONS,
  getGear,
  LEVEL_COPIES,
  duelUsable,
  getSkill,
  uniqueIdOf,
  COLORS,
  LEVELS,
  TOWER_FIRST_ID,
  TOWER_UNLOCK_LEVEL,
  eloUpdate,
  marketOffers,
  sellPrice,
  type MarketOffer,
  TRAILS,
  UniqueRegistry,
  addToInventory,
  fuse,
  fusionsLeft,
  makeInstance,
  randomSkillOfRank,
  randomGear,
  GEAR_SLOTS,
  STAR_MILESTONES,
  bossUniques,
  worldOfLevel,
  BOSS_UNIQUE_FIRST,
  BOSS_UNIQUE_REPEAT,
  rankOf,
  rollDrop,
  rollStarterPack,
  sanitizeLoadout,
  summonById,
  usableInBattle,
  validateLoadout,
  weekId,
  type CosmeticDef,
  type DropSource,
  type LevelDef,
  type Rank,
  type SkillInstance,
} from '@orb/shared';
import type { Platform } from '../platform/crazygames';
import { addGear, dropGear, grantDailyExtra } from './inventory';
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

/** Coins for each of the 30 login days (chests on milestone days, see LOGIN_CALENDAR). */
export const DAILY_REWARDS = LOGIN_CALENDAR.map((d) => d.coins);
/** Free spins per day, shared by all wheels. */
export const SPINS_PER_DAY = 10;
/** Accessories you may pick for free when you create your profile. */
export const FREE_ACCS = [0, 2, 5, 6, 8];
/** Level needed to challenge the champion (1 = anyone). */
export const CHAMPION_MIN_LEVEL = 1;

export interface WheelSegment {
  label: string;
  weight: number;
  kind: 'coins' | 'cosmetic' | 'skill' | 'unique' | 'weapon' | 'acc' | 'gear' | 'egg' | 'stones';
  value: number;
  color: string;
}

/** Skill prizes use `value` as an index into RANKS (F=0 ... S=6). */
export const WHEEL: WheelSegment[] = [
  { label: 'Skill F', weight: 22, kind: 'skill', value: 0, color: '#4a5070' },
  { label: 'Skill E', weight: 20, kind: 'skill', value: 1, color: '#2f7a4a' },
  { label: 'Skill D', weight: 18, kind: 'skill', value: 2, color: '#1f4f9f' },
  { label: 'Skill C', weight: 14, kind: 'skill', value: 3, color: '#1f7a6a' },
  { label: 'Skill B', weight: 8, kind: 'skill', value: 4, color: '#5a2a9a' },
  { label: 'Skill A', weight: 2.5, kind: 'skill', value: 5, color: '#a0521f' },
  { label: 'Skill S', weight: 0.6, kind: 'skill', value: 6, color: '#a08a1f' },
];

export const EXTRA_SPIN_COST = 150;
export type WheelKind = 'coins' | 'skills' | 'weapons' | 'accs' | 'gear' | 'summons';
const WCOL = ['#2a3a7a', '#1f5f8f', '#5a2a9a', '#2f7a4a', '#8a6a1f', '#a02a2a', '#1f7a6a', '#7a2a6a'];
/** Separate wheels on the Lucky Draw page. All share the 10 free spins a day. */
export const WHEELS: Record<WheelKind, WheelSegment[]> = {
  coins: [
    { label: '25', weight: 24, kind: 'coins', value: 25, color: '#2a3a7a' },
    { label: '50', weight: 22, kind: 'coins', value: 50, color: '#1f5f8f' },
    { label: 'Skin', weight: 8, kind: 'cosmetic', value: 0, color: '#7a2a6a' },
    { label: '100', weight: 16, kind: 'coins', value: 100, color: '#2a3a7a' },
    { label: '150', weight: 12, kind: 'coins', value: 150, color: '#1f5f8f' },
    { label: '250', weight: 8, kind: 'coins', value: 250, color: '#2f7a4a' },
    { label: '500', weight: 3, kind: 'coins', value: 500, color: '#8a6a1f' },
    { label: '1000', weight: 1, kind: 'coins', value: 1000, color: '#a02a2a' },
  ],
  skills: WHEEL,
  gear: [
    { label: 'Gear F', weight: 26, kind: 'gear', value: 0, color: '#4a5070' },
    { label: 'Gear E', weight: 22, kind: 'gear', value: 1, color: '#2f7a4a' },
    { label: 'Gear D', weight: 18, kind: 'gear', value: 2, color: '#1f4f9f' },
    { label: 'Gear C', weight: 14, kind: 'gear', value: 3, color: '#1f7a6a' },
    { label: 'Gear B', weight: 9, kind: 'gear', value: 4, color: '#5a2a9a' },
    { label: 'Gear A', weight: 3, kind: 'gear', value: 5, color: '#a0521f' },
    { label: 'Gear S', weight: 0.8, kind: 'gear', value: 6, color: '#a08a1f' },
    { label: 'Gear U', weight: 0.1, kind: 'gear', value: 7, color: '#c0206a' },
  ],
  summons: [
    { label: 'Egg', weight: 18, kind: 'egg', value: 1, color: '#1f7a6a' },
    { label: '2 Eggs', weight: 6, kind: 'egg', value: 2, color: '#5a2a9a' },
    { label: '2 Stones', weight: 40, kind: 'stones', value: 2, color: '#2a3a7a' },
    { label: '5 Stones', weight: 18, kind: 'stones', value: 5, color: '#1f4f9f' },
    { label: '100', weight: 30, kind: 'coins', value: 100, color: '#2f7a4a' },
    { label: '5 Eggs', weight: 1, kind: 'egg', value: 5, color: '#a0521f' },
  ],
  weapons: WEAPONS.slice(1).map((w, i) => ({
    label: w.name,
    weight: Math.max(1, 12 - w.level),
    kind: 'weapon' as const,
    value: w.id,
    color: WCOL[i % WCOL.length],
  })),
  accs: ACCESSORIES.slice(1, 101).map((a, i) => ({
    label: a.name,
    weight: Math.max(1, 10 - a.level),
    kind: 'acc' as const,
    value: a.id,
    color: WCOL[i % WCOL.length],
  })),
};
export const MAX_LEVEL = 1000;

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

export type ShopKind = 'char' | 'color' | 'trail' | 'bfx' | 'weapon' | 'acc';
const OWNED_KEY: Record<ShopKind, string> = {
  char: 'chars',
  color: 'colors',
  trail: 'trails',
  bfx: 'bfx',
  weapon: 'weapons',
  acc: 'accs',
};

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
  /** Chest earned by this result, if any. */
  chest?: ChestKind;
  /** Skill dropped after the match or level, if any. */
  drop?: SkillDrop;
  /** Map-star milestone rewards earned by this result. */
  bonus?: string;
  /** Fusion stones earned by this result. */
  stones?: number;
}

export interface SkillDrop {
  skillId: number;
  rank: Rank;
  merged: boolean;
  level: number;
  /** Level before this copy (equal to level when nothing changed). */
  prevLevel: number;
  copies: number;
  /** Copies needed for the next level (0 at max level). */
  nextAt: number;
}

// ---- progress store -----------------------------------------------------------

export class Progress {
  data: SaveData = defaultSave();
  private listeners: Array<() => void> = [];
  private timer = 0;

  constructor(private platform: Platform) {}

  async init(): Promise<void> {
    const usePlatformData = this.platform.name === 'crazygames';
    let local: SaveData | null = null;
    if (!usePlatformData) {
      try {
        local = parseSave(localStorage.getItem(SAVE_KEY));
      } catch (error) {
        console.warn('[Progress] local save unavailable', error);
      }
    }
    const remote = parseSave(await this.platform.loadData(SAVE_KEY));
    this.data = (usePlatformData ? remote : local) ?? defaultSave();
    this.grantStarterIfNeeded();
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
    if (this.platform.name !== 'crazygames') {
      try {
        localStorage.setItem(SAVE_KEY, json);
      } catch (error) {
        console.warn('[Progress] local save unavailable', error);
      }
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
      case 'color':
        return COLORS[id as number] ?? null;
      case 'trail':
        return TRAILS[id as number] ?? null;
      case 'bfx':
        return BULLET_FX[id as number] ?? null;
      case 'weapon':
        return WEAPONS[id as number] ?? null;
      case 'acc':
        return ACCESSORIES[id as number] ?? null;
    }
  }

  owns(kind: ShopKind, id: string | number): boolean {
    const o = this.data.owned as unknown as Record<string, Array<string | number>>;
    return o[OWNED_KEY[kind]].includes(id);
  }

  private grant(kind: ShopKind, id: string | number): void {
    const o = this.data.owned as unknown as Record<string, Array<string | number>>;
    if (!o[OWNED_KEY[kind]].includes(id)) o[OWNED_KEY[kind]].push(id);
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

  equip(kind: ShopKind, id: string | number): boolean {
    if (!this.owns(kind, id)) return false;
    const l = this.data.loadout;
    if (kind === 'char') l.char = id as string;
    else if (kind === 'color') l.color = id as number;
    else if (kind === 'trail') l.trail = id as number;
    else if (kind === 'bfx') l.bfx = id as number;
    else if (kind === 'weapon') l.weapon = id as number;
    else if (kind === 'acc') l.acc = id as number;
    this.data.loadout = sanitizeLoadout(l);
    this.commit();
    return true;
  }

  // ---- skill inventory --------------------------------------------------------

  private uidSeq = 0;

  newUid(): string {
    this.uidSeq += 1;
    return `L${Date.now().toString(36)}${this.uidSeq.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
  }

  /** Adds a skill, merging with a copy you already own. Returns the merged result. */
  addSkill(inst: SkillInstance): SkillDrop {
    const prev = this.skillBySkillId(inst.skillId);
    const r = addToInventory(this.data.skills, inst);
    this.data.skills = r.inv;
    const lvl = r.result.level;
    const d: SkillDrop = {
      skillId: r.result.skillId,
      rank: rankOfId(r.result.skillId),
      merged: r.merged,
      level: lvl,
      prevLevel: prev ? prev.level : lvl,
      copies: r.result.copies,
      nextAt: LEVEL_COPIES[lvl] ?? 0,
    };
    this.skillListeners.forEach((l) => l(d));
    return d;
  }
  private skillListeners: Array<(d: SkillDrop) => void> = [];
  /** Called for every skill gained (new or merged), e.g. to play the merge animation. */
  onSkill(fn: (d: SkillDrop) => void): void {
    this.skillListeners.push(fn);
  }
  /**
   * A skill id for a drop: 35% of the time a copy of a skill you already own (so merging happens often),
   * otherwise a random skill of the rank.
   */
  private pickDropId(rank: Rank, rng: () => number): number {
    const owned = this.data.skills.filter((s) => s.skillId < 1_000_000);
    if (owned.length && rng() < 0.35) return owned[Math.floor(rng() * owned.length)].skillId;
    return randomSkillOfRank(rank, rng);
  }
  /** The duel loadout, or the battle loadout filtered to duel-legal skills when none was set. */
  duelSkillIds(): number[] {
    const own = (id: number) => !!this.skillBySkillId(id) && duelUsable(id);
    const set = this.data.duelSkills.filter(own);
    return set.length ? set : this.data.loadout.skillIds.filter(own).slice(0, 5);
  }
  duelInstances(): SkillInstance[] {
    return this.duelSkillIds()
      .map((id) => this.skillBySkillId(id))
      .filter((s): s is SkillInstance => !!s);
  }
  equipDuelSkills(ids: number[]): { ok: boolean; reason?: string } {
    const clean = Array.from(new Set(ids)).slice(0, 5);
    for (const id of clean) {
      if (!this.skillBySkillId(id)) return { ok: false, reason: 'You do not own that skill' };
      if (!duelUsable(id)) return { ok: false, reason: 'That skill does not work in duels' };
    }
    this.data.duelSkills = clean;
    this.commit();
    return { ok: true };
  }
  /** Wipes all local progress and starts over (the account name stays reserved for you). */
  resetProgress(): void {
    const keepName = this.data.nick;
    this.data = defaultSave();
    this.data.nick = keepName;
    this.grantStarterIfNeeded();
    this.ensureQuests();
    this.commit();
    this.flush();
  }

  skillBySkillId(skillId: number): SkillInstance | undefined {
    return this.data.skills.find((s) => s.skillId === skillId);
  }

  /** The equipped skill instances in slot order. Empty when nothing is equipped. */
  loadoutInstances(): SkillInstance[] {
    const out: SkillInstance[] = [];
    for (const id of this.data.loadout.skillIds) {
      const s = this.skillBySkillId(id);
      if (s) out.push(s);
    }
    return out;
  }

  /** First run: grants the starter pack (one each of B, C, D, E, F) and equips it. Returns the pack when granted. */
  grantStarterIfNeeded(): SkillInstance[] | null {
    const meta = this.data.skillMeta;
    if (meta.starterGiven) return null;
    meta.starterGiven = true;
    const pack = rollStarterPack(Math.random, this.newUid(), 'local', new UniqueRegistry());
    for (const s of pack.skills) this.addSkill({ ...s, uid: this.newUid(), bound: true });
    const ids = pack.skills.map((s) => s.skillId).filter((id) => usableInBattle(id));
    this.data.loadout.skillIds = this.data.skills.length ? ids.slice(0, 5) : [];
    this.starterPack = pack.skills;
    return pack.skills;
  }

  /** Set once when the starter pack was just granted, so the UI can show it. */
  starterPack: SkillInstance[] | null = null;

  dailySkillStatus(): { canClaim: boolean } {
    return { canClaim: this.data.skillMeta.dropDay !== dateKey() };
  }

  /** One free skill drop per day. */
  claimDailySkill(rng: () => number = Math.random): SkillDrop | null {
    if (!this.dailySkillStatus().canClaim) return null;
    this.data.skillMeta.dropDay = dateKey();
    const drop = this.dropSkill('daily', rng);
    this.commit();
    return drop;
  }

  /** A random skill of one rank (lucky draw prizes). */
  grantSkillOfRank(rank: Rank, rng: () => number = Math.random): SkillDrop {
    // Lucky draw and chest prizes: a fresh skill of the rank, or sometimes a copy of one you own of that rank.
    const same = this.data.skills.filter((s) => s.skillId < 1_000_000 && rankOfId(s.skillId) === rank);
    const id = same.length && rng() < 0.35 ? same[Math.floor(rng() * same.length)].skillId : randomSkillOfRank(rank, rng);
    return this.addSkill(makeInstance(id, rng, this.newUid()));
  }
  /** A unique skill you do not own yet (or any unique when you own them all). */
  grantUnique(rng: () => number = Math.random): SkillDrop {
    const missing = UNIQUES.filter((u) => !this.skillBySkillId(uniqueIdOf(u.n)));
    const pool = missing.length ? missing : UNIQUES;
    const u = pool[Math.floor(rng() * pool.length)];
    return this.addSkill(makeInstance(uniqueIdOf(u.n), rng, this.newUid()));
  }
  /** Bonuses from owned out-of-battle skills. They work automatically: no slot needed. */
  get passives(): Passives {
    return totalPassives(this.data.skills);
  }
  private dropSkill(source: DropSource, rng: () => number = Math.random): SkillDrop {
    const pv = this.passives;
    const rank = luckyRank(rollDrop(source, rng), pv.luck, rng);
    const id = this.pickDropId(rank, rng);
    const first = this.addSkill(makeInstance(id, rng, this.newUid()));
    if (rng() * 100 < pv.double) return this.addSkill(makeInstance(id, rng, this.newUid()));
    return first;
  }
  // ---- treasure chests ----------------------------------------------------------
  /** Opens one chest. Returns everything inside so the UI can list it. */
  openChest(kind: ChestKind, rng: () => number = Math.random): { coins: number; items: string[]; drops: SkillDrop[] } | null {
    if (!isChestKind(kind) || this.data.chests[kind] <= 0) return null;
    const def = CHESTS[kind];
    this.data.chests[kind] -= 1;
    const items: string[] = [];
    const coins = Math.round(
      (def.coins[0] + Math.floor(rng() * (def.coins[1] - def.coins[0] + 1))) * (1 + this.passives.coins / 100),
    );
    this.addCoins(coins);
    items.push(`${coins} coins`);
    const drops: SkillDrop[] = [];
    for (let i = 0; i < def.skills; i++) {
      const rank = luckyRank(rollChestRank(def, rng), this.passives.luck, rng);
      const d = rank === 'U' ? this.grantUnique(rng) : this.grantSkillOfRank(rank, rng);
      drops.push(d);
      items.push(`Skill: ${getSkill(d.skillId).name} (${d.rank})${d.merged ? `, merged to level ${d.level}` : ', new!'}`);
    }
    if (rng() * 100 < def.weapon) {
      const w = WEAPONS.find((x) => !this.owns('weapon', x.id));
      if (w) {
        this.grant('weapon', w.id);
        items.push(`Weapon: ${w.name}`);
      }
    }
    if (rng() * 100 < def.acc) {
      const left = ACCESSORIES.filter((x) => !this.owns('acc', x.id));
      if (left.length) {
        const a = left[Math.floor(rng() * left.length)];
        this.grant('acc', a.id);
        items.push(`Accessory: ${a.name}`);
      }
    }
    // Gear (accessories with stats) and fusion stones.
    const gearRank: Rank = kind === 'legend' ? 'S' : kind === 'gold' ? 'A' : kind === 'silver' ? 'C' : 'E';
    const gid = dropGear(this, luckyRank(gearRank, this.passives.luck, rng), rng);
    items.push(`Gear: ${getGear(gid).name} (${getGear(gid).rank})`);
    const stones = { wood: 2, silver: 4, gold: 8, legend: 20 }[kind];
    if (stones) {
      this.data.stones += stones;
      items.push(`${stones} fusion stone(s)`);
    }
    if (kind === 'legend') {
      this.data.eggs += 1;
      items.push('A summon egg');
    }
    this.commit();
    return { coins, items, drops };
  }
  // ---- first run: class and look -------------------------------------------------
  get needsProfile(): boolean {
    return !this.data.profile.cls;
  }
  /** Sets the class, swaps the bound starter skills for the class kit and applies the look. */
  createProfile(clsId: string, look: { nick: string; char: string; color: number; acc: number }, rng: () => number = Math.random): boolean {
    const cls = classById(clsId);
    if (!cls) return false;
    this.data.profile = { ...this.data.profile, cls: cls.id, created: this.data.profile.created || Date.now() };
    this.data.nick = look.nick.slice(0, 16);
    this.data.skills = this.data.skills.filter((s) => !s.bound);
    const ranks: Rank[] = ['B', 'C', 'D', 'E', 'F'];
    const ids: number[] = [];
    ranks.forEach((rank, i) => {
      const kinds = cls.kinds[i];
      let id = randomSkillOfRank(rank, rng);
      for (let t = 0; t < 400 && !kinds.includes(getSkill(id).kind); t++) id = randomSkillOfRank(rank, rng);
      const d = this.addSkill({ ...makeInstance(id, rng, this.newUid()), bound: true });
      ids.push(d.skillId);
    });
    const l = this.data.loadout;
    l.skillIds = Array.from(new Set(ids)).slice(0, 5);
    // The class character and one starter accessory are free.
    this.grant('char', cls.char);
    if (FREE_ACCS.includes(look.acc)) this.grant('acc', look.acc);
    if (this.owns('char', look.char)) l.char = look.char;
    if (this.owns('color', look.color)) l.color = look.color;
    if (this.owns('acc', look.acc)) l.acc = look.acc;
    // Each class gets its signature weapon for free.
    this.grant('weapon', cls.weapon);
    l.weapon = cls.weapon;
    this.data.loadout = sanitizeLoadout(l);
    this.commit();
    return true;
  }
  // ---- champion ---------------------------------------------------------------
  /** The champion kit: Majen's five uniques, passed down to every new champion. */
  championKit(): number[] {
    return this.data.champion.kit.length ? this.data.champion.kit : (BOSS_LEVELS[8].bossKit ?? []);
  }
  canChallengeChampion(): { ok: boolean; reason?: string } {
    if (this.data.champion.isYou) return { ok: false, reason: 'You are the champion' };
    if (this.level.level < CHAMPION_MIN_LEVEL) return { ok: false, reason: `Reach level ${CHAMPION_MIN_LEVEL} to challenge the champion` };
    return { ok: true };
  }
  /** After beating the champion: take one skill of your choice from the champion kit and the crown. */
  claimChampion(skillId: number): SkillDrop | null {
    const kit = this.championKit();
    if (!kit.includes(skillId)) return null;
    const d = this.addSkill(makeInstance(skillId, Math.random, this.newUid()));
    this.data.champion = { name: this.data.nick || 'You', isYou: true, kit, since: Date.now(), defences: 0 };
    this.data.chests.legend += 1;
    this.commit();
    return d;
  }

  /** Equips up to five owned skills by skill id. */
  equipSkills(skillIds: number[]): { ok: boolean; reason?: string } {
    const uids: string[] = [];
    for (const id of skillIds) {
      const s = this.skillBySkillId(id);
      if (!s) return { ok: false, reason: 'You do not own that skill' };
      if (!usableInBattle(id)) return { ok: false, reason: 'That skill only works outside battle' };
      uids.push(s.uid);
    }
    const v = validateLoadout(uids, this.data.skills);
    if (!v.ok) return v;
    this.data.loadout = sanitizeLoadout({ ...this.data.loadout, skillIds });
    this.commit();
    return { ok: true };
  }

  fusionStatus(): { left: number; week: string } {
    const week = weekId(new Date());
    const m = this.data.skillMeta;
    if (m.fusionWeek !== week) {
      m.fusionWeek = week;
      m.fusionsUsed = 0;
    }
    return { left: fusionsLeft(m.fusionsUsed), week };
  }

  /** Fuses two owned skills (once per week). The parents are consumed. */
  fuseSkills(
    uidA: string,
    uidB: string,
    rng: () => number = Math.random,
  ): { ok: boolean; reason?: string; drop?: SkillDrop; upgraded?: boolean } {
    if (this.fusionStatus().left <= 0) return { ok: false, reason: 'You already fused this week' };
    const a = this.data.skills.find((s) => s.uid === uidA);
    const b = this.data.skills.find((s) => s.uid === uidB);
    if (!a || !b) return { ok: false, reason: 'Pick two skills you own' };
    const r = fuse(a, b, rng);
    if (!r.ok || r.skillId === undefined) return { ok: false, reason: r.reason };
    this.data.skills = this.data.skills.filter((s) => s.uid !== a.uid && s.uid !== b.uid);
    this.data.loadout.skillIds = this.data.loadout.skillIds.filter(
      (id) => id !== a.skillId && id !== b.skillId,
    );
    this.data.skillMeta.fusionsUsed += 1;
    const drop = this.addSkill(makeInstance(r.skillId, rng, this.newUid()));
    this.commit();
    return { ok: true, drop, upgraded: r.upgraded };
  }

  /** Mastery experience for skills used in a match. */
  addMastery(uses: Map<number, number>): void {
    for (const [id, n] of uses) {
      const s = this.skillBySkillId(id);
      if (s) s.masteryXp += n * 5;
    }
  }

  // ---- daily reward ---------------------------------------------------------

  dailyStatus(): { canClaim: boolean; nextDay: number; streak: number } {
    const today = dateKey();
    const d = this.data.daily;
    const canClaim = d.last !== today;
    const continuing = d.last === yesterdayKey() || d.last === today;
    const streak = canClaim ? (continuing ? d.streak : 0) : d.streak;
    return { canClaim, nextDay: canClaim ? (streak % 30) + 1 : (d.streak % 30) + 1, streak };
  }

  claimDaily(): { coins: number; day: number; levels: number[]; chest?: ChestKind; extra?: string } | null {
    const st = this.dailyStatus();
    if (!st.canClaim) return null;
    const day = st.nextDay;
    const cal = LOGIN_CALENDAR[day - 1];
    const coins = cal.coins;
    this.data.daily = { last: dateKey(), streak: st.streak + 1 };
    this.addCoins(coins);
    if (cal.chest) this.data.chests[cal.chest] += 1;
    const extra = grantDailyExtra(this, day);
    const levels = this.addXp(30 + day * 5);
    this.commit();
    return { coins, day, levels, chest: cal.chest, extra };
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
    // Quests pay well: coins, XP, fusion stones and a chest (Silver for weekly quests).
    const weekly = this.data.quests.weekList.includes(q);
    this.addCoins(def.coins * 2);
    const levels = this.addXp(def.xp * 2);
    this.data.stones += weekly ? 3 : 1;
    this.data.chests[weekly ? 'silver' : 'wood'] += 1;
    this.commit();
    return { coins: def.coins * 2, levels };
  }

  // ---- lucky draw -----------------------------------------------------------

  spinStatus(): { free: boolean; cost: number; left: number } {
    const sp = this.data.spins;
    const used = sp.day === dateKey() ? sp.used : 0;
    const left = Math.max(0, SPINS_PER_DAY - used);
    return { free: left > 0, cost: EXTRA_SPIN_COST, left };
  }

  /** Picks the result of a spin without paying. Returns the wheel index. */
  rollSpin(rng: () => number = Math.random, wheel: WheelKind = 'coins'): number {
    const list = WHEELS[wheel];
    const total = list.reduce((s, w) => s + w.weight, 0);
    let r = rng() * total;
    for (let i = 0; i < list.length; i++) {
      r -= list[i].weight;
      if (r <= 0) return i;
    }
    return 0;
  }

  /** Pays for a spin. Returns false when a paid spin cannot be afforded. */
  payForSpin(): boolean {
    if (this.spinStatus().free) {
      const today = dateKey();
      if (this.data.spins.day !== today) this.data.spins = { day: today, used: 0 };
      this.data.spins.used += 1;
      this.data.spin.last = today;
      this.commit();
      return true;
    }

    if (this.data.coins < EXTRA_SPIN_COST) return false;
    this.addCoins(-EXTRA_SPIN_COST);
    this.commit();
    return true;
  }

  /** Pays for and grants a batch of draws. Free daily spins are consumed first. */
  spinBatch(
    count: number,
    rng: () => number = Math.random,
    wheel: WheelKind = 'coins',
  ): { ok: boolean; prizes: string[]; reason?: string } {
    const n = Math.max(1, Math.min(100, Math.floor(count)));
    const status = this.spinStatus();
    const free = Math.min(n, status.left);
    const paid = n - free;
    if (this.data.coins < paid * EXTRA_SPIN_COST) {
      return { ok: false, prizes: [], reason: 'Not enough coins for that many spins' };
    }
    if (free > 0) {
      const today = dateKey();
      if (this.data.spins.day !== today) this.data.spins = { day: today, used: 0 };
      this.data.spins.used += free;
      this.data.spin.last = today;
    }
    if (paid > 0) this.data.coins -= paid * EXTRA_SPIN_COST;
    const prizes: string[] = [];
    for (let i = 0; i < n; i++) prizes.push(this.grantPrize(this.rollSpin(rng, wheel), rng, wheel));
    this.commit();
    return { ok: true, prizes };
  }

  /** Grants the prize of the segment. Returns a text describing it. */
  grantPrize(index: number, rng: () => number = Math.random, wheel: WheelKind = 'coins'): string {
    const seg = WHEELS[wheel][index];
    if (seg.kind === 'gear') {
      const id = dropGear(this, luckyRank(RANKS[seg.value], this.passives.luck, rng), rng);
      if (rng() * 100 < this.passives.double) addGear(this, id);
      this.commit();
      return `${getGear(id).name} (${getGear(id).rank})`;
    }
    if (seg.kind === 'egg') {
      this.data.eggs += seg.value;
      this.commit();
      return `${seg.value} summon egg(s)`;
    }
    if (seg.kind === 'stones') {
      this.data.stones += seg.value;
      this.commit();
      return `${seg.value} fusion stone(s)`;
    }
    if (seg.kind === 'weapon' || seg.kind === 'acc') {
      const k: ShopKind = seg.kind;
      if (this.owns(k, seg.value)) {
        this.addCoins(100);
        this.commit();
        return `100 coins (you already own ${seg.label})`;
      }
      this.grant(k, seg.value);
      this.commit();
      return seg.label;
    }
    if (seg.kind === 'coins') {
      this.addCoins(seg.value);
      this.commit();
      return `${seg.value} coins`;
    }
    if (seg.kind === 'skill' || seg.kind === 'unique') {
      const d = seg.kind === 'unique' ? this.grantUnique(rng) : this.grantSkillOfRank(RANKS[seg.value], rng);
      this.commit();
      return `${getSkill(d.skillId).name} (${d.rank})${d.merged ? `, merged to level ${d.level}` : ''}`;
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
    const pv = this.passives;
    coins = Math.round(Math.min(coins, 150) * scale * (1 + pv.coins / 100));
    xp = Math.round(Math.min(xp, 200) * scale * (1 + pv.xp / 100));
    const s = this.data.stats;
    s.matches += 1;
    s.kills += r.kills;
    s.deaths += r.deaths;
    if (r.won) s.wins += 1;
    this.track('rounds', 1);
    if (r.won) this.track('wins', 1);
    if (r.mode === 'hill') this.track('hold', r.score);
    // Every won round pays a chest: Wooden, and a Silver one every 5th win.
    let chest: ChestKind | undefined;
    if (r.won) {
      chest = s.wins % 5 === 0 ? 'silver' : 'wood';
      this.data.chests[chest] += 1;
    }
    this.addCoins(coins);
    const levelsGained = this.addXp(xp);
    const drop = this.dropSkill(r.mode === 'tdm' ? 'team' : 'solo');
    // Fusion stones drop often: 1 per match, 2 for a win, sometimes one more.
    const stones = Math.round(((r.won ? 2 : 1) + (Math.random() < 0.5 ? 1 : 0)) * Math.max(0.5, scale));
    this.data.stones += stones;
    this.commit();
    return { coins, xp, levelsGained, drop, chest, stones };
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
    const tower = level.id >= TOWER_FIRST_ID;
    const xp = prev === 0 ? (tower ? 200 + (level.id - TOWER_FIRST_ID) * 40 : 80 + level.id * 10) : 20;
    const levelsGained = this.addXp(xp);
    // The champion's reward (a skill of your choice from his kit) is claimed with claimChampion().
    const drop = prev === 0 && level.id !== CHAMPION_LEVEL_ID ? this.dropSkill(tower ? 'boss' : 'story') : undefined;
    let bonus = '';
    if (!tower && level.id !== CHAMPION_LEVEL_ID) {
      const mapLevels = LEVELS.filter((x) => x.map === level.map);
      const mapStars = mapLevels.reduce((sum, x) => sum + (this.data.campaign[String(x.id)] ?? 0), 0);
      const claimed = this.data.campaignBonuses[level.map] ?? 0;
      // Map star milestones (10 / 20 / all 33 stars), the same list the map tracker shows.
      const milestones = STAR_MILESTONES.map((m, i) => ({
        stars: m.stars,
        bit: 1 << i,
        reward: m.text,
        grant: () => {
          this.data.chests[m.reward] += 1;
          this.data.stones += m.stones;
          if (m.egg) this.data.eggs += 1;
          if (m.sRank) this.addSkill(makeInstance(randomSkillOfRank('S', Math.random), Math.random, this.newUid()));
        },
      }));
      for (const milestone of milestones) {
        if (mapStars >= milestone.stars && !(claimed & milestone.bit)) {
          milestone.grant();
          this.data.campaignBonuses[level.map] = (this.data.campaignBonuses[level.map] ?? 0) | milestone.bit;
          bonus = bonus ? `${bonus}, ${milestone.reward}` : milestone.reward;
        }

      }
    }
    // Map bosses can drop one of their own unique skills: 12% on the first clear, 2% on replays.
    let unique: SkillDrop | undefined;
    if (level.boss && !tower && level.id !== CHAMPION_LEVEL_ID) {
      const pool = bossUniques(worldOfLevel(level.id).world);
      const pct = prev === 0 ? BOSS_UNIQUE_FIRST : BOSS_UNIQUE_REPEAT;
      if (pool.length && Math.random() * 100 < pct) {
        unique = this.addSkill(makeInstance(pool[Math.floor(Math.random() * pool.length)], Math.random, this.newUid()));
        bonus = bonus ? `${bonus}, UNIQUE skill ${getSkill(unique.skillId).name}!` : `UNIQUE skill ${getSkill(unique.skillId).name}!`;
      }
    }
    // Every win against a boss or a campaign level pays a chest (better on the first clear).
    let chest: ChestKind | undefined;
    if (level.id === CHAMPION_LEVEL_ID) chest = 'legend';
    else if (tower) chest = prev === 0 ? 'gold' : 'silver';
    else chest = prev === 0 ? 'silver' : 'wood';
    if (level.id !== CHAMPION_LEVEL_ID) this.data.chests[chest] += 1;
    // Fusion stones: 2-3 per enemy and 6-8 per boss (20 for Majen), double on the first clear.
    const base = level.id === CHAMPION_LEVEL_ID ? 20 : level.boss || tower ? 6 + Math.floor(Math.random() * 3) : 2 + (Math.random() < 0.5 ? 1 : 0);
    const stones = prev === 0 ? base * 2 : base;
    this.data.stones += stones;
    this.commit();
    return { coins, xp, levelsGained, drop, chest, bonus: bonus || undefined, stones };
  }

  summon(id: number): { ok: boolean; reason?: string } {
    const s = summonById(id);
    if (!s) return { ok: false, reason: 'Unknown summon' };
    if (this.data.summons.owned.includes(id)) return { ok: false, reason: 'Already owned' };
    if (this.data.coins < s.price) return { ok: false, reason: 'Not enough coins' };
    this.data.coins -= s.price;
    this.data.summons.owned.push(id);
    this.data.summons.levels[String(id)] = 1;
    this.commit();
    return { ok: true };
  }

  upgradeSummon(id: number): { ok: boolean; reason?: string; level?: number } {
    const s = summonById(id);
    if (!s || !this.data.summons.owned.includes(id)) return { ok: false, reason: 'Summon is not owned' };
    const level = this.data.summons.levels[String(id)] ?? 1;
    if (level >= 20) return { ok: false, reason: 'Summon is max level' };
    const price = Math.round(s.price * 0.35 * level);
    if (this.data.coins < price) return { ok: false, reason: `Upgrade costs ${price} coins` };
    this.data.coins -= price;
    this.data.summons.levels[String(id)] = level + 1;
    this.commit();
    return { ok: true, level: level + 1 };
  }

  levelUnlocked(level: LevelDef): boolean {
    if (level.id === CHAMPION_LEVEL_ID) return this.canChallengeChampion().ok;
    if (level.id === TOWER_FIRST_ID) return (this.data.campaign[String(TOWER_UNLOCK_LEVEL)] ?? 0) > 0;
    return level.id === 1 || (this.data.campaign[String(level.id - 1)] ?? 0) > 0;
  }
  // ---- 2v2 ranked ---------------------------------------------------------------
  /** Applies a ranked result. opp is the average rating of the other team (bots count as your own rating). */
  recordRanked(won: boolean, opp = this.data.ranked.rating): { rating: number; delta: number; drop?: SkillDrop } {
    const r = this.data.ranked;
    const before = r.rating;
    r.rating = eloUpdate(before, opp, won ? 1 : 0);
    r.best = Math.max(r.best, r.rating);
    r.games += 1;
    if (won) r.wins += 1;
    // Every fifth ranked win pays a ranked drop.
    const drop = won && r.wins % 5 === 0 ? this.dropSkill('ranked') : undefined;
    this.commit();
    return { rating: r.rating, delta: r.rating - before, drop };
  }
  // ---- market (Crowns only) ----------------------------------------------------
  marketDay(now = Date.now()): number {
    return Math.floor(now / 86_400_000);
  }
  /** Today's broker stock with sold-out flags. */
  marketToday(now = Date.now()): Array<MarketOffer & { sold: boolean }> {
    const day = this.marketDay(now);
    const bought = this.data.market.day === day ? this.data.market.bought : [];
    const r = this.data.marketRefresh.day === String(day) ? this.data.marketRefresh.n : 0;
    return marketOffers(day * 101 + r * 7919).map((o, i) => ({ ...o, sold: bought.includes(i) }));
  }
  /** Today's gear stock: one item per slot, new every day and on each refresh. */
  gearOffers(now = Date.now()): Array<{ id: number; price: number; sold: boolean }> {
    const day = this.marketDay(now);
    const bought = this.data.market.day === day ? this.data.market.bought : [];
    const r = this.data.marketRefresh.day === String(day) ? this.data.marketRefresh.n : 0;
    let s = (day * 101 + r * 7919 + 13) >>> 0;
    const rng = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const ranks: Rank[] = ['D', 'D', 'C', 'C', 'B', 'B', 'A', 'S'];
    return GEAR_SLOTS.map((slot, i) => {
      const id = randomGear(ranks[Math.floor(rng() * ranks.length)], rng, slot);
      return { id, price: getGear(id).price, sold: bought.includes(100 + i) };
    });
  }
  buyGearOffer(index: number, now = Date.now()): { ok: boolean; reason?: string } {
    const o = this.gearOffers(now)[index];
    if (!o || o.sold) return { ok: false, reason: 'Sold out' };
    if (this.data.coins < o.price) return { ok: false, reason: `Costs ${o.price} coins` };
    const day = this.marketDay(now);
    if (this.data.market.day !== day) this.data.market = { day, bought: [] };
    this.addCoins(-o.price);
    this.data.market.bought.push(100 + index);
    addGear(this, o.id);
    this.commit();
    return { ok: true };
  }
  /** New market stock for coins (cost grows with each refresh that day). */
  refreshCost(now = Date.now()): number {
    const day = String(this.marketDay(now));
    return 100 * ((this.data.marketRefresh.day === day ? this.data.marketRefresh.n : 0) + 1);
  }
  refreshMarket(now = Date.now()): { ok: boolean; reason?: string } {
    const cost = this.refreshCost(now);
    if (this.data.coins < cost) return { ok: false, reason: `Refreshing costs ${cost} coins` };
    const day = String(this.marketDay(now));
    this.addCoins(-cost);
    this.data.marketRefresh = { day, n: (this.data.marketRefresh.day === day ? this.data.marketRefresh.n : 0) + 1 };
    this.data.market = { day: this.marketDay(now), bought: [] };
    this.commit();
    return { ok: true };
  }
  buyOffer(index: number, now = Date.now()): { ok: boolean; reason?: string; drop?: SkillDrop } {
    const offers = this.marketToday(now);
    const o = offers[index];
    if (!o) return { ok: false, reason: 'No such offer' };
    if (o.sold) return { ok: false, reason: 'Already bought today' };
    if (this.data.coins < o.price) return { ok: false, reason: 'Not enough Crowns' };
    const day = this.marketDay(now);
    if (this.data.market.day !== day) this.data.market = { day, bought: [] };
    this.data.market.bought.push(index);
    this.data.coins -= o.price;
    const drop = this.addSkill(makeInstance(o.skillId, Math.random, this.newUid()));
    this.commit();
    return { ok: true, drop };
  }
  /** Crowns paid for a skill, or 0 when it cannot be sold. */
  sellValue(skillId: number): number {
    const s = this.skillBySkillId(skillId);
    return s && !s.bound ? sellPrice(skillId, s.level) : 0;
  }
  sellSkill(skillId: number): { ok: boolean; reason?: string; coins?: number } {
    const s = this.skillBySkillId(skillId);
    if (!s) return { ok: false, reason: 'You do not own that skill' };
    if (s.bound) return { ok: false, reason: 'Starter skills are bound and cannot be sold' };
    if (this.data.loadout.skillIds.includes(skillId)) return { ok: false, reason: 'Unequip it first' };
    const coins = sellPrice(skillId, s.level);
    this.data.skills = this.data.skills.filter((x) => x !== s);
    this.addCoins(coins);
    this.commit();
    return { ok: true, coins };
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

function rankOfId(id: number): Rank {
  return rankOf(id) ?? 'F';
}

export const LEVEL_COUNT = LEVELS.length;
