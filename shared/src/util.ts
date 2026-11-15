import { MAX_NICK, OBSTACLES, PLAYER_RADIUS, PLAYER_SPEED, WORLD_H, WORLD_W, type Rect } from './constants';

export type Rng = () => number;

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Pushes a circle out of a rectangle. Returns the corrected centre. */
export function resolveCircleRect(x: number, y: number, r: number, rect: Rect): { x: number; y: number } {
  const cx = clamp(x, rect.x, rect.x + rect.w);
  const cy = clamp(y, rect.y, rect.y + rect.h);
  let dx = x - cx;
  let dy = y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return { x, y };
  if (d2 === 0) {
    // centre inside the rect: push out along the shortest axis
    const left = x - rect.x;
    const right = rect.x + rect.w - x;
    const top = y - rect.y;
    const bottom = rect.y + rect.h - y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) return { x: rect.x - r, y };
    if (m === right) return { x: rect.x + rect.w + r, y };
    if (m === top) return { x, y: rect.y - r };
    return { x, y: rect.y + rect.h + r };
  }
  const d = Math.sqrt(d2);
  dx /= d;
  dy /= d;
  return { x: cx + dx * r, y: cy + dy * r };
}

/** Shared movement step used by the server, offline mode and client prediction. */
export function movePlayer(
  x: number,
  y: number,
  moveX: number,
  moveY: number,
  dt: number,
  speed: number = PLAYER_SPEED,
  obstacles: Rect[] = OBSTACLES,
): { x: number; y: number } {
  let mx = Number.isFinite(moveX) ? moveX : 0;
  let my = Number.isFinite(moveY) ? moveY : 0;
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  let nx = x + mx * speed * dt;
  let ny = y + my * speed * dt;
  nx = clamp(nx, PLAYER_RADIUS, WORLD_W - PLAYER_RADIUS);
  ny = clamp(ny, PLAYER_RADIUS, WORLD_H - PLAYER_RADIUS);
  for (const o of obstacles) {
    const r = resolveCircleRect(nx, ny, PLAYER_RADIUS, o);
    nx = r.x;
    ny = r.y;
  }
  return { x: nx, y: ny };
}

export function pointInRect(x: number, y: number, rect: Rect, pad = 0): boolean {
  return x >= rect.x - pad && x <= rect.x + rect.w + pad && y >= rect.y - pad && y <= rect.y + rect.h + pad;
}

/** True when the straight segment crosses any obstacle (sampled). */
export function segmentBlocked(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  obstacles: Rect[] = OBSTACLES,
): boolean {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / 20));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    for (const o of obstacles) if (pointInRect(x, y, o, 4)) return true;
  }
  return false;
}

export function circlesOverlap(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const rr = r1 + r2;
  return dx * dx + dy * dy <= rr * rr;
}

export function normalizeAngle(a: number): number {
  const t = Math.PI * 2;
  return ((((a + Math.PI) % t) + t) % t) - Math.PI;
}

const BAD_WORDS = [
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'dick',
  'cock',
  'pussy',
  'nazi',
  'rape',
  'slut',
  'whore',
  'nigg',
  'fag',
];

const ADJECTIVES = ['Swift', 'Brave', 'Neon', 'Lucky', 'Solar', 'Cosmic', 'Rapid', 'Calm', 'Wild', 'Bright'];
const ANIMALS = ['Fox', 'Owl', 'Wolf', 'Lynx', 'Hawk', 'Otter', 'Panda', 'Moth', 'Crab', 'Newt'];

export function randomNick(rng: Rng = Math.random): string {
  const a = ADJECTIVES[Math.floor(rng() * ADJECTIVES.length)];
  const b = ANIMALS[Math.floor(rng() * ANIMALS.length)];
  return `${a}${b}${Math.floor(rng() * 100)}`;
}

export function containsProfanity(s: string): boolean {
  const flat = s.toLowerCase().replace(/[^a-z]/g, '');
  return BAD_WORDS.some((w) => flat.includes(w));
}

/** Strips HTML and control characters, trims, caps length, replaces profane names. */
export function sanitizeNick(raw: unknown, rng: Rng = Math.random): string {
  if (typeof raw !== 'string') return randomNick(rng);
  let s = raw
    .replace(/<[^>]*>?/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e]/g, '')
    .replace(/[<>&"'`\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  s = Array.from(s).slice(0, MAX_NICK).join('').trim();
  if (s.length === 0 || containsProfanity(s)) return randomNick(rng);
  return s;
}

export interface PlayerInput {
  moveX: number;
  moveY: number;
  aim: number;
  shooting: boolean;
  seq: number;
  /** Bits 0..4 = skill slots 1..5 (pressed since the last message). */
  skill: number;
}

/** Validates untrusted input. Returns null when unusable. */
export function sanitizeInput(raw: unknown): PlayerInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const { moveX, moveY, aimAngle, shooting, seq } = r;
  if (typeof moveX !== 'number' || typeof moveY !== 'number' || typeof aimAngle !== 'number') return null;
  if (!Number.isFinite(moveX) || !Number.isFinite(moveY) || !Number.isFinite(aimAngle)) return null;
  if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 0 || seq > 2_000_000_000) return null;
  return {
    moveX: clamp(moveX, -1, 1),
    moveY: clamp(moveY, -1, 1),
    aim: normalizeAngle(aimAngle),
    shooting: shooting === true,
    seq,
    skill: typeof r.skill === 'number' && Number.isInteger(r.skill) ? r.skill & 31 : 0,
  };
}

/** Wire format of an input message (client to server). */
export interface InputMessage {
  moveX: number;
  moveY: number;
  aimAngle: number;
  shooting: boolean;
  seq: number;
  skill?: number;
}
