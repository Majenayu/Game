import { GEAR_COLORS, RANK_INFO, getCreature, getGear } from '@orb/shared';

const hx = (n: number) => '#' + n.toString(16).padStart(6, '0');
const box = (inner: string, border = '#33406e') =>
  `<svg class="ico" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="62" height="62" rx="12" fill="#141a33" stroke="${border}" stroke-width="2"/>${inner}</svg>`;

/** Character avatars: an orb face with the character's signature gear. */
export function avatar(charId: string, color = 0x4dd2ff): string {
  const c = hx(color);
  const face = `<circle cx="32" cy="36" r="18" fill="${c}"/><circle cx="26" cy="30" r="5" fill="#fff" opacity=".45"/><circle cx="27" cy="36" r="3" fill="#1b0a3a"/><circle cx="37" cy="36" r="3" fill="#1b0a3a"/><path d="M27 44 Q32 48 37 44" stroke="#1b0a3a" stroke-width="2" fill="none"/>`;
  const gear: Record<string, string> = {
    nova: `<ellipse cx="32" cy="16" rx="12" ry="4" fill="none" stroke="#ffe58a" stroke-width="3"/>`,
    bolt: `<path d="M34 6 L26 20 L32 20 L28 30 L40 14 L34 14 Z" fill="#ffe14d"/>`,
    titan: `<path d="M14 30 Q32 6 50 30" stroke="#9aa6c8" stroke-width="6" fill="none"/><circle cx="32" cy="18" r="3" fill="#ffc93c"/>`,
    viper: `<path d="M16 26 L20 10 L26 22 Z M48 26 L44 10 L38 22 Z" fill="#e0334f"/>`,
    ghost: `<path d="M14 50 Q18 56 22 50 Q26 56 30 50 Q34 56 38 50 Q42 56 46 50 L50 44 L14 44 Z" fill="${c}" opacity=".7"/>`,
    medic: `<circle cx="32" cy="16" r="8" fill="#fff"/><rect x="29" y="11" width="6" height="10" fill="#e0334f"/><rect x="27" y="13" width="10" height="6" fill="#e0334f"/>`,
    sniper: `<circle cx="40" cy="34" r="8" fill="none" stroke="#4dd2ff" stroke-width="2"/><path d="M46 40 L54 48" stroke="#4dd2ff" stroke-width="2"/>`,
  };
  return box(face + (gear[charId] ?? ''));
}

/** One base shape per gear slot; the design index adds a pattern, the colour tints it. */
export function gearIcon(id: number): string {
  const g = getGear(id);
  const c = hx(GEAR_COLORS[g.color].hex);
  const rank = hx(RANK_INFO[g.rank].color);
  const d = g.design;
  const deco =
    d % 5 === 0
      ? `<circle cx="32" cy="32" r="4" fill="#fff" opacity=".8"/>`
      : d % 5 === 1
        ? `<path d="M22 32 L42 32" stroke="#fff" stroke-width="2" opacity=".7"/>`
        : d % 5 === 2
          ? `<path d="M32 22 L35 30 L43 30 L37 35 L39 43 L32 38 L25 43 L27 35 L21 30 L29 30 Z" fill="#fff" opacity=".6"/>`
          : d % 5 === 3
            ? `<circle cx="26" cy="28" r="3" fill="#fff" opacity=".6"/><circle cx="38" cy="36" r="3" fill="#fff" opacity=".6"/>`
            : `<path d="M24 40 L32 24 L40 40" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/>`;
  const shapes: Record<string, string> = {
    hat: `<path d="M12 40 L52 40 L46 30 Q32 ${8 + (d % 6) * 2} 18 30 Z" fill="${c}"/><rect x="10" y="40" width="44" height="5" rx="2" fill="${c}" opacity=".8"/>`,
    gloves: `<path d="M20 52 L20 28 Q20 20 26 22 L26 14 Q30 10 32 14 L32 12 Q36 9 38 13 L38 16 Q42 13 44 18 L44 40 Q44 52 32 52 Z" fill="${c}"/>`,
    armor: `<path d="M14 18 L24 12 L32 18 L40 12 L50 18 L46 32 L46 54 L18 54 L18 32 Z" fill="${c}"/>`,
    pants: `<path d="M18 12 L46 12 L48 54 L36 54 L32 28 L28 54 L16 54 Z" fill="${c}"/>`,
    shoes: `<path d="M10 44 L28 44 L30 30 L40 30 L44 42 L54 46 L54 52 L10 52 Z" fill="${c}"/>`,
    bag: `<rect x="16" y="22" width="32" height="30" rx="8" fill="${c}"/><path d="M24 22 Q32 8 40 22" stroke="${c}" stroke-width="4" fill="none"/>`,
    sword: `<path d="M44 8 L52 12 L26 42 L22 38 Z" fill="${c}"/><rect x="14" y="40" width="16" height="4" rx="2" transform="rotate(-45 22 42)" fill="#ffc93c"/><circle cx="16" cy="48" r="4" fill="#ffc93c"/>`,
    vehicle: `<rect x="10" y="30" width="44" height="14" rx="6" fill="${c}"/><path d="M18 30 L24 20 L40 20 L46 30 Z" fill="${c}" opacity=".8"/><circle cx="20" cy="46" r="6" fill="#222"/><circle cx="44" cy="46" r="6" fill="#222"/>`,
  };
  return box(shapes[g.slot] + deco + `<text x="56" y="14" font-size="11" font-weight="800" text-anchor="end" fill="${rank}">${g.rank}</text>`, rank);
}

/** Creature icons by family. */
export function creatureIcon(id: number): string {
  const s = getCreature(id);
  const c = hx(s.color);
  const rank = hx(RANK_INFO[s.rank].color);
  const eyes = `<circle cx="27" cy="30" r="3" fill="#1b0a3a"/><circle cx="37" cy="30" r="3" fill="#1b0a3a"/>`;
  const body: Record<string, string> = {
    beast: `<circle cx="32" cy="34" r="16" fill="${c}"/><path d="M18 24 L16 10 L26 20 Z M46 24 L48 10 L38 20 Z" fill="${c}"/>${eyes}<path d="M28 38 L32 42 L36 38" stroke="#1b0a3a" stroke-width="2" fill="none"/>`,
    robot: `<rect x="16" y="18" width="32" height="28" rx="6" fill="${c}"/><rect x="30" y="8" width="4" height="10" fill="${c}"/><circle cx="32" cy="8" r="3" fill="#ff4da6"/><rect x="22" y="26" width="8" height="6" fill="#4dd2ff"/><rect x="34" y="26" width="8" height="6" fill="#4dd2ff"/>`,
    dragon: `<path d="M32 14 L44 24 L48 40 L32 50 L16 40 L20 24 Z" fill="${c}"/><path d="M14 30 L2 18 L8 36 Z M50 30 L62 18 L56 36 Z" fill="${c}" opacity=".7"/>${eyes}`,
    animal: `<circle cx="32" cy="34" r="16" fill="${c}"/><circle cx="20" cy="20" r="6" fill="${c}"/><circle cx="44" cy="20" r="6" fill="${c}"/>${eyes}<circle cx="32" cy="38" r="3" fill="#1b0a3a"/>`,
    fish: `<ellipse cx="30" cy="32" rx="18" ry="12" fill="${c}"/><path d="M46 32 L58 22 L58 42 Z" fill="${c}"/><circle cx="22" cy="30" r="3" fill="#1b0a3a"/>`,
    mermaid: `<circle cx="32" cy="20" r="9" fill="#ffd6c0"/><path d="M24 28 L40 28 L38 44 Q32 56 26 44 Z" fill="${c}"/><path d="M26 50 L18 58 L32 54 L46 58 L38 50 Z" fill="${c}"/><path d="M23 16 Q32 4 41 16" stroke="#ff7eb6" stroke-width="4" fill="none"/>`,
    drone: `<rect x="22" y="26" width="20" height="12" rx="4" fill="${c}"/><path d="M10 22 L22 28 M54 22 L42 28" stroke="${c}" stroke-width="3"/><ellipse cx="10" cy="20" rx="8" ry="2" fill="#dfe8ff"/><ellipse cx="54" cy="20" rx="8" ry="2" fill="#dfe8ff"/><circle cx="32" cy="32" r="3" fill="#ff4da6"/>`,
    spirit: `<path d="M32 10 Q50 24 44 44 Q38 56 32 50 Q26 56 20 44 Q14 24 32 10 Z" fill="${c}" opacity=".85"/>${eyes}`,
  };
  return box((body[s.family] ?? body.beast) + `<text x="56" y="14" font-size="11" font-weight="800" text-anchor="end" fill="${rank}">${s.rank}</text>`, rank);
}
