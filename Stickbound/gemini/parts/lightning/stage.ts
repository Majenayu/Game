/**
 * Volt City rooftop: a night city under a thunderstorm, seen from a rooftop arena.
 * Static layers (sky, far skyline, street grid, mid towers, side buildings, floor) are baked once.
 * Clouds, lightning, spotlights, billboards, sparks, air traffic, the LED rail and floor reflections
 * move every frame. Render only: it reads the frame number and never touches the fight state,
 * so the simulation stays deterministic. Everything is drawn in code (original art, no assets).
 */
import { drawBolt } from './fx';

export const STAGE_W = 2200;
export const STAGE_H = 900;
export const GROUND = 760;
/** baked layer width: the stage plus room for parallax */
const LW = STAGE_W + 400;
const HORIZON = 640;

type G = CanvasRenderingContext2D;
interface Layer {
  c: HTMLCanvasElement;
  /** parallax factor: 0 moves with the camera, 1 is fixed to the world */
  f: number;
  y0: number;
}
interface Pt {
  x: number;
  y: number;
}
interface Sign {
  x: number;
  y: number;
  w: number;
  h: number;
  phase: number;
}
interface Panel {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  col: string;
  speed: number;
}
export interface Arena {
  sky: Layer;
  far: Layer;
  city: Layer;
  mid: Layer;
  near: Layer;
  clouds: HTMLCanvasElement[];
  cloudsLit: HTMLCanvasElement[];
  fog: HTMLCanvasElement;
  floorBase: HTMLCanvasElement;
  floorTop: HTMLCanvasElement;
  boards: HTMLCanvasElement[];
  halos: HTMLCanvasElement[];
  glow: HTMLCanvasElement;
  farTops: Pt[];
  tips: Pt[];
  upBeams: Pt[];
  signs: Sign[];
  panels: Panel[];
  ledText: string;
  ledW: number;
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** stable hash of an integer to [0, 1) */
function hash(n: number): number {
  let t = (n * 2654435761) >>> 0;
  t = Math.imul(t ^ (t >>> 16), 0x85ebca6b) >>> 0;
  t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35) >>> 0;
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}
function canvas(w: number, h: number): [HTMLCanvasElement, G] {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return [c, c.getContext('2d')!];
}
/** a layer canvas covering world y0..y1; its context is shifted so you draw in layer x and world y */
function layer(f: number, y0: number, y1: number): [Layer, G] {
  const [c, g] = canvas(LW, y1 - y0);
  g.translate(0, -y0);
  return [{ c, f, y0 }, g];
}

// ---------------------------------------------------------------- baking
function bakeSky(): Layer {
  const [L, g] = layer(0.05, -260, GROUND);
  const r = rng(3);
  const s = g.createLinearGradient(0, -260, 0, GROUND);
  const at = (y: number) => (y + 260) / (GROUND + 260);
  s.addColorStop(0, '#03041a');
  s.addColorStop(at(150), '#0a1238');
  s.addColorStop(at(420), '#16307a');
  s.addColorStop(at(560), '#2569b4');
  s.addColorStop(at(640), '#4cc8ee');
  s.addColorStop(1, '#2a8fd0');
  g.fillStyle = s;
  g.fillRect(0, -260, LW, GROUND + 260);
  for (let i = 0; i < 140; i++) {
    g.fillStyle = `rgba(220,235,255,${0.25 + r() * 0.6})`;
    const z = r() < 0.1 ? 2.2 : 1.3;
    g.fillRect(r() * LW, -200 + r() * 520, z, z);
  }
  // a wide glow on the horizon behind the city
  g.globalCompositeOperation = 'lighter';
  g.save();
  g.translate(LW / 2, HORIZON - 20);
  g.scale(1, 0.32);
  const gl = g.createRadialGradient(0, 0, 0, 0, 0, 1100);
  gl.addColorStop(0, 'rgba(120,230,255,0.45)');
  gl.addColorStop(1, 'rgba(120,230,255,0)');
  g.fillStyle = gl;
  g.fillRect(-1300, -1100, 2600, 2200);
  g.restore();
  return L;
}

function bakeFar(tops: Pt[]): Layer {
  const [L, g] = layer(0.12, 220, 720);
  const r = rng(11);
  let x = -20;
  while (x < LW) {
    const w = 22 + r() * 50;
    const ht = 60 + r() * 210 + (r() < 0.14 ? 130 : 0);
    const top = HORIZON + 30 - ht;
    const fill = g.createLinearGradient(0, top, 0, HORIZON + 40);
    fill.addColorStop(0, '#24478a');
    fill.addColorStop(1, '#3a86c2');
    g.fillStyle = fill;
    g.fillRect(x, top, w, ht + 60);
    for (let yy = top + 6; yy < HORIZON + 20; yy += 9)
      for (let xx = x + 3; xx < x + w - 3; xx += 6)
        if (r() < 0.22) {
          g.fillStyle = `rgba(170,240,255,${0.3 + r() * 0.45})`;
          g.fillRect(xx, yy, 2, 3);
        }
    if (r() < 0.35) {
      g.strokeStyle = '#2c56a0';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x + w / 2, top);
      g.lineTo(x + w / 2, top - 20 - r() * 40);
      g.stroke();
    }
    tops.push({ x: x + w / 2, y: top });
    x += w * (0.55 + r() * 0.6);
  }
  const haze = g.createLinearGradient(0, HORIZON - 240, 0, HORIZON + 40);
  haze.addColorStop(0, 'rgba(90,210,245,0)');
  haze.addColorStop(1, 'rgba(110,220,250,0.5)');
  g.fillStyle = haze;
  g.fillRect(0, HORIZON - 240, LW, 300);
  return L;
}

function bakeCity(): Layer {
  const [L, g] = layer(0.22, HORIZON - 10, GROUND + 10);
  const r = rng(23);
  const base = g.createLinearGradient(0, HORIZON, 0, GROUND);
  base.addColorStop(0, '#1d5594');
  base.addColorStop(0.35, '#0f2c5e');
  base.addColorStop(1, '#081633');
  g.fillStyle = base;
  g.fillRect(0, HORIZON, LW, GROUND - HORIZON + 10);
  const vx = LW / 2;
  const vy = HORIZON - 70;
  const N = 7;
  const rows: number[] = [];
  for (let k = 0; k <= N; k++) rows.push(HORIZON + (GROUND - HORIZON) * Math.pow(k / N, 1.5));
  const cols: number[] = [];
  for (let bx = -LW; bx <= 2 * LW; bx += 170) cols.push(bx);
  const xAt = (bx: number, y: number) => vx + ((bx - vx) * (y - vy)) / (GROUND - vy);
  // glowing streets
  g.globalCompositeOperation = 'lighter';
  for (const [w, col] of [[6, 'rgba(70,220,255,0.22)'], [1.4, 'rgba(170,250,255,0.85)']] as const) {
    g.strokeStyle = col;
    g.lineWidth = w;
    for (const y of rows.slice(1)) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(LW, y);
      g.stroke();
    }
    for (const bx of cols) {
      g.beginPath();
      g.moveTo(xAt(bx, HORIZON), HORIZON);
      g.lineTo(xAt(bx, GROUND), GROUND);
      g.stroke();
    }
  }
  g.globalCompositeOperation = 'source-over';
  // low blocks in the cells, far rows first
  for (let k = 0; k < N; k++) {
    const y0 = rows[k];
    const y1 = rows[k + 1];
    const bh = y1 - y0;
    for (let j = 0; j < cols.length - 1; j++) {
      if (r() < 0.25) continue;
      const ym = (y0 + y1) / 2;
      const xl = xAt(cols[j], ym);
      const xr = xAt(cols[j + 1], ym);
      if (xr < -50 || xl > LW + 50) continue;
      const inset = (xr - xl) * (0.12 + r() * 0.1);
      const bottom = y1 - bh * 0.18;
      const top = y0 + bh * 0.2 - r() * bh * 1.9;
      g.fillStyle = '#0f275a';
      g.fillRect(xl + inset, top, xr - xl - inset * 2, bottom - top);
      g.fillStyle = '#2a5ea4';
      g.fillRect(xl + inset, top, xr - xl - inset * 2, Math.max(2, bh * 0.06));
      const n = Math.floor(((xr - xl) / 14) * ((bottom - top) / 10) * 0.25);
      for (let i = 0; i < n; i++) {
        g.fillStyle = r() < 0.3 ? 'rgba(255,110,215,0.8)' : 'rgba(130,235,255,0.75)';
        g.fillRect(xl + inset + 3 + r() * (xr - xl - inset * 2 - 6), top + 4 + r() * (bottom - top - 8), 2, 2);
      }
      if (r() < 0.1) {
        g.fillStyle = r() < 0.5 ? '#ff5ec8' : '#5ef0ff';
        g.fillRect(xl + inset + 4, top - 6, (xr - xl - inset * 2) * 0.5, 4);
      }
    }
  }
  const haze = g.createLinearGradient(0, HORIZON - 10, 0, HORIZON + 50);
  haze.addColorStop(0, 'rgba(110,220,250,0.45)');
  haze.addColorStop(1, 'rgba(110,220,250,0)');
  g.fillStyle = haze;
  g.fillRect(0, HORIZON - 10, LW, 60);
  return L;
}

function bakeMid(tips: Pt[]): Layer {
  const [L, g] = layer(0.34, 0, GROUND);
  const r = rng(41);
  let x = 30;
  while (x < LW) {
    const centre = Math.abs(x - LW / 2) < 380;
    const w = (centre ? 60 : 80) + r() * (centre ? 50 : 80);
    const top = (centre ? 300 : 130) + r() * 260;
    const fill = g.createLinearGradient(0, top, 0, GROUND);
    fill.addColorStop(0, '#15225e');
    fill.addColorStop(1, '#0b1540');
    g.fillStyle = fill;
    g.fillRect(x, top, w, GROUND - top);
    let tipY = top;
    if (r() < 0.55) {
      const cw = w * (0.45 + r() * 0.2);
      const ch = 24 + r() * 40;
      g.fillRect(x + (w - cw) / 2, top - ch, cw, ch + 2);
      tipY = top - ch;
    }
    if (r() < 0.6) {
      const sh = 40 + r() * 70;
      g.strokeStyle = '#1a2a6a';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x + w / 2, tipY);
      g.lineTo(x + w / 2, tipY - sh);
      g.stroke();
      tipY -= sh;
    }
    tips.push({ x: x + w / 2, y: tipY });
    // rim light on the side facing the glow
    const rim = g.createLinearGradient(0, top, 0, HORIZON + 60);
    rim.addColorStop(0, 'rgba(120,240,255,0.75)');
    rim.addColorStop(1, 'rgba(120,240,255,0.05)');
    g.fillStyle = rim;
    g.fillRect(x < LW / 2 ? x + w - 3 : x, top, 3, HORIZON + 60 - top);
    g.fillStyle = 'rgba(160,245,255,0.5)';
    g.fillRect(x, top, w, 2);
    for (let yy = top + 10; yy < HORIZON + 60; yy += 12)
      for (let xx = x + 6; xx < x + w - 8; xx += 9)
        if (r() < 0.28) {
          g.fillStyle = r() < 0.82 ? `rgba(120,235,255,${0.35 + r() * 0.5})` : `rgba(255,120,220,${0.5 + r() * 0.4})`;
          g.fillRect(xx, yy, 4, 5);
        }
    if (r() < 0.45) {
      const sx = x + w * (0.25 + r() * 0.4);
      const sy = top + 30 + r() * 120;
      const sh = 60 + r() * 70;
      const col = r() < 0.5 ? '255,90,200' : '90,235,255';
      g.fillStyle = `rgba(${col},0.22)`;
      g.fillRect(sx - 6, sy - 6, 28, sh + 12);
      g.fillStyle = `rgba(${col},0.95)`;
      g.fillRect(sx, sy, 16, sh);
      g.fillStyle = 'rgba(10,14,40,0.75)';
      for (let yy = sy + 8; yy < sy + sh - 6; yy += 14) g.fillRect(sx + 4, yy, 8, 6);
    }
    x += w + 40 + r() * 120;
  }
  return L;
}

function bakeNear(signs: Sign[], panels: Panel[]): Layer {
  const [L, g] = layer(0.62, -260, GROUND);
  const blocks = [
    { x: 0, w: 300, top: 130, side: 1, strip: '255,205,90' },
    { x: 470, w: 330, top: -140, side: 1, strip: '255,205,90' },
    { x: 1800, w: 330, top: 240, side: -1, strip: '255,110,220' },
    { x: 2170, w: 430, top: -80, side: -1, strip: '120,235,255' },
  ];
  for (const b of blocks) {
    const fill = g.createLinearGradient(0, b.top, 0, GROUND);
    fill.addColorStop(0, '#0d1336');
    fill.addColorStop(1, '#060920');
    g.fillStyle = fill;
    g.fillRect(b.x, b.top, b.w, GROUND - b.top);
    // floor light strips
    for (let yy = b.top + 40; yy < GROUND - 30; yy += 70) {
      g.fillStyle = `rgba(${b.strip},0.12)`;
      g.fillRect(b.x, yy - 3, b.w, 10);
      g.fillStyle = `rgba(${b.strip},0.55)`;
      g.fillRect(b.x, yy, b.w, 2);
    }
    // rim on the edge facing the arena
    const ex = b.side > 0 ? b.x + b.w - 4 : b.x;
    g.fillStyle = 'rgba(120,240,255,0.7)';
    g.fillRect(ex, b.top, 4, GROUND - b.top);
    g.fillStyle = 'rgba(120,240,255,0.15)';
    g.fillRect(ex - 6, b.top, 16, GROUND - b.top);
    g.fillStyle = `rgba(${b.strip},0.8)`;
    g.fillRect(b.x, b.top, b.w, 3);
  }
  // rooftop gear on the left frame building
  g.fillStyle = '#0d1336';
  g.fillRect(520, -200, 70, 60);
  g.fillRect(700, -230, 14, 90);
  // sign tower on the right frame building
  g.fillRect(1880, 150, 8, 90);
  g.fillRect(2060, 150, 8, 90);
  // warm mist at the foot of the left buildings
  g.globalCompositeOperation = 'lighter';
  g.save();
  g.translate(420, GROUND - 40);
  g.scale(1, 0.4);
  const mist = g.createRadialGradient(0, 0, 0, 0, 0, 500);
  mist.addColorStop(0, 'rgba(255,210,90,0.35)');
  mist.addColorStop(1, 'rgba(255,210,90,0)');
  g.fillStyle = mist;
  g.fillRect(-500, -500, 1000, 1000);
  g.restore();
  g.globalCompositeOperation = 'source-over';
  signs.push({ x: 630, y: -80, w: 140, h: 240, phase: 0 });
  signs.push({ x: 140, y: 230, w: 120, h: 190, phase: 0.55 });
  signs.push({ x: 1830, y: 330, w: 120, h: 230, phase: 0.3 });
  signs.push({ x: 1975, y: 300, w: 130, h: 270, phase: 0.8 });
  signs.push({ x: 2240, y: 60, w: 160, h: 260, phase: 0.15 });
  panels.push({ x: 560, y: 250, w: 220, h: 70, text: 'LIGHTNING LAB  ·  TONIGHT 1V1  ·  ', col: '#ffd84a', speed: 0.9 });
  panels.push({ x: 1865, y: 175, w: 210, h: 56, text: 'VOLT CITY  ·  ELEMENTICK ARENA  ·  ', col: '#ff6ad5', speed: 0.7 });
  // frames for every sign and panel
  for (const s of [...signs, ...panels]) {
    g.fillStyle = '#04061a';
    g.fillRect(s.x - 6, s.y - 6, s.w + 12, s.h + 12);
    g.strokeStyle = 'rgba(160,240,255,0.5)';
    g.lineWidth = 2;
    g.strokeRect(s.x - 6, s.y - 6, s.w + 12, s.h + 12);
  }
  return L;
}

function bolt(g: G, cx: number, cy: number, s: number, col: string): void {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(cx + 0.15 * s, cy - 0.5 * s);
  g.lineTo(cx - 0.25 * s, cy + 0.05 * s);
  g.lineTo(cx + 0.02 * s, cy + 0.05 * s);
  g.lineTo(cx - 0.12 * s, cy + 0.5 * s);
  g.lineTo(cx + 0.28 * s, cy - 0.08 * s);
  g.lineTo(cx + 0.02 * s, cy - 0.08 * s);
  g.closePath();
  g.fill();
}
/** Billboard pictures (original): a volt badge, the game name, a fighter pose and a live show card. */
function bakeBoards(): { boards: HTMLCanvasElement[]; halos: HTMLCanvasElement[] } {
  const W = 200;
  const H = 320;
  const boards: HTMLCanvasElement[] = [];
  const cols = ['80,220,255', '255,80,200', '255,210,80', '170,110,255'];
  const font = (px: number) => `900 ${px}px Orbitron, Arial Black, Arial, sans-serif`;
  for (let k = 0; k < 4; k++) {
    const [c, g] = canvas(W, H);
    const bg = g.createLinearGradient(0, 0, 0, H);
    g.textAlign = 'center';
    if (k === 0) {
      bg.addColorStop(0, '#0b1440');
      bg.addColorStop(1, '#1d3a8a');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      g.strokeStyle = '#5ef0ff';
      g.lineWidth = 9;
      g.beginPath();
      g.arc(W / 2, 130, 70, 0, Math.PI * 2);
      g.stroke();
      g.shadowColor = '#ffd84a';
      g.shadowBlur = 24;
      bolt(g, W / 2, 130, 120, '#ffd84a');
      g.shadowBlur = 0;
      g.fillStyle = '#e8fbff';
      g.font = font(46);
      g.fillText('VOLT', W / 2, 270);
    } else if (k === 1) {
      bg.addColorStop(0, '#ff3fb0');
      bg.addColorStop(1, '#6a1fd0');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      g.save();
      g.translate(W / 2 + 14, H / 2);
      g.rotate(-Math.PI / 2);
      g.fillStyle = '#fff';
      g.font = font(40);
      g.shadowColor = '#ffd0f4';
      g.shadowBlur = 14;
      g.fillText('ELEMENTICK', 0, 0);
      g.restore();
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.font = font(22);
      g.fillText('1 V 1', W / 2 - 52, 40);
    } else if (k === 2) {
      bg.addColorStop(0, '#04202e');
      bg.addColorStop(1, '#0a5a7a');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      g.strokeStyle = '#ffd84a';
      g.lineWidth = 11;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.shadowColor = '#ffd84a';
      g.shadowBlur = 16;
      g.beginPath();
      g.arc(92, 62, 22, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(88, 86);
      g.lineTo(80, 160);
      g.moveTo(86, 104);
      g.lineTo(130, 112);
      g.lineTo(172, 98);
      g.moveTo(86, 104);
      g.lineTo(58, 128);
      g.lineTo(76, 140);
      g.moveTo(80, 160);
      g.lineTo(122, 196);
      g.lineTo(130, 244);
      g.moveTo(80, 160);
      g.lineTo(46, 200);
      g.lineTo(28, 244);
      g.stroke();
      g.shadowBlur = 0;
      bolt(g, 176, 86, 44, '#8ff4ff');
      g.fillStyle = '#e8fbff';
      g.font = font(28);
      g.fillText('FIGHT', W / 2, 284);
      g.fillText('NIGHT', W / 2, 312);
    } else {
      bg.addColorStop(0, '#24104e');
      bg.addColorStop(1, '#3a1a7a');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#ff4a6a';
      g.beginPath();
      g.arc(54, 40, 9, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.font = font(28);
      g.fillText('LIVE', 116, 50);
      const r = rng(5);
      for (let i = 0; i < 8; i++) {
        const h = 40 + r() * 140;
        g.fillStyle = i % 2 ? '#5ef0ff' : '#ff6ad5';
        g.fillRect(20 + i * 21, 250 - h, 14, h);
      }
      g.fillStyle = '#ffd84a';
      g.font = font(30);
      g.fillText('STORM', W / 2, 300);
    }
    // scanlines
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
    boards.push(c);
  }
  const halos = cols.map((col) => {
    const [c, g] = canvas(128, 128);
    const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64);
    gr.addColorStop(0, `rgba(${col},0.6)`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return c;
  });
  return { boards, halos };
}

/** A storm cloud bank: soft puffs lit from above, dark underneath. The lit copy glows when lightning flashes. */
export function bakeCloud(w: number, h: number, seed: number, lit: boolean): HTMLCanvasElement {
  const [c, g] = canvas(w, h);
  const r = rng(seed);
  const puffs: Array<{ x: number; y: number; r: number }> = [];
  // a dark body first, then many soft puffs (no hard rims, so it reads as one storm mass, not bubbles)
  for (let i = 0; i < 260; i++) {
    const k = 0.04 + r() * 0.92;
    const x = k * w;
    const mid = h * 0.5 + Math.sin(k * Math.PI * 3 + seed) * h * 0.1;
    const taper = Math.max(0.25, 1 - Math.abs(k - 0.5) * 1.3);
    const body = i < 90;
    puffs.push({ x, y: mid + (r() - 0.5) * h * (body ? 0.2 : 0.42) * taper, r: (body ? h * 0.2 + r() * h * 0.12 : h * 0.05 + r() * h * 0.13) * taper });
  }
  puffs.sort((a, b) => b.y - a.y);
  for (const p of puffs) {
    const gr = g.createRadialGradient(p.x - p.r * 0.2, p.y - p.r * 0.45, 0, p.x, p.y, p.r);
    if (lit) {
      gr.addColorStop(0, 'rgba(210,235,255,0.35)');
      gr.addColorStop(0.5, 'rgba(120,170,240,0.15)');
      gr.addColorStop(1, 'rgba(60,90,190,0)');
    } else {
      gr.addColorStop(0, 'rgba(78,88,128,0.55)');
      gr.addColorStop(0.5, 'rgba(40,46,80,0.5)');
      gr.addColorStop(1, 'rgba(24,28,52,0)');
    }
    g.fillStyle = gr;
    g.beginPath();
    g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    g.fill();
  }
  if (!lit) {
    g.globalCompositeOperation = 'source-atop';
    const under = g.createLinearGradient(0, 0, 0, h);
    under.addColorStop(0.35, 'rgba(8,10,28,0)');
    under.addColorStop(1, 'rgba(8,10,28,0.65)');
    g.fillStyle = under;
    g.fillRect(0, 0, w, h);
  }
  return c;
}

function bakeFog(): HTMLCanvasElement {
  const [c, g] = canvas(LW, 200);
  const r = rng(77);
  for (let i = 0; i < 46; i++) {
    const x = r() * LW;
    const y = 60 + r() * 90;
    const rad = 80 + r() * 140;
    for (const dx of [-LW, 0, LW]) {
      const gr = g.createRadialGradient(x + dx, y, 0, x + dx, y, rad);
      gr.addColorStop(0, 'rgba(140,215,255,0.13)');
      gr.addColorStop(1, 'rgba(140,215,255,0)');
      g.fillStyle = gr;
      g.fillRect(x + dx - rad, y - rad, rad * 2, rad * 2);
    }
  }
  return c;
}

const FW = STAGE_W + 600;
const FH = STAGE_H - GROUND + 140;
function bakeFloor(): { base: HTMLCanvasElement; top: HTMLCanvasElement } {
  const [base, b] = canvas(FW, FH);
  const bg = b.createLinearGradient(0, 0, 0, FH);
  bg.addColorStop(0, '#1b2766');
  bg.addColorStop(0.5, '#0c1236');
  bg.addColorStop(1, '#05071a');
  b.fillStyle = bg;
  b.fillRect(0, 0, FW, FH);
  const [top, g] = canvas(FW, FH);
  // reflections fade out toward the viewer
  const fade = g.createLinearGradient(0, 0, 0, FH);
  fade.addColorStop(0, 'rgba(6,8,26,0)');
  fade.addColorStop(0.6, 'rgba(6,8,26,0.6)');
  fade.addColorStop(1, 'rgba(6,8,26,0.9)');
  g.fillStyle = fade;
  g.fillRect(0, 0, FW, FH);
  const cx = FW / 2;
  g.strokeStyle = 'rgba(140,195,255,0.16)';
  g.lineWidth = 2;
  for (let bx = -FW; bx < 2 * FW; bx += 170) {
    g.beginPath();
    g.moveTo(cx + (bx - cx) * 0.42, 0);
    g.lineTo(bx, FH);
    g.stroke();
  }
  for (const y of [28, 68, 124, 200]) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(FW, y);
    g.stroke();
  }
  // gloss streak
  const gl = g.createLinearGradient(0, 30, 0, 64);
  gl.addColorStop(0, 'rgba(255,255,255,0)');
  gl.addColorStop(0.5, 'rgba(200,230,255,0.05)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gl;
  g.fillRect(0, 30, FW, 34);
  // roof edge rails
  g.strokeStyle = 'rgba(255,216,74,0.22)';
  g.lineWidth = 16;
  g.beginPath();
  g.moveTo(0, 1);
  g.lineTo(FW, 1);
  g.stroke();
  g.strokeStyle = '#ffd84a';
  g.lineWidth = 4;
  g.stroke();
  g.strokeStyle = 'rgba(255,216,74,0.5)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, 16);
  g.lineTo(FW, 16);
  g.stroke();
  // centre ring
  g.save();
  g.translate(cx, 64);
  g.scale(1, 0.28);
  g.strokeStyle = 'rgba(80,220,255,0.55)';
  g.lineWidth = 8;
  g.beginPath();
  g.arc(0, 0, 170, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, 0, 130, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  return { base, top };
}

export function bakeStage(): Arena {
  const farTops: Pt[] = [];
  const tips: Pt[] = [];
  const signs: Sign[] = [];
  const panels: Panel[] = [];
  const far = bakeFar(farTops);
  const mid = bakeMid(tips);
  const near = bakeNear(signs, panels);
  const { boards, halos } = bakeBoards();
  const floor = bakeFloor();
  const pick = (k: number) => tips.reduce((a, b) => (Math.abs(b.x - LW * k) < Math.abs(a.x - LW * k) ? b : a));
  const [glow, gg] = canvas(128, 128);
  const gr = gg.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  gg.fillStyle = gr;
  gg.fillRect(0, 0, 128, 128);
  const A: Arena = {
    sky: bakeSky(),
    far,
    city: bakeCity(),
    mid,
    near,
    clouds: [bakeCloud(1500, 420, 1, false), bakeCloud(1400, 380, 2, false), bakeCloud(1100, 300, 3, false)],
    cloudsLit: [bakeCloud(1500, 420, 1, true), bakeCloud(1400, 380, 2, true), bakeCloud(1100, 300, 3, true)],
    fog: bakeFog(),
    floorBase: floor.base,
    floorTop: floor.top,
    boards,
    halos,
    glow,
    farTops,
    tips,
    upBeams: [pick(0.3), pick(0.56), pick(0.8)],
    signs,
    panels,
    ledText: 'ELEMENTICK ARENA   ⚡   LIGHTNING LAB   ⚡   VOLT CITY ROOFTOP   ⚡   ',
    ledW: 0,
  };
  return A;
}

// ---------------------------------------------------------------- per frame
interface Strike {
  x: number;
  y: number;
  tx: number;
  ty: number;
  seed: number;
  a: number;
  big: boolean;
}
const FLICKER = [1, 0.3, 1, 0.85, 0.35, 0.9, 0.75, 0.6];
/** Sky bolts on fixed timetables: each slot of P frames holds one strike at a hashed time and place. */
function strikes(A: Arena, frame: number, storm: number): Strike[] {
  const out: Strike[] = [];
  const slot = (P: number, salt: number, dur: number) => {
    const n = Math.floor(frame / P);
    for (const k of [n - 1, n]) {
      const h1 = hash(k * 7 + salt);
      const h2 = hash(k * 13 + salt * 3 + 1);
      const h3 = hash(k * 31 + salt * 5 + 2);
      const t = frame - (k * P + Math.floor(h1 * P * 0.6));
      if (t < 0 || t >= dur) continue;
      const tg = A.tips[Math.floor(h2 * A.tips.length)];
      out.push({ x: tg.x + (h3 - 0.5) * 220, y: 30 + h3 * 60, tx: tg.x, ty: tg.y, seed: k * 101 + salt + Math.floor(t / 3), a: (1 - t / dur) * FLICKER[t % 8], big: h3 > 0.55 });
    }
  };
  slot(150, 1, 20);
  slot(220, 5, 18);
  if (storm > 0.25) slot(36, 9, 14);
  return out;
}
/** sheet lightning: a glow inside the clouds with no bolt */
function sheets(frame: number): Array<{ x: number; a: number }> {
  const out: Array<{ x: number; a: number }> = [];
  const P = 97;
  const n = Math.floor(frame / P);
  for (const k of [n - 1, n]) {
    const t = frame - (k * P + Math.floor(hash(k * 17 + 3) * P * 0.7));
    if (t >= 0 && t < 12) out.push({ x: hash(k * 19 + 4) * LW, a: (1 - t / 12) * FLICKER[(t + 3) % 8] });
  }
  return out;
}

function beam(g: G, ox: number, oy: number, ang: number, spread: number, len: number, rgb: string, a: number): void {
  const grad = g.createLinearGradient(ox, oy, ox + Math.cos(ang) * len, oy + Math.sin(ang) * len);
  grad.addColorStop(0, `rgba(${rgb},${a})`);
  grad.addColorStop(0.7, `rgba(${rgb},${a * 0.25})`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(ox, oy);
  g.lineTo(ox + Math.cos(ang - spread) * len, oy + Math.sin(ang - spread) * len);
  g.lineTo(ox + Math.cos(ang + spread) * len, oy + Math.sin(ang + spread) * len);
  g.closePath();
  g.fill();
}

/**
 * Draw the arena behind the fighters, in stage space (after the camera transform).
 * flash: the fight's screen flash (powers light up the sky); storm 0..1 adds extra strikes (the ultimate).
 */
export function drawArena(g: G, A: Arena, camX: number, frame: number, flash: number, storm: number): void {
  const px = (f: number) => -200 + (camX - STAGE_W / 2) * (1 - f);
  const lay = (L: Layer) => g.drawImage(L.c, px(L.f), L.y0);
  const st = strikes(A, frame, storm);
  const sh = sheets(frame);
  let sky = Math.min(1, flash / 10);
  for (const s of st) sky = Math.max(sky, s.a * (s.big ? 0.9 : 0.55));
  for (const s of sh) sky = Math.max(sky, s.a * 0.4);

  lay(A.sky);
  if (sky > 0.01) {
    g.fillStyle = `rgba(130,185,255,${0.12 * sky})`;
    g.fillRect(-600, -400, STAGE_W + 1200, GROUND + 400);
  }
  // storm clouds drifting across the sky
  const bands = [
    { i: 0, y: -170, v: 0.05, f: 0.06, ph: 0 },
    { i: 1, y: -90, v: 0.09, f: 0.08, ph: 1300 },
    { i: 2, y: 10, v: 0.16, f: 0.1, ph: 500 },
  ];
  const drawBand = (b: (typeof bands)[number]) => {
    const c = A.clouds[b.i];
    const period = LW + c.width;
    for (const k of [0, 0.5]) {
      const x = ((frame * b.v + b.ph + k * period) % period) - c.width + px(b.f);
      g.drawImage(c, x, b.y);
      if (sky > 0.02) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = Math.min(1, sky * 0.6);
        g.drawImage(A.cloudsLit[b.i], x, b.y);
        g.restore();
      }
    }
  };
  drawBand(bands[0]);
  drawBand(bands[1]);
  lay(A.far);
  lay(A.city);
  // drifting mist on the horizon
  const fx = ((frame * 0.25) % LW) + px(0.25);
  g.drawImage(A.fog, fx - LW, HORIZON - 120);
  g.drawImage(A.fog, fx, HORIZON - 120);
  lay(A.mid);
  const om = px(A.mid.f);
  g.save();
  g.globalCompositeOperation = 'lighter';
  // searchlights sweeping up into the clouds from the towers
  A.upBeams.forEach((t, i) => {
    const ang = -Math.PI / 2 + Math.sin(frame * 0.006 + i * 2.1) * 0.38;
    beam(g, t.x + om, t.y, ang, 0.05, 820, '150,235,255', 0.2);
  });
  // red aircraft lights on the spires
  A.tips.forEach((t, i) => {
    if ((frame + i * 37) % 84 < 9) {
      g.fillStyle = 'rgba(255,60,80,0.95)';
      g.fillRect(t.x + om - 2, t.y - 2, 4, 4);
      g.globalAlpha = 0.5;
      g.drawImage(A.glow, t.x + om - 14, t.y - 14, 28, 28);
      g.globalAlpha = 1;
    }
  });
  g.restore();
  drawBand(bands[2]);
  // sky bolts out of the clouds onto the tower spires
  for (const s of st) {
    drawBolt(g, { x: s.x + om, y: s.y }, { x: s.tx + om, y: s.ty }, s.seed, s.big ? 2.6 : 1.6, s.a, s.big ? 'white' : 'cyan', s.big ? 4 : 2);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = s.a * 0.8;
    g.drawImage(A.glow, s.tx + om - 60, s.ty - 60, 120, 120);
    g.restore();
  }
  // glow inside the clouds where lightning fires
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const s of st) {
    g.globalAlpha = s.a * (s.big ? 0.6 : 0.4);
    g.drawImage(A.glow, s.x + om - 380, s.y - 200, 760, 330);
  }
  const os = px(0.08);
  for (const s of sh) {
    g.globalAlpha = s.a * 0.45;
    g.drawImage(A.glow, s.x + os - 420, -40, 840, 300);
  }
  // air traffic crossing the city
  g.globalAlpha = 1;
  for (let i = 0; i < 7; i++) {
    const h = hash(i * 5 + 50);
    const v = (0.35 + hash(i * 5 + 51) * 0.6) * (i % 2 ? 1 : -1);
    const x = (((h * LW + frame * v) % LW) + LW) % LW + om;
    const y = 240 + hash(i * 5 + 52) * 220;
    g.fillStyle = 'rgba(235,250,255,0.9)';
    g.fillRect(x - 1.5, y - 1.5, 3, 3);
    g.globalAlpha = 0.35;
    g.drawImage(A.glow, x - 8, y - 8, 16, 16);
    g.globalAlpha = 1;
    if ((frame + i * 11) % 40 < 6) {
      g.fillStyle = 'rgba(255,70,90,0.95)';
      g.fillRect(x - v * 9 - 1.5, y - 1.5, 3, 3);
    }
  }
  g.restore();
  lay(A.near);
  const on = px(A.near.f);
  // billboards: change picture every few seconds with a flicker, light band rolling down
  A.signs.forEach((s, i) => {
    const t = frame / 260 + s.phase + i * 0.37;
    const idx = Math.floor(t) % A.boards.length;
    const fr = t - Math.floor(t);
    const a = fr < 0.035 ? (frame % 4 < 2 ? 0.25 : 0.85) : 0.95;
    const x = s.x + on;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.55 * a;
    g.drawImage(A.halos[idx], x - 50, s.y - 50, s.w + 100, s.h + 100);
    g.restore();
    g.globalAlpha = a;
    g.drawImage(A.boards[idx], x, s.y, s.w, s.h);
    g.globalAlpha = 1;
    const by = s.y + ((frame * 1.4 + i * 70) % (s.h + 40)) - 20;
    g.fillStyle = 'rgba(255,255,255,0.09)';
    g.fillRect(x, Math.max(s.y, by), s.w, Math.max(0, Math.min(16, s.y + s.h - by)));
  });
  // scrolling text panels
  for (const p of A.panels) {
    const x = p.x + on;
    g.save();
    g.beginPath();
    g.rect(x, p.y, p.w, p.h);
    g.clip();
    g.fillStyle = '#080b26';
    g.fillRect(x, p.y, p.w, p.h);
    g.font = `900 ${Math.round(p.h * 0.5)}px Orbitron, Arial Black, Arial, sans-serif`;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.fillStyle = p.col;
    const tw = g.measureText(p.text).width;
    const sx = x - ((frame * p.speed) % tw);
    for (let k = 0; k < 3; k++) g.fillText(p.text, sx + k * tw, p.y + p.h / 2 + 1);
    g.restore();
  }
  // gold floodlights from the top left, landing on the roof
  const ox = 420 + on;
  const oy = -300;
  const gold = [0.98 + Math.sin(frame * 0.011) * 0.13, 1.22 + Math.sin(frame * 0.008 + 2) * 0.1];
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const ang of gold) beam(g, ox, oy, ang, 0.065, 1600, '255,215,100', 0.26);
  beam(g, 2010 + on, 150, -2.25 + Math.sin(frame * 0.009 + 1) * 0.2, 0.05, 900, '140,230,255', 0.2);
  // sparks drifting up through the air
  for (let i = 0; i < 48; i++) {
    const a = hash(i * 3 + 1);
    const b = hash(i * 3 + 2);
    const vx = 0.25 + a * 0.6;
    const vy = 0.35 + b * 0.7;
    const x = ((a * LW * 7 + frame * vx) % LW) + px(0.8);
    const y = GROUND - 30 - ((b * 900 + frame * vy) % 560);
    const tw = 0.45 + 0.55 * Math.sin(frame * 0.12 + i * 1.7);
    const cyan = hash(i * 3 + 3) >= 0.72;
    const col = cyan ? '130,240,255' : '255,215,90';
    g.globalAlpha = 0.6 * tw;
    g.drawImage(A.halos[cyan ? 0 : 2], x - 8, y - 8, 16, 16);
    g.globalAlpha = 1;
    g.strokeStyle = `rgba(${col},${0.9 * tw})`;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - vx * 7, y + vy * 7);
    g.stroke();
  }
  g.restore();
  // LED rail along the roof edge
  g.fillStyle = 'rgba(8,10,34,0.92)';
  g.fillRect(-300, GROUND - 24, FW, 24);
  g.fillStyle = 'rgba(120,240,255,0.7)';
  g.fillRect(-300, GROUND - 24, FW, 2);
  g.font = '900 15px Orbitron, Arial Black, Arial, sans-serif';
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  if (!A.ledW) A.ledW = g.measureText(A.ledText).width;
  g.fillStyle = 'rgba(255,216,74,0.85)';
  for (let x = -300 - ((frame * 0.8) % A.ledW); x < STAGE_W + 300; x += A.ledW) g.fillText(A.ledText, x, GROUND - 11);
  // roof floor with the city mirrored in it
  g.drawImage(A.floorBase, -300, GROUND);
  g.save();
  g.beginPath();
  g.rect(-300, GROUND, FW, FH);
  g.clip();
  g.globalAlpha = 0.24 + sky * 0.2;
  g.translate(0, GROUND);
  g.scale(1, -0.45);
  g.translate(0, -GROUND);
  lay(A.mid);
  lay(A.near);
  g.restore();
  g.drawImage(A.floorTop, -300, GROUND);
  // pools of floodlight on the roof
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const ang of gold) {
    const hx = ox + Math.cos(ang) * ((GROUND - oy) / Math.sin(ang));
    g.globalAlpha = 0.7;
    g.drawImage(A.halos[2], hx - 220, GROUND - 6, 440, 90);
  }
  if (sky > 0.01) {
    g.globalAlpha = 1;
    g.fillStyle = `rgba(140,200,255,${0.1 * sky})`;
    g.fillRect(-300, GROUND, FW, FH);
  }
  g.restore();
}
