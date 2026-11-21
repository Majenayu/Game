import { CLASSES } from './classes';
import { emptyBonus, type Bonus } from './progression';

/** Guilds have at most 5 members. */
export const GUILD_MAX = 5;
/** Guild level from guild XP (ranked wins, raids, wars). */
export function guildLevel(xp: number): number {
  return Math.min(50, 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 150)));
}
export function guildXpFor(level: number): number {
  return (level - 1) * (level - 1) * 150;
}
/** What each class adds to the whole guild (percent, per member, at guild level 1). */
export const CLASS_BUFF: Record<string, Partial<Bonus>> = {
  warrior: { attack: 3 },
  mage: { spAttack: 3 },
  assassin: { speed: 1.5, aim: 2 },
  guardian: { defence: 3, hp: 1 },
  summoner: { mp: 3, spAttack: 1 },
  gunner: { reload: 3 },
};
export interface GuildBuffInfo {
  bonus: Bonus;
  /** Lines to show before a battle. */
  lines: string[];
}
/**
 * The guild buff from the classes of its members. Five different classes unlock "Harmony" (+all stats);
 * five of the same class unlock that class's "Legion" (its buff doubled). Everything grows with guild level.
 */
export function guildBuff(classes: string[], level: number): GuildBuffInfo {
  const b = emptyBonus();
  const lines: string[] = [];
  const scale = 1 + (Math.max(1, level) - 1) * 0.06;
  const count = new Map<string, number>();
  for (const c of classes) if (CLASS_BUFF[c]) count.set(c, (count.get(c) ?? 0) + 1);
  for (const [c, n] of count) {
    const def = CLASS_BUFF[c];
    for (const [k, v] of Object.entries(def)) b[k as keyof Bonus] += (v as number) * n * scale;
    const name = CLASSES.find((x) => x.id === c)?.name ?? c;
    lines.push(`${name} x${n}: ${Object.entries(def).map(([k, v]) => `+${Math.round((v as number) * n * scale * 10) / 10}% ${k}`).join(', ')}`);
  }
  if (count.size >= 5) {
    for (const k of Object.keys(b) as Array<keyof Bonus>) b[k] += 3 * scale;
    lines.push(`Harmony (5 different classes): +${Math.round(3 * scale * 10) / 10}% to every stat`);
  } else if (classes.length >= 5 && count.size === 1) {
    const [c] = count.keys();
    for (const [k, v] of Object.entries(CLASS_BUFF[c])) b[k as keyof Bonus] += (v as number) * 5 * scale;
    lines.push(`Legion (5 of one class): the ${c} buff is doubled`);
  }
  for (const k of Object.keys(b) as Array<keyof Bonus>) b[k] = Math.round(b[k] * 10) / 10;
  if (lines.length) lines.unshift(`Guild level ${level}`);
  return { bonus: b, lines };
}
