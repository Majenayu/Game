// How the arena reacts to powers, element by element. Render-only state, fed by the effects system (fx.ts) from sim
// events; it never touches the sim. Floor-level reactions are drawn here; whole-screen ones (strobe, warp, shake,
// desaturation, colour grade) are read by the fight scene from the public values.
import type { ElementId } from '../content/elements';
import type { Pen } from './pen';
import { FLOOR_Y } from './arenas';

interface Spot {
  x: number;
  t: number;
  max: number;
  seed: number;
}

export class ArenaReact {
  /** 0..1 intensities, decaying every frame */
  fire = 0;
  fireX = 640;
  frost = 0;
  strobe = 0;
  wind = 0;
  shake = 0;
  light = 0;
  lightX = 640;
  lightY = 300;
  warp = 0;
  warpX = 640;
  warpY = 400;
  time = 0;
  superK = 0;
  superColor = 0xffffff;
  private ripples: Spot[] = [];
  private cracks: Spot[] = [];
  private vines: Spot[] = [];
  /** quality: 0 = reactions off (low graphics), 0.6 medium, 1 high */
  q = 1;
  reduced = false;

  constructor(private props: number[] = []) {}

  reset(): void {
    this.fire = this.frost = this.strobe = this.wind = this.shake = this.light = this.warp = this.time = this.superK = 0;
    this.ripples.length = this.cracks.length = this.vines.length = 0;
  }

  /** A power of `el` landed (k = strength 0..1.5) or was cast (k small). */
  trigger(el: ElementId, x: number, y: number, k: number): void {
    if (this.q <= 0) return;
    const m = this.reduced ? 0.5 : 1;
    switch (el) {
      case 'fire':
        this.fire = Math.min(1, this.fire + 0.6 * k * m);
        this.fireX = x;
        break;
      case 'water':
        if (this.ripples.length < 8) this.ripples.push({ x, t: 0, max: 70, seed: 0 });
        break;
      case 'ice':
        this.frost = Math.min(1, this.frost + 0.3 * k);
        break;
      case 'lightning':
        this.strobe = Math.min(1, this.strobe + 0.8 * k * m);
        break;
      case 'wind':
        this.wind = Math.min(1, this.wind + 0.7 * k);
        break;
      case 'earth':
        this.shake = Math.min(1, this.shake + 0.8 * k * m);
        if (this.cracks.length < 6) this.cracks.push({ x, t: 0, max: 240, seed: (x * 7919) | 0 });
        break;
      case 'leaf': {
        // the nearest prop sprouts a vine
        let best = this.props[0] ?? x;
        for (const px of this.props) if (Math.abs(px - x) < Math.abs(best - x)) best = px;
        if (!this.vines.some((v) => v.x === best)) this.vines.push({ x: best, t: 0, max: 360, seed: (best * 31) | 0 });
        else for (const v of this.vines) if (v.x === best) v.t = Math.min(v.t, 40);
        break;
      }
      case 'light':
        this.light = Math.min(1, this.light + 0.8 * k * m);
        this.lightX = x;
        this.lightY = y;
        break;
      case 'gravity':
        this.warp = Math.min(1, this.warp + 0.7 * k * m);
        this.warpX = x;
        this.warpY = y;
        break;
      case 'time':
        this.time = Math.min(1, this.time + 0.7 * k);
        break;
    }
  }

  /** A Power III went off: the arena lights pulse in the element's colour. */
  super(color: number): void {
    if (this.q <= 0) return;
    this.superK = 1;
    this.superColor = color;
  }

  update(): void {
    this.fire *= 0.9;
    this.strobe *= 0.82;
    this.wind *= 0.96;
    this.shake *= 0.86;
    this.light *= 0.9;
    this.warp *= 0.93;
    this.time *= 0.97;
    this.superK *= 0.94;
    this.frost *= 0.997;
    for (const s of this.ripples) s.t++;
    for (const s of this.cracks) s.t++;
    for (const s of this.vines) s.t++;
    if (this.ripples.length && this.ripples[0]!.t > this.ripples[0]!.max) this.ripples.shift();
    if (this.cracks.length && this.cracks[0]!.t > this.cracks[0]!.max) this.cracks.shift();
    if (this.vines.length && this.vines[0]!.t > this.vines[0]!.max) this.vines.shift();
  }

  /** Floor and prop reactions, drawn after the floor layer and before the fighters. */
  drawFloor(p: Pen, t: number, accent: number): void {
    if (this.q <= 0) return;
    const F = FLOOR_Y;
    p.add?.(true);
    // fire: an orange wash over the floor and a flicker on nearby surfaces
    if (this.fire > 0.02) {
      p.glow?.(this.fireX, F + 20, 380, 0xff6a1f, 0.5 * this.fire);
      p.glow?.(this.fireX, F - 160, 300, 0xffa040, 0.18 * this.fire * (0.7 + 0.3 * Math.sin(t * 40)));
      for (let i = 0; i < 4; i++) ellipseLine(p, this.fireX, F + 6, 60 + i * 60 + (1 - this.fire) * 90, 8 + i * 4, 2, 0xffc23d, 0.35 * this.fire);
    }
    // water: ripples spreading across the glossy floor
    for (const s of this.ripples) {
      const k = s.t / s.max;
      for (let i = 0; i < 3; i++) {
        const kk = Math.max(0, k - i * 0.12);
        if (kk <= 0) continue;
        ellipseLine(p, s.x, F + 10, 20 + kk * 260, 4 + kk * 26, 2.5, 0x8fd7ff, 0.6 * (1 - kk));
      }
    }
    // ice: frost creeping in from the edges of the floor
    if (this.frost > 0.03) {
      const f = this.frost;
      for (let i = 0; i < 26; i++) {
        const side = i % 2 ? 1 : -1;
        const x = 640 + side * (700 - ((i * 37) % 200) * f - f * 160);
        const h = 10 + ((i * 53) % 30) * f;
        p.line(x, F + 2, x + side * 6, F - h, 2, 0xdff8ff, 0.6 * f);
        p.line(x, F + 2, x - side * 14, F + 8 + h * 0.4, 1.6, 0xdff8ff, 0.4 * f);
      }
      p.glow?.(-40, F, 300 * f, 0xc8f4ff, 0.25 * f);
      p.glow?.(1320, F, 300 * f, 0xc8f4ff, 0.25 * f);
    }
    // light: a lens flare with rays and ghost circles toward the screen centre
    if (this.light > 0.03) {
      const L = this.light;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + t * 0.4;
        p.line(this.lightX, this.lightY, this.lightX + Math.cos(a) * 260 * L, this.lightY + Math.sin(a) * 260 * L, 2, 0xfffbe0, 0.35 * L);
      }
      for (let i = 1; i <= 4; i++) {
        const k = i / 5;
        const x = this.lightX + (640 - this.lightX) * k * 2;
        const y = this.lightY + (360 - this.lightY) * k * 2;
        p.circle(x, y, 10 + i * 8, null, 0xffe46b, 2, 0.25 * L);
      }
      p.glow?.(this.lightX, this.lightY, 220 * L, 0xffe46b, 0.4 * L);
    }
    // gravity: dark pull lines converging on the effect
    if (this.warp > 0.03) {
      const W = this.warp;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + t * 0.8;
        const r0 = 340 * W + 60;
        p.line(this.warpX + Math.cos(a) * r0, this.warpY + Math.sin(a) * r0 * 0.6, this.warpX + Math.cos(a) * 40, this.warpY + Math.sin(a) * 24, 2, 0xd6c4ff, 0.35 * W);
      }
    }
    // super: the whole floor edge lights up in the element colour
    if (this.superK > 0.03) {
      p.glow?.(640, F, 900, this.superColor, 0.35 * this.superK);
      p.line(-640, F, 1920, F, 6, this.superColor, 0.7 * this.superK);
    }
    p.add?.(false);
    // earth: cracks spreading from the impact, then fading
    for (const s of this.cracks) {
      const k = Math.min(1, s.t / 14);
      const fade = 1 - Math.max(0, (s.t - s.max * 0.6) / (s.max * 0.4));
      let seed = s.seed;
      const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
      for (let b = 0; b < 5; b++) {
        let x = s.x;
        let y = F + 2;
        const dir = rnd() < 0.5 ? -1 : 1;
        for (let j = 0; j < 5; j++) {
          const nx = x + dir * (14 + rnd() * 22) * k;
          const ny = y + (rnd() * 9) * k;
          p.line(x, y, nx, ny, 3 - j * 0.4, 0x120804, 0.8 * fade);
          p.add?.(true);
          p.line(x, y, nx, ny, 1.2, accent, 0.4 * fade);
          p.add?.(false);
          x = nx;
          y = ny;
        }
      }
    }
    // leaf: glowing vines climbing the props
    for (const s of this.vines) {
      const grow = Math.min(1, s.t / 50);
      const fade = 1 - Math.max(0, (s.t - s.max * 0.7) / (s.max * 0.3));
      let px = s.x;
      let py = F;
      for (let j = 1; j <= 10; j++) {
        if (j / 10 > grow) break;
        const nx = s.x + Math.sin(j * 0.9 + t * 1.2) * 16;
        const ny = F - j * 18;
        p.line(px, py, nx, ny, 4, 0x1f7a2a, fade);
        p.add?.(true);
        p.line(px, py, nx, ny, 1.6, 0x9aff7a, 0.7 * fade);
        if (j % 3 === 0) p.glow?.(nx + 8, ny, 10, 0xb9f27a, 0.7 * fade);
        p.add?.(false);
        px = nx;
        py = ny;
      }
    }
  }
}

function ellipseLine(p: Pen, cx: number, cy: number, rx: number, ry: number, w: number, c: number, a: number): void {
  let px = cx + rx;
  let py = cy;
  for (let i = 1; i <= 28; i++) {
    const ang = (i / 28) * Math.PI * 2;
    const nx = cx + Math.cos(ang) * rx;
    const ny = cy + Math.sin(ang) * ry;
    p.line(px, py, nx, ny, w, c, a);
    px = nx;
    py = ny;
  }
}
