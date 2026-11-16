import {
  CREATURE_COST,
  GEAR_SLOTS,
  MAX_CREATURE_LEVEL,
  RANKS,
  creatureUpgradeCost,
  fuse,
  getGear,
  getSkill,
  isGearId,
  levelUpGains,
  playerStats,
  randomGear,
  rollCreature,
  summonById,
  usableInBattle,
  type Bonus,
  type GearSlot,
  type Rank,
} from '@orb/shared';
import type { Progress, SkillDrop } from './economy';

// ---- gear (accessories with stats) -----------------------------------------------------
export function addGear(pr: Progress, id: number): void {
  if (!isGearId(id)) return;
  pr.data.gear.owned.push(id);
  if (pr.data.gear.owned.length > 2000) pr.data.gear.owned.shift();
  // Auto-equip into an empty slot.
  const g = getGear(id);
  if (pr.data.gear.equip[g.slot] === undefined) pr.data.gear.equip[g.slot] = id;
}
export function dropGear(pr: Progress, rank: Rank, rng: () => number = Math.random, slot?: GearSlot): number {
  const id = randomGear(rank, rng, slot);
  addGear(pr, id);
  return id;
}
export function equipGear(pr: Progress, id: number): boolean {
  if (!pr.data.gear.owned.includes(id)) return false;
  pr.data.gear.equip[getGear(id).slot] = id;
  pr.commit();
  return true;
}
export function unequipGear(pr: Progress, slot: GearSlot): void {
  delete pr.data.gear.equip[slot];
  pr.commit();
}
export function equippedGear(pr: Progress): number[] {
  return GEAR_SLOTS.map((s) => pr.data.gear.equip[s]).filter((x): x is number => x !== undefined);
}
export function sellGear(pr: Progress, id: number): number {
  const i = pr.data.gear.owned.indexOf(id);
  if (i < 0) return 0;
  pr.data.gear.owned.splice(i, 1);
  const g = getGear(id);
  if (pr.data.gear.equip[g.slot] === id && !pr.data.gear.owned.includes(id)) delete pr.data.gear.equip[g.slot];
  const coins = Math.round(g.price / 3);
  pr.addCoins(coins);
  pr.commit();
  return coins;
}

// ---- stats --------------------------------------------------------------------------
/** Guild buff last seen from the server (applied offline too). */
let guildBonus: Partial<Bonus> | undefined;
export function setGuildBonus(b: Partial<Bonus> | undefined): void {
  guildBonus = b;
}
/** The guild class buff that applies to your battles (undefined when you have no guild). */
export function getGuildBonus(): Partial<Bonus> | undefined {
  return guildBonus;
}
export function myStats(pr: Progress) {
  const l = pr.data.loadout;
  return playerStats({ level: pr.level.level, gear: equippedGear(pr), trail: l.trail, bfx: l.bfx, guild: guildBonus });
}
export { levelUpGains };

// ---- creature summons ---------------------------------------------------------------
export function hatchCreature(pr: Progress, rng: () => number = Math.random): { ok: boolean; reason?: string; id?: number } {
  if (pr.data.eggs > 0) pr.data.eggs -= 1;
  else if (pr.data.coins >= CREATURE_COST) pr.addCoins(-CREATURE_COST);
  else return { ok: false, reason: `Hatching costs a summon egg or ${CREATURE_COST} coins` };
  const id = rollCreature(rng, pr.passives.luck / 4);
  const uid = pr.newUid();
  pr.data.creatures.list.push({ uid, id, level: 1, cards: [] });
  if (!pr.data.creatures.active) pr.data.creatures.active = uid;
  pr.commit();
  return { ok: true, id };
}
export function upgradeCreature(pr: Progress, uid: string): { ok: boolean; reason?: string } {
  const c = pr.data.creatures.list.find((x) => x.uid === uid);
  if (!c) return { ok: false, reason: 'Unknown summon' };
  if (c.level >= MAX_CREATURE_LEVEL) return { ok: false, reason: 'Max level' };
  const cost = creatureUpgradeCost(c.id, c.level);
  if (pr.data.coins < cost) return { ok: false, reason: `Needs ${cost} coins` };
  pr.addCoins(-cost);
  c.level += 1;
  pr.commit();
  return { ok: true };
}
/** Attaches one of your skill cards to a summon slot (the summon uses it in battle). */
export function attachCard(pr: Progress, uid: string, slot: number, skillId: number, cardSlots: number): { ok: boolean; reason?: string } {
  const c = pr.data.creatures.list.find((x) => x.uid === uid);
  if (!c) return { ok: false, reason: 'Unknown summon' };
  if (slot >= cardSlots) return { ok: false, reason: 'This summon has fewer card slots' };
  if (!pr.skillBySkillId(skillId) || !usableInBattle(skillId)) return { ok: false, reason: 'Pick a battle skill you own' };
  c.cards[slot] = skillId;
  c.cards = c.cards.filter((x) => x !== undefined);
  pr.commit();
  return { ok: true };
}
/** The companion used in casual matches (creature, or one of the shop summons). */
export function activeSummon(pr: Progress): { id: number; level: number; cards: number[] } | undefined {
  const c = pr.data.creatures.list.find((x) => x.uid === pr.data.creatures.active);
  if (c) return { id: c.id, level: c.level, cards: c.cards };
  // Shop summons fight too: map them to a creature of the same family.
  const owned = pr.data.summons.owned[0];
  const s = owned ? summonById(owned) : undefined;
  if (!s) return undefined;
  const fam = { beast: 0, robot: 1, dragon: 2, aquatic: 4, drone: 6 }[s.kind] ?? 0;
  const lvl = pr.data.summons.levels[String(owned)] ?? 1;
  return { id: (fam * 12 + (owned % 12)) * 8 + Math.min(5, Math.floor(s.power / 4)), level: lvl, cards: [] };
}

// ---- fusion (recipes, stones) ----------------------------------------------------------
export const FUSION_COINS = 500;
export const recipeKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;
export function fusionCost(pr: Progress): { free: boolean; stones: number; coins: number } {
  const free = pr.fusionStatus().left > 0;
  return { free, stones: free ? 0 : 1, coins: free ? 0 : FUSION_COINS };
}
/**
 * Fuses two owned skills. The same pair always gives the same result (the recipe is saved and shown to you
 * next time). The result is never lower than the better parent; same-rank pairs sometimes rank up, and
 * a few S + S recipes forge a unique. One fusion a week is free, then each costs 1 stone + 500 coins.
 */
export function fuseV2(pr: Progress, uidA: string, uidB: string): { ok: boolean; reason?: string; drop?: SkillDrop; upgraded?: boolean } {
  const a = pr.data.skills.find((s) => s.uid === uidA);
  const b = pr.data.skills.find((s) => s.uid === uidB);
  if (!a || !b) return { ok: false, reason: 'Pick two skills you own' };
  const r = fuse(a, b);
  if (!r.ok || r.skillId === undefined) return { ok: false, reason: r.reason };
  const cost = fusionCost(pr);
  if (!cost.free && (pr.data.stones < cost.stones || pr.data.coins < cost.coins))
    return { ok: false, reason: `Needs ${cost.stones} fusion stone and ${cost.coins} coins` };
  if (cost.free) pr.data.skillMeta.fusionsUsed += 1;
  else {
    pr.data.stones -= cost.stones;
    pr.addCoins(-cost.coins);
  }
  pr.data.recipes[recipeKey(a.skillId, b.skillId)] = r.skillId;
  pr.data.skills = pr.data.skills.filter((s) => s.uid !== a.uid && s.uid !== b.uid);
  pr.data.loadout.skillIds = pr.data.loadout.skillIds.filter((id) => id !== a.skillId && id !== b.skillId);
  const drop = pr.addSkill({ uid: pr.newUid(), skillId: r.skillId, level: 1, copies: 1, rolls: { power: 1, cooldown: 1, mp: 1, range: 1 }, masteryXp: 0, bound: false });
  pr.commit();
  return { ok: true, drop, upgraded: r.upgraded };
}
export function knownRecipe(pr: Progress, a: number, b: number): number | undefined {
  return pr.data.recipes[recipeKey(a, b)];
}

// ---- daily extras -------------------------------------------------------------------
/** Every login day pays coins plus one extra item, so every day feels worth it. */
export function dailyExtra(day: number): { text: string; kind: 'stones' | 'skill' | 'gear' | 'egg'; n: number; rank: Rank } {
  const ranks: Rank[] = ['E', 'D', 'C', 'B', 'A'];
  const rank = ranks[Math.min(4, Math.floor((day - 1) / 6))];
  switch (day % 4) {
    case 1:
      return { text: `${1 + Math.floor(day / 10)} fusion stone(s)`, kind: 'stones', n: 1 + Math.floor(day / 10), rank };
    case 2:
      return { text: `a rank ${rank} skill`, kind: 'skill', n: 1, rank };
    case 3:
      return { text: `rank ${rank} gear`, kind: 'gear', n: 1, rank };
    default:
      return { text: 'a summon egg', kind: 'egg', n: 1, rank };
  }
}
export function grantDailyExtra(pr: Progress, day: number): string {
  const e = dailyExtra(day);
  if (e.kind === 'stones') pr.data.stones += e.n;
  else if (e.kind === 'egg') pr.data.eggs += e.n;
  else if (e.kind === 'gear') dropGear(pr, e.rank);
  else pr.grantSkillOfRank(e.rank);
  pr.commit();
  return e.text;
}

// ---- encyclopedia: how to get a skill -------------------------------------------------
export function howToGet(skillId: number): string[] {
  const d = getSkill(skillId);
  if (d.unique)
    return [
      'Unique skills are the hardest to get. They are never sold and never on the lucky wheels.',
      'Defeat campaign bosses: each boss has its own set of uniques it can drop (rare).',
      'Beat the champion and choose a skill from the champion kit.',
      'Fuse two S-rank skills: a few recipes forge a unique.',
      'Hold a top 10 world rank for 30 days.',
    ];
  const i = RANKS.indexOf(d.rank);
  const out = ['Drops after matches and campaign levels.'];
  if (i <= 2) out.push('Daily skill drop, lucky draw (Skills wheel), Wooden Chests.');
  if (i >= 2 && i <= 4) out.push('Silver and Gold Chests, the market broker, quests.');
  if (i >= 4) out.push('Gold and Legend Chests, campaign bosses, map star rewards.');
  if (i >= 5) out.push('Fusion of two skills of the rank below (some recipes rank up).');
  if (i === 6) out.push('Legend Chests, world-rank rewards (top 50 for 30 days).');
  return out;
}
