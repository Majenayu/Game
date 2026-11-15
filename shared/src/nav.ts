import { PLAYER_RADIUS, WORLD_H, WORLD_W, type Rect } from './constants';
import type { MapDef } from './maps';
import { pointInRect } from './util';

/** Grid navigation for bots. Cells that a player orb cannot stand in are blocked. */
const CELL = 40;
export const NAV_COLS = Math.ceil(WORLD_W / CELL);
export const NAV_ROWS = Math.ceil(WORLD_H / CELL);

export interface Nav {
  blocked: Uint8Array;
  obstacles: Rect[];
}

const cache = new Map<string, Nav>();

export function getNav(map: MapDef): Nav {
  const hit = cache.get(map.id);
  if (hit) return hit;
  const blocked = new Uint8Array(NAV_COLS * NAV_ROWS);
  for (let r = 0; r < NAV_ROWS; r++) {
    for (let c = 0; c < NAV_COLS; c++) {
      const x = c * CELL + CELL / 2;
      const y = r * CELL + CELL / 2;
      let b =
        x < PLAYER_RADIUS || y < PLAYER_RADIUS || x > WORLD_W - PLAYER_RADIUS || y > WORLD_H - PLAYER_RADIUS;
      for (const o of map.obstacles) if (pointInRect(x, y, o, PLAYER_RADIUS + 4)) b = true;
      for (const h of map.hazards) if (pointInRect(x, y, h, 12)) b = true;
      blocked[r * NAV_COLS + c] = b ? 1 : 0;
    }
  }
  const nav = { blocked, obstacles: map.obstacles };
  cache.set(map.id, nav);
  return nav;
}

const cellOf = (v: number, size: number) => Math.max(0, Math.min(size - 1, Math.floor(v / CELL)));

/** True when a player orb can travel the straight segment without touching a wall. */
export function segmentClear(nav: Nav, x1: number, y1: number, x2: number, y2: number): boolean {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(d / 12));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    for (const o of nav.obstacles) if (pointInRect(x, y, o, PLAYER_RADIUS + 1)) return false;
  }
  return true;
}

/** Nearest unblocked cell centre to a point (spiral search). */
export function nearestFree(nav: Nav, x: number, y: number): { x: number; y: number } {
  const c0 = cellOf(x, NAV_COLS);
  const r0 = cellOf(y, NAV_ROWS);
  for (let ring = 0; ring < 12; ring++) {
    let best: { x: number; y: number } | null = null;
    let bd = Infinity;
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        const c = c0 + dc;
        const r = r0 + dr;
        if (c < 0 || r < 0 || c >= NAV_COLS || r >= NAV_ROWS || nav.blocked[r * NAV_COLS + c]) continue;
        const cx = c * CELL + CELL / 2;
        const cy = r * CELL + CELL / 2;
        const d = Math.hypot(cx - x, cy - y);
        if (d < bd) {
          bd = d;
          best = { x: cx, y: cy };
        }
      }
    }
    if (best) return best;
  }
  return { x: WORLD_W / 2, y: WORLD_H / 2 };
}

/** A* over the grid, then string-pulled into a few waypoints. Returns [] when no route exists. */
export function findPath(
  nav: Nav,
  sx: number,
  sy: number,
  gx: number,
  gy: number,
): Array<{ x: number; y: number }> {
  const start = nearestFree(nav, sx, sy);
  const goal = nearestFree(nav, gx, gy);
  const sc = cellOf(start.x, NAV_COLS);
  const sr = cellOf(start.y, NAV_ROWS);
  const gc = cellOf(goal.x, NAV_COLS);
  const gr = cellOf(goal.y, NAV_ROWS);
  const n = NAV_COLS * NAV_ROWS;
  const g = new Float32Array(n).fill(Infinity);
  const from = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const open: number[] = [];
  const f = new Float32Array(n);
  const idx = (c: number, r: number) => r * NAV_COLS + c;
  const h = (c: number, r: number) => Math.hypot(c - gc, r - gr);
  const s = idx(sc, sr);
  g[s] = 0;
  f[s] = h(sc, sr);
  open.push(s);
  const target = idx(gc, gr);
  let found = false;
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur === target) {
      found = true;
      break;
    }
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cc = cur % NAV_COLS;
    const cr = Math.floor(cur / NAV_COLS);
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dc && !dr) continue;
        const c = cc + dc;
        const r = cr + dr;
        if (c < 0 || r < 0 || c >= NAV_COLS || r >= NAV_ROWS) continue;
        const ni = idx(c, r);
        if (nav.blocked[ni] || closed[ni]) continue;
        if (dc && dr && (nav.blocked[idx(cc + dc, cr)] || nav.blocked[idx(cc, cr + dr)])) continue;
        const ng = g[cur] + (dc && dr ? 1.414 : 1);
        if (ng < g[ni]) {
          g[ni] = ng;
          from[ni] = cur;
          f[ni] = ng + h(c, r);
          open.push(ni);
        }
      }
    }
  }
  if (!found) return [];
  const cells: Array<{ x: number; y: number }> = [];
  for (let c = target; c !== -1; c = from[c])
    cells.push({ x: (c % NAV_COLS) * CELL + CELL / 2, y: Math.floor(c / NAV_COLS) * CELL + CELL / 2 });
  cells.reverse();
  // string pulling: skip waypoints that are visible from the current anchor
  const out: Array<{ x: number; y: number }> = [];
  let ax = sx;
  let ay = sy;
  let i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !segmentClear(nav, ax, ay, cells[j].x, cells[j].y)) j--;
    out.push(cells[j]);
    ax = cells[j].x;
    ay = cells[j].y;
    i = j + 1;
  }
  return out;
}
