import { DEFAULT_LOADOUT, rankOf, type Loadout, type SkillInstance } from '@orb/shared';

export interface QuestState {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface SaveData {
  v: 2;
  updated: number;
  nick: string;
  coins: number;
  xp: number;
  loadout: Loadout;
  owned: { chars: string[]; colors: number[]; trails: number[]; bfx: number[] };
  /** Owned skill instances, one per skill id (duplicates merge automatically). */
  skills: SkillInstance[];
  skillMeta: { dropDay: string; fusionWeek: string; fusionsUsed: number; starterGiven: boolean };
  daily: { last: string; streak: number };
  quests: { day: string; list: QuestState[]; week: string; weekList: QuestState[] };
  spin: { last: string };
  /** Best stars per campaign level id. */
  campaign: Record<string, number>;
  stats: { kills: number; wins: number; matches: number; deaths: number; coinsCollected: number };
  /** Discovered powerup ids. */
  dex: number[];
}

export const SAVE_KEY = 'orb.save2';

export function defaultSave(): SaveData {
  return {
    v: 2,
    updated: 0,
    nick: '',
    coins: 100,
    xp: 0,
    loadout: { ...DEFAULT_LOADOUT, skillIds: [] },
    owned: {
      chars: ['nova'],
      colors: [0, 1, 2, 3, 4, 5, 6, 7],
      trails: [0],
      bfx: [0],
    },
    skills: [],
    skillMeta: { dropDay: '', fusionWeek: '', fusionsUsed: 0, starterGiven: false },
    daily: { last: '', streak: 0 },
    quests: { day: '', list: [], week: '', weekList: [] },
    spin: { last: '' },
    campaign: {},
    stats: { kills: 0, wins: 0, matches: 0, deaths: 0, coinsCollected: 0 },
    dex: [],
  };
}

const nums = (v: unknown, d: number[]): number[] =>
  Array.isArray(v) ? v.filter((x) => Number.isInteger(x)) : d;
const strs = (v: unknown, d: string[]): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string') : d;
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);

function quests(v: unknown): QuestState[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((q) => q && typeof q.id === 'string')
    .map((q) => ({
      id: String(q.id),
      progress: Math.max(0, num(q.progress, 0)),
      claimed: q.claimed === true,
    }));
}

/** Keeps only well-formed skill instances, one per skill id. */
function instances(v: unknown): SkillInstance[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<number>();
  const out: SkillInstance[] = [];
  for (const s of v) {
    if (!s || typeof s !== 'object' || typeof s.uid !== 'string' || !Number.isInteger(s.skillId)) continue;
    if (!rankOf(s.skillId) || seen.has(s.skillId)) continue;
    const r = s.rolls ?? {};
    seen.add(s.skillId);
    out.push({
      uid: s.uid.slice(0, 40),
      skillId: s.skillId,
      level: Math.min(20, Math.max(1, Math.floor(num(s.level, 1)))),
      copies: Math.max(1, Math.floor(num(s.copies, 1))),
      rolls: {
        power: num(r.power, 1),
        cooldown: num(r.cooldown, 1),
        mp: num(r.mp, 1),
        range: num(r.range, 1),
      },
      masteryXp: Math.max(0, num(s.masteryXp, 0)),
      bound: s.bound === true,
    });
  }
  return out;
}
/** Merges untrusted stored JSON onto the defaults so missing or damaged fields never crash the game. */
export function parseSave(raw: string | null | undefined): SaveData | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Record<string, any>;
    if (!j || typeof j !== 'object') return null;
    const d = defaultSave();
    const owned = (j.owned ?? {}) as Record<string, unknown>;
    return {
      v: 2,
      updated: num(j.updated, 0),
      nick: typeof j.nick === 'string' ? j.nick.slice(0, 16) : '',
      coins: Math.max(0, Math.floor(num(j.coins, d.coins))),
      xp: Math.max(0, Math.floor(num(j.xp, 0))),
      loadout: { ...d.loadout, ...(j.loadout ?? {}), skillIds: nums(j.loadout?.skillIds, []).slice(0, 5) },
      owned: {
        chars: Array.from(new Set([...d.owned.chars, ...strs(owned.chars, [])])),
        colors: Array.from(new Set([...d.owned.colors, ...nums(owned.colors, [])])),
        trails: Array.from(new Set([...d.owned.trails, ...nums(owned.trails, [])])),
        bfx: Array.from(new Set([...d.owned.bfx, ...nums(owned.bfx, [])])),
      },
      skills: instances(j.skills),
      skillMeta: {
        dropDay: String(j.skillMeta?.dropDay ?? ''),
        fusionWeek: String(j.skillMeta?.fusionWeek ?? ''),
        fusionsUsed: Math.max(0, Math.floor(num(j.skillMeta?.fusionsUsed, 0))),
        starterGiven: j.skillMeta?.starterGiven === true,
      },
      daily: { last: String(j.daily?.last ?? ''), streak: Math.max(0, num(j.daily?.streak, 0)) },
      quests: {
        day: String(j.quests?.day ?? ''),
        list: quests(j.quests?.list),
        week: String(j.quests?.week ?? ''),
        weekList: quests(j.quests?.weekList),
      },
      spin: { last: String(j.spin?.last ?? '') },
      campaign: Object.fromEntries(
        Object.entries((j.campaign ?? {}) as Record<string, unknown>).filter(
          ([, v]) => typeof v === 'number',
        ),
      ) as Record<string, number>,
      stats: {
        kills: num(j.stats?.kills, 0),
        wins: num(j.stats?.wins, 0),
        matches: num(j.stats?.matches, 0),
        deaths: num(j.stats?.deaths, 0),
        coinsCollected: num(j.stats?.coinsCollected, 0),
      },
      dex: Array.from(new Set(nums(j.dex, []))).filter((n) => n >= 0 && n < 1008),
    };
  } catch {
    return null;
  }
}
