// Stick-figure portraits for menus, drawn with the same rig as the fight onto a small canvas.
import { ELEMENTS, type ElementId } from '../content/elements';
import type { Look } from '../content/looks';
import { CanvasPen } from '../render/pen';
import { mixC, RimPen } from '../render/rimPen';
import { drawStick, POSES, solve, type Expression } from '../render/rig';
import { settings } from '../meta/settings';

import { AURAS as AURA } from '../content/looks';

export interface PreviewOpts {
  look: Look;
  element: ElementId;
  pose?: string;
  expression?: Expression;
  face?: 1 | -1;
  /** animate an idle bob */
  live?: boolean;
  scale?: number;
}

const live = new Set<{ el: HTMLCanvasElement; draw: (t: number) => void }>();
let raf = 0;
function loop(t: number): void {
  raf = 0;
  for (const it of [...live]) {
    if (!it.el.isConnected) live.delete(it);
    else it.draw(t / 1000);
  }
  if (live.size) raf = requestAnimationFrame(loop);
}

/** Returns a canvas showing the figure. Width/height are CSS pixels. */
export function stickPreview(o: PreviewOpts, w = 160, h = 200, cls = 'preview'): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.className = cls;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const pen = new CanvasPen(ctx);
  const rim = new RimPen(pen);
  const s = (o.scale ?? 1) * (h / 200);
  const cloth: { x: number; y: number }[] = [];
  const draw = (time: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const [main, light] = ELEMENTS[o.element].color;
    const aura = AURA[o.look.aura] || main;
    // ground shadow
    pen.line(w / 2 - 34 * s, h - 14 * s, w / 2 + 34 * s, h - 14 * s, 8 * s, 0x000000, 0.18);
    const bob = o.live && !settings.reducedMotion ? Math.sin(time * 2.4) * 2 * s : 0;
    const pose = POSES[o.pose ?? 'idle'] ?? POSES.idle!;
    const j = solve(pose, w / 2, h - 16 * s + bob, o.face ?? 1, s * 1.15);
    const opts = { look: o.look, element: aura, elementLight: light, expression: o.expression ?? ('happy' as const), aura: 0.55, cloth, time };
    rim.color = mixC(light, 0xffffff);
    drawStick(rim, j, o.face ?? 1, s * 1.15, opts);
    drawStick(pen, j, o.face ?? 1, s * 1.15, opts);
  };
  draw(0);
  if (o.live) {
    live.add({ el: c, draw });
    if (!raf) raf = requestAnimationFrame(loop);
  }
  return c;
}
