import type { Rank } from './skills/catalog';
import { rankOf, randomSkillOfRank } from './skills/generate';

// ---- quick chat ---------------------------------------------------------------
/**
 * Preset quick-chat lines. Players cannot type free text, so there is nothing to moderate and the game stays
 * safe for every age (CrazyGames can also disable chat, and then these are hidden).
 */
export const EMOTES = [
  'Hi!',
  'Good game!',
  'Nice shot!',
  'Help me!',
  'Follow me',
  'Push now!',
  'Fall back!',
  'Thanks!',
  'Oops!',
  'Well played',
  'Rematch?',
  'GG, Majen!',
] as const;
export const MSG_EMOTE = 'emote';
/** Minimum seconds between two emotes from the same player. */
export const EMOTE_COOLDOWN = 2;
export function isEmoteId(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < EMOTES.length;
}

// ---- 2v2 ranked ---------------------------------------------------------------
export const RANKED_START = 1000;
export interface RankedTier {
  name: string;
  min: number;
  color: number;
}
export const RANKED_TIERS: RankedTier[] = [
  { name: 'Bronze', min: 0, color: 0xc08050 },
  { name: 'Silver', min: 1100, color: 0xc0c8d8 },
  { name: 'Gold', min: 1250, color: 0xffc93c },
  { name: 'Platinum', min: 1400, color: 0x5bf0e0 },
  { name: 'Diamond', min: 1600, color: 0x6ec8ff },
  { name: 'Starforged', min: 1850, color: 0xff4da6 },
];
export function rankedTier(rating: number): RankedTier {
  let t = RANKED_TIERS[0];
  for (const x of RANKED_TIERS) if (rating >= x.min) t = x;
  return t;
}
/** Elo update. `expectedOpp` is the opponent team rating. Returns the new rating (never below 0). */
export function eloUpdate(rating: number, opp: number, result: 1 | 0.5 | 0, k = 32): number {
  const expected = 1 / (1 + Math.pow(10, (opp - rating) / 400));
  return Math.max(0, Math.round(rating + k * (result - expected)));
}

// ---- market (trades for Crowns only) ------------------------------------------
const SELL_BASE: Record<Rank, number> = { F: 5, E: 10, D: 20, C: 40, B: 90, A: 400, S: 2500, U: 20000 };
/** Crowns the broker pays for a skill. Higher levels are worth more. */
export function sellPrice(skillId: number, level = 1): number {
  const r = rankOf(skillId);
  if (!r) return 0;
  return Math.round(SELL_BASE[r] * (1 + (Math.max(1, level) - 1) * 0.25));
}
/** Crowns the broker asks for a level 1 copy. */
export function buyPrice(skillId: number): number {
  return Math.round(sellPrice(skillId, 1) * 3);
}
export interface MarketOffer {
  skillId: number;
  price: number;
}
/** Today's broker stock. The same for every player on the same day; uniques are never sold. */
export function marketOffers(day: number, n = 8): MarketOffer[] {
  let s = (day * 2654435761) >>> 0;
  const rng = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const ranks: Rank[] = ['F', 'E', 'D', 'C', 'C', 'B', 'B', 'A'];
  const out: MarketOffer[] = [];
  for (let i = 0; i < n; i++) {
    const rank = ranks[i % ranks.length];
    const id = randomSkillOfRank(rank, rng);
    out.push({ skillId: id, price: buyPrice(id) });
  }
  return out;
}
