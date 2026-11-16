import {
  DEFAULT_LOADOUT,
  RANKED_START,
  isCreatureId,
  isGearId,
  rankOf,
  type ChestKind,
  type Loadout,
  type SkillInstance,
} from '@orb/shared';

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
  owned: {
    chars: string[];
    colors: number[];
    trails: number[];
    bfx: number[];
    weapons: number[];
    accs: number[];
  };
  /** Owned skill instances, one per skill id (duplicates merge automatically). */
  skills: SkillInstance[];
  skillMeta: { dropDay: string; fusionWeek: string; fusionsUsed: number; starterGiven: boolean };
  daily: { last: string; streak: number };
  quests: { day: string; list: QuestState[]; week: string; weekList: QuestState[] };
  spin: { last: string };
  /** Best stars per campaign level id. */
  campaign: Record<string, number>;
  /** Claimed map-star reward milestones, keyed by map id and milestone bit. */
  campaignBonuses: Record<string, number>;
  stats: { kills: number; wins: number; matches: number; deaths: number; coinsCollected: number };
  /** Discovered powerup ids. */
  dex: number[];
  /** 2v2 ranked rating and record. */
  ranked: { rating: number; best: number; games: number; wins: number };
  /** Market: day of the stock the player bought from, and the offer indexes already bought that day. */
  market: { day: number; bought: number[] };
  /** Unopened treasure chests by kind. */
  chests: Record<ChestKind, number>;
  /** Spins used today (10 a day across all wheels). */
  spins: { day: string; used: number };
  /** First-run profile: chosen class (empty until chosen); `registered` = the name is reserved on the server. */
  profile: { cls: string; created: number; registered: boolean; onboarded: boolean };
  /** Separate loadout for ranked 1v1 duels (duel-legal skills only). */
  duelSkills: number[];
  /** The reigning champion as seen on this device, and the kit passed down from Majen. */
  champion: { name: string; isYou: boolean; kit: number[]; since: number; defences: number };
  /** Summons owned by the player and their upgrade levels. */
  summons: { owned: number[]; levels: Record<string, number> };
  /** Gear (accessories with stats): owned item ids (duplicates allowed) and what is equipped per slot. */
  gear: { owned: number[]; equip: Record<string, number> };
  /** Creature summons (carry skill cards). `active` is the uid fighting beside you. */
  creatures: { list: Array<{ uid: string; id: number; level: number; cards: number[] }>; active: string };
  /** Fusion stones and summon eggs. */
  stones: number;
  eggs: number;
  /** Fusion recipes you discovered: "idA-idB" -> result skill id. */
  recipes: Record<string, number>;
  /** Market refreshes bought today. */
  marketRefresh: { day: string; n: number };
  /** Campaign map gifts already opened ("world:node"). */
  mapGifts: string[];
  /** Auction house: your bids in the current round. */
  auction: { round: number; lots: Record<string, { top: number; mine: boolean; name: string }>; claimed: number };
}

/** Bumped to start everyone fresh with the Skill World update. */
export const SAVE_KEY = 'orb.save3';

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
      weapons: [0],
      accs: [0],
    },
    skills: [],
    skillMeta: { dropDay: '', fusionWeek: '', fusionsUsed: 0, starterGiven: false },
    daily: { last: '', streak: 0 },
    quests: { day: '', list: [], week: '', weekList: [] },
    spin: { last: '' },
    campaign: {},
    campaignBonuses: {},
    stats: { kills: 0, wins: 0, matches: 0, deaths: 0, coinsCollected: 0 },
    dex: [],
    ranked: { rating: RANKED_START, best: RANKED_START, games: 0, wins: 0 },
    market: { day: 0, bought: [] },
    chests: { wood: 0, silver: 0, gold: 0, legend: 0 },
    spins: { day: '', used: 0 },
    profile: { cls: '', created: 0, registered: false, onboarded: false },
    duelSkills: [],
    champion: { name: 'Majen', isYou: false, kit: [], since: 0, defences: 0 },
    summons: { owned: [], levels: {} },
    gear: { owned: [], equip: {} },
    creatures: { list: [], active: '' },
    stones: 3,
    eggs: 1,
    recipes: {},
    marketRefresh: { day: '', n: 0 },
    auction: { round: 0, lots: {}, claimed: 0 },
    mapGifts: [],
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
        weapons: Array.from(new Set([...d.owned.weapons, ...nums(owned.weapons, [])])),
        accs: Array.from(new Set([...d.owned.accs, ...nums(owned.accs, [])])),
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
      campaignBonuses: Object.fromEntries(
        Object.entries((j.campaignBonuses ?? {}) as Record<string, unknown>).filter(
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
      ranked: {
        rating: Math.max(0, Math.round(num(j.ranked?.rating, RANKED_START))),
        best: Math.max(0, Math.round(num(j.ranked?.best, RANKED_START))),
        games: Math.max(0, Math.floor(num(j.ranked?.games, 0))),
        wins: Math.max(0, Math.floor(num(j.ranked?.wins, 0))),
      },
      market: {
        day: Math.max(0, Math.floor(num(j.market?.day, 0))),
        bought: nums(j.market?.bought, []).filter((n) => n >= 0 && n < 32),
      },
      chests: {
        wood: Math.max(0, Math.floor(num(j.chests?.wood, 0))),
        silver: Math.max(0, Math.floor(num(j.chests?.silver, 0))),
        gold: Math.max(0, Math.floor(num(j.chests?.gold, 0))),
        legend: Math.max(0, Math.floor(num(j.chests?.legend, 0))),
      },
      spins: { day: String(j.spins?.day ?? ''), used: Math.max(0, Math.floor(num(j.spins?.used, 0))) },
      profile: {
        cls: typeof j.profile?.cls === 'string' ? j.profile.cls.slice(0, 16) : '',
        created: num(j.profile?.created, 0),
        registered: j.profile?.registered === true,
        onboarded: j.profile?.onboarded === true,
      },
      duelSkills: nums(j.duelSkills, []).slice(0, 5),
      champion: {
        name: typeof j.champion?.name === 'string' ? j.champion.name.slice(0, 16) : 'Majen',
        isYou: j.champion?.isYou === true,
        kit: nums(j.champion?.kit, []).filter((n) => !!rankOf(n)).slice(0, 5),
        since: num(j.champion?.since, 0),
        defences: Math.max(0, Math.floor(num(j.champion?.defences, 0))),
      },
      summons: {
        owned: Array.from(new Set(nums(j.summons?.owned, []))).filter((n) => n > 0 && n < 1000),
        levels: Object.fromEntries(
          Object.entries((j.summons?.levels ?? {}) as Record<string, unknown>)
            .filter(([k, v]) => /^\d+$/.test(k) && typeof v === 'number')
            .map(([k, v]) => [k, Math.max(1, Math.min(20, Math.floor(v as number)))]),
        ),
      },
      gear: {
        owned: nums(j.gear?.owned, []).filter(isGearId).slice(0, 2000),
        equip: Object.fromEntries(
          Object.entries((j.gear?.equip ?? {}) as Record<string, unknown>).filter(([k, v]) => /^[a-z]+$/.test(k) && isGearId(v)),
        ) as Record<string, number>,
      },
      creatures: {
        list: (Array.isArray(j.creatures?.list) ? j.creatures.list : [])
          .filter((c: any) => c && typeof c.uid === 'string' && isCreatureId(c.id))
          .slice(0, 300)
          .map((c: any) => ({
            uid: String(c.uid).slice(0, 40),
            id: c.id as number,
            level: Math.max(1, Math.min(50, Math.floor(num(c.level, 1)))),
            cards: nums(c.cards, []).filter((n) => !!rankOf(n)).slice(0, 2),
          })),
        active: typeof j.creatures?.active === 'string' ? j.creatures.active.slice(0, 40) : '',
      },
      stones: Math.max(0, Math.floor(num(j.stones, 3))),
      eggs: Math.max(0, Math.floor(num(j.eggs, 1))),
      recipes: Object.fromEntries(
        Object.entries((j.recipes ?? {}) as Record<string, unknown>).filter(([k, v]) => /^\d+-\d+$/.test(k) && typeof v === 'number' && !!rankOf(v)),
      ) as Record<string, number>,
      marketRefresh: { day: String(j.marketRefresh?.day ?? ''), n: Math.max(0, Math.floor(num(j.marketRefresh?.n, 0))) },
    mapGifts: Array.isArray(j.mapGifts) ? (j.mapGifts as unknown[]).filter((x): x is string => typeof x === 'string' && /^\d:\d+$/.test(x)).slice(0, 64) : [],
    auction: {
      round: Math.max(0, Math.floor(num(j.auction?.round, 0))),
      claimed: Math.max(0, Math.floor(num(j.auction?.claimed, 0))),
      lots: Object.fromEntries(
        Object.entries((j.auction?.lots ?? {}) as Record<string, { top?: unknown; mine?: unknown; name?: unknown }>)
          .filter(([k]) => /^[0-3]$/.test(k))
          .map(([k, v]) => [k, { top: Math.max(0, Math.floor(num(v?.top, 0))), mine: v?.mine === true, name: String(v?.name ?? '').slice(0, 16) }]),
      ),
    },
    };
  } catch {
    return null;
  }
}
