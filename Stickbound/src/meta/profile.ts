// The player's profile: avatars (each levels on its own), squad, coins, unlocks, stats, streak, quests,
// Champion Road, Zombie Survival and Ranked Ladder progress. Pure data and rules, unit-tested.

import { ELEMENT_IDS, type ElementId } from '../content/elements';
import { DEFAULT_LOOK, lookFromSeed, type Look } from '../content/looks';
import { comboLenFor, MAX_LEVEL, PERK_LEVELS, PERKS, pgWindowFor, ranksFor, stickSpec } from '../sim/stats';
import type { FighterSpec } from '../sim/types';
import { ARCHETYPE_IDS, POWER_UNLOCK_LEVELS, powersFor, type Archetype } from '../content/powers';
import { SaveError, type Schema } from './save';

export const PROFILE_VERSION = 3;
export const START_SLOTS = 10;
export const MAX_SLOTS = 20;

export interface Avatar {
  id: string;
  name: string;
  element: ElementId;
  /** fighting style: decides the avatar's 3 powers */
  archetype: Archetype;
  level: number;
  xp: number;
  look: Look;
  /** chosen perk id per tier (15, 30, 45) */
  perks: (string | null)[];
  wins: number;
  losses: number;
}

export interface QuestState {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface Profile {
  version: number;
  name: string;
  created: number;
  coins: number;
  playerXp: number;
  avatars: Avatar[];
  squad: string[];
  slots: number;
  unlocked: ElementId[];
  owned: string[];
  tutorialDone: boolean;
  stats: { wins: number; losses: number; matches: number; kos: number; falls: number; roundsWon: number; bestStreak: number; curStreak: number; powerUse: Record<string, number> };
  streak: { last: string; days: number; claimed: string };
  quests: { day: string; daily: QuestState[]; week: string; weekly: QuestState[] };
  champion: { cleared: number[]; seen: string[] };
  zombie: { best: number; bestKills: number; runs: { wave: number; kills: number; date: string }[] };
  ranked: { rating: number; season: string; peak: number; history: { opp: string; win: boolean; delta: number; date: string }[]; matches: number };
  nextId: number;
}

// ---- schema -----------------------------------------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export const PROFILE_SCHEMA: Schema<Profile> = {
  version: PROFILE_VERSION,
  migrations: {
    // v1 had no fighting styles: avatars of the same element get different styles in roster order, so a squad of
    // two same-element starters ends up with two different power sets.
    1: (d) => {
      const seen: Record<string, number> = {};
      const avatars = (Array.isArray(d.avatars) ? d.avatars : []) as Record<string, unknown>[];
      for (const a of avatars) {
        const el = String(a.element);
        const n = seen[el] ?? 0;
        seen[el] = n + 1;
        if (!ARCHETYPE_IDS.includes(a.archetype as Archetype)) a.archetype = ARCHETYPE_IDS[n % ARCHETYPE_IDS.length];
      }
      return { ...d, avatars, version: 2 };
    },
    // v2 looks had no suit pattern or hand effect (visual overhaul): both start at none
    2: (d) => {
      const avatars = (Array.isArray(d.avatars) ? d.avatars : []) as Record<string, unknown>[];
      for (const a of avatars) {
        const look = a.look as Record<string, unknown> | undefined;
        if (look && typeof look === 'object') {
          if (typeof look.suit !== 'number') look.suit = 0;
          if (typeof look.hand !== 'number') look.hand = 0;
        }
      }
      return { ...d, avatars, version: 3 };
    },
  },
  validate: (d) => {
    if (!isObj(d) || d.version !== PROFILE_VERSION) throw new SaveError('bad profile version');
    if (!Array.isArray(d.avatars) || !Array.isArray(d.squad) || typeof d.coins !== 'number') throw new SaveError('bad profile');
    for (const a of d.avatars as Avatar[]) {
      if (!ELEMENT_IDS.includes(a.element) || !Number.isInteger(a.level) || a.level < 1 || a.level > MAX_LEVEL) throw new SaveError('bad avatar');
      if (!ARCHETYPE_IDS.includes(a.archetype)) throw new SaveError('bad avatar style');
    }
    return d as unknown as Profile;
  },
};

// ---- dates (outside the sim, so Date is fine) --------------------------------------------------------------------

export const dayKey = (t = Date.now()): string => new Date(t).toISOString().slice(0, 10);
export const weekKey = (t = Date.now()): string => {
  const d = new Date(t);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
};
export const seasonKey = (t = Date.now()): string => new Date(t).toISOString().slice(0, 7);

// ---- names --------------------------------------------------------------------------------------------------

const SYL_A = ['Ka', 'Ri', 'Zo', 'Mi', 'Ta', 'Bo', 'Lu', 'Ve', 'Sa', 'Ny', 'Jo', 'Ru', 'Fe', 'Do', 'Ki'];
const SYL_B = ['ro', 'zen', 'mo', 'ka', 'lix', 'dan', 'ti', 'vo', 'rin', 'sha', 'po', 'gu', 'ne', 'tor', 'by'];

export function randomName(seed: number): string {
  let s = seed >>> 0;
  const r = (n: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s % n;
  };
  return SYL_A[r(SYL_A.length)]! + SYL_B[r(SYL_B.length)]!;
}

/** Allowed name characters: letters, digits, space, apostrophe, hyphen; 1 to 12 characters. */
export function cleanName(raw: string): string {
  const c = raw.normalize('NFC').replace(/[^\p{L}\p{N} '\-]/gu, '').replace(/\s+/g, ' ').trim();
  return [...c].slice(0, 12).join('');
}

// ---- creation -----------------------------------------------------------------------------------------------

export function newProfile(name = 'Player', now = Date.now()): Profile {
  return {
    version: PROFILE_VERSION,
    name,
    created: now,
    coins: 150,
    playerXp: 0,
    avatars: [],
    squad: [],
    slots: START_SLOTS,
    unlocked: [],
    owned: [],
    tutorialDone: false,
    stats: { wins: 0, losses: 0, matches: 0, kos: 0, falls: 0, roundsWon: 0, bestStreak: 0, curStreak: 0, powerUse: {} },
    streak: { last: '', days: 0, claimed: '' },
    quests: { day: '', daily: [], week: '', weekly: [] },
    champion: { cleared: [], seen: [] },
    zombie: { best: 0, bestKills: 0, runs: [] },
    ranked: { rating: 1000, season: seasonKey(now), peak: 1000, history: [], matches: 0 },
    nextId: 1,
  };
}

export function addAvatar(p: Profile, element: ElementId, name?: string, look?: Look, archetype?: Archetype): Avatar | null {
  if (p.avatars.length >= p.slots) return null;
  if (!p.unlocked.includes(element)) return null;
  const id = `a${p.nextId++}`;
  const a: Avatar = { id, name: cleanName(name ?? '') || randomName(p.nextId * 977 + p.created), element, archetype: archetype ?? suggestArchetype(p, element), level: 1, xp: 0, look: look ?? lookFromSeed(p.nextId * 31 + p.created), perks: [null, null, null], wins: 0, losses: 0 };
  p.avatars.push(a);
  if (p.squad.length < 2) p.squad.push(id);
  return a;
}

/** First run: the free starter element, two avatars of it so the squad of 2 is complete from the start. */
export function chooseStarter(p: Profile, element: ElementId): void {
  if (!p.unlocked.includes(element)) p.unlocked.push(element);
  if (p.avatars.length === 0) {
    addAvatar(p, element, undefined, { ...DEFAULT_LOOK, hat: 1 }, 'classic');
    addAvatar(p, element, undefined, { ...DEFAULT_LOOK, hat: 2, back: 0, eyes: 1, body: 1 }, 'striker');
  }
}

export const avatarById = (p: Profile, id: string) => p.avatars.find((a) => a.id === id);

/** The style a new avatar of this element should default to: the one the roster has least of. */
export function suggestArchetype(p: Profile, element: ElementId): Archetype {
  const count = (a: Archetype) => p.avatars.filter((x) => x.element === element && x.archetype === a).length;
  return [...ARCHETYPE_IDS].sort((a, b) => count(a) - count(b))[0]!;
}

/** True when the two squad avatars would have exactly the same 3 powers. */
export function squadClash(p: Profile): boolean {
  const [a, b] = squadAvatars(p);
  return !!a && !!b && a.element === b.element && a.archetype === b.archetype;
}

export function squadAvatars(p: Profile): Avatar[] {
  return p.squad.map((id) => avatarById(p, id)).filter((a): a is Avatar => !!a);
}

export function specFor(a: Avatar, ranked = false): FighterSpec {
  return stickSpec(a.name, a.element, a.level, a.perks.filter((x): x is string => !!x), ranked, a.id, a.archetype);
}

// ---- XP and levels --------------------------------------------------------------------------------------------

/** XP needed to go from `level` to `level + 1`. About 12 hours of play reach 50 on one avatar. */
export const xpToNext = (level: number): number => 100 + level * 40;

export interface LevelUp {
  avatar: string;
  from: number;
  to: number;
  unlocks: string[];
  perkTier: number | null;
}

export function unlocksAt(element: ElementId, level: number, archetype: Archetype = 'classic'): string[] {
  const set = powersFor(element, archetype);
  const out: string[] = [];
  POWER_UNLOCK_LEVELS.forEach((l, i) => level === l && out.push(`New power: ${set[i]!.name}`));
  const before = ranksFor(level - 1);
  const now = ranksFor(level);
  now.forEach((r, i) => r > before[i]! && before[i]! > 0 && out.push(`${set[i]!.name} rank ${r}`));
  if (comboLenFor(level) > comboLenFor(level - 1)) out.push(`Basic combo: ${comboLenFor(level)} hits`);
  if (pgWindowFor(level) > pgWindowFor(level - 1)) out.push('Wider perfect-guard window');
  if (level === 30) out.push('Element shield: take less damage from powers');
  if (level % 5 === 0) out.push('Stronger basic attack, defense, special attack and special defense');
  if ((PERK_LEVELS as readonly number[]).includes(level)) out.push('Choose a perk');
  return out;
}

export function giveXp(a: Avatar, xp: number): LevelUp | null {
  if (a.level >= MAX_LEVEL) return null;
  const from = a.level;
  a.xp += xp;
  const unlocks: string[] = [];
  let perkTier: number | null = null;
  while (a.level < MAX_LEVEL && a.xp >= xpToNext(a.level)) {
    a.xp -= xpToNext(a.level);
    a.level++;
    unlocks.push(...unlocksAt(a.element, a.level, a.archetype));
    const t = (PERK_LEVELS as readonly number[]).indexOf(a.level);
    if (t >= 0) perkTier = t;
  }
  if (a.level >= MAX_LEVEL) a.xp = 0;
  return a.level > from ? { avatar: a.id, from, to: a.level, unlocks, perkTier } : null;
}

export function choosePerk(a: Avatar, tier: number, perkId: string): boolean {
  const perk = PERKS.find((p) => p.id === perkId);
  if (!perk || perk.tier !== tier || a.level < PERK_LEVELS[tier]!) return false;
  a.perks[tier] = perkId;
  return true;
}

export function pendingPerk(a: Avatar): number | null {
  for (let t = 0; t < 3; t++) if (a.level >= PERK_LEVELS[t]! && !a.perks[t]) return t;
  return null;
}

// ---- player level and tiers ------------------------------------------------------------------------------------

export const TIERS = ['Rookie', 'Fighter', 'Veteran', 'Elite', 'Legend'];

export function playerLevel(xp: number): { level: number; into: number; need: number; tier: string } {
  let level = 1;
  let rest = xp;
  while (rest >= 200 + level * 60) {
    rest -= 200 + level * 60;
    level++;
  }
  return { level, into: rest, need: 200 + level * 60, tier: TIERS[Math.min(4, Math.floor((level - 1) / 10))]! };
}

/** More roster slots by playing: +1 every 5 player levels, up to 20. */
export function slotsFor(p: Profile): number {
  return Math.max(p.slots, Math.min(MAX_SLOTS, START_SLOTS + Math.floor(playerLevel(p.playerXp).level / 5)));
}

// ---- streak -----------------------------------------------------------------------------------------------------

export const STREAK_REWARDS = [50, 75, 100, 125, 150, 200, 400];

/** Call on each visit. Returns the reward available today (0 if already claimed). */
export function touchStreak(p: Profile, now = Date.now()): number {
  const today = dayKey(now);
  if (p.streak.last !== today) {
    const yesterday = dayKey(now - 86_400_000);
    p.streak.days = p.streak.last === yesterday ? (p.streak.days % 7) + 1 : 1;
    p.streak.last = today;
  }
  return p.streak.claimed === today ? 0 : STREAK_REWARDS[p.streak.days - 1]!;
}

export function claimStreak(p: Profile, now = Date.now()): number {
  const r = touchStreak(p, now);
  if (r > 0) {
    p.coins += r;
    p.streak.claimed = dayKey(now);
  }
  return r;
}

// ---- quests -----------------------------------------------------------------------------------------------------

export type QuestKey = 'win' | 'play' | 'powers' | 'hits' | 'perfect' | 'swaps' | 'zombieWave' | 'champion' | 'damage' | 'ranked';

export interface QuestDef {
  id: string;
  key: QuestKey;
  text: string;
  target: number;
  coins: number;
  xp: number;
}

export const DAILY_POOL: QuestDef[] = [
  { id: 'd_win2', key: 'win', text: 'Win 2 fights', target: 2, coins: 60, xp: 120 },
  { id: 'd_play3', key: 'play', text: 'Play 3 fights', target: 3, coins: 40, xp: 90 },
  { id: 'd_pow15', key: 'powers', text: 'Use 15 powers', target: 15, coins: 50, xp: 100 },
  { id: 'd_hits60', key: 'hits', text: 'Land 60 hits', target: 60, coins: 50, xp: 100 },
  { id: 'd_pg3', key: 'perfect', text: 'Make 3 perfect guards', target: 3, coins: 70, xp: 120 },
  { id: 'd_swap6', key: 'swaps', text: 'Tag swap 6 times', target: 6, coins: 40, xp: 90 },
  { id: 'd_zw5', key: 'zombieWave', text: 'Reach wave 5 in Zombie Survival', target: 5, coins: 60, xp: 120 },
  { id: 'd_champ1', key: 'champion', text: 'Win a Champion Road fight', target: 1, coins: 60, xp: 120 },
  { id: 'd_dmg3k', key: 'damage', text: 'Deal 3,000 damage', target: 3000, coins: 50, xp: 100 },
];

export const WEEKLY_POOL: QuestDef[] = [
  { id: 'w_win12', key: 'win', text: 'Win 12 fights', target: 12, coins: 250, xp: 500 },
  { id: 'w_pow80', key: 'powers', text: 'Use 80 powers', target: 80, coins: 200, xp: 400 },
  { id: 'w_pg15', key: 'perfect', text: 'Make 15 perfect guards', target: 15, coins: 250, xp: 500 },
  { id: 'w_zw10', key: 'zombieWave', text: 'Reach wave 10 in Zombie Survival', target: 10, coins: 250, xp: 500 },
  { id: 'w_champ5', key: 'champion', text: 'Win 5 Champion Road fights', target: 5, coins: 250, xp: 500 },
  { id: 'w_rank5', key: 'ranked', text: 'Play 5 Ranked Ladder matches', target: 5, coins: 200, xp: 400 },
  { id: 'w_dmg20k', key: 'damage', text: 'Deal 20,000 damage', target: 20000, coins: 200, xp: 400 },
];

export const questDef = (id: string) => [...DAILY_POOL, ...WEEKLY_POOL].find((q) => q.id === id);

function pick(pool: QuestDef[], n: number, seed: number): QuestState[] {
  const ids = pool.map((q) => q.id);
  const out: QuestState[] = [];
  let s = seed >>> 0;
  while (out.length < n && ids.length) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    out.push({ id: ids.splice(s % ids.length, 1)[0]!, progress: 0, claimed: false });
  }
  return out;
}

export function refreshQuests(p: Profile, now = Date.now()): void {
  const d = dayKey(now);
  const w = weekKey(now);
  if (p.quests.day !== d) p.quests = { ...p.quests, day: d, daily: pick(DAILY_POOL, 3, hash(d)) };
  if (p.quests.week !== w) p.quests = { ...p.quests, week: w, weekly: pick(WEEKLY_POOL, 5, hash(w) ^ 77) };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function addQuestProgress(p: Profile, key: QuestKey, amount: number, absolute = false): void {
  for (const q of [...p.quests.daily, ...p.quests.weekly]) {
    const def = questDef(q.id);
    if (!def || def.key !== key || q.claimed) continue;
    q.progress = absolute ? Math.max(q.progress, amount) : q.progress + amount;
  }
}

export function claimQuest(p: Profile, id: string): QuestDef | null {
  const q = [...p.quests.daily, ...p.quests.weekly].find((x) => x.id === id);
  const def = questDef(id);
  if (!q || !def || q.claimed || q.progress < def.target) return null;
  q.claimed = true;
  p.coins += def.coins;
  p.playerXp += def.xp;
  return def;
}

// ---- ranked ladder ----------------------------------------------------------------------------------------------

export const RANK_TIERS = [
  { name: 'Bronze', min: 0 },
  { name: 'Silver', min: 1100 },
  { name: 'Gold', min: 1250 },
  { name: 'Platinum', min: 1400 },
  { name: 'Diamond', min: 1550 },
  { name: 'Champion', min: 1700 },
];

export const rankTier = (rating: number) => [...RANK_TIERS].reverse().find((t) => rating >= t.min)!;

export function eloDelta(mine: number, theirs: number, win: boolean, k = 32): number {
  const expected = 1 / (1 + Math.pow(10, (theirs - mine) / 400));
  return Math.round(k * ((win ? 1 : 0) - expected));
}

/** New month: half of the distance to 1000 is kept, and a reward is paid for last season's tier. */
export function checkSeason(p: Profile, now = Date.now()): number {
  const s = seasonKey(now);
  if (p.ranked.season === s) return 0;
  const tierIdx = RANK_TIERS.indexOf(rankTier(p.ranked.rating));
  const reward = p.ranked.matches > 0 ? 100 + tierIdx * 120 : 0;
  p.coins += reward;
  p.ranked = { ...p.ranked, season: s, rating: Math.round(1000 + (p.ranked.rating - 1000) / 2), matches: 0, history: [] };
  return reward;
}

export interface Rival {
  name: string;
  rating: number;
  elements: [ElementId, ElementId];
  difficulty: number;
}

const RIVAL_NAMES = ['Dex Volta', 'Tess Quickstep', 'Tova Swift', 'Kai Rook', 'Sena Hart', 'Rex Calder', 'Ivy Marsh', 'Otto Grim', 'Lena Frost', 'Zane Arc', 'Pia Lark', 'Cole Brand', 'Nia Storm', 'Hugo Drift', 'Yara Peak', 'Finn Vale', 'Rhea Stone', 'Max Pulse', 'Ada Flint', 'Leo Gale', 'Suki Reed', 'Omar Crest', 'Taro Bolt', 'Rina Sol', 'Ben Thorn'];

/** AI ranked rivals. Ratings drift a little each day (deterministic), so the board moves. */
export function rivals(now = Date.now()): Rival[] {
  const day = Math.floor(now / 86_400_000);
  return RIVAL_NAMES.map((name, i) => {
    const h = hash(name);
    const base = 900 + (h % 900);
    const drift = ((Math.imul(h ^ day, 2654435761) >>> 0) % 60) - 30;
    const rating = base + drift;
    return {
      name,
      rating,
      elements: [ELEMENT_IDS[h % 10]!, ELEMENT_IDS[(h >>> 4) % 10]!] as [ElementId, ElementId],
      difficulty: Math.max(1, Math.min(5, Math.floor((rating - 850) / 180) + 1 + (i % 2))),
    };
  }).sort((a, b) => b.rating - a.rating);
}

export function pickRival(p: Profile, now = Date.now()): Rival {
  const list = rivals(now);
  return list.reduce((best, r) => (Math.abs(r.rating - p.ranked.rating) < Math.abs(best.rating - p.ranked.rating) ? r : best), list[0]!);
}

// ---- shop ------------------------------------------------------------------------------------------------------

export const SLOT_PRICE = 500;
export const ELEMENT_PRICE = 800;

export function buy(p: Profile, key: string, price: number): boolean {
  if (p.coins < price || p.owned.includes(key)) return false;
  p.coins -= price;
  p.owned.push(key);
  return true;
}

export function unlockElement(p: Profile, el: ElementId, viaCoins: boolean): boolean {
  if (p.unlocked.includes(el)) return false;
  if (viaCoins) {
    if (p.coins < ELEMENT_PRICE) return false;
    p.coins -= ELEMENT_PRICE;
  }
  p.unlocked.push(el);
  return true;
}

// ---- match results -------------------------------------------------------------------------------------------

export interface MatchSummary {
  mode: 'ranked' | 'champion' | 'zombie' | 'training' | 'local' | 'tutorial' | 'practice';
  win: boolean;
  roundsWon: number;
  kos: number;
  falls: number;
  hits: number;
  powers: number;
  perfect: number;
  swaps: number;
  damage: number;
  wave?: number;
  powerUse: Record<string, number>;
}

export interface Rewards {
  xp: number;
  coins: number;
  levelUps: LevelUp[];
  ratingDelta?: number;
}

export function applyMatch(p: Profile, s: MatchSummary, squad: Avatar[], opts: { xpMul?: number; coinsBonus?: number } = {}): Rewards {
  const base =
    s.mode === 'zombie' ? 40 + (s.wave ?? 0) * 25 : s.mode === 'training' ? 30 : s.mode === 'practice' ? (s.win ? 90 : 50) : s.mode === 'local' ? 60 : s.win ? 260 : 120;
  const xp = Math.round(base * (opts.xpMul ?? 1));
  const coins = (s.mode === 'zombie' ? (s.wave ?? 0) * 6 : s.mode === 'training' || s.mode === 'local' ? 5 : s.win ? 40 : 15) + (opts.coinsBonus ?? 0);
  p.coins += coins;
  p.playerXp += Math.round(xp / 2);
  const levelUps: LevelUp[] = [];
  for (const a of squad) {
    const lu = giveXp(a, xp);
    if (lu) levelUps.push(lu);
    if (s.mode !== 'training' && s.mode !== 'zombie') s.win ? a.wins++ : a.losses++;
  }
  if (s.mode !== 'training' && s.mode !== 'local' && s.mode !== 'zombie') {
    const st = p.stats;
    st.matches++;
    if (s.win) {
      st.wins++;
      st.curStreak++;
      st.bestStreak = Math.max(st.bestStreak, st.curStreak);
    } else {
      st.losses++;
      st.curStreak = 0;
    }
    st.roundsWon += s.roundsWon;
    addQuestProgress(p, 'play', 1);
    if (s.win) addQuestProgress(p, 'win', 1);
  }
  p.stats.kos += s.kos;
  p.stats.falls += s.falls;
  for (const [k, v] of Object.entries(s.powerUse)) p.stats.powerUse[k] = (p.stats.powerUse[k] ?? 0) + v;
  addQuestProgress(p, 'powers', s.powers);
  addQuestProgress(p, 'hits', s.hits);
  addQuestProgress(p, 'perfect', s.perfect);
  addQuestProgress(p, 'swaps', s.swaps);
  addQuestProgress(p, 'damage', s.damage);
  if (s.mode === 'zombie' && s.wave) addQuestProgress(p, 'zombieWave', s.wave, true);
  if (s.mode === 'champion' && s.win) addQuestProgress(p, 'champion', 1);
  if (s.mode === 'ranked') addQuestProgress(p, 'ranked', 1);
  return { xp, coins, levelUps };
}

export function favoritePower(p: Profile): string | null {
  const e = Object.entries(p.stats.powerUse).sort((a, b) => b[1] - a[1])[0];
  return e ? e[0] : null;
}
