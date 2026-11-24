/**
 * Heroes on the screens: the Hero Trial rig and its picture heads (gemini/trial, gemini/characters), posed with the
 * trial clips. Lightning (Tadan) uses his base-design head and his own Lightning lab moves (see LIGHTNING below).
 */
import { guardPose, idlePose, makeClips, sample, type Clip } from '../trial/anims';
import { CLIPS as LAB } from '../trial/base';
import { aura } from '../trial/fx';
import { drawAura } from '../stages/engine/fx';
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
/**
 * Lightning (Tadan) is the hero of the Lightning lab (gemini/stages/engine), built before the Hero Trial. His kit,
 * names and moves are that lab's: Spark Step, Chain Bolt, Skyfall Strike, Volt Hammer, Bolt Dash, Thunder God.
 * The kit borrows gravity's id only for the shared types (the orbit ring is switched off).
 */
const LIGHTNING: Kit = {
  ...KITS.gravity,
  orbit: false,
  name: 'Lightning',
  icon: '⚡',
  // his base design: yellow body outline and head ring, cyan visor, headphone and sparks
  line: '#ffe27a',
  light: '#fffbd0',
  accent: '#7fe9ff',
  fill: '#141833',
  fx: { glow: '60,200,255', mid: '150,240,255', core: '255,255,230' },
  fx2: { glow: '255,210,40', mid: '255,240,120', core: '255,255,230' },
  heavy: 'Volt Hammer',
  kick: 'Thunder Kick',
  rising: 'Rising Volt',
  dash: 'Bolt Dash',
  shield: 'lightning shield',
  ult: 'Thunder God',
  ultBanner: 'THUNDER GOD',
  passive: 'Fastest hero on the roster',
  shouts: ['ZAP', 'OVERCHARGED!', 'THUNDERSTRUCK!'],
  powers: [
    { key: 'KeyU', clip: 'sparkStep', name: 'Spark Step', mp: 20, text: 'turns into a bolt, reappears behind the foe and strikes' },
    { key: 'KeyI', clip: 'chainBolt', name: 'Chain Bolt', mp: 30, text: 'a living bolt from the palm, three hits' },
    { key: 'KeyO', clip: 'skyfall', name: 'Skyfall Strike', mp: 50, text: 'marks the foe, then a bolt falls from the storm cloud' },
  ],
};
/** his own clips from the Lightning lab (gemini/trial/base.ts is that lab's copy) */
function lightningClips(): Record<string, Clip> {
  const n = (key: string, name: string, extra: Partial<Clip> = {}): Clip => ({ ...(JSON.parse(JSON.stringify(LAB[key])) as Clip), name, ...extra });
  return {
    jab: n('jab', 'Jab'),
    cross: n('cross', 'Cross'),
    kick: n('kick', 'Thunder Kick'),
    rising: n('rising', 'Rising Volt'),
    heavy: n('heavy', 'Volt Hammer', { mp: 0 }),
    dash: n('dash', 'Bolt Dash'),
    hurt: n('hurt', 'Hurt'),
    ko: n('ko', 'KO fall'),
    victory: n('victory', 'Victory'),
    taunt: n('taunt', 'Taunt'),
    sparkStep: n('sparkStep', 'Spark Step', { mp: 20 }),
    chainBolt: n('chainBolt', 'Chain Bolt', { mp: 30 }),
    skyfall: n('skyfall', 'Skyfall Strike', { mp: 50 }),
    ult: n('thunderGod', 'Thunder God'),
  };
}
/**
 * His base-design head (gemini/characters/lightning/body/head.png): side view facing right, spiky yellow hair,
 * cyan headphone, yellow-and-cyan visor with the bolt. The sheet has one expression, so the hurt and KO faces are
 * the same head dimmed. The head circle was measured from the picture's outline (centre 108,118, radius 84).
 */
async function lightningSkin(k: Kit): Promise<Skin> {
  const [head, core] = await Promise.all([img(new URL('../characters/lightning/body/head.png', import.meta.url).href), img(new URL('../characters/lightning/out/core.png', import.meta.url).href)]);
  const dim = (f: string): HTMLCanvasElement => {
    const c = document.createElement('canvas');
    c.width = head.width;
    c.height = head.height;
    const g = c.getContext('2d')!;
    g.filter = f;
    g.drawImage(head, 0, 0);
    return c;
  };
  const heads = { normal: head, attack: head, hurt: dim('brightness(0.8) saturate(0.8)'), ko: dim('brightness(0.6) saturate(0.5)') };
  const circle = { cx: 108, cy: 118, r: 84 };
  return { heads, circles: { normal: circle, attack: circle, hurt: circle, ko: circle }, pieces: { emblem: core }, pal: heroPalette(k), kit: k };
}
function img(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error(`missing part ${url}`));
    im.src = url;
  });
}/**
 * Hero stats: vitality, might, spirit, guard, resolve, speed. The fights use them (Hero in fight.ts):
 * vitality x12 = HP, might = hit damage, spirit = power damage, guard = damage taken, resolve = MP gain,
 * speed = run speed; 80 is the plain value. Each hero level adds 3% to the element base, the class shifts it.
 */
export const STAT_NAMES = ['Vitality', 'Might', 'Spirit', 'Guard', 'Resolve', 'Speed'] as const;
const BASE: Record<El, number[]> = {
  fire: [84, 92, 70, 65, 78, 88], water: [86, 72, 90, 80, 84, 74], ice: [80, 76, 82, 92, 80, 64], lightning: [70, 84, 80, 62, 72, 96],
  wind: [72, 74, 78, 64, 76, 98], earth: [96, 90, 62, 94, 88, 56], leaf: [88, 68, 86, 78, 90, 72], light: [74, 80, 92, 70, 82, 86],
  gravity: [90, 88, 84, 82, 86, 60], time: [76, 78, 94, 74, 92, 80],
};
export const CLASS_LIST = ['Vanguard', 'Striker', 'Warden'] as const;
/** what each class adds to the six stats */
const CLASS_MOD: Record<string, number[]> = {
  Vanguard: [6, 6, -4, 6, 2, -8],
  Striker: [-6, 4, 0, -6, -2, 10],
  Warden: [4, -6, 6, 4, 6, -4],
};
export function heroStats(el: El, lv = 1, cls: string = CLASSES[el]): number[] {
  const own = CLASS_MOD[CLASSES[el]];
  const now = CLASS_MOD[cls] ?? own;
  const grow = 1 + 0.03 * (Math.max(1, lv) - 1);
  return BASE[el].map((v, i) => Math.max(10, Math.round((v - own[i]) * grow) + now[i]));
}
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
  if (el === 'lightning') s = await lightningSkin(k);
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
    c = el === 'lightning' ? lightningClips() : makeClips(kitOf(el));
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
  const aur = (side: -1 | 1) => (el === 'lightning' ? drawAura(g, hx, d.feet, 360 * s * (0.9 + au * 0.4), au, Math.floor(t), side) : aura(g, k, hx, d.feet, 360 * s * (0.9 + au * 0.4), au, Math.floor(t), side));
  if (au > 0) aur(-1);
  g.save();
  g.translate(hx, hipY);
  g.scale(s * facing, s);
  drawRig(g, skin, d.pose, { face: d.face, alpha: d.alpha, charge: d.charge, t, speed: d.speed ?? 0, vy: d.vy ?? 0 });
  g.restore();
  if (au > 0) aur(1);
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
