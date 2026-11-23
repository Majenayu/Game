/**
 * The screens ARE the owner's reference pictures in gemini/extra/, shown as they are, with click areas over the
 * buttons in each picture. Nothing is redrawn; live values (names, levels, coins, the player's own heroes) are painted
 * over the picture in its own colours (see lobby.ts). Hovering a button outlines it; clicks go where the button says.
 * Add ?boxes=1 to the address to see every click area.
 * The pictures carry the generator's small sparkle mark in the bottom-right corner; cleanMark() takes it out when a
 * picture loads by reversing the mark's blend (alpha map below, measured on a flat part of element-icons.png).
 */
import { nav, pages, type Page, type PageName } from './nav';
import { profile, save } from './save';
import { C, H, W, chamfer, input, neon, region, text, type G } from './ui';

// ---------------------------------------------------------------- the sparkle mark
const MARK_SIZE = 72;
const MARK_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAIAAADajyQQAAAACXBIWXMAAAPoAAAD6AG1e1JrAAADEklEQVRoge2awW7iMBCGfaFiOICE8wJFKigVYI5NqNrKNiKUOO//OJWYXWvkCXSlpU0c+TtEeBqq/PlnxnaCEIlEIpFIJBKJRNeYC2JgZFnmLmRZJobEZrNxzjVN8/z8LIaEtRYdq6pKDAYpJapqmmZQ2aiUOp/PdV3jsSgKMQAAAPV4nHPj8VjEzm63qxlKKRE1k8kE6wqPlLgrzRgTCPMf9vu9iJTlcokaeCpi/PHxUUQHAHhJXp7vIhg5Ho/T6VREBABorZ1zVMn5QmCdMWY0GolYeHt78xVF8Z3DD5umiabYlFLojz+iY7zGfDyC7r/b7WhPp5L4NE2P/dU2Go3KsgwmK19dvDfSc7D8Xl9fJ5OJ6BWz2cwYQ4uHlhMf1nVNC8/rtNb2SNtisaiqKvDK90DqG83M4GQaXC6XHUuSUhZFQa+ez8i8xgKprWitAaADSQCw3W6vXVZrOfkh1RPEA+uUUr+3D8iyDJvEjUuncZqBeOncKL9bC/6Eke12K6X8KT1SyjzPq6pqdYD2wGD1xC+Uns+FBfns74vWOs/zO+8JjDHUAVrxNMI10yDdRAeV5r36/PwMmhD/t1rrewrjArxXfCVB8/OaOdem72uO+Yi19m7ChBDz+TzPc/+w6YaGoIPz7Aoc42XZev7pdMrz/GeLDVeDPNnoZdE7HZhMv/itKudcURQ/qCcAAJRS1+z69vbzrVrrV3613VMAwFrb6tgNW7jVvN+UZTmfz0W3PD09tZoWVFGw1LgmvqqqHj0yGI/H2Dm5Y60CeIniUGs9m81ErwCA9/d3Phnw7senMhy+vLyIWDaaSDBHB00Ch/3daN7WRhXyzhGBKqQsSz6J0XUwjX98fIhYeHh4oMvLIP2o5n5tmf+F6XTKt9W0qPBDN7vJ/2SxWFA9TdME1q1WKxEp5d/nVvxty+FwEAN4SUtB06JMQgpdK/tUjKa/3wAA+Ao4eruQ/X5PU3EIdgU/yxnCS9qA0+mENXbnJxads16vsbqG9pMjeen7dV0PKg8Re+HPIJFIJBKJRCKREJ3xBapR2OwNpBb2AAAAAElFTkSuQmCC';
let markAlpha: Float32Array | null = null;
function loadMark(): Promise<Float32Array> {
  if (markAlpha) return Promise.resolve(markAlpha);
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = MARK_SIZE;
      const x = c.getContext('2d')!;
      x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, MARK_SIZE, MARK_SIZE).data;
      const a = new Float32Array(MARK_SIZE * MARK_SIZE);
      for (let i = 0; i < a.length; i++) a[i] = d[i * 4] / 255;
      markAlpha = a;
      res(a);
    };
    im.onerror = () => res(new Float32Array(MARK_SIZE * MARK_SIZE));
    im.src = `data:image/png;base64,${MARK_B64}`;
  });
}
/** takes the sparkle mark out of a picture (centre 120 px in from the right and bottom edges) */
export async function cleanMark(c: HTMLCanvasElement): Promise<void> {
  const a = await loadMark();
  const x = c.getContext('2d', { willReadFrequently: true })!;
  const ox = c.width - 120 - MARK_SIZE / 2;
  const oy = c.height - 120 - MARK_SIZE / 2;
  if (ox < 0 || oy < 0) return;
  const img = x.getImageData(ox, oy, MARK_SIZE, MARK_SIZE);
  const d = img.data;
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (!k) continue;
    for (let ch = 0; ch < 3; ch++) d[i * 4 + ch] = Math.max(0, Math.min(255, Math.round((d[i * 4 + ch] - k * 255) / (1 - k))));
  }
  x.putImageData(img, ox, oy);
}

// ---------------------------------------------------------------- pictures
const imgs = new Map<string, HTMLCanvasElement>();
const loading = new Map<string, Promise<HTMLCanvasElement>>();
export function loadRef(name: string): Promise<HTMLCanvasElement> {
  const hit = imgs.get(name);
  if (hit) return Promise.resolve(hit);
  const busy = loading.get(name);
  if (busy) return busy;
  const p = new Promise<HTMLCanvasElement>((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      c.getContext('2d', { willReadFrequently: true })!.drawImage(im, 0, 0);
      void cleanMark(c).then(() => {
        imgs.set(name, c);
        res(c);
      });
    };
    im.onerror = () => rej(new Error(`missing gemini/extra/${name}.png`));
    im.src = new URL(`../extra/${name}.png`, import.meta.url).href;
  });
  loading.set(name, p);
  return p;
}
export const ref = (name: string): HTMLCanvasElement | undefined => imgs.get(name);
const showBoxes = new URLSearchParams(location.search).has('boxes');

// ---------------------------------------------------------------- click areas
export interface Spot {
  x: number;
  y: number;
  w: number;
  h: number;
  act: () => void;
  /** outline shape: rounded box or circle */
  round?: boolean;
  /** stays outlined (the picked card, item or option) */
  on?: () => boolean;
  /** greyed out and not clickable */
  off?: () => boolean;
}
export const S = (x: number, y: number, w: number, h: number, act: () => void, o: Partial<Spot> = {}): Spot => ({ x, y, w, h, act, ...o });
export const go = (p: PageName) => () => nav.go(p);
let toast = '';
let toastT = 0;
/** a short message at the bottom of the screen */
export function say(s: string, frames = 150): void {
  toast = s;
  toastT = frames;
}
function outline(g: G, s: Spot, col: string, strong: boolean): void {
  g.save();
  if (s.round) {
    g.beginPath();
    g.ellipse(s.x + s.w / 2, s.y + s.h / 2, s.w / 2 + 3, s.h / 2 + 3, 0, 0, Math.PI * 2);
  } else chamfer(g, s.x - 3, s.y - 3, s.w + 6, s.h + 6, Math.min(12, s.h / 4));
  if (strong) {
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fill();
  }
  neon(g, col, strong ? 3 : 2, 18);
  g.restore();
}
/** draws a picture (cleaned) to fill the screen */
export function drawPicture(g: G, name: string, fit: 'full' | 'portrait' = 'full'): void {
  const im = ref(name);
  if (!im) return;
  if (fit === 'portrait') {
    g.fillStyle = '#05060f';
    g.fillRect(0, 0, W, H);
    const w = (im.width / im.height) * H;
    g.drawImage(im, (W - w) / 2, 0, w, H);
  } else g.drawImage(im, 0, 0, W, H);
}
/** the click areas of a picture with their hover and picked outlines */
export function drawSpots(g: G, spots: Spot[]): void {
  for (const s of spots) {
    if (s.off?.()) {
      g.save();
      chamfer(g, s.x, s.y, s.w, s.h, 10);
      g.fillStyle = 'rgba(2,4,12,0.62)';
      g.fill();
      g.restore();
      continue;
    }
    region(s.x, s.y, s.w, s.h, s.act);
    const hov = input.mx >= s.x && input.mx <= s.x + s.w && input.my >= s.y && input.my <= s.y + s.h;
    if (s.on?.()) outline(g, s, '#ffd24a', true);
    else if (hov) outline(g, s, '#ffffff', false);
    if (showBoxes) {
      g.strokeStyle = '#ff00ff';
      g.lineWidth = 2;
      g.strokeRect(s.x, s.y, s.w, s.h);
    }
  }
}
/** the message box (call last so it sits on top) */
/** y is the top of the box; pages with buttons at the bottom centre pass a higher one */
export function drawToast(g: G, y = H - 92): void {
  if (toastT <= 0) return;
  toastT--;
  g.save();
  g.globalAlpha = Math.min(1, toastT / 20);
  g.font = `700 24px Bahnschrift, sans-serif`;
  const w = Math.max(520, g.measureText(toast).width + 60);
  chamfer(g, W / 2 - w / 2, y, w, 52, 10);
  g.fillStyle = 'rgba(6,14,32,0.92)';
  g.fill();
  neon(g, C.cyan, 2, 12);
  text(g, toast, W / 2, y + 27, { size: 24, align: 'center' });
  g.restore();
}
export function drawRef(g: G, name: string, spots: Spot[], fit: 'full' | 'portrait' = 'full'): void {
  drawPicture(g, name, fit);
  drawSpots(g, spots);
  drawToast(g);
}
export function refPage(title: string, name: string, spots: () => Spot[], extra: Partial<Page> = {}, fit: 'full' | 'portrait' = 'full'): Page {
  return {
    title,
    load: () => loadRef(name).then(() => undefined),
    draw(g) {
      drawRef(g, name, spots(), fit);
    },
    ...extra,
  };
}
/** coins, gear and rank in the shared top bar of the pictures */
export const topRight = (): Spot[] => [S(1118, 14, 180, 44, () => say(`${profile.coins.toLocaleString('en-US')} coins. Win fights and claim the Daily Streak to earn more.`)), S(1310, 16, 46, 42, () => ((nav.back = nav.name), nav.go('settings')), { round: true })];

// ---------------------------------------------------------------- index of all screens (a plain link list, for checks)
const LIST: Array<[PageName, string]> = [
  ['title', 'Logo'], ['register', 'Register name'], ['starter', 'First hero'], ['partner', 'Pick partner'], ['lobby', 'Lobby'], ['road', 'Champion Road'],
  ['roster', 'Hero roster'], ['ranked', 'Rank ladder'], ['versus', 'Versus'], ['fight', 'Fight (playable)'], ['pause', 'Pause'], ['victory', 'Victory'],
  ['levelup', 'Level up'], ['zombie', 'Zombies (playable)'], ['bestiary', 'Zombies sheet'], ['icons', 'Icons'], ['keyart', 'Key art'], ['poster', 'Poster'],
];
pages.gallery = {
  title: 'All screens',
  draw(g) {
    g.fillStyle = '#070a1c';
    g.fillRect(0, 0, W, H);
    text(g, 'ELEMENTICK · SCREENS', 60, 60, { size: 40, weight: 800 });
    text(g, 'Each screen is the reference picture from gemini/extra, with working buttons.', 60, 100, { size: 19, col: '#9fc8ff', weight: 500 });
    const all = [...LIST, ['trial', 'Trial room'] as [string, string]];
    all.forEach(([p, label], i) => {
      const x = 60 + (i % 4) * 318;
      const y = 140 + Math.floor(i / 4) * 100;
      const hov = input.mx >= x && input.mx <= x + 296 && input.my >= y && input.my <= y + 80;
      const trial = p === 'trial';
      chamfer(g, x, y, 296, 80, 10);
      g.fillStyle = trial ? 'rgba(90,60,10,0.9)' : hov ? 'rgba(40,90,130,0.9)' : 'rgba(14,34,64,0.9)';
      g.fill();
      neon(g, trial ? '#ffd24a' : C.cyan, 2, 10);
      text(g, label, x + 20, y + 40, { size: 24, col: trial ? '#ffe08a' : C.white });
      region(x, y, 296, 80, () => (trial ? (location.href = '../trial/') : nav.go(p as PageName)));
    });
  },
};

// ---------------------------------------------------------------- pictures with plain buttons
pages.victory = refPage('Victory', 'victory-screen', () => [
  S(748, 619, 340, 104, () => nav.go(nav.result?.score !== undefined ? 'zombie' : 'versus')),
  S(1111, 619, 225, 104, () => nav.go(nav.result?.levelUp ? 'levelup' : 'lobby')),
  S(1190, 200, 125, 96, go('levelup')),
  ...topRight(),
]);
pages.levelup = refPage('Level Up', 'level-up-popup', () => [S(0, 0, W, H, go('lobby')), S(694, 629, 269, 66, go('lobby'))]);
// pause and settings: the pause picture with working options
const PAUSE = (menu: boolean) => (): Spot[] => [
  S(213, 288, 306, 81, () => resume(menu)),
  S(215, 390, 304, 70, () => say('A D move · W jump · S guard · J attack · K heavy · L dash · U I O powers · P ultimate')),
  S(215, 485, 304, 72, () => say('Settings are on the right')),
  S(215, 582, 304, 71, go('lobby')),
  S(903, 321, 340, 24, () => ((profile.music = Math.max(0, Math.min(1, (input.mx - 903) / 340))), save(), say(`Music ${Math.round(profile.music * 100)}%`))),
  S(903, 369, 340, 25, () => ((profile.sfx = Math.max(0, Math.min(1, (input.mx - 903) / 340))), save(), say(`Sound FX ${Math.round(profile.sfx * 100)}%`))),
  ...(['high', 'medium', 'low'] as const).map((q, i) => S(903 + i * 117, 468, 108, 39, () => ((profile.graphics = q), save()), { on: () => profile.graphics === q })),
  S(1142, 582, 100, 31, () => ((profile.reduced = !profile.reduced), save(), say(`Reduced motion ${profile.reduced ? 'on' : 'off'}`)), { on: () => profile.reduced }),
  S(1142, 629, 100, 30, () => ((profile.shake = !profile.shake), save(), say(`Screen shake ${profile.shake ? 'on' : 'off'}`)), { on: () => profile.shake }),
  S(1142, 673, 100, 32, () => ((profile.colorblind = !profile.colorblind), save(), say(`Colorblind mode ${profile.colorblind ? 'on' : 'off'}`)), { on: () => profile.colorblind }),
];
export const resumeFlags = { fight: false, zombie: false };
function resume(menu: boolean): void {
  const back = menu || nav.back === 'pause' || nav.back === 'settings' ? (menu ? nav.back : 'lobby') : nav.back;
  if (back === 'fight') resumeFlags.fight = true;
  if (back === 'zombie') resumeFlags.zombie = true;
  nav.go(back === 'settings' || back === 'pause' ? 'lobby' : back);
}
pages.pause = { ...refPage('Paused', 'pause-menu', PAUSE(false)), key: (e) => e.code === 'Escape' && resume(false) };
pages.settings = { ...refPage('Settings', 'pause-menu', PAUSE(true)), key: (e) => e.code === 'Escape' && resume(true) };
pages.icons = refPage('Icons', 'element-icons', () => [S(0, 0, W, H, go('lobby'))]);
pages.keyart = refPage('Key art', 'key-art-landscape', () => [S(0, 0, W, H, go('lobby'))]);
pages.poster = refPage('Key art portrait', 'key-art-portrait', () => [S(0, 0, W, H, go('lobby'))], {}, 'portrait');
pages.bestiary = refPage('Zombies', 'zombie-enemies-sheet', () => [S(0, 0, W, H, go('zombie'))], { key: (e) => (e.code === 'Escape' ? nav.go('lobby') : undefined) });
