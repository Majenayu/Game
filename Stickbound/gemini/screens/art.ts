/**
 * Elementick screens: code-drawn art. Element icons, rank badges, coin, XP star, comet, chest, small UI icons,
 * cosmetic icons, the neon city backdrops, podiums, spotlights and particles. Element badges, coin, XP star and chest
 * come from the owner's icon sheet (icons.ts) once it has loaded; the shapes here are drawn only until then.
 */
import { icon } from './icons';
import type { El, Tier } from './save';
import { C, H, W, chamfer, glowDot, hexPath, neon, rng, text, type G } from './ui';

export interface ElCol {
  line: string;
  light: string;
  deep: string;
  rgb: string;
  name: string;
}
export const EL: Record<El, ElCol> = {
  fire: { line: '#ff7a2a', light: '#ffd23a', deep: '#7a1e0c', rgb: 'rgb(255,110,30)', name: 'Fire' },
  water: { line: '#3fb8ff', light: '#c8f4ff', deep: '#0b3f86', rgb: 'rgb(60,170,255)', name: 'Water' },
  ice: { line: '#a9e6ff', light: '#ffffff', deep: '#3d6f94', rgb: 'rgb(170,225,255)', name: 'Ice' },
  lightning: { line: '#ffe23a', light: '#fffbd0', deep: '#7a5a00', rgb: 'rgb(255,226,60)', name: 'Lightning' },
  wind: { line: '#4dffb4', light: '#d8fff0', deep: '#0f6a4a', rgb: 'rgb(80,255,180)', name: 'Wind' },
  earth: { line: '#d8903e', light: '#ffd6a0', deep: '#5a2e0c', rgb: 'rgb(216,144,62)', name: 'Earth' },
  leaf: { line: '#7dff4a', light: '#e4ffc8', deep: '#1f6010', rgb: 'rgb(125,255,74)', name: 'Leaf' },
  light: { line: '#ffe27a', light: '#fffbe6', deep: '#8a6a10', rgb: 'rgb(255,226,122)', name: 'Light' },
  gravity: { line: '#b45cff', light: '#ecd2ff', deep: '#3a1270', rgb: 'rgb(180,92,255)', name: 'Gravity' },
  time: { line: '#3fe0c8', light: '#d4fff6', deep: '#0c5a52', rgb: 'rgb(63,224,200)', name: 'Time' },
};
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- element glyphs
function flamePath(g: G, s: number): void {
  g.beginPath();
  g.moveTo(0, s);
  g.bezierCurveTo(-s * 0.75, s * 0.95, -s * 0.85, s * 0.1, -s * 0.45, -s * 0.35);
  g.bezierCurveTo(-s * 0.4, -s * 0.05, -s * 0.2, s * 0.05, -s * 0.15, -s * 0.15);
  g.bezierCurveTo(-s * 0.2, -s * 0.55, s * 0.05, -s * 0.8, s * 0.1, -s);
  g.bezierCurveTo(s * 0.25, -s * 0.6, s * 0.85, -s * 0.3, s * 0.7, s * 0.35);
  g.bezierCurveTo(s * 0.62, s * 0.8, s * 0.35, s, 0, s);
  g.closePath();
}
export function flame(g: G, x: number, y: number, s: number, cols = ['#ff3b1a', '#ff8a1a', '#ffe14a']): void {
  g.save();
  g.translate(x, y);
  flamePath(g, s);
  const gr = g.createLinearGradient(0, s, 0, -s);
  gr.addColorStop(0, cols[2]);
  gr.addColorStop(0.45, cols[1]);
  gr.addColorStop(1, cols[0]);
  g.fillStyle = gr;
  g.shadowColor = cols[1];
  g.shadowBlur = s * 0.6;
  g.fill();
  g.scale(0.5, 0.55);
  g.translate(0, s * 0.75);
  flamePath(g, s);
  g.fillStyle = '#fff3b0';
  g.shadowBlur = 0;
  g.fill();
  g.restore();
}
/** the element symbol, centred, about 2s across */
export function glyph(g: G, el: El, x: number, y: number, s: number): void {
  const c = EL[el];
  g.save();
  g.translate(x, y);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.shadowColor = c.line;
  g.shadowBlur = s * 0.5;
  switch (el) {
    case 'fire':
      g.restore();
      flame(g, x, y, s * 0.95);
      return;
    case 'water': {
      g.beginPath();
      g.moveTo(0, -s);
      g.bezierCurveTo(s * 0.2, -s * 0.5, s * 0.75, 0, s * 0.72, s * 0.35);
      g.arc(0, s * 0.3, s * 0.72, 0.05, Math.PI - 0.05);
      g.bezierCurveTo(-s * 0.75, 0, -s * 0.2, -s * 0.5, 0, -s);
      const gr = g.createLinearGradient(0, -s, 0, s);
      gr.addColorStop(0, '#9ff0ff');
      gr.addColorStop(1, '#1a7ad8');
      g.fillStyle = gr;
      g.fill();
      g.shadowBlur = 0;
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.lineWidth = s * 0.1;
      g.beginPath();
      g.arc(0, s * 0.3, s * 0.45, Math.PI * 0.95, Math.PI * 1.3);
      g.stroke();
      break;
    }
    case 'ice': {
      g.strokeStyle = '#eaf9ff';
      g.lineWidth = s * 0.14;
      for (let i = 0; i < 6; i++) {
        g.save();
        g.rotate((i * TAU) / 6);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(0, -s);
        g.moveTo(0, -s * 0.55);
        g.lineTo(-s * 0.28, -s * 0.8);
        g.moveTo(0, -s * 0.55);
        g.lineTo(s * 0.28, -s * 0.8);
        g.moveTo(0, -s * 0.25);
        g.lineTo(-s * 0.2, -s * 0.42);
        g.moveTo(0, -s * 0.25);
        g.lineTo(s * 0.2, -s * 0.42);
        g.stroke();
        g.restore();
      }
      break;
    }
    case 'lightning': {
      g.beginPath();
      g.moveTo(s * 0.25, -s);
      g.lineTo(-s * 0.5, s * 0.12);
      g.lineTo(-s * 0.02, s * 0.12);
      g.lineTo(-s * 0.3, s);
      g.lineTo(s * 0.55, -s * 0.2);
      g.lineTo(s * 0.06, -s * 0.2);
      g.lineTo(s * 0.4, -s);
      g.closePath();
      const gr = g.createLinearGradient(0, -s, 0, s);
      gr.addColorStop(0, '#fffbd0');
      gr.addColorStop(1, '#ffc81a');
      g.fillStyle = gr;
      g.fill();
      break;
    }
    case 'wind': {
      g.strokeStyle = '#bfffe4';
      g.lineWidth = s * 0.16;
      const sw = (yy: number, len: number, curl: number) => {
        g.beginPath();
        g.moveTo(-s, yy);
        g.lineTo(len, yy);
        g.arc(len, yy - curl, curl, Math.PI / 2, -Math.PI * 0.9, true);
        g.stroke();
      };
      sw(-s * 0.35, s * 0.35, s * 0.28);
      sw(s * 0.1, s * 0.6, s * 0.22);
      g.beginPath();
      g.moveTo(-s * 0.8, s * 0.55);
      g.quadraticCurveTo(0, s * 0.45, s * 0.2, s * 0.7);
      g.stroke();
      break;
    }
    case 'earth': {
      const pts = [[0, -s], [s * 0.6, -s * 0.5], [s * 0.7, s * 0.3], [0, s], [-s * 0.7, s * 0.3], [-s * 0.6, -s * 0.5]];
      g.beginPath();
      pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.closePath();
      const gr = g.createLinearGradient(-s, -s, s, s);
      gr.addColorStop(0, '#ffc77a');
      gr.addColorStop(1, '#8a4a16');
      g.fillStyle = gr;
      g.fill();
      g.shadowBlur = 0;
      g.strokeStyle = '#ffe0b0';
      g.lineWidth = s * 0.07;
      g.stroke();
      g.beginPath();
      g.moveTo(-s * 0.6, -s * 0.5);
      g.lineTo(0, -s * 0.15);
      g.lineTo(s * 0.6, -s * 0.5);
      g.moveTo(0, -s * 0.15);
      g.lineTo(0, s);
      g.strokeStyle = 'rgba(90,40,10,0.7)';
      g.stroke();
      break;
    }
    case 'leaf': {
      g.strokeStyle = '#ff7ad8';
      g.lineWidth = s * 0.14;
      g.beginPath();
      g.moveTo(0, s);
      g.quadraticCurveTo(-s * 0.1, 0, s * 0.1, -s * 0.2);
      g.stroke();
      const lf = (ang: number, len: number, col: string) => {
        g.save();
        g.translate(s * 0.05, -s * 0.1);
        g.rotate(ang);
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(len * 0.5, -len * 0.45, len, 0);
        g.quadraticCurveTo(len * 0.5, len * 0.45, 0, 0);
        g.fillStyle = col;
        g.fill();
        g.restore();
      };
      lf(-0.6, s * 0.95, '#8dff5a');
      lf(Math.PI + 0.5, s * 0.8, '#5ad83a');
      break;
    }
    case 'light': {
      g.fillStyle = '#fff6c0';
      g.strokeStyle = '#ffe27a';
      g.lineWidth = s * 0.12;
      for (let i = 0; i < 12; i++) {
        g.save();
        g.rotate((i * TAU) / 12);
        g.beginPath();
        g.moveTo(0, -s * 0.55);
        g.lineTo(0, i % 2 ? -s * 0.85 : -s);
        g.stroke();
        g.restore();
      }
      g.beginPath();
      g.arc(0, 0, s * 0.45, 0, TAU);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, s * 0.45);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(1, '#ffcf3a');
      g.fillStyle = gr;
      g.fill();
      break;
    }
    case 'gravity': {
      g.beginPath();
      g.arc(0, 0, s * 0.55, 0, TAU);
      const gr = g.createRadialGradient(-s * 0.2, -s * 0.2, 0, 0, 0, s * 0.55);
      gr.addColorStop(0, '#f0c8ff');
      gr.addColorStop(1, '#6a1ab0');
      g.fillStyle = gr;
      g.fill();
      g.rotate(-0.4);
      g.strokeStyle = '#e8b8ff';
      g.lineWidth = s * 0.12;
      g.beginPath();
      g.ellipse(0, 0, s, s * 0.3, 0, Math.PI * 0.05, Math.PI * 0.95, true);
      g.stroke();
      break;
    }
    case 'time': {
      g.strokeStyle = '#c8a060';
      g.lineWidth = s * 0.1;
      g.beginPath();
      g.moveTo(-s * 0.5, -s * 0.85);
      g.lineTo(s * 0.5, -s * 0.85);
      g.moveTo(-s * 0.5, s * 0.85);
      g.lineTo(s * 0.5, s * 0.85);
      g.stroke();
      g.beginPath();
      g.moveTo(-s * 0.4, -s * 0.8);
      g.quadraticCurveTo(-s * 0.35, -s * 0.1, 0, 0);
      g.quadraticCurveTo(-s * 0.35, s * 0.1, -s * 0.4, s * 0.8);
      g.lineTo(s * 0.4, s * 0.8);
      g.quadraticCurveTo(s * 0.35, s * 0.1, 0, 0);
      g.quadraticCurveTo(s * 0.35, -s * 0.1, s * 0.4, -s * 0.8);
      g.closePath();
      g.fillStyle = 'rgba(160,255,240,0.25)';
      g.fill();
      g.strokeStyle = '#d4fff6';
      g.lineWidth = s * 0.08;
      g.stroke();
      g.beginPath();
      g.moveTo(-s * 0.25, s * 0.75);
      g.lineTo(s * 0.25, s * 0.75);
      g.lineTo(0, s * 0.35);
      g.closePath();
      g.fillStyle = '#ffd27a';
      g.fill();
      gearShape(g, -s * 0.75, 0, s * 0.32, 8, '#c8a060');
      break;
    }
  }
  g.restore();
}
export function gearShape(g: G, x: number, y: number, r: number, teeth: number, col: string): void {
  g.save();
  g.translate(x, y);
  g.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * TAU;
    const a1 = ((i + 1) / (teeth * 2)) * TAU;
    const rr = i % 2 ? r * 0.75 : r;
    g.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
    g.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
  }
  g.closePath();
  g.moveTo(r * 0.35, 0);
  g.arc(0, 0, r * 0.35, 0, TAU, true);
  g.fillStyle = col;
  g.fill('evenodd');
  g.restore();
}

/** element badge: a framed hexagon in the element colour with the symbol (icons sheet, top row) */
export function elementIcon(g: G, el: El, x: number, y: number, r: number, dim = false): void {
  if (icon(g, el, x, y, r * 2.3, dim ? 0.45 : 1)) return;
  const c = EL[el];
  g.save();
  if (dim) g.globalAlpha = 0.45;
  hexPath(g, x, y, r, 1.12);
  const rim = g.createLinearGradient(x, y - r, x, y + r);
  rim.addColorStop(0, c.light);
  rim.addColorStop(0.5, c.line);
  rim.addColorStop(1, c.deep);
  g.fillStyle = rim;
  g.shadowColor = c.line;
  g.shadowBlur = r * 0.35;
  g.fill();
  g.shadowBlur = 0;
  hexPath(g, x, y, r * 0.84, 1.12);
  const inn = g.createRadialGradient(x, y - r * 0.2, 0, x, y, r);
  inn.addColorStop(0, c.deep);
  inn.addColorStop(1, '#050816');
  g.fillStyle = inn;
  g.fill();
  hexPath(g, x, y, r * 0.74, 1.12);
  g.strokeStyle = c.line + '90';
  g.lineWidth = Math.max(1, r * 0.04);
  g.stroke();
  g.restore();
  glyph(g, el, x, y, r * 0.5);
}
/** small round element badge (name plates, HUD portraits) */
export function elementCoin(g: G, el: El, x: number, y: number, r: number): void {
  if (icon(g, el, x, y, r * 2.2)) return;
  const c = EL[el];
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  const gr = g.createRadialGradient(x, y - r * 0.3, 0, x, y, r);
  gr.addColorStop(0, c.deep);
  gr.addColorStop(1, '#060a18');
  g.fillStyle = gr;
  g.fill();
  neon(g, c.line, Math.max(1.5, r * 0.08), r * 0.6);
  g.restore();
  glyph(g, el, x, y, r * 0.6);
}

// ---------------------------------------------------------------- rank badges
const TIER_COL: Record<Tier, [string, string, string]> = {
  bronze: ['#f0b07a', '#b0602a', '#5a2a10'],
  silver: ['#ffffff', '#b8c8d8', '#5a6a80'],
  gold: ['#fff2a0', '#ffc22a', '#8a5a00'],
  platinum: ['#e8fffa', '#8fd8d0', '#2a6a70'],
  diamond: ['#e0f0ff', '#6a9cff', '#2a2a9a'],
  champion: ['#ffe0ff', '#c46aff', '#4a1080'],
};
function shieldPath(g: G, s: number): void {
  g.beginPath();
  g.moveTo(0, -s);
  g.lineTo(s * 0.8, -s * 0.72);
  g.lineTo(s * 0.74, s * 0.1);
  g.quadraticCurveTo(s * 0.55, s * 0.7, 0, s);
  g.quadraticCurveTo(-s * 0.55, s * 0.7, -s * 0.74, s * 0.1);
  g.lineTo(-s * 0.8, -s * 0.72);
  g.closePath();
}
function wing(g: G, s: number, side: 1 | -1, cols: [string, string, string]): void {
  g.save();
  g.scale(side, 1);
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    const y0 = -s * 0.55 + i * s * 0.28;
    g.moveTo(s * 0.6, y0);
    g.quadraticCurveTo(s * (1.4 - i * 0.12), y0 - s * 0.35, s * (1.55 - i * 0.18), y0 - s * 0.2);
    g.quadraticCurveTo(s * (1.2 - i * 0.1), y0 + s * 0.15, s * 0.6, y0 + s * 0.25);
    g.closePath();
    const gr = g.createLinearGradient(s * 0.6, 0, s * 1.5, 0);
    gr.addColorStop(0, cols[1]);
    gr.addColorStop(1, cols[0]);
    g.fillStyle = gr;
    g.fill();
    g.strokeStyle = cols[2];
    g.lineWidth = s * 0.03;
    g.stroke();
  }
  g.restore();
}
function trophy(g: G, s: number, col: string): void {
  g.save();
  g.fillStyle = col;
  g.strokeStyle = col;
  g.lineWidth = s * 0.08;
  g.beginPath();
  g.moveTo(-s * 0.4, -s * 0.5);
  g.lineTo(s * 0.4, -s * 0.5);
  g.quadraticCurveTo(s * 0.38, s * 0.1, 0, s * 0.18);
  g.quadraticCurveTo(-s * 0.38, s * 0.1, -s * 0.4, -s * 0.5);
  g.fill();
  g.beginPath();
  g.arc(-s * 0.42, -s * 0.28, s * 0.18, Math.PI * 0.5, Math.PI * 1.5);
  g.arc(s * 0.42, -s * 0.28, s * 0.18, -Math.PI * 0.5, Math.PI * 0.5);
  g.stroke();
  g.fillRect(-s * 0.08, s * 0.15, s * 0.16, s * 0.25);
  g.fillRect(-s * 0.28, s * 0.38, s * 0.56, s * 0.12);
  g.restore();
}
/** rank emblem for a tier (icons sheet, middle row). withCup: trophy on the shield (rank ladder style) */
export function rankBadge(g: G, tier: Tier, x: number, y: number, s: number, withCup = false): void {
  const cols = TIER_COL[tier];
  g.save();
  g.translate(x, y);
  g.shadowColor = cols[1];
  g.shadowBlur = s * 0.4;
  if (tier === 'silver' || tier === 'gold' || tier === 'champion') {
    wing(g, s, 1, cols);
    wing(g, s, -1, cols);
  }
  if (tier === 'platinum') {
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * s * 0.75, -s * 0.9);
      g.lineTo(sd * s * 0.95, -s * 0.5);
      g.lineTo(sd * s * 0.95, s * 0.4);
      g.lineTo(sd * s * 0.55, s * 0.4);
      g.lineTo(sd * s * 0.55, -s * 0.5);
      g.closePath();
      g.fillStyle = cols[1];
      g.fill();
      g.fillStyle = '#7ad8ff';
      g.beginPath();
      g.moveTo(sd * s * 0.62, s * 0.4);
      g.lineTo(sd * s * 0.75, s * 1.1);
      g.lineTo(sd * s * 0.88, s * 0.4);
      g.fill();
    }
  }
  if (tier === 'diamond') {
    g.beginPath();
    g.moveTo(-s, -s * 0.25);
    g.lineTo(-s * 0.55, -s * 0.8);
    g.lineTo(s * 0.55, -s * 0.8);
    g.lineTo(s, -s * 0.25);
    g.lineTo(0, s);
    g.closePath();
    const gr = g.createLinearGradient(0, -s, 0, s);
    gr.addColorStop(0, cols[0]);
    gr.addColorStop(0.5, cols[1]);
    gr.addColorStop(1, cols[2]);
    g.fillStyle = gr;
    g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = s * 0.04;
    g.beginPath();
    g.moveTo(-s, -s * 0.25);
    g.lineTo(s, -s * 0.25);
    g.moveTo(-s * 0.55, -s * 0.8);
    g.lineTo(-s * 0.25, -s * 0.25);
    g.lineTo(0, s);
    g.lineTo(s * 0.25, -s * 0.25);
    g.lineTo(s * 0.55, -s * 0.8);
    g.moveTo(-s * 0.25, -s * 0.25);
    g.lineTo(0, -s * 0.8);
    g.lineTo(s * 0.25, -s * 0.25);
    g.stroke();
    if (withCup) trophy(g, s * 0.45, '#ffffffcc');
    g.restore();
    return;
  }
  shieldPath(g, s * 0.85);
  const gr = g.createLinearGradient(0, -s, 0, s);
  gr.addColorStop(0, cols[0]);
  gr.addColorStop(0.5, cols[1]);
  gr.addColorStop(1, cols[2]);
  g.fillStyle = gr;
  g.fill();
  g.shadowBlur = 0;
  g.strokeStyle = cols[0];
  g.lineWidth = s * 0.05;
  g.stroke();
  shieldPath(g, s * 0.62);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fill();
  if (withCup) trophy(g, s * 0.5, cols[0]);
  else if (tier === 'bronze') gearShape(g, 0, -s * 0.05, s * 0.36, 9, cols[0]);
  else if (tier === 'champion') {
    g.beginPath();
    g.moveTo(-s * 0.45, s * 0.2);
    g.lineTo(-s * 0.5, -s * 0.45);
    g.lineTo(-s * 0.22, -s * 0.15);
    g.lineTo(0, -s * 0.6);
    g.lineTo(s * 0.22, -s * 0.15);
    g.lineTo(s * 0.5, -s * 0.45);
    g.lineTo(s * 0.45, s * 0.2);
    g.closePath();
    g.fillStyle = '#ffd24a';
    g.fill();
    g.fillStyle = '#c46aff';
    g.beginPath();
    g.arc(0, -s * 0.05, s * 0.12, 0, TAU);
    g.fill();
  } else {
    g.beginPath();
    g.moveTo(0, -s * 0.5);
    g.lineTo(s * 0.3, 0);
    g.lineTo(0, s * 0.5);
    g.lineTo(-s * 0.3, 0);
    g.closePath();
    g.fillStyle = cols[0];
    g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- currency and rewards
export function coin(g: G, x: number, y: number, r: number): void {
  if (icon(g, 'coin', x, y, r * 2.3)) return;
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  const gr = g.createLinearGradient(x, y - r, x, y + r);
  gr.addColorStop(0, '#fff2a0');
  gr.addColorStop(0.5, '#ffc21a');
  gr.addColorStop(1, '#b06a00');
  g.fillStyle = gr;
  g.shadowColor = '#ffc21a';
  g.shadowBlur = r * 0.5;
  g.fill();
  g.shadowBlur = 0;
  g.beginPath();
  g.arc(x, y, r * 0.74, 0, TAU);
  g.strokeStyle = '#a05a00';
  g.lineWidth = r * 0.1;
  g.stroke();
  g.lineWidth = r * 0.2;
  g.strokeStyle = '#8a4a00';
  g.beginPath();
  g.arc(x, y, r * 0.38, Math.PI * 0.25, Math.PI * 1.75);
  g.stroke();
  g.restore();
}
export function xpStar(g: G, x: number, y: number, r: number): void {
  if (icon(g, 'xp', x, y, r * 2.4)) return;
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
  g.fillStyle = '#0b2a66';
  g.fill();
  neon(g, '#3fd6ff', r * 0.1, r * 0.5);
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.4 : r * 0.85;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
  const gr = g.createLinearGradient(0, -r, 0, r);
  gr.addColorStop(0, '#9ff0ff');
  gr.addColorStop(1, '#1a6ad8');
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = '#ffd24a';
  g.lineWidth = r * 0.07;
  g.stroke();
  g.restore();
  text(g, 'XP', x, y + r * 0.05, { size: r * 0.55, col: '#ffffff', align: 'center', weight: 800, stroke: '#0b2a66', sw: 3 });
}
export function comet(g: G, x: number, y: number, s: number, cols = ['#ff3b1a', '#ff9a2a', '#fff0a0']): void {
  g.save();
  g.translate(x, y);
  g.rotate(-0.7);
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.moveTo(s * 0.4, -s * 0.35 + i * 0.17 * s);
    g.quadraticCurveTo(-s * 0.4, -s * 0.5 + i * 0.2 * s, -s * (1.2 - Math.abs(i - 2) * 0.2), -s * 0.1 + i * 0.05 * s);
    g.lineWidth = s * 0.16;
    g.lineCap = 'round';
    g.strokeStyle = i % 2 ? cols[1] : cols[0];
    g.shadowColor = cols[1];
    g.shadowBlur = s * 0.3;
    g.stroke();
  }
  g.beginPath();
  g.arc(s * 0.35, 0, s * 0.42, 0, TAU);
  const gr = g.createRadialGradient(s * 0.45, -s * 0.05, 0, s * 0.35, 0, s * 0.42);
  gr.addColorStop(0, '#ffffff');
  gr.addColorStop(0.4, cols[2]);
  gr.addColorStop(1, cols[1]);
  g.fillStyle = gr;
  g.fill();
  g.restore();
}
export function chest(g: G, x: number, y: number, s: number, open = 0): void {
  if (open > 0) glowDot(g, x, y - s * 0.2, s * 1.4, 'rgb(255,200,80)', open * 0.8);
  if (icon(g, 'chest', x, y, s * 2.2)) return;
  g.save();
  g.translate(x, y);
  // glow
  if (open > 0) glowDot(g, 0, -s * 0.2, s * 1.4, 'rgb(255,200,80)', open * 0.8);
  // body
  chamfer(g, -s, -s * 0.15, s * 2, s * 0.95, s * 0.08);
  const gr = g.createLinearGradient(0, -s * 0.15, 0, s * 0.8);
  gr.addColorStop(0, '#5a2a6a');
  gr.addColorStop(1, '#1e0c28');
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = '#ffc94a';
  g.lineWidth = s * 0.1;
  g.stroke();
  // lid
  g.beginPath();
  g.moveTo(-s, -s * 0.15);
  g.lineTo(-s, -s * 0.45);
  g.quadraticCurveTo(0, -s * 1.0, s, -s * 0.45);
  g.lineTo(s, -s * 0.15);
  g.closePath();
  const lg = g.createLinearGradient(0, -s, 0, -s * 0.15);
  lg.addColorStop(0, '#7a3a8a');
  lg.addColorStop(1, '#3a1648');
  g.fillStyle = lg;
  g.fill();
  g.stroke();
  // bands
  g.fillStyle = '#ffc94a';
  for (const bx of [-0.6, 0.6]) g.fillRect(bx * s - s * 0.09, -s * 0.8, s * 0.18, s * 1.6);
  g.fillStyle = '#ff6ad8';
  g.shadowColor = '#ff6ad8';
  g.shadowBlur = s * 0.4;
  g.fillRect(-s * 0.95, -s * 0.2, s * 1.9, s * 0.08);
  // lock
  g.shadowBlur = 0;
  g.fillStyle = '#ffe07a';
  chamfer(g, -s * 0.2, -s * 0.32, s * 0.4, s * 0.42, s * 0.06);
  g.fill();
  g.fillStyle = '#3a1648';
  g.beginPath();
  g.arc(0, -s * 0.16, s * 0.06, 0, TAU);
  g.fill();
  g.restore();
}
export function gearIcon(g: G, x: number, y: number, r: number, col = '#9ad8ff'): void {
  gearShape(g, x, y, r, 8, col);
}
export function lock(g: G, x: number, y: number, s: number, col = '#e0e8f8'): void {
  g.save();
  g.translate(x, y);
  g.strokeStyle = col;
  g.lineWidth = s * 0.22;
  g.beginPath();
  g.arc(0, -s * 0.2, s * 0.42, Math.PI, 0);
  g.stroke();
  g.fillStyle = col;
  chamfer(g, -s * 0.65, -s * 0.2, s * 1.3, s * 1.0, s * 0.12);
  g.fill();
  g.fillStyle = '#20283a';
  g.beginPath();
  g.arc(0, s * 0.25, s * 0.14, 0, TAU);
  g.fill();
  g.restore();
}
export function check(g: G, x: number, y: number, s: number, col = '#5dff7a'): void {
  g.save();
  g.strokeStyle = col;
  g.lineWidth = s * 0.3;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.shadowColor = col;
  g.shadowBlur = s * 0.6;
  g.beginPath();
  g.moveTo(x - s * 0.7, y);
  g.lineTo(x - s * 0.2, y + s * 0.5);
  g.lineTo(x + s * 0.75, y - s * 0.55);
  g.stroke();
  g.restore();
}
/** round node token (map nodes) */
export function nodeToken(g: G, x: number, y: number, r: number, col: string, state: 'done' | 'locked' | 'open'): void {
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fillStyle = '#0a1226';
  g.fill();
  neon(g, col, r * 0.14, r);
  g.restore();
  if (state === 'done') check(g, x, y, r * 0.55);
  if (state === 'locked') lock(g, x, y, r * 0.5);
}
/** arrow back icon */
export function backArrow(g: G, x: number, y: number, s: number, col = '#dff8ff'): void {
  g.save();
  g.strokeStyle = col;
  g.lineWidth = s * 0.22;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(x + s * 0.6, y + s * 0.6);
  g.lineTo(x + s * 0.6, y);
  g.quadraticCurveTo(x + s * 0.6, y - s * 0.4, x + s * 0.1, y - s * 0.4);
  g.lineTo(x - s * 0.6, y - s * 0.4);
  g.moveTo(x - s * 0.25, y - s * 0.8);
  g.lineTo(x - s * 0.65, y - s * 0.4);
  g.lineTo(x - s * 0.25, y);
  g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- cosmetic icons
/** visor / mask shapes for the shop and the head tab (variant 0..3) */
export function visorIcon(g: G, x: number, y: number, s: number, col: string, v: number): void {
  g.save();
  g.translate(x, y);
  g.strokeStyle = col;
  g.lineWidth = s * 0.07;
  g.shadowColor = col;
  g.shadowBlur = s * 0.4;
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath();
  if (v === 0) {
    // winged mask
    g.moveTo(0, -s * 0.2);
    g.quadraticCurveTo(s * 0.5, -s * 0.9, s * 0.9, -s * 0.7);
    g.quadraticCurveTo(s * 0.7, s * 0.2, s * 0.15, s * 0.5);
    g.lineTo(0, s * 0.3);
    g.lineTo(-s * 0.15, s * 0.5);
    g.quadraticCurveTo(-s * 0.7, s * 0.2, -s * 0.9, -s * 0.7);
    g.quadraticCurveTo(-s * 0.5, -s * 0.9, 0, -s * 0.2);
  } else if (v === 1) {
    // helmet with a band visor
    g.arc(0, 0, s * 0.75, Math.PI * 0.85, Math.PI * 2.15);
    g.closePath();
  } else if (v === 2) {
    // half mask
    g.moveTo(-s * 0.85, -s * 0.2);
    g.quadraticCurveTo(0, -s * 0.6, s * 0.85, -s * 0.2);
    g.quadraticCurveTo(s * 0.6, s * 0.45, 0, s * 0.3);
    g.quadraticCurveTo(-s * 0.6, s * 0.45, -s * 0.85, -s * 0.2);
  } else {
    // fox mask
    g.moveTo(-s * 0.7, -s * 0.8);
    g.lineTo(-s * 0.25, -s * 0.35);
    g.lineTo(s * 0.25, -s * 0.35);
    g.lineTo(s * 0.7, -s * 0.8);
    g.lineTo(s * 0.75, 0);
    g.lineTo(0, s * 0.7);
    g.lineTo(-s * 0.75, 0);
    g.closePath();
  }
  g.fill();
  g.stroke();
  // eye slits
  g.fillStyle = col;
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.ellipse(sd * s * 0.32, v === 1 ? -s * 0.05 : -s * 0.05, s * 0.2, s * 0.07, sd * -0.25, 0, TAU);
    g.fill();
  }
  if (v === 1) {
    g.fillRect(-s * 0.7, -s * 0.12, s * 1.4, s * 0.18);
  }
  g.restore();
}
export function capeIcon(g: G, x: number, y: number, s: number, col: string, deep: string): void {
  g.save();
  g.translate(x, y);
  g.beginPath();
  g.moveTo(-s * 0.3, -s * 0.8);
  g.lineTo(s * 0.3, -s * 0.8);
  g.quadraticCurveTo(s * 0.7, 0, s * 0.75, s * 0.85);
  g.lineTo(s * 0.35, s * 0.7);
  g.lineTo(0, s * 0.9);
  g.lineTo(-s * 0.35, s * 0.7);
  g.lineTo(-s * 0.75, s * 0.85);
  g.quadraticCurveTo(-s * 0.7, 0, -s * 0.3, -s * 0.8);
  g.closePath();
  const gr = g.createLinearGradient(0, -s, 0, s);
  gr.addColorStop(0, col);
  gr.addColorStop(1, deep);
  g.fillStyle = gr;
  g.shadowColor = col;
  g.shadowBlur = s * 0.3;
  g.fill();
  g.strokeStyle = '#ffffff60';
  g.lineWidth = s * 0.04;
  g.beginPath();
  g.moveTo(-s * 0.1, -s * 0.6);
  g.quadraticCurveTo(-s * 0.2, 0, -s * 0.3, s * 0.65);
  g.moveTo(s * 0.15, -s * 0.6);
  g.quadraticCurveTo(s * 0.25, 0, s * 0.35, s * 0.6);
  g.stroke();
  g.restore();
}
export function swirlIcon(g: G, x: number, y: number, s: number, col: string, t = 0): void {
  g.save();
  g.translate(x, y);
  g.rotate(t / 40);
  g.lineCap = 'round';
  g.shadowColor = col;
  g.shadowBlur = s * 0.4;
  for (let i = 0; i < 3; i++) {
    g.rotate(TAU / 3);
    g.beginPath();
    g.arc(0, 0, s * (0.35 + i * 0.18), 0, Math.PI * 1.1);
    g.strokeStyle = i === 1 ? '#ffffff' : col;
    g.lineWidth = s * 0.12;
    g.stroke();
  }
  g.restore();
}
export function trailIcon(g: G, x: number, y: number, s: number, col: string): void {
  g.save();
  g.translate(x, y);
  g.rotate(-0.6);
  g.lineCap = 'round';
  g.shadowColor = col;
  g.shadowBlur = s * 0.4;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.moveTo(s * 0.5, (i - 1.5) * s * 0.12);
    g.lineTo(-s * (0.9 - Math.abs(i - 1.5) * 0.15), (i - 1.5) * s * 0.22);
    g.strokeStyle = i % 2 ? '#ffffff' : col;
    g.lineWidth = s * 0.1;
    g.stroke();
  }
  g.beginPath();
  g.arc(s * 0.5, 0, s * 0.22, 0, TAU);
  g.fillStyle = '#ffffff';
  g.fill();
  g.restore();
}
export function crystalIcon(g: G, x: number, y: number, s: number, col: string): void {
  g.save();
  g.translate(x, y);
  g.shadowColor = col;
  g.shadowBlur = s * 0.4;
  const shard = (dx: number, h: number, w: number, lean: number) => {
    g.beginPath();
    g.moveTo(dx - w, s * 0.7);
    g.lineTo(dx - w + lean, s * 0.7 - h);
    g.lineTo(dx + lean * 1.2, s * 0.7 - h - w);
    g.lineTo(dx + w + lean, s * 0.7 - h);
    g.lineTo(dx + w, s * 0.7);
    g.closePath();
    const gr = g.createLinearGradient(dx - w, 0, dx + w, 0);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(0.5, col);
    gr.addColorStop(1, '#203060');
    g.fillStyle = gr;
    g.fill();
  };
  shard(-s * 0.4, s * 0.8, s * 0.18, -s * 0.15);
  shard(s * 0.4, s * 0.75, s * 0.18, s * 0.15);
  shard(0, s * 1.15, s * 0.24, 0);
  g.restore();
}
export function tornadoIcon(g: G, x: number, y: number, s: number, col: string): void {
  g.save();
  g.translate(x, y);
  g.strokeStyle = col;
  g.lineCap = 'round';
  g.shadowColor = col;
  g.shadowBlur = s * 0.3;
  for (let i = 0; i < 6; i++) {
    const yy = -s * 0.75 + i * s * 0.28;
    const w = s * (0.9 - i * 0.13);
    g.lineWidth = s * 0.1;
    g.beginPath();
    g.ellipse(i * s * 0.04, yy, w, s * 0.1, 0, 0, Math.PI * 1.6);
    g.stroke();
  }
  g.restore();
}
/** head and body items for the customise screen */
export function itemIcon(g: G, kind: string, x: number, y: number, s: number, col: string): void {
  g.save();
  g.translate(x, y);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.shadowColor = col;
  g.shadowBlur = s * 0.3;
  const fillGrad = (c1: string, c2: string) => {
    const gr = g.createLinearGradient(0, -s, 0, s);
    gr.addColorStop(0, c1);
    gr.addColorStop(1, c2);
    return gr;
  };
  switch (kind) {
    case 'helmet':
      g.beginPath();
      g.arc(0, 0, s * 0.75, Math.PI, 0);
      g.lineTo(s * 0.75, s * 0.45);
      g.lineTo(-s * 0.75, s * 0.45);
      g.closePath();
      g.fillStyle = fillGrad('#c8d8ff', '#3a4a8a');
      g.fill();
      g.fillStyle = col;
      g.fillRect(-s * 0.6, -s * 0.05, s * 1.2, s * 0.2);
      break;
    case 'halo':
      g.strokeStyle = '#ffe27a';
      g.lineWidth = s * 0.14;
      g.beginPath();
      g.ellipse(0, 0, s * 0.8, s * 0.22, 0, 0, TAU);
      g.stroke();
      break;
    case 'band':
      g.fillStyle = fillGrad('#bff8ff', '#2a8ab0');
      g.beginPath();
      g.ellipse(0, 0, s * 0.85, s * 0.35, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#0a1a2a';
      g.beginPath();
      g.ellipse(0, -s * 0.05, s * 0.6, s * 0.15, 0, 0, TAU);
      g.fill();
      break;
    case 'goggles':
      g.strokeStyle = '#3a3a3a';
      g.lineWidth = s * 0.14;
      g.beginPath();
      g.moveTo(-s * 0.9, 0);
      g.lineTo(s * 0.9, 0);
      g.stroke();
      for (const sd of [-1, 1]) {
        g.beginPath();
        g.ellipse(sd * s * 0.4, 0, s * 0.33, s * 0.25, 0, 0, TAU);
        g.fillStyle = fillGrad('#bff8ff', '#2a8ab0');
        g.fill();
        g.strokeStyle = '#d0d0d0';
        g.lineWidth = s * 0.07;
        g.stroke();
      }
      break;
    case 'headband':
      g.fillStyle = fillGrad('#ff6a4a', '#a8200c');
      g.beginPath();
      g.moveTo(-s * 0.85, -s * 0.15);
      g.quadraticCurveTo(0, -s * 0.35, s * 0.85, -s * 0.15);
      g.lineTo(s * 0.85, s * 0.15);
      g.quadraticCurveTo(0, -s * 0.05, -s * 0.85, s * 0.15);
      g.closePath();
      g.fill();
      g.fillStyle = '#1a0a0a';
      g.fillRect(-s * 0.4, -s * 0.15, s * 0.25, s * 0.08);
      g.fillRect(s * 0.15, -s * 0.15, s * 0.25, s * 0.08);
      break;
    case 'bandana':
      g.fillStyle = fillGrad(col, '#401040');
      g.beginPath();
      g.moveTo(-s * 0.85, -s * 0.4);
      g.lineTo(s * 0.85, -s * 0.4);
      g.lineTo(0, s * 0.6);
      g.closePath();
      g.fill();
      g.beginPath();
      g.moveTo(s * 0.7, -s * 0.4);
      g.lineTo(s * 0.95, s * 0.2);
      g.lineTo(s * 0.55, -s * 0.1);
      g.fill();
      break;
    case 'scarf':
      g.fillStyle = fillGrad(col, '#401010');
      g.beginPath();
      g.ellipse(0, -s * 0.2, s * 0.8, s * 0.3, 0, 0, TAU);
      g.fill();
      g.beginPath();
      g.moveTo(-s * 0.2, -s * 0.1);
      g.lineTo(-s * 0.5, s * 0.8);
      g.lineTo(-s * 0.1, s * 0.75);
      g.lineTo(s * 0.1, -s * 0.05);
      g.fill();
      break;
    case 'pads':
      for (const sd of [-1, 1]) {
        g.beginPath();
        g.ellipse(sd * s * 0.45, 0, s * 0.42, s * 0.32, sd * 0.3, Math.PI, 0);
        g.lineTo(sd * s * 0.45 + s * 0.4, s * 0.3);
        g.closePath();
        g.fillStyle = fillGrad(col, '#5a3a10');
        g.fill();
      }
      break;
    case 'ring':
      g.strokeStyle = col;
      g.lineWidth = s * 0.1;
      g.beginPath();
      g.arc(0, 0, s * 0.6, 0, TAU);
      g.stroke();
      g.beginPath();
      g.arc(0, 0, s * 0.3, 0, TAU);
      g.stroke();
      break;
    case 'smile':
      g.strokeStyle = col;
      g.lineWidth = s * 0.1;
      g.beginPath();
      g.arc(0, 0, s * 0.7, 0, TAU);
      g.stroke();
      g.beginPath();
      g.arc(0, s * 0.05, s * 0.35, 0.3, Math.PI - 0.3);
      g.stroke();
      break;
    case 'body':
      g.strokeStyle = col;
      g.lineWidth = s * 0.12;
      g.beginPath();
      g.arc(0, -s * 0.65, s * 0.2, 0, TAU);
      g.moveTo(0, -s * 0.45);
      g.lineTo(0, s * 0.2);
      g.lineTo(-s * 0.35, s * 0.8);
      g.moveTo(0, s * 0.2);
      g.lineTo(s * 0.35, s * 0.8);
      g.moveTo(-s * 0.6, -s * 0.5);
      g.lineTo(0, -s * 0.25);
      g.lineTo(s * 0.6, -s * 0.55);
      g.stroke();
      break;
    case 'fireHair':
      g.restore();
      flame(g, x, y, s * 0.8);
      return;
  }
  g.restore();
}

// ---------------------------------------------------------------- backdrops
export type City = 'city' | 'ruin' | 'dark';
const cache = new Map<string, HTMLCanvasElement>();
/** the neon night city behind most screens: skyline, billboards, railing and a wet tiled floor */
export function city(kind: City = 'city', horizon = 520): HTMLCanvasElement {
  const key = `${kind}:${horizon}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const r = rng(kind === 'ruin' ? 11 : 5);
  const ruin = kind === 'ruin';
  // sky
  const sky = g.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, ruin ? '#060914' : '#070a2a');
  sky.addColorStop(0.55, ruin ? '#141a38' : '#1a1652');
  sky.addColorStop(1, ruin ? '#2a2c50' : '#3a2a8a');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  glowDot(g, W * 0.5, horizon - 40, 520, ruin ? 'rgb(80,90,160)' : 'rgb(140,80,255)', 0.35);
  // far skyline
  for (let layer = 0; layer < 3; layer++) {
    const tone = ['#141a48', '#10153a', '#0b0f2c'][layer];
    let x = -20;
    while (x < W) {
      const bw = 30 + r() * (60 + layer * 30);
      const bh = (80 + r() * 220) * (1 + layer * 0.35);
      const top = horizon - bh;
      g.fillStyle = tone;
      g.fillRect(x, top, bw, bh + 4);
      if (r() < 0.3) {
        g.fillRect(x + bw * 0.4, top - 30 - r() * 40, 3, 40);
      }
      // windows
      for (let wy = top + 8; wy < horizon - 6; wy += 9 + layer * 2) {
        for (let wx = x + 4; wx < x + bw - 4; wx += 7 + layer * 2) {
          if (r() < (ruin ? 0.08 : 0.22)) {
            const pick = r();
            g.fillStyle = pick < 0.5 ? 'rgba(90,220,255,0.75)' : pick < 0.8 ? 'rgba(255,90,220,0.7)' : 'rgba(255,220,120,0.7)';
            g.fillRect(wx, wy, 3, 4);
          }
        }
      }
      // neon trims
      if (r() < 0.35) {
        g.save();
        g.fillStyle = r() < 0.5 ? '#3fe6ff' : '#ff4fd8';
        g.shadowColor = g.fillStyle as string;
        g.shadowBlur = 12;
        g.fillRect(x + 2, top + 10 + r() * bh * 0.6, bw - 4, 3);
        g.restore();
      }
      x += bw + r() * 8;
    }
  }
  // big side towers
  const tower = (x: number, w: number, top: number, col: string) => {
    const gr = g.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, '#0a0e26');
    gr.addColorStop(1, '#151a44');
    g.fillStyle = gr;
    g.fillRect(x, top, w, horizon - top + 10);
    for (let wy = top + 20; wy < horizon - 10; wy += 22) {
      g.fillStyle = r() < 0.5 ? 'rgba(80,200,255,0.18)' : 'rgba(40,60,120,0.35)';
      g.fillRect(x + 8, wy, w - 16, 10);
    }
    g.save();
    g.strokeStyle = col;
    g.shadowColor = col;
    g.shadowBlur = 14;
    g.lineWidth = 2;
    g.strokeRect(x + 3, top + 3, w - 6, horizon - top);
    g.restore();
  };
  tower(-30, 170, 40, '#2a5aff');
  tower(W - 150, 190, 60, '#2a5aff');
  // billboards
  const board = (x: number, y: number, w: number, h: number, col: string, skew: number, kindB: 'figure' | 'news') => {
    g.save();
    g.translate(x, y);
    g.transform(1, skew, 0, 1, 0, 0);
    g.fillStyle = 'rgba(10,20,50,0.9)';
    g.fillRect(-6, -6, w + 12, h + 12);
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, col);
    gr.addColorStop(1, '#2a1a6a');
    g.globalAlpha = 0.85;
    g.fillStyle = gr;
    g.shadowColor = col;
    g.shadowBlur = 30;
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 1;
    g.shadowBlur = 0;
    g.strokeStyle = '#ffffffaa';
    g.lineWidth = 2;
    if (kindB === 'figure') {
      g.beginPath();
      g.arc(w / 2, h * 0.32, w * 0.16, 0, TAU);
      g.moveTo(w / 2, h * 0.45);
      g.lineTo(w / 2, h * 0.75);
      g.moveTo(w * 0.25, h * 0.9);
      g.lineTo(w / 2, h * 0.75);
      g.lineTo(w * 0.75, h * 0.9);
      g.stroke();
    } else {
      text(g, 'NEWS', w * 0.08, h * 0.3, { size: h * 0.28, col: '#ffffff', weight: 800 });
      g.fillStyle = '#ff4fd8';
      g.fillRect(w * 0.08, h * 0.6, w * 0.45, h * 0.12);
      g.strokeRect(w * 0.62, h * 0.15, w * 0.3, h * 0.7);
    }
    g.restore();
  };
  board(50, 150, 80, 140, '#3fd6ff', 0.08, 'figure');
  board(ruin ? 110 : 980, ruin ? 120 : 90, 110, 80, ruin ? '#ff4fd8' : '#5ab0ff', -0.18, 'news');
  if (ruin) board(300, 140, 40, 100, '#ff4f6a', 0, 'figure');
  else board(1180, 170, 50, 120, '#ff4fd8', 0, 'figure');
  // flying craft
  g.save();
  g.translate(ruin ? 900 : 560, ruin ? 70 : 125);
  g.rotate(-0.12);
  g.fillStyle = '#1a2a5a';
  g.beginPath();
  g.moveTo(-40, 0);
  g.lineTo(30, -6);
  g.lineTo(44, 2);
  g.lineTo(-30, 8);
  g.closePath();
  g.fill();
  g.fillStyle = '#7ad8ff';
  g.shadowColor = '#7ad8ff';
  g.shadowBlur = 18;
  g.fillRect(-60, 0, 22, 3);
  g.restore();
  if (!ruin) {
    // railing
    const ry = horizon - 30;
    g.fillStyle = 'rgba(20,30,70,0.85)';
    g.fillRect(0, ry, W, 34);
    g.fillStyle = 'rgba(60,90,170,0.35)';
    for (let x = 0; x < W; x += 140) g.fillRect(x, ry - 20, 6, 54);
    g.save();
    g.strokeStyle = '#6aa8ff';
    g.shadowColor = '#6aa8ff';
    g.shadowBlur = 8;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, ry - 20);
    g.lineTo(W, ry - 20);
    g.stroke();
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, ry + 2);
    g.lineTo(W, ry + 2);
    g.stroke();
    g.restore();
  } else {
    // rubble, a wrecked car and street lamps
    for (let i = 0; i < 14; i++) {
      const x = r() * W;
      const y = horizon - 10 + r() * 20;
      g.fillStyle = '#0c1020';
      g.beginPath();
      g.moveTo(x - 40 - r() * 40, y + 20);
      g.lineTo(x - 10, y - 20 - r() * 30);
      g.lineTo(x + 20, y - 10);
      g.lineTo(x + 50 + r() * 30, y + 20);
      g.fill();
    }
    g.fillStyle = '#121828';
    g.beginPath();
    g.roundRect(20, horizon - 60, 200, 70, 14);
    g.fill();
  }
  // floor
  const fl = g.createLinearGradient(0, horizon, 0, H);
  fl.addColorStop(0, ruin ? '#1a1e36' : '#1b2a6a');
  fl.addColorStop(1, ruin ? '#06080f' : '#070b22');
  g.fillStyle = fl;
  g.fillRect(0, horizon, W, H - horizon);
  // reflections
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 22; i++) {
    const x = r() * W;
    const col = r() < 0.5 ? '63,214,255' : '255,79,216';
    const gr = g.createLinearGradient(0, horizon, 0, horizon + 140 + r() * 120);
    gr.addColorStop(0, `rgba(${col},0.22)`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr;
    g.fillRect(x, horizon, 4 + r() * 14, 260);
  }
  g.restore();
  // tiles in perspective
  g.strokeStyle = ruin ? 'rgba(80,100,160,0.12)' : 'rgba(100,160,255,0.16)';
  g.lineWidth = 1;
  for (let i = -16; i <= 16; i++) {
    g.beginPath();
    g.moveTo(W / 2 + i * 40, horizon);
    g.lineTo(W / 2 + i * 220, H);
    g.stroke();
  }
  for (let k = 0; k < 9; k++) {
    const y = horizon + Math.pow(k / 8, 1.8) * (H - horizon);
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
  if (ruin) {
    // road line and cracks
    g.strokeStyle = 'rgba(220,220,200,0.25)';
    g.lineWidth = 6;
    g.setLineDash([60, 50]);
    g.beginPath();
    g.moveTo(W / 2, horizon + 10);
    g.lineTo(W / 2, H);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(80,255,120,0.06)';
    g.fillRect(0, horizon - 120, W, 200);
  }
  // vignette
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,10,0.55)');
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  cache.set(key, c);
  return c;
}

/** light cone from above */
export function spotlight(g: G, x: number, top: number, wTop: number, wBot: number, bottom: number, col = 'rgb(120,220,255)', a = 0.35): void {
  g.save();
  g.globalCompositeOperation = 'lighter';
  const gr = g.createLinearGradient(0, top, 0, bottom);
  gr.addColorStop(0, col.replace('rgb(', 'rgba(').replace(')', `,${a})`));
  gr.addColorStop(1, col.replace('rgb(', 'rgba(').replace(')', ',0)'));
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(x - wTop / 2, top);
  g.lineTo(x + wTop / 2, top);
  g.lineTo(x + wBot / 2, bottom);
  g.lineTo(x - wBot / 2, bottom);
  g.closePath();
  g.fill();
  g.restore();
}

/** round hero podium with glowing rings in the element colour */
export function podium(g: G, x: number, y: number, rw: number, col: string, t = 0): void {
  const rh = rw * 0.24;
  g.save();
  // side
  const sd = g.createLinearGradient(0, y, 0, y + rh * 0.9);
  sd.addColorStop(0, '#1a2448');
  sd.addColorStop(1, '#070b1c');
  g.fillStyle = sd;
  g.beginPath();
  g.ellipse(x, y + rh * 0.55, rw * 1.04, rh * 1.04, 0, 0, Math.PI);
  g.lineTo(x - rw * 1.04, y);
  g.ellipse(x, y, rw * 1.04, rh * 1.04, 0, Math.PI, 0, true);
  g.closePath();
  g.fill();
  // rim lights
  for (let i = 0; i < 12; i++) {
    const a = Math.PI * (0.08 + (i / 11) * 0.84);
    const lx = x + Math.cos(a) * rw * 1.0;
    const ly = y + rh * 0.5 + Math.sin(a) * rh * 0.95;
    g.fillStyle = col;
    g.shadowColor = col;
    g.shadowBlur = 10;
    g.fillRect(lx - 6, ly - 2, 12, 4);
  }
  g.shadowBlur = 0;
  // top
  g.beginPath();
  g.ellipse(x, y, rw, rh, 0, 0, TAU);
  const tp = g.createRadialGradient(x, y, 0, x, y, rw);
  tp.addColorStop(0, col);
  tp.addColorStop(0.35, '#3a2a5a');
  tp.addColorStop(1, '#141a36');
  g.globalAlpha = 0.9;
  g.fillStyle = tp;
  g.fill();
  g.globalAlpha = 1;
  g.strokeStyle = '#8aa0d8';
  g.lineWidth = 2;
  g.stroke();
  // glowing rings
  for (const k of [0.78, 0.55, 0.32]) {
    g.beginPath();
    g.ellipse(x, y, rw * k, rh * k, 0, 0, TAU);
    neon(g, col, 3, 18 + Math.sin(t / 15 + k * 5) * 6);
  }
  g.restore();
  glowDot(g, x, y, rw * 0.9, col.startsWith('#') ? hexRgb(col) : col, 0.35);
}
export function hexRgb(h: string): string {
  const n = parseInt(h.slice(1, 7), 16);
  return `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`;
}

// ---------------------------------------------------------------- particles
/** rising embers / motes, deterministic from the frame number */
export function embers(g: G, t: number, x: number, y: number, w: number, h: number, col: string, n: number, seed = 1, size = 3): void {
  const r = rng(seed);
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const sx = r() * w;
    const sp = 0.4 + r() * 1.2;
    const ph = r() * h;
    const yy = h - ((ph + t * sp) % h);
    const xx = sx + Math.sin((t + i * 40) / 30) * 10;
    const a = Math.min(1, yy / (h * 0.3)) * (0.5 + r() * 0.5);
    g.globalAlpha = a;
    g.fillStyle = col;
    g.shadowColor = col;
    g.shadowBlur = 8;
    const sz = size * (0.5 + r());
    g.fillRect(x + xx, y + yy, sz, sz * (0.8 + r()));
  }
  g.restore();
}
export function confetti(g: G, t: number, n: number, seed = 3): void {
  const r = rng(seed);
  g.save();
  for (let i = 0; i < n; i++) {
    const x0 = r() * W;
    const sp = 0.8 + r() * 1.6;
    const y = ((r() * H + t * sp) % (H + 40)) - 20;
    const x = x0 + Math.sin(t / 25 + i) * 20;
    g.save();
    g.translate(x, y);
    g.rotate(t / 20 + i);
    g.fillStyle = ['#ffd24a', '#ff9a2a', '#ffe9a0'][i % 3];
    g.fillRect(-5, -3, 10 * Math.abs(Math.cos(t / 12 + i)), 6);
    g.restore();
  }
  g.restore();
}
export function rain(g: G, t: number, n: number, a = 0.25): void {
  const r = rng(17);
  g.save();
  g.strokeStyle = `rgba(170,200,255,${a})`;
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const x = (r() * W + t * 2) % W;
    const y = (r() * H + t * (14 + r() * 8)) % H;
    g.moveTo(x, y);
    g.lineTo(x - 4, y + 18);
  }
  g.stroke();
  g.restore();
}
/** zig-zag lightning bolt between two points */
export function bolt(g: G, x1: number, y1: number, x2: number, y2: number, seed: number, col = '#bff4ff', w = 3): void {
  const r = rng(seed);
  const n = 8;
  g.save();
  g.strokeStyle = col;
  g.lineWidth = w;
  g.shadowColor = '#3fd6ff';
  g.shadowBlur = 14;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(x1, y1);
  for (let i = 1; i < n; i++) {
    const k = i / n;
    g.lineTo(x1 + (x2 - x1) * k + (r() - 0.5) * 30, y1 + (y2 - y1) * k + (r() - 0.5) * 30);
  }
  g.lineTo(x2, y2);
  g.stroke();
  g.restore();
}
export { C };
