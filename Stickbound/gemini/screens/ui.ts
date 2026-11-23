/**
 * Elementick screens: the canvas UI kit. Every screen is drawn at a fixed 1376 x 768 design size (the size of the
 * owner's mock-ups in gemini/extra/) and scaled to fit the window. Neon panels, gold and cyan buttons, bars, text
 * with glow, the top bar and clickable regions. All drawn in code, no images.
 */
export const W = 1376;
export const H = 768;
export type G = CanvasRenderingContext2D;
export const FONT = "Bahnschrift, 'Segoe UI', Arial, sans-serif";

// ---- colours ----
export const C = {
  cyan: '#3fe6ff',
  cyanDeep: '#1a9fd0',
  gold: '#ffc93a',
  goldDeep: '#c87a12',
  pink: '#ff4fd8',
  purple: '#a64dff',
  red: '#ff3b4a',
  green: '#5dff7a',
  ink: '#071027',
  panel: 'rgba(8,22,48,0.82)',
  white: '#eef6ff',
};

// ---- clickable regions (rebuilt every frame) ----
export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
  act: () => void;
  cursor?: boolean;
}
export const input = { mx: -1, my: -1, down: false, regions: [] as Region[], wheel: 0, typed: [] as string[], pointers: [] as Array<{ x: number; y: number }>, held: new Set<string>() };
export function region(x: number, y: number, w: number, h: number, act: () => void): void {
  input.regions.push({ x, y, w, h, act });
}
export function hover(x: number, y: number, w: number, h: number): boolean {
  return input.mx >= x && input.mx <= x + w && input.my >= y && input.my <= y + h;
}
export function click(mx: number, my: number): boolean {
  for (let i = input.regions.length - 1; i >= 0; i--) {
    const r = input.regions[i];
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
      r.act();
      return true;
    }
  }
  return false;
}

// ---- shapes ----
/** rectangle with cut corners (c = cut size; per corner: tl, tr, br, bl) */
export function chamfer(g: G, x: number, y: number, w: number, h: number, c: number | [number, number, number, number] = 10): void {
  const [a, b, d, e] = typeof c === 'number' ? [c, c, c, c] : c;
  g.beginPath();
  g.moveTo(x + a, y);
  g.lineTo(x + w - b, y);
  g.lineTo(x + w, y + b);
  g.lineTo(x + w, y + h - d);
  g.lineTo(x + w - d, y + h);
  g.lineTo(x + e, y + h);
  g.lineTo(x, y + h - e);
  g.lineTo(x, y + a);
  g.closePath();
}
export function rrect(g: G, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}
export function hexPath(g: G, x: number, y: number, r: number, tall = 1.15): void {
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const px = x + Math.sin(a) * r;
    const py = y - Math.cos(a) * r * tall;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
}
/** neon stroke: a wide soft glow, then the bright line */
export function neon(g: G, col: string, w = 2, blur = 14): void {
  g.save();
  g.shadowColor = col;
  g.shadowBlur = blur;
  g.strokeStyle = col;
  g.lineWidth = w;
  g.stroke();
  g.shadowBlur = blur / 2;
  g.stroke();
  g.restore();
}

export interface PanelOpts {
  col?: string;
  fill?: string;
  cut?: number | [number, number, number, number];
  glow?: number;
  /** corner brackets */
  brackets?: boolean;
  inner?: boolean;
}
/** dark glass panel with a neon edge */
export function panel(g: G, x: number, y: number, w: number, h: number, o: PanelOpts = {}): void {
  const col = o.col ?? C.cyan;
  const cut = o.cut ?? 14;
  g.save();
  chamfer(g, x, y, w, h, cut);
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, o.fill ?? 'rgba(14,34,70,0.86)');
  gr.addColorStop(1, o.fill ?? 'rgba(6,16,38,0.9)');
  g.fillStyle = gr;
  g.fill();
  neon(g, col, 2, o.glow ?? 16);
  if (o.inner !== false) {
    chamfer(g, x + 5, y + 5, w - 10, h - 10, typeof cut === 'number' ? Math.max(2, cut - 4) : cut);
    g.strokeStyle = col + '40';
    g.lineWidth = 1;
    g.stroke();
  }
  if (o.brackets) {
    g.strokeStyle = col;
    g.lineWidth = 3;
    g.shadowColor = col;
    g.shadowBlur = 10;
    const L = 22;
    g.beginPath();
    g.moveTo(x - 4, y + L);
    g.lineTo(x - 4, y - 4);
    g.lineTo(x + L, y - 4);
    g.moveTo(x + w - L, y + h + 4);
    g.lineTo(x + w + 4, y + h + 4);
    g.lineTo(x + w + 4, y + h - L);
    g.stroke();
  }
  g.restore();
}

export interface TextOpts {
  size?: number;
  col?: string | CanvasGradient;
  align?: CanvasTextAlign;
  base?: CanvasTextBaseline;
  glow?: string;
  blur?: number;
  weight?: number | string;
  stroke?: string;
  sw?: number;
  max?: number;
  italic?: boolean;
  spacing?: number;
}
export function text(g: G, s: string, x: number, y: number, o: TextOpts = {}): void {
  g.save();
  g.font = `${o.italic ? 'italic ' : ''}${o.weight ?? 700} ${o.size ?? 20}px ${FONT}`;
  g.textAlign = o.align ?? 'left';
  g.textBaseline = o.base ?? 'middle';
  if (o.spacing) (g as G & { letterSpacing: string }).letterSpacing = `${o.spacing}px`;
  if (o.stroke) {
    g.lineJoin = 'round';
    g.strokeStyle = o.stroke;
    g.lineWidth = o.sw ?? 4;
    g.strokeText(s, x, y, o.max);
  }
  if (o.glow) {
    g.shadowColor = o.glow;
    g.shadowBlur = o.blur ?? 12;
  }
  g.fillStyle = o.col ?? C.white;
  g.fillText(s, x, y, o.max);
  g.restore();
}
export function measure(g: G, s: string, size: number, weight: number | string = 700): number {
  g.save();
  g.font = `${weight} ${size}px ${FONT}`;
  const w = g.measureText(s).width;
  g.restore();
  return w;
}

/** gold metal gradient used by titles and the big buttons */
export function goldGrad(g: G, y0: number, y1: number): CanvasGradient {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, '#fff6c8');
  gr.addColorStop(0.35, '#ffd65a');
  gr.addColorStop(0.55, '#e8a21e');
  gr.addColorStop(1, '#ffe08a');
  return gr;
}

/** big gold button (PLAY, BATTLE, BUY, SELECT, CREATE, FIND MATCH) */
export function goldButton(g: G, x: number, y: number, w: number, h: number, label: string, o: { sub?: string; size?: number; act?: () => void; t?: number } = {}): void {
  const hov = hover(x, y, w, h);
  const pulse = 0.5 + 0.5 * Math.sin((o.t ?? 0) / 18);
  g.save();
  // outer glow frame
  chamfer(g, x - 6, y - 6, w + 12, h + 12, 16);
  g.fillStyle = 'rgba(60,30,0,0.6)';
  g.fill();
  neon(g, hov ? '#fff2a8' : '#ffcf4a', 3, 18 + pulse * 10);
  chamfer(g, x, y, w, h, 12);
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, hov ? '#fff3b0' : '#ffe78a');
  gr.addColorStop(0.45, hov ? '#ffd24a' : '#f7c437');
  gr.addColorStop(0.5, '#e09a17');
  gr.addColorStop(1, hov ? '#ffcc4a' : '#f3b02c');
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = '#fff7d0';
  g.lineWidth = 2;
  g.stroke();
  // shine
  g.clip();
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillRect(x, y, w, h * 0.42);
  g.restore();
  const size = o.size ?? Math.min(h * 0.55, 64);
  const ty = o.sub ? y + h * 0.42 : y + h / 2 + 2;
  text(g, label, x + w / 2, ty, { size, col: '#5a3200', align: 'center', stroke: '#fff0b0', sw: 2, weight: 800 });
  if (o.sub) text(g, o.sub, x + w / 2, y + h * 0.77, { size: size * 0.38, col: '#6a3c00', align: 'center', weight: 700 });
  if (o.act) region(x, y, w, h, o.act);
}

/** dark cyan neon button (LOBBY, CONTROLS, tabs) */
export function cyanButton(g: G, x: number, y: number, w: number, h: number, label: string, o: { col?: string; size?: number; act?: () => void; on?: boolean; fillOn?: string } = {}): void {
  const col = o.col ?? C.cyan;
  const hov = hover(x, y, w, h);
  g.save();
  chamfer(g, x, y, w, h, Math.min(12, h / 3));
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, o.on ? (o.fillOn ?? 'rgba(60,150,190,0.65)') : hov ? 'rgba(40,90,130,0.85)' : 'rgba(18,48,80,0.85)');
  gr.addColorStop(1, o.on ? (o.fillOn ?? 'rgba(20,80,120,0.75)') : 'rgba(8,24,46,0.9)');
  g.fillStyle = gr;
  g.fill();
  neon(g, col, o.on || hov ? 2.6 : 1.8, o.on || hov ? 18 : 10);
  g.restore();
  text(g, label, x + w / 2, y + h / 2 + 1, { size: o.size ?? Math.min(h * 0.5, 40), col: '#dff8ff', align: 'center', glow: col, blur: 10, weight: 700 });
  if (o.act) region(x, y, w, h, o.act);
}

/** segmented or plain bar. cols: gradient stops for the fill */
export function bar(g: G, x: number, y: number, w: number, h: number, frac: number, cols: string[], o: { seg?: number; back?: string; edge?: string; skew?: number; glow?: boolean } = {}): void {
  const f = Math.max(0, Math.min(1, frac));
  const sk = o.skew ?? 0;
  const path = (px: number, pw: number) => {
    g.beginPath();
    g.moveTo(px + sk, y);
    g.lineTo(px + pw + sk, y);
    g.lineTo(px + pw, y + h);
    g.lineTo(px, y + h);
    g.closePath();
  };
  g.save();
  path(x, w);
  g.fillStyle = o.back ?? 'rgba(4,10,24,0.85)';
  g.fill();
  if (o.edge) {
    g.strokeStyle = o.edge;
    g.lineWidth = 1.5;
    g.stroke();
  }
  if (f > 0) {
    const gr = g.createLinearGradient(x, 0, x + w, 0);
    cols.forEach((c, i) => gr.addColorStop(cols.length === 1 ? 0 : i / (cols.length - 1), c));
    g.save();
    path(x, w);
    g.clip();
    path(x + 1, (w - 2) * f);
    g.fillStyle = gr;
    if (o.glow !== false) {
      g.shadowColor = cols[cols.length - 1];
      g.shadowBlur = 8;
    }
    g.fill();
    // top shine
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(x, y, w * f, h * 0.35);
    g.restore();
  }
  if (o.seg) {
    g.strokeStyle = 'rgba(0,8,20,0.9)';
    g.lineWidth = 2;
    for (let i = 1; i < o.seg; i++) {
      const sx = x + (w / o.seg) * i;
      g.beginPath();
      g.moveTo(sx + sk, y);
      g.lineTo(sx, y + h);
      g.stroke();
    }
  }
  g.restore();
}

/** ring gauge (XP ring) */
export function ring(g: G, x: number, y: number, r: number, frac: number, col: string, back = 'rgba(255,255,255,0.12)', w = 5): void {
  g.save();
  g.lineCap = 'round';
  g.lineWidth = w;
  g.strokeStyle = back;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = col;
  g.shadowColor = col;
  g.shadowBlur = 10;
  g.beginPath();
  g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  g.stroke();
  g.restore();
}

/** small pill with an angled end (rank pill, name tags) */
export function pill(g: G, x: number, y: number, w: number, h: number, col: string, fill = 'rgba(10,24,48,0.85)'): void {
  g.save();
  g.beginPath();
  g.moveTo(x + h * 0.35, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w - h * 0.35, y + h);
  g.lineTo(x, y + h);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  neon(g, col, 1.6, 10);
  g.restore();
}

/** soft light pool (spotlights, glows) */
export function glowDot(g: G, x: number, y: number, r: number, col: string, a = 1): void {
  g.save();
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, col.replace(')', `,${a})`).replace('rgb(', 'rgba('));
  gr.addColorStop(1, col.replace(')', ',0)').replace('rgb(', 'rgba('));
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
}

/** seeded random (render only) */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
