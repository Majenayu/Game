/**
 * HUD for the two playable screens, cut from the owner's pictures: the top strip and the touch buttons of
 * gemini/extra/fight-hud.png and zombie-survival-hud.png. Only the live values (bars, names, timer, wave, score)
 * are painted over the picture, on a patch in the picture's own colour.
 */
import { Sound } from '../stages/engine/audio';
import { drawBackdrop, loadBackdrop, type Backdrop } from '../stages/engine/backdrop';
import { ARENA_DEFS } from '../stages/engine/registry';
import { cleanMark, loadRef, ref } from './refs';
import { profile, type El } from './save';
import { W, type G } from './ui';

// ---------------------------------------------------------------- arenas with their moving effects and music
let stage: Backdrop | null = null;
let stageKey = '';
let sound: Sound | null = null;
let heard = 0;
/** loads the element's arena from gemini/stages (picture, moving effects, sounds, music) */
export async function useStage(el: El): Promise<void> {
  const key = `${el}arena`;
  if (stageKey === key && stage) {
    if (!sound) {
      const def = stage.def;
      sound = new Sound(def.song, def.air);
      sound.setSfx(profile.sfx > 0.02);
      heard = 0;
    }
    return;
  }
  const load = ARENA_DEFS[key] ?? ARENA_DEFS.lightningarena;
  const def = await load();
  const b = await loadBackdrop(def);
  if (b) await cleanMark(b.img);
  stopMusic();
  stage = b;
  stageKey = key;
  sound = new Sound(def.song, def.air);
  sound.setVolume(Math.max(0.05, profile.music));
  sound.setSfx(profile.sfx > 0.02);
  heard = 0;
}
/** starts (or resumes) the arena music; browsers allow it after the first click or key */
export function startMusic(): void {
  if (!sound) return;
  sound.setVolume(Math.max(0.05, profile.music));
  sound.setMusic(profile.music > 0.02);
  sound.start();
}
export function pauseMusic(): void {
  void sound?.ctx?.suspend();
}
export function stopMusic(): void {
  sound?.stop();
  sound = null;
}
for (const ev of ['pointerdown', 'keydown'] as const) window.addEventListener(ev, () => (stage && sound && !sound.ctx ? startMusic() : undefined));
/** draws the current arena: floor at `ground`, with its moving effects and their sounds */
export function drawStage(g: G, ground: number, frame: number, flash: number, storm: number): void {
  if (!stage) return drawArena(g);
  drawBackdrop(g, stage, { ground, stageW: W, camX: W / 2, halfW: W / 2, frame, flash, storm });
  if (sound?.ctx && stage.def.sounds && frame > heard) {
    for (const s of stage.def.sounds(heard, frame, storm)) sound.play(s);
    heard = frame;
  }
}

/** the plain picture of an element's arena (versus screen halves), cleaned of the generator mark */
const arenaPics = new Map<El, HTMLCanvasElement>();
export async function loadArenaPicture(el: El): Promise<void> {
  if (arenaPics.has(el)) return;
  const load = ARENA_DEFS[`${el}arena`] ?? ARENA_DEFS.lightningarena;
  const b = await loadBackdrop(await load());
  if (!b) return;
  await cleanMark(b.img);
  arenaPics.set(el, b.img);
}
export const arenaPicture = (el: El): HTMLCanvasElement | undefined => arenaPics.get(el);

export const ARENA_URL = new URL('../stages/lightningarena/arena.png', import.meta.url).href;
let arena: HTMLImageElement | null = null;
export function loadArena(): Promise<void> {
  if (arena?.complete) return Promise.resolve();
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      arena = im;
      res();
    };
    im.onerror = () => res();
    im.src = ARENA_URL;
  });
}
export function drawArena(g: G, dark = 0): void {
  if (arena) g.drawImage(arena, 0, 0, W, 768);
  if (dark > 0) {
    g.fillStyle = `rgba(4,8,14,${dark})`;
    g.fillRect(0, 0, W, 768);
  }
}

interface Cut {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
}
const cuts = new Map<string, Cut>();
const samples = new Map<string, ImageData>();
/** a piece of a picture with soft edges: shape 'rect' (rounded) or 'circle' */
function cut(name: string, x: number, y: number, w: number, h: number, shape: 'rect' | 'circle' | 'strip', mid?: [number, number, number]): Cut {
  const key = `${name}:${x}:${y}:${w}:${h}`;
  const hit = cuts.get(key);
  if (hit) return hit;
  const im = ref(name)!;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const k = im.width / W;
  g.drawImage(im, x * k, y * k, w * k, h * k, 0, 0, w, h);
  g.globalCompositeOperation = 'destination-in';
  if (shape === 'circle') {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0.82, 'rgba(0,0,0,1)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  } else if (shape === 'rect') {
    g.fillStyle = '#000';
    g.beginPath();
    g.roundRect(0, 0, w, h, 14);
    g.fill();
  } else {
    // top strip: solid at the top, fading out at the bottom; mid = [x0, x1, bottom] keeps the middle shorter
    const mask = document.createElement('canvas');
    mask.width = w;
    mask.height = h;
    const mg = mask.getContext('2d')!;
    const band = (x0: number, x1: number, bottom: number) => {
      const gr = mg.createLinearGradient(0, bottom - 34, 0, bottom);
      gr.addColorStop(0, 'rgba(0,0,0,1)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      mg.fillStyle = '#000';
      mg.fillRect(x0, 0, x1 - x0, bottom - 34);
      mg.fillStyle = gr;
      mg.fillRect(x0, bottom - 34, x1 - x0, 34);
    };
    const [m0, m1, mb] = mid ?? [w, w, h];
    band(0, m0, h);
    band(m0, m1, mb);
    band(m1, w, h);
    g.drawImage(mask, 0, 0);
  }
  const out = { canvas: c, x, y };
  cuts.set(key, out);
  return out;
}
export function drawCut(g: G, name: string, x: number, y: number, w: number, h: number, shape: 'rect' | 'circle' | 'strip', mid?: [number, number, number]): void {
  if (!ref(name)) return;
  const c = cut(name, x, y, w, h, shape, mid);
  g.drawImage(c.canvas, c.x, c.y);
}
/** colour of the picture at a point (patches use it so they blend in) */
export function colourAt(name: string, x: number, y: number): string {
  let d = samples.get(name);
  const im = ref(name);
  if (!im) return '#0a1430';
  if (!d) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = 768;
    const g = c.getContext('2d')!;
    g.drawImage(im, 0, 0, W, 768);
    d = g.getImageData(0, 0, W, 768);
    samples.set(name, d);
  }
  const i = (Math.round(y) * W + Math.round(x)) * 4;
  return `rgb(${d.data[i]},${d.data[i + 1]},${d.data[i + 2]})`;
}
/** fills a box with the picture's colour sampled just outside it */
export function patch(g: G, name: string, x: number, y: number, w: number, h: number, sx = x - 3, sy = y + h / 2): void {
  g.fillStyle = colourAt(name, sx, sy);
  g.fillRect(x, y, w, h);
}
export function loadHudRefs(): Promise<void> {
  return Promise.all([loadRef('fight-hud'), loadRef('zombie-survival-hud'), loadArena()]).then(() => undefined);
}
