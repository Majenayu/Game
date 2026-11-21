import { getGear, getSkill, makeInstance, randomGear, randomSkillOfRank, type Rank } from '@orb/shared';
import type { Progress } from './economy';
import { addGear } from './inventory';

/**
 * The auction house: every 20 minutes four new lots go up. Bot bidders compete with you; each has a hidden
 * limit per lot. Bid above it and you lead; bid below and a bot outbids you at once (your coins come back).
 * When the round ends, every lot you lead is yours.
 */
export const AUCTION_ROUND_MS = 20 * 60 * 1000;
export const AUCTION_LOTS = 4;
const BIDDERS = ['Kairo', 'Velma', 'Draxx', 'Nimue', 'Orrin', 'Sable', 'Tamsin', 'Vex', 'Juno', 'Rook', 'Ilsa', 'Brann'];

export interface AuctionLot {
  index: number;
  kind: 'skill' | 'gear' | 'egg' | 'stones';
  /** Skill id or gear id; egg / stone count for the others. */
  item: number;
  name: string;
  rank: Rank;
  start: number;
  /** The highest bid right now. */
  top: number;
  topName: string;
  mine: boolean;
  /** Smallest bid that is accepted. */
  next: number;
}
export interface AuctionSave {
  round: number;
  lots: Record<string, { top: number; mine: boolean; name: string }>;
  claimed: number;
}
export const emptyAuction = (): AuctionSave => ({ round: 0, lots: {}, claimed: 0 });

function rngFor(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const roundOf = (now: number) => Math.floor(now / AUCTION_ROUND_MS);

/** The fixed contents of a round's lots (the same for every player in that round). */
function baseLots(round: number): Array<Omit<AuctionLot, 'top' | 'topName' | 'mine' | 'next'> & { limit: number }> {
  const rng = rngFor(round * 7919 + 17);
  const ranks: Rank[] = ['B', 'A', 'A', 'S', 'S'];
  return Array.from({ length: AUCTION_LOTS }, (_, index) => {
    const roll = rng();
    const rank = ranks[Math.floor(rng() * ranks.length)];
    const mul = { F: 1, E: 1, D: 1, C: 1, B: 1, A: 2.2, S: 5, U: 12 }[rank];
    if (roll < 0.55) {
      const id = randomSkillOfRank(rank, rng);
      const start = Math.round(400 * mul);
      return { index, kind: 'skill' as const, item: id, name: getSkill(id).name, rank, start, limit: Math.round(start * (1.3 + rng() * 1.2)) };
    }
    if (roll < 0.85) {
      const id = randomGear(rank, rng);
      const start = Math.round(getGear(id).price * 0.8);
      return { index, kind: 'gear' as const, item: id, name: getGear(id).name, rank, start, limit: Math.round(start * (1.2 + rng())) };
    }
    if (roll < 0.95) {
      const n = 1 + Math.floor(rng() * 3);
      return { index, kind: 'egg' as const, item: n, name: `${n} summon egg${n > 1 ? 's' : ''}`, rank: 'A' as Rank, start: 250 * n, limit: Math.round(250 * n * (1.3 + rng())) };
    }
    const n = 10 + Math.floor(rng() * 20);
    return { index, kind: 'stones' as const, item: n, name: `${n} fusion stones`, rank: 'A' as Rank, start: 30 * n, limit: Math.round(30 * n * (1.3 + rng())) };
  });
}

/** Pays out lots you won in earlier rounds and starts the current round. Returns what you won. */
export function settleAuction(pr: Progress, now = Date.now()): string[] {
  const a = pr.data.auction;
  const round = roundOf(now);
  const won: string[] = [];
  if (a.round && a.round !== round && a.claimed !== a.round) {
    const lots = baseLots(a.round);
    for (const l of lots) {
      const st = a.lots[String(l.index)];
      if (!st?.mine) continue;
      won.push(l.name);
      if (l.kind === 'skill') pr.addSkill(makeInstance(l.item, Math.random, pr.newUid()));
      else if (l.kind === 'gear') addGear(pr, l.item);
      else if (l.kind === 'egg') pr.data.eggs += l.item;
      else pr.data.stones += l.item;
    }
    a.claimed = a.round;
  }
  if (a.round !== round) {
    a.round = round;
    a.lots = {};
    pr.commit();
  }
  return won;
}

/** The lots of the current round, with bot bids that climb as the round goes on. */
export function auctionLots(pr: Progress, now = Date.now()): { lots: AuctionLot[]; endsIn: number } {
  settleAuction(pr, now);
  const round = roundOf(now);
  const passed = (now % AUCTION_ROUND_MS) / AUCTION_ROUND_MS;
  const lots = baseLots(round).map((l) => {
    const st = pr.data.auction.lots[String(l.index)];
    const rng = rngFor(round * 31 + l.index);
    // Bots bid up over time, to at most 75% of their limit before you join in.
    const botTop = Math.round(l.start + (l.limit * 0.75 - l.start) * Math.min(1, passed * 1.3));
    const botName = BIDDERS[Math.floor(rng() * BIDDERS.length)];
    const top = st ? Math.max(st.top, st.mine ? 0 : botTop) : botTop;
    const mine = !!st?.mine;
    return { ...l, top, topName: mine ? 'You' : st?.name ?? botName, mine, next: Math.ceil(top * 1.1) };
  });
  return { lots, endsIn: AUCTION_ROUND_MS - (now % AUCTION_ROUND_MS) };
}

/** Places a bid. Coins are held while you lead and refunded if a bot outbids you. */
export function placeBid(pr: Progress, index: number, amount: number, now = Date.now()): { ok: boolean; reason?: string; outbid?: string } {
  const { lots } = auctionLots(pr, now);
  const l = lots[index];
  if (!l) return { ok: false, reason: 'No such lot' };
  if (l.mine) return { ok: false, reason: 'You already lead this lot' };
  amount = Math.floor(amount);
  if (amount < l.next) return { ok: false, reason: `Bid at least ${l.next}` };
  if (pr.data.coins < amount) return { ok: false, reason: 'Not enough coins' };
  const limit = baseLots(roundOf(now))[index].limit;
  const key = String(index);
  if (amount >= limit) {
    pr.addCoins(-amount);
    pr.data.auction.lots[key] = { top: amount, mine: true, name: 'You' };
    pr.commit();
    return { ok: true };
  }
  // A bot outbids you right away; nothing is spent.
  const rng = rngFor(amount + index * 977);
  const name = BIDDERS[Math.floor(rng() * BIDDERS.length)];
  const counter = Math.min(limit, Math.ceil(amount * (1.05 + rng() * 0.1)));
  pr.data.auction.lots[key] = { top: counter, mine: false, name };
  pr.commit();
  return { ok: true, outbid: `${name} bid ${counter}` };
}
