import type { Rect } from './constants';
import type { ModeId } from './content';
import { EXTRA_MAPS } from './mapsExtra';

export interface MapTheme {
  bg: number;
  grid: number;
  wall: number;
  wallLine: number;
  accent: number;
  hazard: number;
}

export interface MapDef {
  id: string;
  name: string;
  level: number;
  theme: MapTheme;
  obstacles: Rect[];
  hazards: Rect[];
  hill: { x: number; y: number; r: number };
}

const HILL = { x: 800, y: 450, r: 110 };

const CORE_MAPS: Record<string, MapDef> = {
  neon: {
    id: 'neon',
    name: 'Neon Core',
    level: 1,
    theme: {
      bg: 0x0b0e1a,
      grid: 0x161c38,
      wall: 0x1b2247,
      wallLine: 0x5b6cf0,
      accent: 0x4dd2ff,
      hazard: 0xff1744,
    },
    obstacles: [
      { x: 700, y: 390, w: 200, h: 120 },
      { x: 260, y: 180, w: 30, h: 220 },
      { x: 1310, y: 500, w: 30, h: 220 },
      { x: 1150, y: 180, w: 200, h: 30 },
      { x: 250, y: 690, w: 200, h: 30 },
    ],
    hazards: [],
    hill: { x: 1020, y: 300, r: 110 },
  },
  crossfire: {
    id: 'crossfire',
    name: 'Crossfire',
    level: 2,
    theme: {
      bg: 0x1a0b14,
      grid: 0x331626,
      wall: 0x47193a,
      wallLine: 0xf05b9a,
      accent: 0xff5e8a,
      hazard: 0xff1744,
    },
    obstacles: [
      { x: 620, y: 430, w: 360, h: 40 },
      { x: 780, y: 290, w: 40, h: 320 },
      { x: 200, y: 150, w: 140, h: 40 },
      { x: 1260, y: 150, w: 140, h: 40 },
      { x: 200, y: 710, w: 140, h: 40 },
      { x: 1260, y: 710, w: 140, h: 40 },
    ],
    hazards: [],
    hill: { x: 800, y: 170, r: 110 },
  },
  pillars: {
    id: 'pillars',
    name: 'Pillar Park',
    level: 3,
    theme: {
      bg: 0x0b1a12,
      grid: 0x163325,
      wall: 0x1b4730,
      wallLine: 0x5bf09a,
      accent: 0x7dff6b,
      hazard: 0xff1744,
    },
    obstacles: [300, 620, 980, 1300].flatMap((x) =>
      [200, 420, 640]
        .filter((y) => !(y === 420 && (x === 620 || x === 980)))
        .map((y) => ({ x, y, w: 60, h: 60 })),
    ),
    hazards: [],
    hill: HILL,
  },
  fortress: {
    id: 'fortress',
    name: 'Fortress',
    level: 5,
    theme: {
      bg: 0x14100a,
      grid: 0x2e2616,
      wall: 0x453819,
      wallLine: 0xf0c05b,
      accent: 0xffc93c,
      hazard: 0xff1744,
    },
    obstacles: [
      { x: 600, y: 300, w: 150, h: 30 },
      { x: 850, y: 300, w: 150, h: 30 },
      { x: 600, y: 570, w: 150, h: 30 },
      { x: 850, y: 570, w: 150, h: 30 },
      { x: 600, y: 330, w: 30, h: 90 },
      { x: 600, y: 480, w: 30, h: 90 },
      { x: 970, y: 330, w: 30, h: 90 },
      { x: 970, y: 480, w: 30, h: 90 },
      { x: 200, y: 420, w: 60, h: 60 },
      { x: 1340, y: 420, w: 60, h: 60 },
    ],
    hazards: [],
    hill: HILL,
  },
  lava: {
    id: 'lava',
    name: 'Lava Flats',
    level: 7,
    theme: {
      bg: 0x190b0b,
      grid: 0x331616,
      wall: 0x47231b,
      wallLine: 0xf0745b,
      accent: 0xff8a3c,
      hazard: 0xff3d00,
    },
    obstacles: [
      { x: 450, y: 300, w: 30, h: 300 },
      { x: 1120, y: 300, w: 30, h: 300 },
    ],
    hazards: [
      { x: 700, y: 60, w: 200, h: 120 },
      { x: 700, y: 720, w: 200, h: 120 },
      { x: 120, y: 380, w: 140, h: 140 },
      { x: 1340, y: 380, w: 140, h: 140 },
    ],
    hill: HILL,
  },
  maze: {
    id: 'maze',
    name: 'Cyber Maze',
    level: 9,
    theme: {
      bg: 0x0b1419,
      grid: 0x162b33,
      wall: 0x1b3a47,
      wallLine: 0x5bd0f0,
      accent: 0x3cffd0,
      hazard: 0xff1744,
    },
    obstacles: [
      { x: 200, y: 220, w: 420, h: 30 },
      { x: 980, y: 220, w: 420, h: 30 },
      { x: 200, y: 650, w: 420, h: 30 },
      { x: 980, y: 650, w: 420, h: 30 },
      { x: 430, y: 350, w: 30, h: 200 },
      { x: 1140, y: 350, w: 30, h: 200 },
      { x: 700, y: 100, w: 200, h: 30 },
      { x: 700, y: 770, w: 200, h: 30 },
    ],
    hazards: [],
    hill: HILL,
  },
};

export const MAPS: Record<string, MapDef> = { ...CORE_MAPS, ...EXTRA_MAPS };
export const MAP_LIST = Object.values(MAPS);
/** The champion's throne room: an empty arena for the 1v1 duel with Majen. Not part of the normal rotation. */
export const CHAMPION_ARENA: MapDef = {
  id: 'throne',
  name: "Champion's Throne",
  level: 1,
  theme: { bg: 0x120a1f, grid: 0x2a1a45, wall: 0x3a2460, wallLine: 0xffd36e, accent: 0xffd36e, hazard: 0xff1744 },
  obstacles: [],
  hazards: [],
  hill: HILL,
};
MAPS[CHAMPION_ARENA.id] = CHAMPION_ARENA;

export function isMapId(v: unknown): v is string {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(MAPS, v);
}

export function getMap(id: string): MapDef {
  return MAPS[id] ?? MAPS.neon;
}

/** Quick Play cycles through these between rounds. */
export const ROTATION: Array<{ mode: ModeId; map: string }> = [
  { mode: 'dm', map: 'neon' },
  { mode: 'coins', map: 'crossfire' },
  { mode: 'hill', map: 'pillars' },
  { mode: 'tdm', map: 'fortress' },
  { mode: 'dm', map: 'lava' },
  { mode: 'coins', map: 'maze' },
  { mode: 'tdm', map: 'neon' },
  { mode: 'hill', map: 'crossfire' },
  { mode: 'dm', map: 'pillars' },
  { mode: 'coins', map: 'neon' },
];
