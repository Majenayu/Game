import { weaponArt } from './icons2';
import { GEAR_ART } from './packs.gen';
import { frame, giPart } from './render';
/** Small original SVG icons for weapons, accessories, skills and chests (viewBox 64x64). */
const svg = (inner: string, bg = '#141a33') =>
  `<svg class="ico" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="12" fill="${bg}"/>${inner}</svg>`;
const hx = (n: number) => '#' + n.toString(16).padStart(6, '0');


/** Weapons: real gun shapes (see icons2.weaponArt). */
export function weaponIcon(id: number): string {
  return weaponArt(id);
}

/** Look accessories (10,000): a real hat, mask, crown or charm shape in one of many colours. */
export function accIcon(id: number): string {
  const shapes = [...(GEAR_ART.hat ?? []), ...(GEAR_ART.bag ?? [])];
  const art = shapes[id % Math.max(1, shapes.length)] ?? 'crown';
  const col = ((id * 2654435761) >>> 8) & 0xffffff | 0x404040;
  return frame(giPart(art, 8, 8, 48, col, { glow: id % 7 === 0 ? 2 : 0, flip: id % 2 === 1 }), hx(col));
}

export function skillIcon(kind: string, color: number): string {
  const c = hx(color);
  const g: Record<string, string> = {
    projectile: `<circle cx="40" cy="32" r="8" fill="${c}"/><path d="M8 32 L32 32" stroke="${c}" stroke-width="4" opacity=".6"/>`,
    beam: `<path d="M8 32 L58 32" stroke="${c}" stroke-width="10" opacity=".4"/><path d="M8 32 L58 32" stroke="#fff" stroke-width="3"/>`,
    volley: `<g fill="${c}"><circle cx="40" cy="20" r="5"/><circle cx="46" cy="32" r="5"/><circle cx="40" cy="44" r="5"/></g><path d="M10 32 L30 32" stroke="${c}" stroke-width="3"/>`,
    nova: `<circle cx="32" cy="32" r="22" fill="none" stroke="${c}" stroke-width="4"/><circle cx="32" cy="32" r="12" fill="none" stroke="${c}" stroke-width="3" opacity=".6"/><circle cx="32" cy="32" r="4" fill="#fff"/>`,
    cleave: `<path d="M14 46 A26 26 0 0 1 50 14" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>`,
    shield: `<path d="M32 8 L52 16 L50 36 Q46 50 32 56 Q18 50 14 36 L12 16 Z" fill="${c}" opacity=".85"/>`,
    barrier: `<rect x="12" y="10" width="10" height="44" rx="3" fill="${c}"/><rect x="27" y="10" width="10" height="44" rx="3" fill="${c}" opacity=".7"/><rect x="42" y="10" width="10" height="44" rx="3" fill="${c}" opacity=".5"/>`,
    heal: `<path d="M26 12 H38 V26 H52 V38 H38 V52 H26 V38 H12 V26 H26 Z" fill="${c}"/>`,
    aura: `<circle cx="32" cy="32" r="24" fill="${c}" opacity=".25"/><circle cx="32" cy="32" r="10" fill="${c}"/>`,
    buff: `<path d="M32 8 L44 30 H36 L40 56 L20 28 H29 Z" fill="${c}"/>`,
    stealth: `<path d="M8 32 Q32 8 56 32 Q32 56 8 32 Z" fill="none" stroke="${c}" stroke-width="4"/><path d="M12 52 L52 12" stroke="${c}" stroke-width="4"/>`,
    ambush: `<path d="M12 52 L40 24 L44 12 L52 20 L40 24" stroke="${c}" stroke-width="5" fill="none"/>`,
    summon: `<circle cx="22" cy="38" r="9" fill="${c}"/><circle cx="42" cy="38" r="9" fill="${c}" opacity=".7"/><circle cx="32" cy="20" r="9" fill="${c}" opacity=".85"/>`,
    mine: `<circle cx="32" cy="36" r="14" fill="${c}"/><path d="M32 22 L32 10 M22 26 L14 18 M42 26 L50 18" stroke="${c}" stroke-width="3"/>`,
    pull: `<path d="M52 32 A20 20 0 1 1 32 12" fill="none" stroke="${c}" stroke-width="5"/><path d="M32 4 L32 20 L24 12 Z" fill="${c}"/>`,
    slow: `<circle cx="32" cy="32" r="20" fill="none" stroke="${c}" stroke-width="4"/><path d="M32 18 V32 L42 38" stroke="${c}" stroke-width="4" fill="none"/>`,
    dash: `<path d="M10 22 H36 M6 32 H40 M10 42 H36" stroke="${c}" stroke-width="4" stroke-linecap="round"/><circle cx="48" cy="32" r="9" fill="${c}"/>`,
    blink: `<circle cx="18" cy="32" r="8" fill="none" stroke="${c}" stroke-width="3" stroke-dasharray="4 3"/><circle cx="46" cy="32" r="9" fill="${c}"/>`,
    portal: `<ellipse cx="32" cy="32" rx="14" ry="22" fill="none" stroke="${c}" stroke-width="5"/><ellipse cx="32" cy="32" rx="6" ry="12" fill="${c}" opacity=".5"/>`,
    world: `<circle cx="32" cy="32" r="20" fill="none" stroke="${c}" stroke-width="3"/><path d="M12 32 H52 M32 12 Q20 32 32 52 Q44 32 32 12" stroke="${c}" stroke-width="2" fill="none"/>`,
  };
  return svg(g[kind] ?? g.projectile);
}

export function chestIcon(color: number): string {
  const c = hx(color);
  return svg(
    `<rect x="10" y="26" width="44" height="28" rx="4" fill="${c}"/><path d="M10 26 Q32 6 54 26 Z" fill="${c}" opacity=".8"/><rect x="10" y="30" width="44" height="4" fill="#1b0a3a" opacity=".4"/><rect x="28" y="30" width="8" height="12" rx="2" fill="#ffe58a"/>`,
  );
}
