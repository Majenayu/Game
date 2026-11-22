// The lobby hero stage: a dusk rooftop with parallax skyline, spotlights, drifting motes and a glowing podium. The
// player's two squad avatars stand on it (a real sim match, so their powers are the real ones) with idle life:
// breathing, blinking, looking around, now and then a taunt. Tapping an avatar makes it cast one of its powers with
// the full effects. Mode cards tint the stage light. Low graphics or reduced motion: one still frame.
import { ELEMENTS } from '../content/elements';
import type { Avatar } from '../meta/profile';
import { specFor } from '../meta/profile';
import { FLOOR_Y } from '../render/arenas';
import { elementColors, lookOf, poseFor, registerLook, type ViewState } from '../render/fighterView';
import { FxRenderer } from '../render/fx';
import { CanvasPen } from '../render/pen';
import { mixC, RimPen } from '../render/rimPen';
import { drawStick, POSES, solve, type Expression } from '../render/rig';
import { createMatch, step } from '../sim/step';
import { IN, type Fighter, type Match } from '../sim/types';
import { settings } from '../meta/settings';
import { makeCanvas } from './powerPreview';
import { h } from './dom';

const SLOT_BITS = [IN.P1, IN.P2, IN.P3];
const HOME = [55000, 73000];

function lerpColor(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export interface HeroStage {
  el: HTMLElement;
  setTint(color: number | null): void;
  stop(): void;
}

export function heroStage(squad: Avatar[], W: number, H: number): HeroStage {
  const wrap = h('div', 'hero-stage');
  const { c, ctx, dpr } = makeCanvas(W, H);
  c.setAttribute('aria-label', 'Your squad. Tap a fighter to see a power.');
  c.setAttribute('role', 'img');
  const hint = h('div', 'hero-hint', 'Tap a fighter');
  wrap.append(c, hint);
  const pen = new CanvasPen(ctx);
  const rim = new RimPen(pen);
  const fx = new FxRenderer();
  fx.reset(99);
  fx.reduced = settings.reducedMotion;
  const still = settings.reducedMotion || settings.lowGraphics;
  for (const a of squad) registerLook(a.id, a.look);
  const specs = squad.map((a) => ({ ...specFor(a), dummy: 'bot' as const }));
  let m: Match = null as unknown as Match;
  const views = new Map<number, ViewState>();
  const reset = () => {
    m = createMatch({ mode: 'training', teamA: [specs[0]!], teamB: [specs[1] ?? specs[0]!], seed: 3, bots: [0, 0] });
    while (m.phase !== 'fight') step(m, 0, 0);
    m.fighters.forEach((f, i) => {
      f.x = HOME[i]!;
      f.face = i ? -1 : 1;
    });
    m.effects = [];
  };
  reset();
  let tint = 0x3df5ff;
  let tintTarget = 0x3df5ff;
  // render-only idle life
  const blinkT = [0, 0];
  const tauntT = [0, 0];
  const nextTaunt = [240, 420];
  let castT = 0;
  const queued: [number, number] = [0, 0];
  let frame = 0;
  let px = 0;
  const motes = Array.from({ length: 34 }, (_, i) => ({ x: (i * 97) % 1280, y: 200 + ((i * 53) % 380), s: 0.3 + ((i * 7) % 10) / 14, k: i % 3 }));

  const tick = () => {
    frame++;
    const inputs: [number, number] = [queued[0], queued[1]];
    queued[0] = queued[1] = 0;
    // walk home after a power, then reset the stage
    m.fighters.forEach((f, i) => {
      if (castT === 0 && f.st !== 'move' && Math.abs(f.x - HOME[i]!) > 2000) inputs[i] |= f.x > HOME[i]! ? IN.L : IN.R;
      if (f.st !== 'move' && castT === 0) f.face = i ? -1 : 1;
      f.mp = 1000;
      if (blinkT[i]! > 0) blinkT[i]!--;
      else if ((frame + i * 37) % 200 === 0) blinkT[i] = 7;
      if (tauntT[i]! > 0) tauntT[i]!--;
      else if (frame > nextTaunt[i]! && castT === 0) {
        tauntT[i] = 70;
        nextTaunt[i] = frame + 500 + ((frame * 13 + i * 71) % 400);
      }
    });
    if (castT > 0 && --castT === 0) {
      m.effects = m.effects.filter((e) => e.follow);
      for (const f of m.fighters) {
        f.hp = f.hpMax;
        f.status = { burn: 0, slow: 0, freeze: 0, shock: 0, root: 0, weak: 0, float: 0 };
      }
    }
    step(m, inputs[0], inputs[1]);
    fx.events(m, m.events);
    fx.req.freeze = 0;
    fx.update();
  };

  const view = (f: Fighter): ViewState => {
    let v = views.get(f.id);
    if (!v) {
      v = { walk: 0, cloth: [], prevHand: null, look: lookOf(f) };
      views.set(f.id, v);
    }
    return v;
  };

  const drawBackground = (time: number) => {
    // hangar bay: deep navy, a window strip with stars, wall panels with neon seams, a glossy floor with a grid
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#05060f');
    g.addColorStop(0.55, '#0f1236');
    g.addColorStop(0.8, '#161a44');
    g.addColorStop(1, '#070818');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const span = 520;
    const scale = W / span;
    const camX = 640 + px * 14;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (W / 2 - camX * scale), dpr * (H * 0.8 - FLOOR_Y * scale));
    const wx0 = 200 - px * 16;
    pen.poly([wx0, FLOOR_Y - 330, wx0 + 880, FLOOR_Y - 330, wx0 + 880, FLOOR_Y - 190, wx0, FLOOR_Y - 190], 0x03040e);
    for (let i = 0; i < 40; i++) pen.circle(wx0 + ((i * 97) % 880), FLOOR_Y - 325 + ((i * 53) % 130), 0.8 + (i % 3) * 0.5, 0xcfe0ff, null, 0, 0.6);
    for (let x = wx0; x <= wx0 + 880; x += 110) pen.line(x, FLOOR_Y - 335, x + 14, FLOOR_Y - 185, 12, 0x0a0c22);
    pen.line(wx0, FLOOR_Y - 190, wx0 + 880, FLOOR_Y - 190, 8, 0x0a0c22);
    pen.add(true);
    pen.line(wx0, FLOOR_Y - 186, wx0 + 880, FLOOR_Y - 186, 2, 0x3df5ff, 0.6);
    pen.add(false);
    const wall = 250 - px * 34;
    for (let k = 0; k < 7; k++) {
      const x = wall + k * 120;
      pen.poly([x, FLOOR_Y - 170, x + 108, FLOOR_Y - 170, x + 108, FLOOR_Y - 20, x, FLOOR_Y - 20], 0x0d1030);
      pen.add(true);
      pen.line(x + 8, FLOOR_Y - 40, x + 100, FLOOR_Y - 40, 1.6, k % 2 ? 0xff3ea5 : 0x3df5ff, 0.45);
      pen.add(false);
    }
    pen.poly([0, FLOOR_Y, 1280, FLOOR_Y, 1280, FLOOR_Y + 300, 0, FLOOR_Y + 300], 0x0a0c24);
    pen.add(true);
    for (let k = -8; k <= 8; k++) pen.line(640 + k * 40, FLOOR_Y, 640 + k * 90, FLOOR_Y + 200, 1, 0x3df5ff, 0.14);
    for (let i = 0; i < 5; i++) pen.line(0, FLOOR_Y + 8 + i * i * 7, 1280, FLOOR_Y + 8 + i * i * 7, 1, 0x3df5ff, 0.18 - i * 0.03);
    pen.add(false);
    pen.line(0, FLOOR_Y, 1280, FLOOR_Y, 3, 0x7adfff, 0.8);    // spotlights from above, tinted by the mode card under the pointer
    pen.add(true);
    for (const [sx, tx] of [
      [470, 560],
      [810, 720],
    ] as const) {
      const sway = still ? 0 : Math.sin(time * 0.7 + sx) * 18;
      pen.poly([sx - 10, FLOOR_Y - 420, sx + 10, FLOOR_Y - 420, tx + 70 + sway, FLOOR_Y, tx - 70 + sway, FLOOR_Y], tint, 0.12);
      pen.poly([sx - 4, FLOOR_Y - 420, sx + 4, FLOOR_Y - 420, tx + 30 + sway, FLOOR_Y, tx - 30 + sway, FLOOR_Y], tint, 0.1);
    }
    // podium with a glowing floor ring
    pen.add(false);
    pen.poly([500, FLOOR_Y, 520, FLOOR_Y - 16, 760, FLOOR_Y - 16, 780, FLOOR_Y], 0x141a48);
    pen.line(520, FLOOR_Y - 16, 760, FLOOR_Y - 16, 2, 0x3df5ff, 0.8);
    pen.add(true);
    pen.glow(640, FLOOR_Y - 10, 190, tint, 0.35);
    const ringPulse = still ? 1 : 0.85 + 0.15 * Math.sin(time * 2.2);
    pen.circle(640, FLOOR_Y - 8, 150 * ringPulse, null, tint, 3, 0.55);
    pen.circle(640, FLOOR_Y - 8, 110 * ringPulse, null, 0xffffff, 2, 0.3);
    // drifting element motes
    squad.forEach((a, i) => {
      const col = ELEMENTS[a.element].color[0];
      for (const mo of motes) {
        if (mo.k % 2 !== i % 2) continue;
        const mx = (mo.x + time * 18 * mo.s) % 1280;
        const my = mo.y + Math.sin(time * mo.s + mo.x) * 20 - 300;
        pen.glow(mx, FLOOR_Y + my - 140, 10 + mo.s * 10, col, 0.5);
      }
    });
    pen.add(false);
  };

  const draw = (time: number) => {
    drawBackground(time);
    fx.drawUnder(pen, m, time);
    m.fighters.forEach((f, i) => {
      if (!f.onField) return;
      const v = view(f);
      let { pose, expr, alpha, weight } = poseFor(f, v, time);
      // render-only idle life: look around, blink, taunt
      if (f.st !== 'move' && castT === 0) {
        pose = { ...pose, head: pose.head + Math.sin(time * 0.9 + i * 2) * 9 };
        if (tauntT[i]! > 0) {
          const t = tauntT[i]!;
          pose = POSES[`win${v.look.pose % 8}`] ?? pose;
          expr = t > 35 ? 'happy' : 'smug';
        } else expr = (i ? 'smug' : 'determined') as Expression;
        if (blinkT[i]! > 0) expr = 'happy';
      }
      const x = f.x / 100;
      const y = FLOOR_Y + f.y / 100 - 16;
      const j = solve(pose, x, y, f.face, 1.25);
      const [elc, ell] = elementColors(f, v.look);
      pen.line(x - 36, y + 2, x + 36, y + 2, 8, 0, 0.25);
      fx.drawBehindFighter(pen, m, f, time);
      const opts = { look: v.look, element: elc, elementLight: ell, expression: expr, aura: 0.45, alpha, cloth: v.cloth, time, weight, mp: f.mp / 1000 };
      rim.color = mixC(ell, 0xffffff);
      drawStick(rim, j, f.face, 1.25, opts);
      drawStick(pen, j, f.face, 1.25, opts);
      fx.drawOnFighter(pen, m, f, j, time);
    });
    fx.drawOver(pen, m, time);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    tint = lerpColor(tint, tintTarget, 0.06);
  };

  // tap a fighter: it casts one of its unlocked powers at the other
  c.addEventListener('pointerdown', (e) => {
    const r = c.getBoundingClientRect();
    const side = e.clientX - r.left < r.width / 2 ? 0 : 1;
    const f = m.fighters[side];
    if (!f || f.st === 'move' || castT > 0) return;
    const open = [0, 1, 2].filter((s) => f.spec.ranks[s]! > 0);
    const slot = open[(frame >> 3) % open.length] ?? 0;
    queued[side] = SLOT_BITS[slot]!;
    castT = 150;
    hint.classList.add('gone');
  });
  c.addEventListener('pointermove', (e) => {
    const r = c.getBoundingClientRect();
    px = ((e.clientX - r.left) / r.width - 0.5) * 2;
  });

  let raf = 0;
  let last = performance.now();
  let acc = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (!wrap.isConnected) return cancelAnimationFrame(raf);
    acc += Math.min(100, now - last);
    last = now;
    let n = 0;
    while (acc >= 1000 / 60 && n < 3) {
      acc -= 1000 / 60;
      n++;
      tick();
    }
    draw(now / 1000);
  };
  if (still) {
    for (let i = 0; i < 5; i++) tick();
    draw(1);
    // a tap still plays the power, then the stage settles to a still frame again
    c.addEventListener('pointerdown', () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
      setTimeout(() => {
        cancelAnimationFrame(raf);
        raf = 0;
      }, 2600);
    });
  } else raf = requestAnimationFrame(loop);
  return {
    el: wrap,
    setTint(color) {
      tintTarget = color ?? 0x3df5ff;
      if (still) draw(1);
    },
    stop() {
      cancelAnimationFrame(raf);
    },
  };
}
