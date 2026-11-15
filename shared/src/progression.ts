/**
 * Player levels (1 to 1000) and combat stats. Every level raises HP, mana, attack, defence, speed, reload,
 * aim and special attack a little. Gear, trails, bullets, guild buffs and the class add on top.
 * The match simulation reads a CombatStats object; the UI shows the same numbers.
 */
export const MAX_PLAYER_LEVEL = 1000;

/** Stat sheet as shown to the player (Pokemon style: Max HP, Attack, Defence...). */
export interface StatSheet {
  hp: number;
  mp: number;
  attack: number;
  defence: number;
  spAttack: number;
  speed: number;
  reload: number;
  aim: number;
}
export const STAT_LABELS: Record<keyof StatSheet, string> = {
  hp: 'Max HP',
  mp: 'Mana',
  attack: 'Attack',
  defence: 'Defence',
  spAttack: 'Sp. Attack',
  speed: 'Speed',
  reload: 'Reload',
  aim: 'Aim',
};
export const STAT_KEYS = Object.keys(STAT_LABELS) as Array<keyof StatSheet>;

/** Base sheet at a level (before gear and buffs). Grows a little every level. */
export function levelSheet(level: number): StatSheet {
  const l = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(level))) - 1;
  return {
    hp: Math.round(300 + l * 2.2),
    mp: Math.round(100 + l * 0.3),
    attack: Math.round(50 + l * 0.35),
    defence: Math.round(30 + l * 0.3),
    spAttack: Math.round(50 + l * 0.4),
    speed: Math.round(100 + l * 0.02),
    reload: Math.round(100 + l * 0.04),
    aim: Math.round(60 + l * 0.03),
  };
}
/** What one level up gives (for the level-up panel). */
export function levelUpGains(newLevel: number): StatSheet {
  const a = levelSheet(newLevel - 1);
  const b = levelSheet(newLevel);
  const out = {} as StatSheet;
  for (const k of STAT_KEYS) out[k] = b[k] - a[k];
  return out;
}

/** Percent bonuses from gear, cosmetics and guild (all additive). */
export interface Bonus {
  hp: number;
  mp: number;
  attack: number;
  defence: number;
  spAttack: number;
  speed: number;
  reload: number;
  aim: number;
}
export const emptyBonus = (): Bonus => ({ hp: 0, mp: 0, attack: 0, defence: 0, spAttack: 0, speed: 0, reload: 0, aim: 0 });
export function addBonus(a: Bonus, b: Partial<Bonus>, scale = 1): Bonus {
  for (const k of STAT_KEYS) a[k] += (b[k] ?? 0) * scale;
  return a;
}
/** The final sheet: level sheet times (1 + bonus%). */
export function finalSheet(level: number, bonus: Bonus): StatSheet {
  const s = levelSheet(level);
  const out = {} as StatSheet;
  for (const k of STAT_KEYS) out[k] = Math.round(s[k] * (1 + Math.max(-50, bonus[k]) / 100));
  return out;
}

/** Multipliers the match uses, derived from a sheet. */
export interface CombatStats {
  /** Max HP in hit points. */
  maxHp: number;
  maxMp: number;
  /** Bullet damage multiplier. */
  atkMul: number;
  /** Skill damage multiplier. */
  skillMul: number;
  /** Share of damage ignored (0 to 0.75). */
  defPct: number;
  spdMul: number;
  reloadMul: number;
  /** Aim assist: 0 to 0.5 (bullets curve slightly toward targets). */
  aim: number;
}
export function combatFromSheet(s: StatSheet): CombatStats {
  return {
    maxHp: s.hp,
    maxMp: s.mp,
    atkMul: s.attack / 50,
    skillMul: s.spAttack / 50,
    // Level 1 defence (30) blocks nothing; each point above it blocks a little more.
    defPct: Math.min(0.75, Math.max(0, s.defence - 30) / (Math.max(0, s.defence - 30) + 250)),
    spdMul: Math.min(1.6, s.speed / 100),
    reloadMul: Math.min(2.5, s.reload / 100),
    aim: Math.min(0.5, Math.max(0, (s.aim - 60) / 400)),
  };
}
export const DEFAULT_COMBAT: CombatStats = combatFromSheet(levelSheet(1));
