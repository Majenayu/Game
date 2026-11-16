import { GEAR_COLORS, RANKS, getGear, isGearId, type GearSlot } from '@orb/shared';
import type { Progress } from '../meta/economy';
import { equippedGear } from '../meta/inventory';
import { GEAR_ART } from './packs.gen';
import { giPart, hx, nextId, shade } from './render';

/**
 * Character engine: a full-body hero built from parts (body, skin, face, hair, armour, pants, shoes, gloves, hat,
 * bag, weapon and vehicle). Every character has its own body, face and hair; every gear piece changes the look
 * (design = shape, colour = paint, rank = trim and glow), so each outfit combination looks different.
 */
export interface HeroLook {
  char: string;
  /** Equipped gear ids. */
  gear: number[];
  /** WEAPONS id (used when no sword-slot gear is equipped). */
  weapon?: number;
  /** Accent colour (loadout colour). */
  accent?: number;
}

interface Body {
  skin: number;
  hair: number;
  hairStyle: 'long' | 'spiky' | 'beard' | 'mohawk' | 'hood' | 'ponytail' | 'buzz';
  outfit: number;
  width: number;
  eyes: 'round' | 'sharp' | 'calm' | 'visor';
}
const BODIES: Record<string, Body> = {
  nova: { skin: 0xf2c6a0, hair: 0x8a5cff, hairStyle: 'long', outfit: 0x4dd2ff, width: 1, eyes: 'round' },
  bolt: { skin: 0xe8b48a, hair: 0xffe14d, hairStyle: 'spiky', outfit: 0xffb300, width: 1, eyes: 'sharp' },
  titan: { skin: 0xc98a5e, hair: 0x3a2a1a, hairStyle: 'beard', outfit: 0x8c97ad, width: 1.25, eyes: 'calm' },
  viper: { skin: 0xf0c8a8, hair: 0x35e07a, hairStyle: 'mohawk', outfit: 0x2e7d32, width: 1, eyes: 'sharp' },
  ghost: { skin: 0xdfe4f5, hair: 0x2a2f4a, hairStyle: 'hood', outfit: 0x2a2f4a, width: 0.92, eyes: 'visor' },
  medic: { skin: 0xffd9b8, hair: 0xff6fae, hairStyle: 'ponytail', outfit: 0xf4f6ff, width: 0.96, eyes: 'round' },
  sniper: { skin: 0x8d5a3b, hair: 0x1b1b1b, hairStyle: 'buzz', outfit: 0x6b7a3a, width: 1.05, eyes: 'calm' },
};
const WEAPON_ART = ['ray-gun', 'bolter-gun', 'laser-gun', 'minigun', 'bolter-gun', 'pistol-gun'];

type Piece = { design: number; color: number; rank: number; art: string };
function pieces(ids: number[]): Partial<Record<GearSlot, Piece>> {
  const out: Partial<Record<GearSlot, Piece>> = {};
  for (const id of ids) {
    if (!isGearId(id)) continue;
    const g = getGear(id);
    const list = GEAR_ART[g.slot] ?? [];
    out[g.slot] = {
      design: g.design,
      color: GEAR_COLORS[g.color]?.hex ?? 0x9aa6c8,
      rank: RANKS.indexOf(g.rank),
      art: list[g.design % Math.max(1, list.length)] ?? '',
    };
  }
  return out;
}
const rankTrim = (r: number) => [0x6b7280, 0x8bc34a, 0x4dd2ff, 0x3d7bff, 0xb77dff, 0xffc93c, 0xff5e8a, 0xfff2a8][Math.max(0, Math.min(7, r))];

function hair(b: Body, hc: string, dark: string): string {
  switch (b.hairStyle) {
    case 'long':
      return `<path d="M31 32 Q31 12 50 12 Q69 12 69 32 L72 58 Q64 50 64 36 Q50 26 36 36 Q36 50 28 58 Z" fill="${hc}" stroke="${dark}" stroke-width="1"/>`;
    case 'spiky':
      return `<path d="M32 30 L30 14 L39 21 L42 8 L49 19 L56 7 L60 20 L69 12 L68 30 Q50 20 32 30 Z" fill="${hc}" stroke="${dark}" stroke-width="1"/>`;
    case 'beard':
      return `<path d="M33 28 Q34 15 50 15 Q66 15 67 28 Q50 22 33 28 Z" fill="${hc}"/><path d="M35 38 Q37 54 50 55 Q63 54 65 38 Q60 46 50 46 Q40 46 35 38 Z" fill="${hc}" stroke="${dark}" stroke-width="1"/>`;
    case 'mohawk':
      return `<path d="M45 24 L46 6 L50 3 L54 6 L55 24 Z" fill="${hc}" stroke="${dark}" stroke-width="1"/><path d="M34 30 Q36 22 45 21 L55 21 Q64 22 66 30 Q50 25 34 30 Z" fill="${hc}" opacity=".5"/>`;
    case 'hood':
      return `<path d="M28 40 Q26 10 50 9 Q74 10 72 40 L66 52 L66 34 Q50 22 34 34 L34 52 Z" fill="${hc}" stroke="${dark}" stroke-width="1.2"/>`;
    case 'ponytail':
      return `<path d="M32 30 Q33 14 50 14 Q67 14 68 30 Q58 22 50 24 Q42 22 32 30 Z" fill="${hc}" stroke="${dark}" stroke-width="1"/><path d="M66 22 Q80 28 74 50 Q70 40 64 30 Z" fill="${hc}" stroke="${dark}" stroke-width="1"/>`;
    default:
      return `<path d="M33 28 Q34 16 50 16 Q66 16 67 28 Q50 23 33 28 Z" fill="${hc}"/>`;
  }
}
function eyes(b: Body): string {
  switch (b.eyes) {
    case 'sharp':
      return `<path d="M39 34 L46 32 L46 36 Z M61 34 L54 32 L54 36 Z" fill="#1b1030"/><path d="M38 30 L46 31 M62 30 L54 31" stroke="#1b1030" stroke-width="1.6"/>`;
    case 'calm':
      return `<rect x="40" y="32" width="6" height="3.2" rx="1.6" fill="#1b1030"/><rect x="54" y="32" width="6" height="3.2" rx="1.6" fill="#1b1030"/><path d="M39 29 L47 29 M53 29 L61 29" stroke="#1b1030" stroke-width="1.8"/>`;
    case 'visor':
      return `<rect x="36" y="30" width="28" height="8" rx="4" fill="#ff1744" opacity=".9"/><rect x="38" y="31.5" width="24" height="2" rx="1" fill="#fff" opacity=".6"/>`;
    default:
      return `<circle cx="43" cy="34" r="3.6" fill="#1b1030"/><circle cx="57" cy="34" r="3.6" fill="#1b1030"/><circle cx="42" cy="32.6" r="1.3" fill="#fff"/><circle cx="56" cy="32.6" r="1.3" fill="#fff"/>`;
  }
}

/** Full-body hero picture (SVG string, viewBox 100 x 120). */
export function heroSvg(look: HeroLook, opts: { cls?: string } = {}): string {
  const b = BODIES[look.char] ?? BODIES.nova;
  const pc = pieces(look.gear);
  const id = nextId('h');
  const skin = hx(b.skin);
  const skinD = hx(shade(b.skin, -0.25));
  const hc = hx(b.hair);
  const dark = hx(shade(b.hair, -0.5));
  const w = b.width;
  const cx = 50;
  // ---- colours of each part ----
  const armor = pc.armor;
  const torsoCol = armor ? armor.color : b.outfit;
  const pantsCol = pc.pants ? pc.pants.color : shade(b.outfit, -0.45);
  const shoeCol = pc.shoes ? pc.shoes.color : 0x3a2f2a;
  const gloveCol = pc.gloves ? pc.gloves.color : b.skin;
  const best = Math.max(-1, ...Object.values(pc).map((p) => p!.rank));
  const parts: string[] = [];
  // aura for high-rank outfits
  if (best >= 5)
    parts.push(
      `<ellipse cx="50" cy="66" rx="${34 + best * 2}" ry="54" fill="url(#${id}a)" opacity=".55"/><defs><radialGradient id="${id}a"><stop offset="0" stop-color="${hx(rankTrim(best))}" stop-opacity=".9"/><stop offset="1" stop-color="${hx(rankTrim(best))}" stop-opacity="0"/></radialGradient></defs>`,
    );
  // vehicle under the hero
  if (pc.vehicle?.art) parts.push(giPart(pc.vehicle.art, 14, 84, 72, pc.vehicle.color, { glow: pc.vehicle.rank >= 5 ? 2 : 0 }));
  parts.push(`<ellipse cx="50" cy="112" rx="${22 * w}" ry="5" fill="#000" opacity=".35"/>`);
  // bag behind the body
  if (pc.bag?.art) parts.push(giPart(pc.bag.art, 58, 48, 30, pc.bag.color));
  // cape / robe for some armour designs (behind)
  const ad = armor?.design ?? -1;
  if (ad >= 0 && ad % 5 === 2) parts.push(`<path d="M${cx - 18 * w} 52 L${cx + 18 * w} 52 L${cx + 26 * w} 104 L${cx - 26 * w} 104 Z" fill="${hx(shade(torsoCol, -0.35))}"/>`);
  // legs and pants
  const legW = 9 * w;
  const pd = pc.pants?.design ?? 0;
  parts.push(
    `<rect x="${cx - 2 - legW}" y="80" width="${legW}" height="24" rx="4" fill="${hx(pantsCol)}" stroke="${hx(shade(pantsCol, -0.5))}" stroke-width="1"/>`,
    `<rect x="${cx + 2}" y="80" width="${legW}" height="24" rx="4" fill="${hx(pantsCol)}" stroke="${hx(shade(pantsCol, -0.5))}" stroke-width="1"/>`,
  );
  if (pc.pants) {
    if (pd % 3 === 0) parts.push(`<path d="M${cx - 2 - legW} 90 h${legW} M${cx + 2} 90 h${legW} M${cx - 2 - legW} 96 h${legW} M${cx + 2} 96 h${legW}" stroke="${hx(rankTrim(pc.pants.rank))}" stroke-width="1.6"/>`);
    if (pd % 3 === 1) parts.push(`<rect x="${cx - 3 - legW}" y="86" width="${legW + 2}" height="7" rx="3" fill="${hx(shade(pantsCol, 0.3))}"/><rect x="${cx + 1}" y="86" width="${legW + 2}" height="7" rx="3" fill="${hx(shade(pantsCol, 0.3))}"/>`);
    if (pd % 3 === 2) parts.push(`<path d="M${cx - 20 * w} 80 L${cx + 20 * w} 80 L${cx + 22 * w} 94 L${cx - 22 * w} 94 Z" fill="${hx(shade(pantsCol, 0.15))}" stroke="${hx(rankTrim(pc.pants.rank))}" stroke-width="1"/>`);
  }
  // shoes (design changes the shape: boots, sneakers, armoured)
  const sd = pc.shoes?.design ?? 0;
  const shoeH = sd % 3 === 0 ? 10 : sd % 3 === 1 ? 6 : 12;
  for (const sx of [cx - 3 - legW, cx + 1]) {
    parts.push(`<path d="M${sx} ${110 - shoeH} h${legW + 2} v${shoeH - 2} q0 4 ${sd % 2 ? 5 : 3} 4 h-${legW + (sd % 2 ? 7 : 5)} q-1 0 -1 -2 Z" fill="${hx(shoeCol)}" stroke="${hx(shade(shoeCol, -0.55))}" stroke-width="1"/>`);
    if (pc.shoes && pc.shoes.rank >= 4) parts.push(`<path d="M${sx + 1} ${108 - shoeH} h${legW}" stroke="${hx(rankTrim(pc.shoes.rank))}" stroke-width="2"/>`);
  }
  // torso and armour
  const tw = 22 * w;
  parts.push(
    `<defs><linearGradient id="${id}t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hx(shade(torsoCol, 0.35))}"/><stop offset="1" stop-color="${hx(shade(torsoCol, -0.3))}"/></linearGradient></defs>`,
    `<path d="M${cx - tw} 54 Q${cx} 46 ${cx + tw} 54 L${cx + tw - 3} 84 Q${cx} 88 ${cx - tw + 3} 84 Z" fill="url(#${id}t)" stroke="${hx(shade(torsoCol, -0.6))}" stroke-width="1.2"/>`,
  );
  if (armor) {
    const trim = hx(rankTrim(armor.rank));
    switch (ad % 5) {
      case 0: // plates
        parts.push(`<path d="M${cx - tw + 3} 64 Q${cx} 60 ${cx + tw - 3} 64 M${cx - tw + 3} 72 Q${cx} 68 ${cx + tw - 3} 72" stroke="${trim}" stroke-width="2" fill="none"/>`);
        break;
      case 1: // chest emblem
        parts.push(`<path d="M${cx} 58 L${cx + 7} 66 L${cx} 74 L${cx - 7} 66 Z" fill="${trim}" stroke="#fff" stroke-width=".8"/>`);
        break;
      case 3: // big shoulder pads
        parts.push(`<ellipse cx="${cx - tw}" cy="56" rx="9" ry="6" fill="${hx(shade(torsoCol, 0.2))}" stroke="${trim}" stroke-width="1.5"/><ellipse cx="${cx + tw}" cy="56" rx="9" ry="6" fill="${hx(shade(torsoCol, 0.2))}" stroke="${trim}" stroke-width="1.5"/>`);
        break;
      case 4: // spikes
        parts.push(`<path d="M${cx - tw - 4} 56 L${cx - tw - 10} 46 L${cx - tw + 2} 52 Z M${cx + tw + 4} 56 L${cx + tw + 10} 46 L${cx + tw - 2} 52 Z" fill="${trim}"/>`);
        break;
      default:
        parts.push(`<path d="M${cx - 4} 52 L${cx} 84 L${cx + 4} 52" stroke="${trim}" stroke-width="1.5" fill="none"/>`);
    }
    parts.push(`<rect x="${cx - tw + 2}" y="78" width="${tw * 2 - 4}" height="4" rx="2" fill="${hx(shade(torsoCol, -0.5))}"/><rect x="${cx - 3}" y="77" width="6" height="6" rx="1" fill="${trim}"/>`);
  } else if (look.char === 'medic') parts.push(`<rect x="${cx - 2}" y="60" width="4" height="12" fill="#e0334f"/><rect x="${cx - 6}" y="64" width="12" height="4" fill="#e0334f"/>`);
  // arms and gloves
  const gd = pc.gloves?.design ?? 0;
  const gr = pc.gloves ? (gd % 2 ? 6.5 : 5.2) : 4.6;
  for (const [ax, dir] of [[cx - tw - 4, -1], [cx + tw + 4, 1]] as const) {
    parts.push(`<path d="M${ax - dir * 2} 56 Q${ax + dir * 4} 66 ${ax + dir * 2} 76" stroke="${hx(shade(torsoCol, -0.1))}" stroke-width="8" stroke-linecap="round" fill="none"/>`);
    parts.push(`<circle cx="${ax + dir * 2}" cy="78" r="${gr}" fill="${hx(gloveCol)}" stroke="${hx(shade(gloveCol, -0.5))}" stroke-width="1"/>`);
    if (pc.gloves && gd % 3 === 0) parts.push(`<rect x="${ax + dir * 2 - 6}" y="70" width="12" height="4" rx="2" fill="${hx(rankTrim(pc.gloves.rank))}"/>`);
  }
  // head
  parts.push(
    `<rect x="${cx - 5}" y="46" width="10" height="8" fill="${skinD}"/>`,
    `<circle cx="${cx}" cy="34" r="18" fill="${skin}" stroke="${skinD}" stroke-width="1.2"/>`,
    `<ellipse cx="${cx - 18}" cy="35" rx="3" ry="4.5" fill="${skin}"/><ellipse cx="${cx + 18}" cy="35" rx="3" ry="4.5" fill="${skin}"/>`,
    eyes(b),
    `<path d="M44 43 Q50 47 56 43" stroke="#7a3b2e" stroke-width="1.6" fill="none"/>`,
    `<ellipse cx="38" cy="40" rx="3.5" ry="2" fill="#ff8a9a" opacity=".45"/><ellipse cx="62" cy="40" rx="3.5" ry="2" fill="#ff8a9a" opacity=".45"/>`,
  );
  if (!pc.hat || b.hairStyle === 'beard') parts.push(hair(b, hc, dark));
  if (pc.hat?.art) parts.push(giPart(pc.hat.art, 24, -2, 52, pc.hat.color, { glow: pc.hat.rank >= 5 ? 2.5 : 0 }));
  // weapon in the right hand
  const sword = pc.sword;
  const wart = sword?.art || WEAPON_ART[look.weapon ?? 0] || 'ray-gun';
  const wcol = sword ? sword.color : 0xc9d3ea;
  parts.push(giPart(wart, cx + tw - 6, 46, 40, wcol, { rot: 20, glow: sword && sword.rank >= 4 ? 3 : 0 }));
  if (opts.cls) parts.push(`<text x="50" y="119" text-anchor="middle" font-size="7" fill="#fff" opacity=".7">${opts.cls}</text>`);
  return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}

/** Your hero as currently equipped. */
export function heroArt(pr: Progress): string {
  const l = pr.data.loadout;
  return heroSvg({ char: l.char, gear: equippedGear(pr), weapon: l.weapon });
}
