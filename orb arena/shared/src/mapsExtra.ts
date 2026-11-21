import type { Rect } from './constants';
import type { MapDef, MapTheme } from './maps';

/** Small deterministic generator so the extra arenas are the same on every machine. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const GAP = 110;
/** Pieces stay this far from the arena border so nobody gets wedged against the edge. */
const EDGE = 120;

function apart(a: Rect, b: Rect): boolean {
  return (
    a.x + a.w + GAP <= b.x || b.x + b.w + GAP <= a.x || a.y + a.h + GAP <= b.y || b.y + b.h + GAP <= a.y
  );
}

/**
 * Builds a four-way mirrored layout. Pieces stay out of the centre cross lanes and keep an 110 unit gap
 * between each other, so every part of the arena can be reached and the layout is fair to both sides.
 */
function mirrored(seed: number, pieces: number, hazardCount: number): { obstacles: Rect[]; hazards: Rect[] } {
  const rnd = lcg(seed);
  const quad: Rect[] = [];
  const hazQuad: Rect[] = [];
  let tries = 0;
  while ((quad.length < pieces || hazQuad.length < hazardCount) && tries++ < 600) {
    const horizontal = rnd() < 0.5;
    const len = 90 + Math.floor(rnd() * 160);
    const w = horizontal ? len : 30;
    const h = horizontal ? 30 : len;
    const x = EDGE + Math.floor(rnd() * (720 - EDGE - w));
    const y = EDGE + Math.floor(rnd() * (380 - EDGE - h));
    const r = { x, y, w, h };
    if (x + w > 720 || y + h > 380) continue;
    const isHazard = hazQuad.length < hazardCount && (quad.length >= pieces || rnd() < 0.25);
    if (isHazard) {
      const hz = { x, y, w: 110, h: 90 };
      if (hz.x + hz.w > 720 || hz.y + hz.h > 380) continue;
      if ([...quad, ...hazQuad].every((o) => apart(hz, o))) hazQuad.push(hz);
    } else if (quad.length < pieces && [...quad, ...hazQuad].every((o) => apart(r, o))) {
      quad.push(r);
    }
  }
  const mirror = (rs: Rect[]): Rect[] => {
    const out: Rect[] = [];
    for (const r of rs) {
      out.push(r);
      out.push({ ...r, x: 1600 - r.x - r.w });
      out.push({ ...r, y: 900 - r.y - r.h });
      out.push({ ...r, x: 1600 - r.x - r.w, y: 900 - r.y - r.h });
    }
    return out;
  };
  return { obstacles: mirror(quad), hazards: mirror(hazQuad) };
}

interface Spec {
  id: string;
  name: string;
  level: number;
  theme: MapTheme;
  pieces: number;
  hazards: number;
}

const T = (bg: number, grid: number, wall: number, wallLine: number, accent: number, hazard = 0xff1744): MapTheme => ({
  bg,
  grid,
  wall,
  wallLine,
  accent,
  hazard,
});

const SPECS: Spec[] = [
  { id: 'sunken', name: 'Sunken Temple', level: 4, theme: T(0x0a1a1c, 0x13353a, 0x1a4a50, 0x4ee0d0, 0x5bf0e0), pieces: 3, hazards: 0 },
  { id: 'dunes', name: 'Ember Dunes', level: 6, theme: T(0x1c140a, 0x38280f, 0x4a3414, 0xf0b44e, 0xffc34d), pieces: 4, hazards: 1 },
  { id: 'glacier', name: 'Glacier Run', level: 8, theme: T(0x0a1420, 0x14304a, 0x1a3f5e, 0x8fd4ff, 0xbfe6ff), pieces: 4, hazards: 0 },
  { id: 'orchard', name: 'Moon Orchard', level: 10, theme: T(0x140a1f, 0x2a1445, 0x3a1a5e, 0xb48cff, 0xd9b8ff), pieces: 5, hazards: 0 },
  { id: 'foundry', name: 'Star Foundry', level: 11, theme: T(0x1f0e0a, 0x45201a, 0x5e2a1a, 0xff8a5e, 0xffb08a), pieces: 4, hazards: 2 },
  { id: 'reef', name: 'Coral Reef', level: 12, theme: T(0x0a1f18, 0x14453a, 0x1a5e4a, 0x5effc0, 0x8affd9), pieces: 5, hazards: 0 },
  { id: 'citadel', name: 'Iron Citadel', level: 13, theme: T(0x12131a, 0x252838, 0x363b52, 0x9aa4d6, 0xc0c8f0), pieces: 6, hazards: 0 },
  { id: 'grove', name: 'Whisper Grove', level: 14, theme: T(0x0e1a0a, 0x1f3814, 0x2a4f1a, 0x9aff5e, 0xc0ff8a), pieces: 5, hazards: 1 },
  { id: 'orbit', name: 'Orbit Station', level: 15, theme: T(0x0a0c1f, 0x141845, 0x1a2260, 0x6e8aff, 0x9ab0ff), pieces: 5, hazards: 0 },
  { id: 'crypt', name: 'Quiet Crypt', level: 16, theme: T(0x140f14, 0x2e2230, 0x40304a, 0xc08ad6, 0xe0b0f0), pieces: 6, hazards: 1 },
  { id: 'harbor', name: 'Lantern Harbor', level: 17, theme: T(0x1a160a, 0x382f14, 0x4a3f1a, 0xffe05e, 0xffee8a), pieces: 5, hazards: 0 },
  { id: 'canyon', name: 'Red Canyon', level: 18, theme: T(0x1f0f0a, 0x452818, 0x5e381a, 0xff9a5e, 0xffb88a), pieces: 6, hazards: 1 },
  { id: 'nebula', name: 'Nebula Gate', level: 19, theme: T(0x120a1f, 0x261445, 0x33195e, 0xd05eff, 0xe58aff), pieces: 6, hazards: 0 },
  { id: 'clockwork', name: 'Clockwork Hall', level: 20, theme: T(0x1a1a0a, 0x383814, 0x4a4a1a, 0xe0e05e, 0xf0f08a), pieces: 7, hazards: 0 },
  { id: 'tundra', name: 'Frost Tundra', level: 21, theme: T(0x0f1620, 0x1f3048, 0x2a435f, 0xa0d0ff, 0xd0e8ff), pieces: 6, hazards: 1 },
  { id: 'jungle', name: 'Neon Jungle', level: 22, theme: T(0x0a1f10, 0x14452a, 0x1a5e38, 0x5eff8a, 0x8affb0), pieces: 7, hazards: 1 },
  { id: 'abyss', name: 'Glass Abyss', level: 23, theme: T(0x08121a, 0x102838, 0x163a50, 0x5eb8ff, 0x8accff), pieces: 7, hazards: 2 },
  { id: 'solar', name: 'Solar Court', level: 24, theme: T(0x1f1a0a, 0x453814, 0x5e4a1a, 0xffcf5e, 0xffe08a), pieces: 8, hazards: 1 },
  { id: 'finale', name: 'Starforge Arena', level: 25, theme: T(0x0a0a14, 0x181830, 0x24244a, 0xffd36e, 0xffe9a8), pieces: 8, hazards: 2 },
];

export const EXTRA_MAPS: Record<string, MapDef> = {};
SPECS.forEach((s, i) => {
  const { obstacles, hazards } = mirrored(1000 + i * 7919, s.pieces, s.hazards);
  EXTRA_MAPS[s.id] = {
    id: s.id,
    name: s.name,
    level: s.level,
    theme: s.theme,
    obstacles,
    hazards,
    hill: { x: 800, y: 450, r: 110 },
  };
});
