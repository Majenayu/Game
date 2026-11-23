/**
 * Code-drawn heads for the Hero Trial, one canvas per element and face (normal, attack, hurt, knocked out).
 * Same layout as the Lightning head picture: a round dark head with a thick glowing outline, the face toward +x,
 * the chin at the bottom of the canvas (pivot u 0.5, v 0.97), crowns and hair above it.
 * Looks from the owner's element sheets: fire flame hair, headband and eye slits; water wave hair and visor; ice
 * crystal crown; wind goggles; earth helmet with a visor slit; leaf laurel; light halo; gravity slit visor; time
 * gear crown.
 */
import type { ElementId, Kit } from './kits';
export type Face = 'normal' | 'attack' | 'hurt' | 'ko';
type G = CanvasRenderingContext2D;

const W = 220;
const R = 84;
const LW = 9;
/** extra room above the head for each crown */
const TOP: Record<ElementId, number> = { fire: 86, water: 40, ice: 74, wind: 16, earth: 22, leaf: 34, light: 64, gravity: 16, time: 46 };

function circle(g: G, x: number, y: number, r: number): void {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
}
/** fill and glowing outline for the path that is currently set */
function ink(g: G, fill: string | CanvasGradient, line: string, w = LW, glow = 14): void {
  g.save();
  g.fillStyle = fill;
  g.fill();
  g.shadowColor = line;
  g.shadowBlur = glow;
  g.strokeStyle = line;
  g.lineWidth = w;
  g.lineJoin = 'round';
  g.stroke();
  g.restore();
}
function poly(g: G, pts: Array<[number, number]>, smooth = false): void {
  g.beginPath();
  if (!smooth) {
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    return;
  }
  const n = pts.length;
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[n - 1], pts[0]);
  g.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n]);
    g.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  g.closePath();
}

/** A glass visor band across the front of the face. */
function visor(g: G, k: Kit, cx: number, cy: number, opts: { y?: number; h?: number; from?: number; tint?: string; symbol?: (g: G, x: number, y: number) => void; slit?: boolean } = {}): void {
  const y = cy + (opts.y ?? -0.12) * R;
  const h = (opts.h ?? 0.34) * R;
  const x0 = cx + (opts.from ?? -0.38) * R;
  const x1 = cx + R * 1.06;
  g.save();
  poly(g, [[x0, y - h * 0.45], [x1 - 6, y - h * 0.6], [x1 + 4, y - h * 0.1], [x1 - 2, y + h * 0.5], [x0 + 4, y + h * 0.55]], true);
  const gr = g.createLinearGradient(x0, y - h, x1, y + h);
  gr.addColorStop(0, opts.tint ?? 'rgba(20,30,60,0.95)');
  gr.addColorStop(0.55, k.line);
  gr.addColorStop(1, k.light);
  ink(g, opts.slit ? '#07060d' : gr, k.line, 5, 10);
  if (opts.slit) {
    g.shadowColor = k.light;
    g.shadowBlur = 16;
    g.fillStyle = k.light;
    poly(g, [[x0 + 18, y - 4], [x1 - 6, y - 7], [x1 - 8, y + 5], [x0 + 20, y + 4]], true);
    g.fill();
  } else {
    // glass shine
    g.fillStyle = 'rgba(255,255,255,0.45)';
    poly(g, [[x0 + 14, y - h * 0.3], [x1 - 22, y - h * 0.42], [x1 - 30, y - h * 0.18], [x0 + 18, y - h * 0.08]], true);
    g.fill();
  }
  opts.symbol?.(g, cx + R * 0.55, y);
  g.restore();
}
/** Mouth for each face, near the lower front of the head. */
function mouth(g: G, _k: Kit, cx: number, cy: number, face: Face, style: 'grin' | 'smile' | 'flat' = 'grin'): void {
  const mx = cx + R * 0.5;
  const my = cy + R * 0.48;
  g.save();
  g.lineCap = 'round';
  if (face === 'attack') {
    poly(g, [[mx - 22, my - 9], [mx + 22, my - 13], [mx + 16, my + 12], [mx - 14, my + 13]], true);
    g.fillStyle = '#05050b';
    g.fill();
    g.fillStyle = '#f4f6ff';
    g.fillRect(mx - 17, my - 10, 34, 6);
    g.fillRect(mx - 12, my + 6, 24, 4);
  } else if (face === 'hurt') {
    g.strokeStyle = '#f4f6ff';
    g.lineWidth = 4.5;
    g.beginPath();
    g.moveTo(mx - 20, my);
    for (let i = 1; i <= 6; i++) g.lineTo(mx - 20 + (i * 40) / 6, my + (i % 2 ? -5 : 5));
    g.stroke();
  } else if (face === 'ko') {
    g.strokeStyle = '#c9d3ea';
    g.lineWidth = 4.5;
    g.beginPath();
    g.moveTo(mx - 16, my + 3);
    g.lineTo(mx + 16, my - 2);
    g.stroke();
  } else if (style === 'grin') {
    poly(g, [[mx - 22, my - 6], [mx + 20, my - 12], [mx + 8, my + 9], [mx - 12, my + 7]], true);
    g.fillStyle = '#f4f6ff';
    g.fill();
    g.strokeStyle = '#0a0b18';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(mx - 18, my - 3);
    g.lineTo(mx + 15, my - 8);
    g.stroke();
  } else if (style === 'smile') {
    g.strokeStyle = '#f4f6ff';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(mx - 2, my - 14, 20, 0.35, 1.9);
    g.stroke();
  } else {
    g.strokeStyle = '#d6dcf0';
    g.lineWidth = 4.5;
    g.beginPath();
    g.moveTo(mx - 14, my + 2);
    g.lineTo(mx + 14, my - 1);
    g.stroke();
  }
  g.restore();
}
/** X marks over the eyes / a cracked visor when knocked out. */
function koEyes(g: G, cx: number, cy: number): void {
  g.save();
  g.strokeStyle = '#ffffff';
  g.lineWidth = 5;
  g.lineCap = 'round';
  for (const ex of [cx + R * 0.25, cx + R * 0.72]) {
    const ey = cy - R * 0.12;
    g.beginPath();
    g.moveTo(ex - 9, ey - 9);
    g.lineTo(ex + 9, ey + 9);
    g.moveTo(ex + 9, ey - 9);
    g.lineTo(ex - 9, ey + 9);
    g.stroke();
  }
  g.restore();
}
function crack(g: G, cx: number, cy: number): void {
  g.save();
  g.strokeStyle = '#ffffff';
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(cx + R * 0.45, cy - R * 0.32);
  g.lineTo(cx + R * 0.56, cy - R * 0.14);
  g.lineTo(cx + R * 0.48, cy + R * 0.02);
  g.moveTo(cx + R * 0.56, cy - R * 0.14);
  g.lineTo(cx + R * 0.76, cy - R * 0.18);
  g.stroke();
  g.restore();
}
/** Element symbol on the visor (small, like the bolt on the Lightning visor). */
function sym(id: ElementId): (g: G, x: number, y: number) => void {
  return (g, x, y) => {
    g.save();
    g.translate(x, y);
    g.shadowColor = '#ffffff';
    g.shadowBlur = 8;
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.strokeStyle = 'rgba(255,255,255,0.92)';
    g.lineWidth = 2.5;
    if (id === 'water') {
      g.beginPath();
      g.moveTo(0, -10);
      g.quadraticCurveTo(8, 2, 0, 8);
      g.quadraticCurveTo(-8, 2, 0, -10);
      g.fill();
    } else if (id === 'ice') {
      for (let i = 0; i < 3; i++) {
        g.rotate(Math.PI / 3);
        g.beginPath();
        g.moveTo(0, -9);
        g.lineTo(0, 9);
        g.stroke();
      }
    } else if (id === 'leaf') {
      g.rotate(-0.6);
      g.beginPath();
      g.ellipse(0, 0, 5, 10, 0, 0, Math.PI * 2);
      g.fill();
    } else if (id === 'light') {
      for (let i = 0; i < 8; i++) {
        g.rotate(Math.PI / 4);
        g.fillRect(-1.2, -11, 2.4, i % 2 ? 6 : 10);
      }
    } else if (id === 'time') {
      g.beginPath();
      g.moveTo(-6, -9);
      g.lineTo(6, -9);
      g.lineTo(-6, 9);
      g.lineTo(6, 9);
      g.closePath();
      g.stroke();
    } else if (id === 'wind') {
      g.beginPath();
      g.arc(0, 0, 7, 0.5, Math.PI * 1.6);
      g.stroke();
    }
    g.restore();
  };
}

/** Flame tongues (for fire hair and auras): layered red, orange, yellow. */
export function flameShape(g: G, x: number, base: number, w: number, h: number, lean: number, cols: string[]): void {
  cols.forEach((c, i) => {
    const k = 1 - i * 0.24;
    const hw = (w / 2) * k;
    const hh = h * k;
    g.beginPath();
    g.moveTo(x - hw, base);
    g.quadraticCurveTo(x - hw * 1.1, base - hh * 0.55, x + lean * k - hw * 0.15, base - hh);
    g.quadraticCurveTo(x + hw * 0.4, base - hh * 0.6, x + hw * 0.55, base - hh * 0.75);
    g.quadraticCurveTo(x + hw * 1.15, base - hh * 0.35, x + hw, base);
    g.closePath();
    g.fillStyle = c;
    g.fill();
  });
}

function drawHead(k: Kit, face: Face): HTMLCanvasElement {
  const top = TOP[k.id];
  const H = 2 * R + top + 26;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const cx = 100;
  const cy = H - 6 - R - LW / 2;
  const fill = k.fill;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // ---- behind the head
  if (k.id === 'fire') {
    g.save();
    g.shadowColor = '#ff6a1f';
    g.shadowBlur = 18;
    const tongues: Array<[number, number, number, number]> = [[-0.55, 0.9, 1.05, -14], [-0.1, 1.1, 1.45, -10], [0.35, 0.95, 1.2, -6], [0.7, 0.6, 0.85, -2]];
    for (const [dx, w, h, lean] of tongues) flameShape(g, cx + dx * R, cy - R * 0.55, w * R, h * R, lean, ['#ff3b1f', '#ff8a1f', '#ffd23a']);
    g.restore();
  } else if (k.id === 'time') {
    g.save();
    g.translate(cx - R * 0.35, cy - R * 0.6);
    gear(g, R * 0.72, 10, k.accent, '#3a2414');
    g.restore();
  } else if (k.id === 'water') {
    // swept wave crest over the back of the head
    g.save();
    poly(g, [[cx - R * 1.15, cy - R * 0.1], [cx - R * 1.05, cy - R * 0.95], [cx - R * 0.2, cy - R * 1.45], [cx + R * 0.55, cy - R * 1.2], [cx + R * 0.2, cy - R * 0.95], [cx - R * 0.5, cy - R * 0.75], [cx - R * 0.75, cy - R * 0.2]], true);
    const gr = g.createLinearGradient(cx - R, cy - R * 1.4, cx + R * 0.5, cy - R * 0.5);
    gr.addColorStop(0, '#9ff3ff');
    gr.addColorStop(1, '#1aa8e8');
    ink(g, gr, k.line, 6, 14);
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(cx - R * 0.1, cy - R * 0.6, R * 0.6, Math.PI * 1.15, Math.PI * 1.55);
    g.stroke();
    g.restore();
  }
  // ---- the head
  circle(g, cx, cy, R);
  ink(g, fill, k.line);
  // a subtle rim light on the back of the head
  g.save();
  g.strokeStyle = 'rgba(255,255,255,0.10)';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(cx, cy, R - 10, Math.PI * 0.75, Math.PI * 1.25);
  g.stroke();
  g.restore();
  // ---- crown and face per element
  switch (k.id) {
    case 'fire': {
      // red headband with a knot at the back (the tails are drawn by the rig so they can flutter)
      g.save();
      poly(g, [[cx - R * 1.02, cy - R * 0.42], [cx + R * 1.0, cy - R * 0.5], [cx + R * 1.02, cy - R * 0.22], [cx - R * 1.0, cy - R * 0.12]], true);
      ink(g, '#d81f1f', '#ff5a3a', 4, 8);
      circle(g, cx - R * 0.98, cy - R * 0.28, R * 0.13);
      ink(g, '#b51515', '#ff5a3a', 3, 6);
      g.restore();
      // glowing eye slits, slanted down to the front (angry when attacking)
      g.save();
      g.shadowColor = '#ffd23a';
      g.shadowBlur = 14;
      g.fillStyle = face === 'ko' ? 'rgba(0,0,0,0)' : '#ffe07a';
      const tilt = face === 'attack' ? 9 : 5;
      for (const ex of [cx + R * 0.18, cx + R * 0.66]) {
        poly(g, [[ex - 15, cy - R * 0.02 - tilt], [ex + 15, cy - R * 0.02 + 1], [ex + 12, cy + R * 0.1], [ex - 13, cy + R * 0.08]], true);
        g.fill();
      }
      g.restore();
      if (face === 'ko') koEyes(g, cx, cy + R * 0.1);
      mouth(g, k, cx, cy, face, 'flat');
      break;
    }
    case 'water':
      visor(g, k, cx, cy, { symbol: sym('water') });
      if (face === 'ko') crack(g, cx, cy);
      mouth(g, k, cx, cy, face, 'smile');
      break;
    case 'ice': {
      // crystal crown
      g.save();
      const spikes: Array<[number, number, number]> = [[-0.75, 0.55, -0.5], [-0.42, 0.95, -0.25], [-0.05, 1.2, 0], [0.32, 0.95, 0.2], [0.62, 0.6, 0.45]];
      for (const [dx, h, a] of spikes) {
        const bx = cx + dx * R;
        const by = cy - R * 0.72 + Math.abs(dx) * R * 0.25;
        const tx = bx + Math.sin(a) * h * R;
        const ty = by - Math.cos(a) * h * R;
        poly(g, [[bx - R * 0.16, by + 6], [tx, ty], [bx + R * 0.16, by + 6]]);
        const gr = g.createLinearGradient(bx, by, tx, ty);
        gr.addColorStop(0, '#6fc8ff');
        gr.addColorStop(1, '#ffffff');
        ink(g, gr, '#e6f7ff', 3.5, 12);
      }
      g.restore();
      visor(g, k, cx, cy, { symbol: sym('ice'), tint: 'rgba(30,60,110,0.95)' });
      if (face === 'ko') crack(g, cx, cy);
      mouth(g, k, cx, cy, face, 'flat');
      break;
    }
    case 'wind': {
      // goggles with a strap round the head
      g.save();
      g.strokeStyle = k.accent;
      g.lineWidth = 9;
      g.beginPath();
      g.arc(cx, cy, R - 3, Math.PI * 0.95, Math.PI * 1.75);
      g.stroke();
      g.restore();
      visor(g, k, cx, cy, { from: -0.15, h: 0.4, symbol: sym('wind'), tint: 'rgba(10,40,40,0.95)' });
      // lens divider
      g.save();
      g.strokeStyle = k.line;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(cx + R * 0.5, cy - R * 0.3);
      g.lineTo(cx + R * 0.5, cy + R * 0.06);
      g.stroke();
      g.restore();
      if (face === 'ko') crack(g, cx, cy);
      mouth(g, k, cx, cy, face, 'grin');
      break;
    }
    case 'earth': {
      // helmet: a ridge over the top and a cheek guard
      g.save();
      poly(g, [[cx - R * 0.9, cy - R * 0.25], [cx - R * 0.7, cy - R * 0.85], [cx, cy - R * 1.12], [cx + R * 0.75, cy - R * 0.8], [cx + R * 0.95, cy - R * 0.3], [cx - R * 0.1, cy - R * 0.45]], true);
      const gr = g.createLinearGradient(cx, cy - R, cx, cy);
      gr.addColorStop(0, '#6b4524');
      gr.addColorStop(1, '#2a1a0e');
      ink(g, gr, k.line, 5, 10);
      g.strokeStyle = 'rgba(255,208,138,0.35)';
      g.lineWidth = 3;
      for (const dx of [-0.35, 0.05, 0.42]) {
        g.beginPath();
        g.moveTo(cx + dx * R, cy - R * 1.0);
        g.lineTo(cx + dx * R + 6, cy - R * 0.55);
        g.stroke();
      }
      g.restore();
      visor(g, k, cx, cy, { y: -0.1, h: 0.26, slit: true });
      if (face === 'ko') koEyes(g, cx, cy);
      mouth(g, k, cx, cy, face, 'flat');
      break;
    }
    case 'leaf': {
      visor(g, k, cx, cy, { symbol: sym('leaf'), tint: 'rgba(20,50,20,0.95)' });
      // laurel wreath around the top
      g.save();
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (1.02 + i * 0.1);
        const lx = cx + Math.cos(a) * R * 0.98;
        const ly = cy + Math.sin(a) * R * 0.98;
        g.save();
        g.translate(lx, ly);
        g.rotate(a + Math.PI / 2 + (i % 2 ? 0.5 : -0.5));
        g.beginPath();
        g.ellipse(0, -10, 8, 17, 0, 0, Math.PI * 2);
        ink(g, i % 2 ? '#3fae3a' : '#5fd04a', '#a6ff7a', 2.5, 8);
        g.restore();
      }
      g.restore();
      if (face === 'ko') crack(g, cx, cy);
      mouth(g, k, cx, cy, face, 'smile');
      break;
    }
    case 'light': {
      // halo above the head
      g.save();
      g.shadowColor = '#fff3c8';
      g.shadowBlur = 22;
      g.strokeStyle = '#fff6d0';
      g.lineWidth = 7;
      g.beginPath();
      g.ellipse(cx - R * 0.05, cy - R * 1.42, R * 0.62, R * 0.17, -0.12, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = '#ffffff';
      g.lineWidth = 2.5;
      g.stroke();
      g.restore();
      visor(g, k, cx, cy, { symbol: sym('light'), tint: 'rgba(60,45,10,0.95)' });
      if (face === 'ko') crack(g, cx, cy);
      mouth(g, k, cx, cy, face, 'smile');
      break;
    }
    case 'gravity':
      visor(g, k, cx, cy, { y: -0.12, h: 0.24, slit: true });
      if (face === 'ko') koEyes(g, cx, cy);
      mouth(g, k, cx, cy, face, 'flat');
      break;
    case 'time':
      visor(g, k, cx, cy, { symbol: sym('time'), tint: 'rgba(10,45,45,0.95)' });
      // ear gear
      g.save();
      g.translate(cx - R * 0.15, cy + R * 0.05);
      gear(g, R * 0.24, 8, k.accent, '#3a2414');
      g.restore();
      if (face === 'ko') crack(g, cx, cy);
      mouth(g, k, cx, cy, face, 'flat');
      break;
  }
  return c;
}

/** A bronze gear with teeth (time crown, pauldrons, effects). */
export function gear(g: G, r: number, teeth: number, line: string, fill: string): void {
  g.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2;
    const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 ? r * 0.8 : r;
    g.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
    g.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
  }
  g.closePath();
  g.moveTo(r * 0.38, 0);
  g.arc(0, 0, r * 0.38, 0, Math.PI * 2, true);
  g.save();
  g.fillStyle = fill;
  g.fill('evenodd');
  g.shadowColor = line;
  g.shadowBlur = 10;
  g.strokeStyle = line;
  g.lineWidth = 4;
  g.stroke();
  g.restore();
}

export type HeadSet = Record<Face, HTMLCanvasElement>;
export function makeHeads(k: Kit): HeadSet {
  return { normal: drawHead(k, 'normal'), attack: drawHead(k, 'attack'), hurt: drawHead(k, 'hurt'), ko: drawHead(k, 'ko') };
}
/** Where the bottom of the head circle sits, as a fraction of the canvas height (the rig pivot). */
export const HEAD_PIVOT = { u: 100 / W, v: 0.97 };
/** Head circle diameter relative to the canvas width (the rig scales the canvas so the circle matches). */
export const HEAD_CIRCLE = (2 * R + LW) / W;
