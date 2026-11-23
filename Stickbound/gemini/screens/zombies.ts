/**
 * Zombie Survival enemies, drawn in code (gemini/extra/zombie-enemies-sheet.png): Walker, Runner, Spitter, Bomber,
 * Officer, and the two bosses, the Brute and the Toxic Titan. One small skeleton with neon outlines; each type adds
 * its own pieces (circuit lines, slime, bomb tank, riot shield, stone armour).
 */
import { rng, type G } from './ui';

export type ZType = 'walker' | 'runner' | 'spitter' | 'bomber' | 'officer' | 'brute' | 'titan';
export interface ZSpec {
  name: string;
  hp: number;
  speed: number;
  dmg: number;
  score: number;
  /** body size (1 = a normal zombie, about 240 px tall) */
  size: number;
  line: string;
  body: string;
  eye: string;
  core: string;
  reach: number;
  boss?: boolean;
  text: string;
}
export const ZSPEC: Record<ZType, ZSpec> = {
  walker: { name: 'Walker', hp: 300, speed: 0.9, dmg: 60, score: 100, size: 1, line: '#3fd6ff', body: '#3a4a48', eye: '#ff3b3b', core: '#ff3b3b', reach: 70, text: 'Slow, tough, comes in packs.' },
  runner: { name: 'Runner', hp: 160, speed: 3.4, dmg: 45, score: 150, size: 0.95, line: '#3fd6ff', body: '#0a0f1c', eye: '#5dff7a', core: '#5dff7a', reach: 60, text: 'Glitches forward very fast. Low health.' },
  spitter: { name: 'Spitter', hp: 240, speed: 1.0, dmg: 70, score: 180, size: 1, line: '#7dff4a', body: '#3a4a2a', eye: '#9dff4a', core: '#7dff4a', reach: 420, text: 'Keeps its distance and spits acid in an arc.' },
  bomber: { name: 'Bomber', hp: 220, speed: 1.5, dmg: 180, score: 200, size: 1, line: '#3fd6ff', body: '#3a3e4a', eye: '#ff4fd8', core: '#ff3b6a', reach: 90, text: 'Runs in and blows up. Blows up when it dies, too.' },
  officer: { name: 'Officer', hp: 420, speed: 1.1, dmg: 80, score: 250, size: 1.02, line: '#3fa8ff', body: '#101a30', eye: '#3fe6ff', core: '#3fa8ff', reach: 75, text: 'Riot shield blocks hits from the front. Hit it from behind or break the shield.' },
  brute: { name: 'Brute', hp: 6000, speed: 1.0, dmg: 160, score: 5000, size: 1.95, line: '#3fd6ff', body: '#3a4258', eye: '#ff3b3b', core: '#ff4a2a', reach: 150, boss: true, text: 'Boss. Smashes, slams shockwaves along the floor (jump them) and charges.' },
  titan: { name: 'Toxic Titan', hp: 7000, speed: 0.8, dmg: 130, score: 7000, size: 2.1, line: '#7dff4a', body: '#2e4a24', eye: '#c8ff4a', core: '#7dff4a', reach: 140, boss: true, text: 'Boss. Sprays acid volleys and calls up Walkers from the ground.' },
};

/** what the renderer needs from a zombie */
export interface ZLook {
  type: ZType;
  x: number;
  feet: number;
  facing: number;
  /** walk phase (radians) */
  phase: number;
  state: 'walk' | 'attack' | 'hurt' | 'dead' | 'spawn' | 'idle' | 'charge' | 'slam' | 'spit' | 'fuse';
  /** 0..1 progress of the current state */
  k: number;
  t: number;
  flash: number;
  shieldHp?: number;
  seed: number;
}
const D2R = Math.PI / 180;
type P = { x: number; y: number };
const at = (p: P, ang: number, len: number): P => ({ x: p.x + Math.sin(ang * D2R) * len, y: p.y + Math.cos(ang * D2R) * len });

interface ZPose {
  lean: number;
  head: number;
  fu: number;
  fl: number;
  bu: number;
  bl: number;
  ft: number;
  fs: number;
  bt: number;
  bs: number;
  rot: number;
  sink: number;
}
function poseOf(z: ZLook): ZPose {
  const s = Math.sin(z.phase);
  const c = Math.cos(z.phase);
  const run = z.type === 'runner';
  const amp = run ? 50 : z.type === 'brute' || z.type === 'titan' ? 18 : 26;
  const p: ZPose = {
    lean: run ? 28 : 14,
    head: run ? -10 : 14 + Math.sin(z.t / 30) * 6,
    // classic zombie reach: both arms forward
    fu: run ? 40 - s * 50 : 82 + Math.sin(z.t / 20) * 6,
    fl: run ? 70 : 8,
    bu: run ? -40 + s * 50 : 70 + Math.sin(z.t / 23 + 1) * 6,
    bl: run ? 80 : 14,
    ft: s * amp,
    fs: -10 - Math.max(0, c) * (run ? 80 : 30),
    bt: -s * amp,
    bs: -10 - Math.max(0, -c) * (run ? 80 : 30),
    rot: 0,
    sink: -Math.abs(c) * (run ? 8 : 3),
  };
  if (z.type === 'officer') {
    p.fu = 70;
    p.fl = 20;
    p.lean = 8;
    p.head = 6;
  }
  if (z.type === 'brute' || z.type === 'titan') {
    p.fu = 30 + s * 10;
    p.fl = 20;
    p.bu = -20 - s * 10;
    p.bl = 25;
    p.lean = 10;
    p.head = 8;
  }
  switch (z.state) {
    case 'idle':
      p.ft = 6;
      p.bt = -6;
      p.fs = -12;
      p.bs = -12;
      break;
    case 'attack': {
      const k = z.k;
      const swing = k < 0.45 ? -60 * (k / 0.45) : -60 + 200 * Math.min(1, (k - 0.45) / 0.2);
      p.fu = 90 + swing * (z.type === 'brute' ? 1 : 0.6);
      p.fl = 10;
      p.lean = 14 + (k > 0.45 ? 16 : -6);
      break;
    }
    case 'slam': {
      const k = z.k;
      const up = k < 0.5;
      p.fu = up ? 170 : 70;
      p.bu = up ? 165 : 60;
      p.fl = up ? 20 : 10;
      p.bl = up ? 20 : 10;
      p.lean = up ? -10 : 40;
      p.sink = up ? 0 : 30;
      p.ft = 30;
      p.bt = -30;
      p.fs = -30;
      p.bs = -30;
      break;
    }
    case 'spit':
      p.head = z.k < 0.5 ? -30 : 30;
      p.lean = z.k < 0.5 ? -10 : 24;
      break;
    case 'charge':
      p.lean = 40;
      p.fu = 20;
      p.bu = -20;
      break;
    case 'hurt':
      p.lean = -18;
      p.head = -24;
      p.fu = 30;
      p.bu = -50;
      break;
    case 'dead':
      p.rot = -Math.min(1, z.k * 2) * 90;
      p.lean = -20;
      p.head = -30;
      break;
    case 'spawn':
      p.sink = (1 - z.k) * 240;
      p.fu = 160;
      p.fl = 10;
      p.bu = 150;
      break;
    case 'fuse':
      p.fu = 120;
      p.bu = 110;
      p.lean = 20;
      break;
    default:
      break;
  }
  return p;
}

function limb(g: G, pts: P[], w: number, line: string, body: string): void {
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (const q of pts.slice(1)) g.lineTo(q.x, q.y);
  g.strokeStyle = line;
  g.shadowColor = line;
  g.shadowBlur = 14;
  g.lineWidth = w + 6;
  g.stroke();
  g.shadowBlur = 0;
  g.strokeStyle = body;
  g.lineWidth = w;
  g.stroke();
  g.restore();
}
function circuit(g: G, pts: P[], col: string, seed: number): void {
  const r = rng(seed);
  g.save();
  g.strokeStyle = col;
  g.shadowColor = col;
  g.shadowBlur = 6;
  g.lineWidth = 1.6;
  g.beginPath();
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const o = (r() - 0.5) * 4;
    g.moveTo(a.x + o, a.y);
    g.lineTo((a.x + b.x) / 2 + o, (a.y + b.y) / 2);
    g.lineTo((a.x + b.x) / 2 + o + 3, (a.y + b.y) / 2 + 3);
  }
  g.stroke();
  g.restore();
}

function headOf(g: G, z: ZLook, sp: ZSpec, r: number, line: string, flash: boolean): void {
  if (z.type === 'officer') {
    g.beginPath();
    g.arc(0, 0, r + 4, Math.PI, 0);
    g.lineTo(r + 4, 10);
    g.lineTo(-r - 4, 10);
    g.closePath();
    g.fillStyle = flash ? '#fff' : '#18243e';
    g.shadowColor = line;
    g.shadowBlur = 12;
    g.fill();
    g.strokeStyle = line;
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = sp.eye;
    g.shadowColor = sp.eye;
    g.fillRect(-2, -8, r + 6, 9);
    return;
  }
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fillStyle = flash ? '#fff' : z.type === 'runner' ? '#06080f' : z.type === 'spitter' || z.type === 'titan' ? '#4a6a3a' : z.type === 'brute' ? '#4a5268' : '#5a6a62';
  g.shadowColor = line;
  g.shadowBlur = 14;
  g.fill();
  g.strokeStyle = line;
  g.lineWidth = 3;
  g.stroke();
  g.shadowBlur = 0;
  if (z.type !== 'runner') {
    // brow, jaw and teeth
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.ellipse(r * 0.45, -r * 0.15, r * 0.55, r * 0.3, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(10,10,10,0.85)';
    g.beginPath();
    g.roundRect(r * 0.05, r * 0.28, r * 0.85, r * 0.42, 4);
    g.fill();
    g.strokeStyle = '#d8e0d0';
    g.lineWidth = 1.5;
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      g.moveTo(r * (0.15 + i * 0.2), r * 0.28);
      g.lineTo(r * (0.15 + i * 0.2), r * 0.66);
    }
    g.stroke();
  }
  g.fillStyle = sp.eye;
  g.shadowColor = sp.eye;
  g.shadowBlur = 12;
  g.beginPath();
  g.arc(r * 0.25, -r * 0.15, r * 0.17, 0, Math.PI * 2);
  g.arc(r * 0.72, -r * 0.12, r * 0.14, 0, Math.PI * 2);
  g.fill();
}
function drips(g: G, x: number, y: number, t: number, n: number): void {
  g.save();
  g.fillStyle = '#9dff4a';
  g.shadowColor = '#7dff4a';
  g.shadowBlur = 10;
  for (let i = 0; i < n; i++) {
    const len = ((t * 0.6 + i * 9) % 26) + 4;
    g.beginPath();
    g.roundRect(x + i * 4 - n * 2, y, 3, len, 1.5);
    g.fill();
  }
  g.restore();
}
function plate(g: G, x: number, y: number, rx: number, ry: number, rot: number, fill: string, line: string): void {
  g.save();
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  const gr = g.createLinearGradient(x, y - ry, x, y + ry);
  gr.addColorStop(0, '#7a84a8');
  gr.addColorStop(1, fill);
  g.fillStyle = gr;
  g.shadowColor = line;
  g.shadowBlur = 12;
  g.fill();
  g.strokeStyle = line;
  g.lineWidth = 3;
  g.stroke();
  g.restore();
}

/** a boss: wide armoured body, small skull between high shoulders, huge stone fists, glowing chest core */
function drawBoss(g: G, z: ZLook, p: ZPose, sp: ZSpec, line: string, flash: boolean): void {
  const titan = z.type === 'titan';
  const stone = flash ? '#ffffff' : titan ? '#33502a' : '#3a4258';
  const hipY = -112;
  const legW = 34;
  // legs from two hip joints
  for (const [hx, ang, sh] of [[-22, p.bt, p.bs], [22, p.ft, p.fs]] as const) {
    const h0 = { x: hx, y: hipY };
    const k = at(h0, ang * 0.7, 58);
    const a = at(k, ang * 0.7 + sh * 0.6, 54);
    limb(g, [h0, k, a], legW, line, stone);
    plate(g, k.x + 4, k.y, 20, 16, 0, stone, line);
    g.save();
    g.fillStyle = stone;
    g.strokeStyle = line;
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(a.x - 22, a.y - 14, 50, 18, 6);
    g.fill();
    g.stroke();
    g.restore();
  }
  g.save();
  g.translate(0, hipY);
  g.rotate(p.lean * D2R);
  const T = 104;
  // tanks on the titan's back
  if (titan) {
    for (const dx of [-56, -30]) {
      g.save();
      g.fillStyle = 'rgba(125,255,74,0.45)';
      g.strokeStyle = '#7dff4a';
      g.lineWidth = 3;
      g.shadowColor = '#7dff4a';
      g.shadowBlur = 14;
      g.beginPath();
      g.roundRect(dx - 12, -T - 6, 24, 70, 10);
      g.fill();
      g.stroke();
      g.restore();
    }
  }
  const sF = { x: 62, y: -T + 18 };
  const sB = { x: -58, y: -T + 14 };
  const arm = (s: P, u: number, l: number) => {
    const e = { x: s.x + Math.sin(u * D2R) * 58, y: s.y + Math.cos(u * D2R) * 58 };
    const w = { x: e.x + Math.sin((u + l) * D2R) * 54, y: e.y + Math.cos((u + l) * D2R) * 54 };
    limb(g, [s, e, w], 34, line, stone);
    plate(g, (s.x + e.x) / 2, (s.y + e.y) / 2, 22, 17, u * D2R, stone, line);
    plate(g, (e.x + w.x) / 2, (e.y + w.y) / 2, 24, 18, (u + l) * D2R, stone, line);
    g.save();
    g.fillStyle = stone;
    g.strokeStyle = line;
    g.lineWidth = 3;
    g.shadowColor = line;
    g.shadowBlur = 12;
    g.beginPath();
    g.roundRect(w.x - 30, w.y - 22, 60, 54, 14);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(0,0,0,0.45)';
    g.beginPath();
    for (let i = 1; i < 4; i++) {
      g.moveTo(w.x - 30 + i * 15, w.y - 22);
      g.lineTo(w.x - 30 + i * 15, w.y - 4);
    }
    g.stroke();
    g.restore();
  };
  arm(sB, p.bu, p.bl);
  // torso: narrow waist, wide chest
  g.beginPath();
  g.moveTo(-40, 6);
  g.bezierCurveTo(-52, -T * 0.35, -86, -T * 0.6, -74, -T);
  g.quadraticCurveTo(0, -T * 1.2, 76, -T);
  g.bezierCurveTo(88, -T * 0.6, 54, -T * 0.35, 40, 6);
  g.closePath();
  const gr = g.createLinearGradient(0, -T, 0, 0);
  gr.addColorStop(0, flash ? '#fff' : titan ? '#4e7238' : '#56607e');
  gr.addColorStop(1, stone);
  g.fillStyle = gr;
  g.shadowColor = line;
  g.shadowBlur = 18;
  g.fill();
  g.strokeStyle = line;
  g.lineWidth = 4;
  g.stroke();
  g.shadowBlur = 0;
  // plates and belt
  g.strokeStyle = 'rgba(0,0,0,0.5)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-60, -T * 0.62);
  g.quadraticCurveTo(0, -T * 0.5, 60, -T * 0.62);
  g.moveTo(-44, -T * 0.3);
  g.lineTo(44, -T * 0.3);
  g.moveTo(-42, -T * 0.14);
  g.lineTo(42, -T * 0.14);
  g.moveTo(0, -T * 0.55);
  g.lineTo(0, 0);
  g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(-42, -10, 84, 14);
  // cracks and the core
  const cr = rng(z.seed);
  const cy = -T * 0.68;
  g.strokeStyle = sp.core;
  g.shadowColor = sp.core;
  g.shadowBlur = 16;
  g.lineWidth = 3;
  g.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + cr();
    let x = 0;
    let y = cy;
    g.moveTo(x, y);
    for (let s = 0; s < 3; s++) {
      x += Math.cos(a + (cr() - 0.5)) * (10 + cr() * 12);
      y += Math.sin(a + (cr() - 0.5)) * (8 + cr() * 10);
      g.lineTo(x, y);
    }
  }
  g.stroke();
  const pulse = 0.65 + 0.35 * Math.sin(z.t / 8);
  g.globalAlpha *= pulse;
  g.fillStyle = sp.core;
  g.beginPath();
  g.arc(0, cy, 13, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha /= pulse;
  g.shadowBlur = 0;
  // head low between the shoulders
  g.save();
  g.translate(10, -T - 20);
  g.rotate(p.head * D2R * 0.4);
  headOf(g, z, sp, 28, line, flash);
  g.restore();
  if (titan) drips(g, 26, -T - 4, z.t, 4);
  plate(g, sB.x - 4, sB.y - 8, 34, 26, -0.3, stone, line);
  plate(g, sF.x + 4, sF.y - 8, 36, 28, 0.3, stone, line);
  if (titan) {
    for (const s of [sB, sF]) {
      g.save();
      g.fillStyle = 'rgba(125,255,74,0.55)';
      g.shadowColor = '#7dff4a';
      g.shadowBlur = 16;
      g.beginPath();
      g.arc(s.x, s.y - 30, 14 + Math.sin(z.t / 10 + s.x) * 3, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  arm(sF, p.fu, p.fl);
  g.restore();
}

/** draws one zombie with its feet at (x, feet) */
export function drawZombie(g: G, z: ZLook): void {
  const sp = ZSPEC[z.type];
  const p = poseOf(z);
  const S = sp.size;
  const big = !!sp.boss;
  const fade = z.state === 'dead' ? Math.max(0, 1 - Math.max(0, z.k - 0.55) / 0.45) : 1;
  if (fade <= 0) return;
  const flash = z.flash > 0;
  const line = flash ? '#ffffff' : sp.line;
  const body = flash ? '#ffffff' : sp.body;
  g.save();
  g.globalAlpha = fade;
  g.fillStyle = 'rgba(0,0,0,0.4)';
  g.beginPath();
  g.ellipse(z.x, z.feet + 3, 60 * S, 12 * S, 0, 0, Math.PI * 2);
  g.fill();
  g.translate(z.x, z.feet);
  if (z.state === 'spawn') {
    g.beginPath();
    g.rect(-200 * S, -400 * S, 400 * S, 400 * S);
    g.clip();
  }
  g.scale(S * z.facing, S);
  g.translate(0, p.sink);
  g.rotate(p.rot * D2R);
  if (big) {
    drawBoss(g, z, p, sp, line, false); // bosses flash their outline only, a full white body hides them
    g.restore();
    return;
  }
  const thigh = 56;
  const shin = 56;
  const ua = 46;
  const fa = 44;
  const torso = 92;
  const hip: P = { x: 0, y: -(thigh + shin) };
  const neck = { x: hip.x + Math.sin(p.lean * D2R) * torso, y: hip.y - Math.cos(p.lean * D2R) * torso };
  const sh = { x: neck.x - Math.sin(p.lean * D2R) * 10, y: neck.y + 10 };
  const fk = at(hip, p.ft, thigh);
  const fa2 = at(fk, p.ft + p.fs, shin);
  const bk = at(hip, p.bt, thigh);
  const ba = at(bk, p.bt + p.bs, shin);
  const fEl = { x: sh.x + Math.sin(p.fu * D2R) * ua, y: sh.y + Math.cos(p.fu * D2R) * ua };
  const fW = { x: fEl.x + Math.sin((p.fu + p.fl) * D2R) * fa, y: fEl.y + Math.cos((p.fu + p.fl) * D2R) * fa };
  const bEl = { x: sh.x + Math.sin(p.bu * D2R) * ua, y: sh.y + Math.cos(p.bu * D2R) * ua };
  const bW = { x: bEl.x + Math.sin((p.bu + p.bl) * D2R) * fa, y: bEl.y + Math.cos((p.bu + p.bl) * D2R) * fa };
  const headR = 23;
  const hc = { x: neck.x + Math.sin((p.lean + p.head) * D2R) * (headR + 6), y: neck.y - Math.cos((p.lean + p.head) * D2R) * (headR + 6) };
  const W0 = z.type === 'runner' ? 11 : z.type === 'officer' ? 21 : 18;
  if (z.type === 'runner') {
    const r = rng(z.seed + Math.floor(z.t / 3));
    for (let i = 0; i < 5; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(255,79,216,0.75)' : 'rgba(63,230,255,0.75)';
      g.fillRect(-60 + r() * 90, -220 + r() * 200, 20 + r() * 36, 3);
    }
    // sparks at the joints
    g.fillStyle = '#ffd24a';
    g.shadowColor = '#ffb43a';
    g.shadowBlur = 10;
    for (const q of [fk, bEl, fW]) g.fillRect(q.x - 2 + r() * 4, q.y - 2 + r() * 4, 4, 4);
    g.shadowBlur = 0;
  }
  limb(g, [hip, bk, ba], W0, line, body);
  limb(g, [sh, bEl, bW], W0 * 0.85, line, body);
  if (z.type === 'bomber') {
    g.save();
    g.translate(neck.x - 26, neck.y + 34);
    g.rotate(p.lean * D2R);
    g.fillStyle = '#2a3040';
    g.strokeStyle = sp.line;
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(-14, -30, 24, 66, 9);
    g.fill();
    g.stroke();
    g.strokeStyle = '#8a9ab0';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, -30);
    g.quadraticCurveTo(14, -52, 30, -34);
    g.moveTo(4, 30);
    g.quadraticCurveTo(30, 40, 36, 10);
    g.stroke();
    g.restore();
  }
  // torso: a fuller body than the hero sticks
  limb(g, [hip, { x: (hip.x + neck.x) / 2 + 3, y: (hip.y + neck.y) / 2 }, neck], W0 * 1.7, line, body);
  if (z.type === 'officer') {
    g.save();
    g.translate(hip.x, hip.y);
    g.rotate(p.lean * D2R);
    g.fillStyle = flash ? '#fff' : '#1c2a48';
    g.strokeStyle = line;
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(-18, -torso + 6, 36, torso - 16, 8);
    g.fill();
    g.stroke();
    g.strokeStyle = '#3fe6ff';
    g.beginPath();
    g.moveTo(-10, -torso + 24);
    g.lineTo(10, -torso + 24);
    g.moveTo(-10, -torso + 40);
    g.lineTo(6, -torso + 40);
    g.stroke();
    g.restore();
  } else {
    circuit(g, [hip, neck], z.type === 'spitter' ? '#9dff4a' : '#ff3b4a', z.seed);
    if (z.type === 'walker') {
      // torn patches
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath();
      g.ellipse((hip.x + neck.x) / 2 - 4, (hip.y + neck.y) / 2 + 10, 7, 10, 0.3, 0, Math.PI * 2);
      g.fill();
    }
  }
  const cc = { x: (hip.x + neck.x * 2) / 3, y: (hip.y + neck.y * 2) / 3 };
  const pulse = z.type === 'bomber' ? (z.state === 'fuse' ? 0.5 + 0.5 * Math.sin(z.t) : 0.75 + 0.25 * Math.sin(z.t / 6)) : 0.85;
  g.save();
  g.fillStyle = sp.core;
  g.shadowColor = sp.core;
  g.shadowBlur = z.type === 'bomber' ? 28 : 12;
  g.globalAlpha = fade * pulse;
  g.beginPath();
  g.arc(cc.x, cc.y, z.type === 'bomber' ? 13 : 6, 0, Math.PI * 2);
  g.fill();
  g.restore();
  limb(g, [hip, fk, fa2], W0, line, body);
  circuit(g, [hip, fk, fa2], z.type === 'spitter' ? '#9dff4a' : '#ff3b4a', z.seed + 2);
  g.save();
  g.translate(hc.x, hc.y);
  g.rotate((p.lean + p.head) * D2R * 0.5);
  headOf(g, z, sp, headR, line, flash);
  g.restore();
  if (z.type === 'spitter') drips(g, hc.x + headR * 0.4, hc.y + headR * 0.6, z.t, 4);
  if (z.type === 'officer' && (z.shieldHp ?? 0) > 0) {
    // riot shield held in front of the body
    g.save();
    const sx = hip.x + 30;
    const top = neck.y - 30;
    g.globalAlpha = fade * 0.8;
    const sg = g.createLinearGradient(sx, top, sx + 40, top + 210);
    sg.addColorStop(0, 'rgba(140,210,255,0.55)');
    sg.addColorStop(1, 'rgba(40,90,180,0.35)');
    g.fillStyle = sg;
    g.strokeStyle = '#9fe0ff';
    g.lineWidth = 3;
    g.shadowColor = '#3fa8ff';
    g.shadowBlur = 16;
    g.beginPath();
    g.roundRect(sx, top, 46, 205, 10);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(10,20,40,0.55)';
    g.fillRect(sx + 8, top + 16, 30, 16);
    g.strokeStyle = 'rgba(160,220,255,0.6)';
    g.lineWidth = 1.5;
    g.strokeRect(sx + 8, top + 44, 30, 120);
    if ((z.shieldHp ?? 0) < 130) {
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.beginPath();
      g.moveTo(sx + 8, top + 60);
      g.lineTo(sx + 26, top + 96);
      g.lineTo(sx + 14, top + 130);
      g.lineTo(sx + 36, top + 170);
      g.stroke();
    }
    g.restore();
  }
  limb(g, [sh, fEl, fW], W0 * 0.85, line, body);
  if (z.type === 'officer') {
    g.save();
    g.strokeStyle = '#c8d0e0';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(fW.x, fW.y);
    g.lineTo(fW.x + 30, fW.y - 24);
    g.stroke();
    g.restore();
  }
  if (z.state === 'fuse') {
    g.save();
    g.globalAlpha = 0.25 + 0.25 * Math.sin(z.t);
    g.fillStyle = '#ff3b6a';
    g.beginPath();
    g.arc(0, -120, 120, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.restore();
}
