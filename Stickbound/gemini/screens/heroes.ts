/**
 * Heroes on the screens: the Hero Trial rig and its picture heads (gemini/trial, gemini/characters), posed with the
 * trial clips. Lightning uses the code-drawn visor head in his colours, because his own lab runs on another rig.
 */
import { guardPose, idlePose, makeClips, sample, type Clip } from '../trial/anims';
import { aura } from '../trial/fx';
import { makeHeads } from '../trial/heads';
import { KITS, type Kit } from '../trial/kits';
import { drawRig, footDrop, heroPalette, lerpPose, loadTrialParts, solve, type Face, type Pose, type Skin } from '../trial/rig';
import type { El } from './save';
import type { G } from './ui';

export const NAMES: Record<El, string> = {
  fire: 'Nytor', water: 'Root', ice: 'Rime', lightning: 'Tadan', wind: 'Vael', earth: 'Grom', leaf: 'Sprig', light: 'Lumo', gravity: 'Orrin', time: 'Tock',
};
export const CLASSES: Record<El, string> = {
  fire: 'Vanguard', water: 'Warden', ice: 'Warden', lightning: 'Striker', wind: 'Striker', earth: 'Vanguard', leaf: 'Warden', light: 'Striker', gravity: 'Vanguard', time: 'Striker',
};
const LIGHTNING: Kit = {
  ...KITS.gravity,
  name: 'Lightning',
  icon: '⚡',
  line: '#3fe0ff',
  light: '#fff36a',
  accent: '#ffe23a',
  fill: '#0a1020',
  fx: { glow: '60,200,255', mid: '150,240,255', core: '255,255,230' },
  fx2: { glow: '255,210,40', mid: '255,240,120', core: '255,255,230' },
  ult: 'Thunder God',
  ultBanner: 'THUNDER GOD',
  powers: [
    { ...KITS.light.powers[0], name: 'Volt Dart' },
    { ...KITS.light.powers[1], name: 'Arc Lance' },
    { ...KITS.light.powers[2], name: 'Static Guard' },
  ],
};
export function kitOf(el: El): Kit {
  return el === 'lightning' ? LIGHTNING : KITS[el];
}
const skins = new Map<El, Skin>();
const clips = new Map<El, Record<string, Clip>>();
export async function loadHero(el: El): Promise<Skin> {
  const hit = skins.get(el);
  if (hit) return hit;
  const k = kitOf(el);
  let s: Skin;
  if (el === 'lightning') s = { heads: makeHeads(k), pal: heroPalette(k), kit: k };
  else {
    const parts = await loadTrialParts(el);
    s = { heads: parts.heads, circles: parts.circles, pieces: parts.pieces, pal: heroPalette(k), kit: k };
  }
  skins.set(el, s);
  return s;
}
export async function loadHeroes(els: El[]): Promise<void> {
  await Promise.all(els.map((e) => loadHero(e)));
}
export function clipsOf(el: El): Record<string, Clip> {
  let c = clips.get(el);
  if (!c) {
    c = makeClips(kitOf(el));
    clips.set(el, c);
  }
  return c;
}

/** named still poses for the menus */
export type Still = 'idle' | 'fight' | 'victory' | 'cheer' | 'punch' | 'cast' | 'kick' | 'lunge' | 'taunt';
export function stillPose(el: El, kind: Still, t: number): { pose: Pose; face: Face } {
  const c = clipsOf(el);
  const bob = idlePose(t);
  switch (kind) {
    case 'idle':
      return { pose: bob, face: 'normal' };
    case 'fight': {
      const gp = lerpPose(bob, guardPose, 0.75);
      return { pose: { ...gp, y: gp.y + Math.sin(t / 22) * 2 }, face: 'normal' };
    }
    case 'victory':
      return { pose: sample(c.victory, Math.min(c.victory.frames - 1, 40 + ((t / 2) % 10))), face: 'attack' };
    case 'cheer':
      return { pose: sample(c.victory, Math.min(c.victory.frames - 1, 30)), face: 'attack' };
    case 'punch':
      return { pose: sample(c.jab, 6), face: 'attack' };
    case 'cast': {
      const p1 = kitOf(el).powers[0].clip;
      const cl = c[p1] ?? c.jab;
      return { pose: sample(cl, Math.round(cl.frames * 0.4)), face: 'attack' };
    }
    case 'kick':
      return { pose: sample(c.kick, 9), face: 'attack' };
    case 'lunge':
      return { pose: sample(c.cross, 7), face: 'attack' };
    case 'taunt':
      return { pose: sample(c.taunt, Math.round(c.taunt.frames * 0.5)), face: 'attack' };
  }
}

export interface HeroDraw {
  pose: Pose;
  face: Face;
  /** screen x of the hip and the y of the floor under the feet */
  x: number;
  feet: number;
  /** screen pixels per rig unit */
  scale: number;
  facing?: 1 | -1;
  t?: number;
  alpha?: number;
  /** element aura strength 0..1 */
  aura?: number;
  charge?: number;
  speed?: number;
  vy?: number;
  /** pre-made skin (flash, frozen) instead of the hero skin */
  skin?: Skin;
}
/** rig units from the hip down to the feet for a pose */
export function hipLift(p: Pose): number {
  return footDrop(solve({ ...p, rot: 0 }));
}
export function drawHero(g: G, el: El, d: HeroDraw): void {
  const skin = d.skin ?? skins.get(el);
  if (!skin) return;
  const k = kitOf(el);
  const s = d.scale;
  const hipY = d.feet - hipLift(d.pose) * s + d.pose.y * s;
  const facing = d.facing ?? 1;
  const hx = d.x + d.pose.x * s * facing;
  const au = d.aura ?? 0;
  const t = d.t ?? 0;
  if (au > 0) aura(g, k, hx, d.feet, 360 * s * (0.9 + au * 0.4), au, Math.floor(t), -1);
  g.save();
  g.translate(hx, hipY);
  g.scale(s * facing, s);
  drawRig(g, skin, d.pose, { face: d.face, alpha: d.alpha, charge: d.charge, t, speed: d.speed ?? 0, vy: d.vy ?? 0 });
  g.restore();
  if (au > 0) aura(g, k, hx, d.feet, 360 * s * (0.9 + au * 0.4), au, Math.floor(t), 1);
}
/** shadow ellipse under a hero */
export function heroShadow(g: G, x: number, feet: number, scale: number, a = 0.35): void {
  g.save();
  g.fillStyle = `rgba(0,0,0,${a})`;
  g.beginPath();
  g.ellipse(x, feet + 4, 80 * scale, 16 * scale, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}
