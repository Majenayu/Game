// A live power stage on a canvas: a real training match (the same sim as the fight) where an avatar casts its powers
// on a dummy, drawn with the same rig and effects system as the fight. Used by the style picker, the Avatars screen,
// the lobby and the Power Lab (?powers=1), which also uses it to render frame-exact contact sheets.
import type { ElementId } from '../content/elements';
import type { Look } from '../content/looks';
import { mechanicOf, powersFor, type Archetype } from '../content/powers';

const REACT = new Set(['counter', 'decoy', 'barrier', 'recall']);
const CLOSE = new Set(['flurry', 'rising', 'melee', 'spin', 'armor', 'aura', 'buff']);
import { arenaById, FLOOR_Y, type ArenaDef } from '../render/arenas';
import { ArenaReact } from '../render/arenaReact';
import { drawArenaCanvas, type Quality } from '../render/arenaBake';
import { mixC, RimPen } from '../render/rimPen';
import { elementColors, lookOf, poseFor, registerLook, type ViewState } from '../render/fighterView';
import { CanvasPen } from '../render/pen';
import { drawStick, solve } from '../render/rig';
import { FxRenderer } from '../render/fx';
import { stickSpec } from '../sim/stats';
import { activeOf, createMatch, step } from '../sim/step';
import { IN, type Fighter, type Match } from '../sim/types';
import { settings } from '../meta/settings';
import { h } from './dom';

const SLOT_BITS = [IN.P1, IN.P2, IN.P3];
export const CYCLE = 150;

export interface StageOpts {
  element: ElementId;
  archetype: Archetype;
  look: Look;
  level?: number;
  /** world x range shown (px); default 640 wide around the middle */
  span?: number;
  bg?: [string, string];
  /** draw this arena behind the stage (Power Lab, lobby); without it a plain neon floor */
  arena?: string;
  quality?: Quality;
}

export class PowerStage {
  readonly pen: CanvasPen;
  readonly fx = new FxRenderer();
  m!: Match;
  t = 0;
  slot = 0;
  only: number | null = null;
  private views = new Map<number, ViewState>();
  private lookId: string;
  readonly set;
  onLabel: (text: string) => void = () => {};
  arena: ArenaDef | null = null;
  readonly react = new ArenaReact();
  private rim: RimPen;
  setArena(id: string | null): void {
    this.arena = id ? arenaById(id) : null;
    const r = new ArenaReact(this.arena?.props ?? []);
    Object.assign(this.react, r);
    this.react.reduced = settings.reducedMotion;
    this.react.q = settings.lowGraphics ? 0 : 1;
    this.fx.react = this.arena ? this.react : null;
  }

  constructor(
    readonly ctx: CanvasRenderingContext2D,
    readonly W: number,
    readonly H: number,
    readonly dpr: number,
    readonly o: StageOpts,
  ) {
    this.pen = new CanvasPen(ctx);
    this.rim = new RimPen(this.pen);
    this.setArena(o.arena ?? null);
    this.set = powersFor(o.element, o.archetype);
    this.lookId = `stage:${o.element}:${o.archetype}:${Math.random().toString(36).slice(2, 6)}`;
    registerLook(this.lookId, o.look);
    this.reset();
  }

  reset(): void {
    this.m = createMatch({
      mode: 'training',
      teamA: [stickSpec('You', this.o.element, this.o.level ?? 20, [], false, this.lookId, this.o.archetype)],
      teamB: [{ ...stickSpec('Dummy', this.o.element === 'earth' ? 'wind' : 'earth', 20), dummy: 'bot' }],
      seed: 5,
      bots: [0, 1],
    });
    while (this.m.phase !== 'fight') step(this.m, 0, 0);
    this.place();
    this.views.clear();
    this.fx.reset(777);
    this.fx.reduced = settings.reducedMotion;
    this.t = 0;
  }

  private place(): void {
    const a = activeOf(this.m, 0)!;
    const b = activeOf(this.m, 1)!;
    a.x = 52000;
    a.y = 0;
    a.vx = 0;
    a.face = 1;
    b.x = 74000;
    b.hp = b.hpMax;
  }

  /** One sim frame of the demo loop: cast at frame 10 of each cycle, walk home, next power. */
  tick(): void {
    const a = activeOf(this.m, 0)!;
    const slot = this.only ?? this.slot;
    const phase = this.t % CYCLE;
    let input = 0;
    if (phase === 10) {
      a.mp = 1000;
      input = SLOT_BITS[slot]!;
      this.onLabel(`${slot + 1}. ${this.set[slot]!.name}${slot === 2 ? ' (super)' : ''}`);
    }
    if (phase > 115 && a.st !== 'move' && Math.abs(a.x - 52000) > 2500) input |= a.x > 52000 ? IN.L : IN.R;
    if (phase === CYCLE - 1) {
      if (this.only === null) this.slot = (this.slot + 1) % 3;
      this.m.effects = [];
      this.place();
      for (const f of this.m.fighters) {
        f.status = { burn: 0, slow: 0, freeze: 0, shock: 0, root: 0, weak: 0, float: 0 };
        f.buffT = 0;
        f.buff = 0;
      }
    }
    // for reaction powers (counters, decoys, shields, rewinds) the dummy steps in and attacks, so they show what they do
    let dummy = 0;
    const mv = this.set[slot]!;
    const mech = mechanicOf(mv);
    const b0 = activeOf(this.m, 1)!;
    // close-range powers: the dummy waits within reach
    if (phase === 9 && CLOSE.has(mech)) {
      b0.x = a.x + 10500;
      this.views.delete(b0.id);
    }
    if (REACT.has(mech)) {
      const b = b0;
      if (phase === 10) {
        b.x = a.x + 11000;
        this.views.delete(b.id);
      }
      const hitAt = 10 + mv.startup + 6;
      if (phase >= hitAt && phase < hitAt + 3) dummy = IN.ATK;
      else if (phase > hitAt + 20 && phase < hitAt + 60 && b.st !== 'move' && Math.abs(b.x - a.x) > 9000) dummy = b.x > a.x ? IN.L : IN.R;
      else if (phase === hitAt + 40) dummy = IN.ATK;
    }
    step(this.m, input, dummy);
    this.fx.events(this.m, this.m.events);
    this.fx.req.freeze = 0;
    this.t++;
  }

  private view(f: Fighter): ViewState {
    let v = this.views.get(f.id);
    if (!v) {
      v = { walk: 0, cloth: [], prevHand: null, look: lookOf(f) };
      this.views.set(f.id, v);
    }
    return v;
  }

  draw(time: number): void {
    const { ctx, W, H, dpr, pen, m, fx } = this;
    const span = this.o.span ?? 640;
    const camX = 640;
    const scale = W / span;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    const world = () => ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (W / 2 - camX * scale), dpr * (H * 0.84 - FLOOR_Y * scale));
    const q: Quality = this.o.quality ?? (settings.lowGraphics ? 'low' : 'medium');
    if (this.arena) {
      ctx.fillStyle = `#${this.arena.bg.toString(16).padStart(6, '0')}`;
      ctx.fillRect(0, 0, W, H);
      world();
      this.react.update();
      drawArenaCanvas(ctx, pen, this.arena, time, this.react, q, 'back');
    } else {
      // plain neon stage: deep navy, a glossy floor with a light edge
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, this.o.bg?.[0] ?? '#141236');
      g.addColorStop(1, this.o.bg?.[1] ?? '#070615');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      world();
      ctx.fillStyle = '#0c0b26';
      ctx.fillRect(0, FLOOR_Y, 1280, 400);
      pen.add(true);
      for (let i = 0; i < 5; i++) pen.line(0, FLOOR_Y + 14 + i * i * 9, 1280, FLOOR_Y + 14 + i * i * 9, 1.2, 0x5a7cff, 0.22 - i * 0.03);
      pen.line(0, FLOOR_Y, 1280, FLOOR_Y, 9, 0x7a8cff, 0.18);
      pen.add(false);
      pen.line(0, FLOOR_Y, 1280, FLOOR_Y, 2.5, 0xb8c6ff, 0.8);
    }
    fx.drawUnder(pen, m, time);
    for (const f of m.fighters) {
      if (!f.onField) continue;
      const v = this.view(f);
      const { pose, expr, alpha, weight } = poseFor(f, v, time);
      const x = f.x / 100;
      const y = FLOOR_Y + f.y / 100;
      const j = solve(pose, x, y, f.face, 1);
      const [elc, ell] = elementColors(f, v.look);
      pen.line(x - 30, FLOOR_Y + 2, x + 30, FLOOR_Y + 2, 7, 0, 0.2);
      fx.drawBehindFighter(pen, m, f, time);
      const opts = { look: v.look, element: elc, elementLight: ell, expression: expr, aura: f.team === 0 ? 0.4 : 0.1, alpha, cloth: v.cloth, time, weight, mp: f.mp / 1000 };
      this.rim.color = mixC(ell, 0xffffff);
      drawStick(this.rim, j, f.face, 1, opts);
      drawStick(pen, j, f.face, 1, opts);
      fx.drawOnFighter(pen, m, f, j, time);
    }
    fx.drawOver(pen, m, time);
    if (this.arena) drawArenaCanvas(ctx, pen, this.arena, time, this.react, q, 'front');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

export interface PreviewController {
  el: HTMLElement;
  stage: PowerStage;
  only(slot: number | null): void;
  stop(): void;
}

export function makeCanvas(W: number, H: number): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D; dpr: number } {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(W * dpr);
  c.height = Math.round(H * dpr);
  c.style.width = `${W}px`;
  c.style.height = `${H}px`;
  return { c, ctx: c.getContext('2d')!, dpr };
}

export function powerPreview(opts: StageOpts & { w?: number; h?: number }): PreviewController {
  const W = opts.w ?? 360;
  const H = opts.h ?? 200;
  const wrap = h('div', 'pw-preview');
  const { c, ctx, dpr } = makeCanvas(W, H);
  const label = h('div', 'pw-preview-label');
  wrap.append(c, label);
  const stage = new PowerStage(ctx, W, H, dpr, opts);
  stage.onLabel = (t) => (label.textContent = t);
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    if (!wrap.isConnected) return api.stop();
    acc += Math.min(100, now - last);
    last = now;
    let n = 0;
    while (acc >= 1000 / 60 && n < 3) {
      acc -= 1000 / 60;
      n++;
      stage.tick();
      stage.fx.update();
    }
    stage.draw(now / 1000);
  };
  const api: PreviewController = {
    el: wrap,
    stage,
    only(s) {
      stage.only = s;
      if (s !== null) stage.slot = s;
      stage.reset();
    },
    stop() {
      cancelAnimationFrame(raf);
    },
  };
  if (settings.reducedMotion || settings.lowGraphics) {
    // a still frame of power 1 in flight instead of a loop
    for (let i = 0; i < 34; i++) {
      stage.tick();
      stage.fx.update();
    }
    stage.draw(0.5);
  } else raf = requestAnimationFrame(loop);
  return api;
}
