// Small animated stick scenes for the lobby mode tiles, all drawn by one shared animation loop.
import { DEFAULT_LOOK, type Look } from '../content/looks';
import { CanvasPen } from '../render/pen';
import { drawStick, mix, POSES, solve, type Expression, type Pose } from '../render/rig';
import { settings } from '../meta/settings';
import { makeCanvas } from './powerPreview';

export type TileKind = 'road' | 'ranked' | 'zombie' | 'training' | 'local';

const live = new Set<{ c: HTMLCanvasElement; draw: (t: number) => void }>();
let raf = 0;
function loop(now: number): void {
  raf = 0;
  for (const it of [...live]) {
    if (!it.c.isConnected) live.delete(it);
    else it.draw(now / 1000);
  }
  if (live.size) raf = requestAnimationFrame(loop);
}

const L1: Look = { ...DEFAULT_LOOK, hat: 1 };
const L2: Look = { ...DEFAULT_LOOK, hat: 2, back: 0, eyes: 5 };
const ZL: Look = { ...DEFAULT_LOOK, back: 0, mouth: 5, eyes: 3 };

function fig(pen: CanvasPen, pose: Pose, x: number, y: number, face: number, s: number, look: Look, col: number, expr: Expression, t: number, zombie = false): void {
  const j = solve(pose, x, y, face, s);
  drawStick(pen, j, face, s, { look, element: col, elementLight: 0xffffff, expression: expr, aura: 0.2, time: t, zombie });
}

const SCENES: Record<TileKind, (pen: CanvasPen, W: number, H: number, t: number) => void> = {
  road(pen, W, H, t) {
    const k = (Math.sin(t * 4) + 1) / 2;
    const f = H - 8;
    fig(pen, mix(POSES.jab1_w!, POSES.jab1!, k * k), W * 0.38, f, 1, 0.42, L1, 0xff5a2c, 'determined', t);
    fig(pen, k > 0.8 ? POSES.hurt! : POSES.guard!, W * 0.68, f, -1, 0.42, L2, 0x2f8cff, k > 0.8 ? 'hurt' : 'smug', t);
    // the champion's crown
    const cx = W * 0.68;
    const cy = f - 92 * 0.42 - 6 + Math.sin(t * 3) * 1.5;
    pen.poly([cx - 9, cy, cx - 9, cy - 8, cx - 4, cy - 3, cx, cy - 10, cx + 4, cy - 3, cx + 9, cy - 8, cx + 9, cy], 0xffd84a);
    if (k > 0.85) pen.glow(W * 0.6, f - 46, 16, 0xffc23d, 0.8);
  },
  ranked(pen, W, H, t) {
    const f = H - 6;
    const lx = W * 0.62;
    for (let i = 0; i < 6; i++) pen.line(lx - 16, f - i * 12, lx + 16, f - i * 12, 3, 0xffffff, 0.75);
    pen.line(lx - 16, f, lx - 16, f - 70, 3, 0xffffff, 0.75);
    pen.line(lx + 16, f, lx + 16, f - 70, 3, 0xffffff, 0.75);
    const climb = (t * 0.5) % 1;
    const y = f - climb * 58;
    const walk = { ...POSES.air!, aSh: 150 + Math.sin(t * 8) * 30, bSh: 150 - Math.sin(t * 8) * 30 };
    fig(pen, walk, lx, y, 1, 0.34, L1, 0x2f5fd0, 'determined', t);
    const cy = f - 80 + Math.sin(t * 2) * 2;
    pen.glow(lx, cy, 22, 0xffd84a, 0.6);
    pen.poly([lx - 10, cy + 4, lx - 10, cy - 5, lx - 5, cy, lx, cy - 8, lx + 5, cy, lx + 10, cy - 5, lx + 10, cy + 4], 0xffd84a);
  },
  zombie(pen, W, H, t) {
    const f = H - 6;
    for (let i = 0; i < 2; i++) {
      const sway = Math.sin(t * 2 + i * 1.7) * 6;
      fig(pen, { ...POSES.zombie!, lean: 14 + sway, aSh: 82 + sway * 2 }, W * (0.6 + i * 0.18), f - 2, -1, 0.38, ZL, 0x3fbf3a, 'angry', t, true);
    }
    // the fence in front of them
    for (let x = W * 0.48; x < W; x += 10) pen.line(x, f, x, f - 34, 3, 0xc8a070, 0.9);
    pen.line(W * 0.48, f - 24, W, f - 24, 3, 0xc8a070, 0.9);
    fig(pen, POSES.guard!, W * 0.3, f, 1, 0.42, L1, 0x8b5cf6, 'scared', t);
  },
  training(pen, W, H, t) {
    const f = H - 6;
    const k = (Math.sin(t * 5) + 1) / 2;
    fig(pen, mix(POSES.kick_w!, POSES.kick!, k), W * 0.36, f, 1, 0.42, L2, 0x5ee39a, 'determined', t);
    // the dummy on a post wobbles when kicked
    const wob = k > 0.75 ? (k - 0.75) * 60 : 0;
    const dx = W * 0.68;
    pen.line(dx, f, dx, f - 30, 5, 0x8a6a45);
    pen.line(dx, f - 30, dx + wob * 0.4, f - 60, 10, 0xd9b98c);
    pen.circle(dx + wob * 0.6, f - 70, 9, 0xd9b98c, 0x8a6a45, 2);
  },
  local(pen, W, H, t) {
    const f = H - 6;
    const a = (Math.sin(t * 3.5) + 1) / 2;
    const b = (Math.sin(t * 3.5 + Math.PI) + 1) / 2;
    fig(pen, mix(POSES.idle!, POSES.jab1!, a * a), W * 0.4, f, 1, 0.42, L1, 0x2f8cff, 'determined', t);
    fig(pen, mix(POSES.idle!, POSES.jab1!, b * b), W * 0.62, f, -1, 0.42, L2, 0xff4d6d, 'angry', t);
    if (a > 0.9 || b > 0.9) pen.glow(W * 0.51, f - 46, 14, 0xffffff, 0.9);
  },
};

/** A tile canvas with its scene; animated unless reduced motion or low graphics is on. */
export function tileScene(kind: TileKind, W = 150, H = 86): HTMLCanvasElement {
  const { c, ctx, dpr } = makeCanvas(W, H);
  c.className = 'tile-scene';
  c.setAttribute('aria-hidden', 'true');
  const pen = new CanvasPen(ctx);
  const draw = (t: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    SCENES[kind](pen, W, H, t);
  };
  draw(1.2);
  if (!settings.reducedMotion && !settings.lowGraphics) {
    live.add({ c, draw });
    if (!raf) raf = requestAnimationFrame(loop);
  }
  return c;
}
