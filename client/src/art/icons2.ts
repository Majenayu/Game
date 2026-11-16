import { GEAR_COLORS, RANK_INFO, RANKS, getCreature, getGear } from '@orb/shared';
import { heroSvg } from './hero';
import { CREATURE_ART, GEAR_ART } from './packs.gen';
import { flPart, frame, giPart, hx, nextId, shade } from './render';

/** Character avatar: the full-body hero (default outfit), inside a card frame. */
export function avatar(charId: string, _color = 0x4dd2ff, gear: number[] = []): string {
  const inner = heroSvg({ char: charId, gear, accent: _color }).replace('<svg ', '<svg x="7" y="2" width="50" height="60" ');
  return frame(inner, '#4a5aa8', '#1b2148');
}

/**
 * Gear: each slot has its own set of real shapes (30 hats, 42 weapons, 25 vehicles, ...). The design picks the
 * shape, the colour paints it with a metal gradient, and the rank sets the frame, the glow and the trim.
 */
export function gearIcon(id: number): string {
  const g = getGear(id);
  const list = GEAR_ART[g.slot] ?? [];
  const art = list[g.design % Math.max(1, list.length)];
  const col = GEAR_COLORS[g.color]?.hex ?? 0x9aa6c8;
  const ri = RANKS.indexOf(g.rank);
  const rank = hx(RANK_INFO[g.rank].color);
  // Designs past the number of shapes get a second style: mirrored with a gem.
  const alt = list.length > 0 && g.design >= list.length;
  const gem = alt ? `<circle cx="32" cy="32" r="4" fill="${rank}" stroke="#fff" stroke-width="1"/>` : '';
  const bg = ri >= 6 ? `<circle cx="32" cy="34" r="24" fill="${rank}" opacity=".18"/>` : '';
  return frame(
    bg + giPart(art ?? 'swap-bag', 8, 9, 48, col, { glow: ri >= 5 ? 2 : 0, flip: alt }) + gem + `<text x="57" y="15" font-size="11" font-weight="800" text-anchor="end" fill="${rank}" stroke="#000" stroke-width=".4">${g.rank}</text>`,
    rank,
  );
}

/**
 * Summons: real creature art (dragons, wolves, robots, merfolk, drones ...). They grow with level: bigger art,
 * an aura from level 10, sparkles from 25, a crown from 40 and a golden halo at the max level.
 */
export function creatureIcon(id: number, level = 1): string {
  const s = getCreature(id);
  const art = CREATURE_ART[s.family]?.[s.species] ?? 'g:paw-print';
  const rank = hx(RANK_INFO[s.rank].color);
  const grow = Math.min(1, (level - 1) / 49);
  const size = 40 + grow * 12;
  const o = (64 - size) / 2;
  const parts: string[] = [];
  const gid = nextId('c');
  if (level >= 10)
    parts.push(`<defs><radialGradient id="${gid}"><stop offset="0" stop-color="${hx(s.color)}" stop-opacity=".8"/><stop offset="1" stop-color="${hx(s.color)}" stop-opacity="0"/></radialGradient></defs><circle cx="32" cy="34" r="${22 + grow * 8}" fill="url(#${gid})"/>`);
  if (level >= 50) parts.push(`<circle cx="32" cy="34" r="27" fill="none" stroke="#ffd54f" stroke-width="2" opacity=".9"/>`);
  parts.push(art.startsWith('g:') ? giPart(art.slice(2), o, o + 2, size, s.color, { glow: level >= 25 ? 2 : 0 }) : flPart(art, o, o + 2, size));
  if (level >= 25) parts.push(`<path d="M10 14 l2 4 l4 1 l-4 1 l-2 4 l-2 -4 l-4 -1 l4 -1 Z M52 46 l1.5 3 l3 1 l-3 1 l-1.5 3 l-1.5 -3 l-3 -1 l3 -1 Z" fill="#fff8c4"/>`);
  if (level >= 40) parts.push(`<path d="M24 10 L28 4 L32 9 L36 4 L40 10 L40 14 L24 14 Z" fill="#ffd54f" stroke="#a0521f" stroke-width="1"/>`);
  parts.push(`<text x="57" y="15" font-size="11" font-weight="800" text-anchor="end" fill="${rank}" stroke="#000" stroke-width=".4">${s.rank}</text>`);
  if (level > 1) parts.push(`<text x="7" y="60" font-size="9" font-weight="800" fill="#fff" stroke="#000" stroke-width=".4">Lv${level}</text>`);
  return frame(parts.join(''), rank, hx(shade(s.color, -0.82)));
}

/** Shop weapons (the six blasters) drawn as real guns. */
const WEAPON_ART = ['ray-gun', 'bolter-gun', 'laser-gun', 'minigun', 'bolter-gun', 'pistol-gun'];
const WEAPON_COL = [0x4dd2ff, 0xff8a3c, 0xb77dff, 0x7dff6b, 0xffc93c, 0xff5e8a];
export function weaponArt(id: number): string {
  return frame(giPart(WEAPON_ART[id] ?? 'ray-gun', 8, 8, 48, WEAPON_COL[id] ?? 0x9aa6c8, { glow: 1.5 }), hx(WEAPON_COL[id] ?? 0x9aa6c8));
}
