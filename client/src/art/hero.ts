import { COLORS, GEAR_COLORS, RANK_INFO, getGear, isGearId, type GearSlot } from '@orb/shared';
import type { Progress } from '../meta/economy';
import { equippedGear } from '../meta/inventory';
import { GEAR_ART } from './packs.gen';
import { giPart, hx, nextId, shade } from './render';

export interface HeroLook {
  char: string;
  gear: number[];
  weapon?: number;
  accent?: number;
}
export const HERO_PALETTES: Record<string, number> = {
  nova: 0x53d9ec, bolt: 0xf5bf52, titan: 0x899ebc, viper: 0x77d89a,
  ghost: 0xb99bfc, medic: 0xf1b8d4, sniper: 0x72b8c0,
};
const SHAPES: Record<string, string> = {
  nova: 'M19 59 C19 18 81 18 81 59 C81 99 19 99 19 59Z',
  bolt: 'M50 20 L80 49 Q89 83 55 92 L22 78 L19 50Z',
  titan: 'M29 25 L71 25 L89 44 L89 77 L69 94 L31 94 L11 77 L11 44Z',
  viper: 'M50 22 L81 44 L73 78 L50 94 L27 78 L19 44Z',
  ghost: 'M20 57 C18 12 82 12 80 57 L87 98 L66 88 L51 100 L36 88 L14 98Z',
  medic: 'M32 27 Q50 18 68 27 Q85 37 82 62 L76 81 Q50 103 24 81 L18 62 Q15 37 32 27Z',
  sniper: 'M19 49 L33 27 L72 31 L85 52 L76 82 L51 94 L23 79Z',
};

/** Original orb-core silhouettes. Gear remains data-driven; no combat properties are changed. */
export function heroSvg(look: HeroLook, opts: { cls?: string; combat?: boolean; hurt?: boolean; blink?: boolean } = {}): string {
  const color = HERO_PALETTES[look.char] ?? HERO_PALETTES.nova;
  const id = nextId('orb');
  const gear: Partial<Record<GearSlot, ReturnType<typeof getGear>>> = {};
  for (const n of look.gear) if (isGearId(n)) { const d = getGear(n); gear[d.slot] = d; }
  const paint = (s: GearSlot, fallback: number) => GEAR_COLORS[gear[s]?.color ?? -1]?.hex ?? fallback;
  const armor = paint('armor', color);
  const trim = gear.armor ? RANK_INFO[gear.armor.rank].color : shade(color, 0.6);
  const part = (slot: GearSlot, x: number, y: number, size: number) => {
    const g = gear[slot];
    return g ? giPart(GEAR_ART[slot]?.[g.design % (GEAR_ART[slot]?.length || 1)] ?? '', x, y, size, paint(slot, color)) : '';
  };
  const signature: Record<string, string> = {
    nova: `<ellipse cx="50" cy="21" rx="25" ry="7" fill="none" stroke="#f9e3a3" stroke-width="3"/><path d="M13 54 L3 42 L9 71 M87 54 L97 42 L91 71" fill="${hx(color)}" stroke="#10263b" stroke-width="3"/>`,
    bolt: '<path d="M45 30 L51 5 L66 7 L55 22 L69 20 L49 45 L52 29Z" fill="#fff1a7" stroke="#946022" stroke-width="2"/>',
    titan: `<path d="M10 43 L0 49 L0 74 L16 79 L24 64 L23 43 M90 43 L100 49 L100 74 L84 79 L76 64 L77 43" fill="${hx(shade(armor, -0.2))}" stroke="${hx(trim)}" stroke-width="3"/><path d="M33 31 H67 L64 44 H36Z" fill="#d8e5ed"/>`,
    viper: '<path d="M23 45 Q8 21 21 11 L35 36 M77 45 Q92 21 79 11 L65 36" fill="#d1f8bb" stroke="#254c42" stroke-width="3"/><path d="M35 78 L40 86 L44 78 M56 78 L60 86 L65 78" fill="#e5ffe0"/>',
    ghost: '<path d="M22 51 Q50 6 78 51 L74 40 Q50 26 26 40Z" fill="#252541"/><path d="M32 98 L25 109 M50 100 L50 114 M68 98 L75 109" stroke="#b99bfc" stroke-width="4" stroke-linecap="round"/>',
    medic: '<path d="M13 51 L5 46 L3 68 L16 76 M87 51 L95 46 L97 68 L84 76" fill="#e6d7e9" stroke="#614e70" stroke-width="2"/><path d="M50 17 L62 27 L50 37 L38 27Z" fill="#76dfcb"/><path d="M50 21 V33 M44 27 H56" stroke="#153d41" stroke-width="3"/>',
    sniper: '<path d="M22 44 L30 20 L76 26 L86 48 L65 38 L34 42Z" fill="#294553" stroke="#8bd4db" stroke-width="2"/><circle cx="66" cy="58" r="15" fill="#162f44" stroke="#92e3ee" stroke-width="3"/><circle cx="66" cy="58" r="8" fill="#66b3ff"/>',
  };
  const eyes = opts.blink
    ? '<path d="M32 58 H43 M57 58 H68" stroke="#d5f3ff" stroke-width="3" stroke-linecap="round"/>'
    : look.char === 'ghost'
    ? '<rect x="29" y="53" width="42" height="9" rx="4" fill="#c7b9ff"/>'
    : look.char === 'viper'
    ? `<path d="M30 53 L44 57 L42 62 L32 59 M70 53 L56 57 L58 62 L68 59" fill="#e8fac0"/><path d="M37 55 V61 M63 55 V61" stroke="#12332b" stroke-width="2"/>`
    : `<ellipse cx="37" cy="58" rx="${look.char === 'titan' ? 6 : 5}" ry="${opts.hurt ? 3 : look.char === 'bolt' ? 5 : 8}" fill="#f2fcff"/><ellipse cx="63" cy="58" rx="${look.char === 'titan' ? 6 : 5}" ry="${opts.hurt ? 3 : look.char === 'bolt' ? 5 : 8}" fill="#f2fcff"/><circle cx="39" cy="59" r="2.6" fill="#0b1a2b"/><circle cx="65" cy="59" r="2.6" fill="#0b1a2b"/>
    ${look.char === 'bolt' || look.char === 'titan' ? '<path d="M29 49 L44 53 M71 49 L56 53" stroke="#e2f2ff" stroke-width="3" stroke-linecap="round"/>' : ''}
    ${look.char === 'medic' ? '<circle cx="29" cy="66" r="3" fill="#f4c1da"/><circle cx="71" cy="66" r="3" fill="#f4c1da"/>' : ''}`;
  const weapon = ['ray-gun', 'bolter-gun', 'laser-gun', 'minigun', 'bolter-gun', 'pistol-gun'][look.weapon ?? 0];
  return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${look.char} orb champion">
    <defs><radialGradient id="${id}" cx=".3" cy=".2" r=".85"><stop stop-color="${hx(shade(armor, 0.4))}"/><stop offset=".55" stop-color="${hx(armor)}"/><stop offset="1" stop-color="${hx(shade(armor, -0.65))}"/></radialGradient></defs>
    <ellipse cx="50" cy="111" rx="29" ry="5" fill="#030a15" opacity=".4"/>
    ${part('vehicle', 16, 83, 68)}${part('bag', 62, 44, 31)}
    <path d="${SHAPES[look.char] ?? SHAPES.nova}" fill="url(#${id})" stroke="#101e33" stroke-width="4"/>
    <path d="M28 42 Q41 27 63 36" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>
    <path d="M29 85 Q50 99 72 82" fill="none" stroke="${hx(look.accent ?? trim)}" stroke-width="3"/>
    <rect x="25" y="47" width="50" height="27" rx="12" fill="#0c2239" stroke="${hx(look.accent ?? shade(color, -0.2))}" stroke-width="2"/>
    ${eyes}<path d="${opts.hurt ? 'M45 71 Q50 66 55 71' : 'M45 68 Q50 73 55 68'}" fill="none" stroke="#caedff" stroke-width="2" stroke-linecap="round"/>
    ${part('pants', 31, 80, 38)}${part('shoes', 28, 94, 44)}${part('gloves', 9, 62, 22)}
    ${part('armor', 36, 77, 27)}${part('hat', 27, 10, 46)}${signature[look.char] ?? signature.nova}
    ${!opts.combat ? (part('sword', 65, 57, 34) || giPart(weapon, 65, 57, 34, 0xaec7d7)) : ''}
    ${opts.cls ? '<circle cx="50" cy="83" r="3" fill="#fff"/>' : ''}
  </svg>`;
}
export function heroArt(pr: Progress): string {
  const l = pr.data.loadout;
  return heroSvg({ char: l.char, gear: equippedGear(pr), weapon: l.weapon, accent: COLORS[l.color]?.hex });
}
