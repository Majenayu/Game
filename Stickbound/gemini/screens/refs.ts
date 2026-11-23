/**
 * The screens ARE the owner's reference pictures in gemini/extra/, shown as they are, with click areas over the
 * buttons in each picture. Nothing is redrawn. Hovering a button outlines it; clicks go where the button says.
 * Add ?boxes=1 to the address to see every click area.
 */
import { nav, pages, type Page, type PageName } from './nav';
import { ELS, profile, save, type El } from './save';
import { C, H, W, chamfer, click, input, neon, region, text, type G } from './ui';

const imgs = new Map<string, HTMLImageElement>();
export function loadRef(name: string): Promise<HTMLImageElement> {
  const hit = imgs.get(name);
  if (hit?.complete) return Promise.resolve(hit);
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error(`missing gemini/extra/${name}.png`));
    im.src = new URL(`../extra/${name}.png`, import.meta.url).href;
    imgs.set(name, im);
  });
}
export const ref = (name: string): HTMLImageElement | undefined => imgs.get(name);
const showBoxes = new URLSearchParams(location.search).has('boxes');

interface Spot {
  x: number;
  y: number;
  w: number;
  h: number;
  act: () => void;
  /** outline shape: rounded box or circle */
  round?: boolean;
  /** stays outlined (the picked card, item or option) */
  on?: () => boolean;
}
const S = (x: number, y: number, w: number, h: number, act: () => void, o: Partial<Spot> = {}): Spot => ({ x, y, w, h, act, ...o });
const go = (p: PageName) => () => nav.go(p);
let toast = '';
let toastT = 0;
function say(s: string): void {
  toast = s;
  toastT = 100;
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
/** draws the picture, its click areas and the hover outline */
function drawRef(g: G, name: string, spots: Spot[], fit: 'full' | 'portrait' = 'full'): void {
  const im = ref(name);
  if (im) {
    if (fit === 'portrait') {
      g.fillStyle = '#05060f';
      g.fillRect(0, 0, W, H);
      const w = (im.width / im.height) * H;
      g.drawImage(im, (W - w) / 2, 0, w, H);
    } else g.drawImage(im, 0, 0, W, H);
  }
  for (const s of spots) {
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
  if (toastT > 0) {
    toastT--;
    g.save();
    g.globalAlpha = Math.min(1, toastT / 20);
    chamfer(g, W / 2 - 260, H - 92, 520, 52, 10);
    g.fillStyle = 'rgba(6,14,32,0.92)';
    g.fill();
    neon(g, C.cyan, 2, 12);
    text(g, toast, W / 2, H - 65, { size: 24, align: 'center' });
    g.restore();
  }
}
function refPage(title: string, name: string, spots: () => Spot[], extra: Partial<Page> = {}, fit: 'full' | 'portrait' = 'full'): Page {
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
const topRight = (): Spot[] => [S(1118, 14, 180, 44, go('shop')), S(1310, 16, 46, 42, () => ((nav.back = nav.name), nav.go('settings')), { round: true })];

// ---------------------------------------------------------------- index of all screens (a plain link list)
const LIST: Array<[PageName, string]> = [
  ['title', 'Logo'], ['lobby', 'Lobby'], ['road', 'Champion Road'], ['roster', 'Hero roster'], ['customise', 'Customise'], ['shop', 'Shop'],
  ['ranked', 'Rank ladder'], ['versus', 'Versus'], ['fight', 'Fight (playable)'], ['pause', 'Pause'], ['victory', 'Victory'], ['levelup', 'Level up'],
  ['zombie', 'Zombies (playable)'], ['bestiary', 'Zombies sheet'], ['icons', 'Icons'], ['keyart', 'Key art'], ['poster', 'Poster'],
];
pages.gallery = {
  title: 'All screens',
  draw(g) {
    g.fillStyle = '#070a1c';
    g.fillRect(0, 0, W, H);
    text(g, 'ELEMENTICK · SCREENS', 60, 60, { size: 40, weight: 800 });
    text(g, 'Each screen is the reference picture from gemini/extra, with working buttons. Esc comes back here.', 60, 100, { size: 19, col: '#9fc8ff', weight: 500 });
    LIST.forEach(([p, label], i) => {
      const x = 60 + (i % 4) * 318;
      const y = 140 + Math.floor(i / 4) * 100;
      const hov = input.mx >= x && input.mx <= x + 296 && input.my >= y && input.my <= y + 80;
      chamfer(g, x, y, 296, 80, 10);
      g.fillStyle = hov ? 'rgba(40,90,130,0.9)' : 'rgba(14,34,64,0.9)';
      g.fill();
      neon(g, C.cyan, 2, 10);
      text(g, label, x + 20, y + 40, { size: 24 });
      region(x, y, 296, 80, () => nav.go(p));
    });
    const x = 60 + (LIST.length % 4) * 318;
    const y = 140 + Math.floor(LIST.length / 4) * 100;
    chamfer(g, x, y, 296, 80, 10);
    g.fillStyle = 'rgba(90,60,10,0.9)';
    g.fill();
    neon(g, '#ffd24a', 2, 10);
    text(g, 'Trial room', x + 20, y + 40, { size: 24, col: '#ffe08a' });
    region(x, y, 296, 80, () => (location.href = '../trial/'));
  },
};

// ---------------------------------------------------------------- the pictures
pages.title = refPage('Title', 'logo-wordmark', () => [S(0, 0, W, H, go('lobby'))]);
pages.lobby = refPage('Lobby', 'lobby', () => [
  S(715, 269, 333, 138, go('road')),
  S(663, 445, 185, 114, go('road')),
  S(866, 445, 245, 114, go('ranked')),
  S(1136, 445, 203, 114, go('bestiary')),
  S(663, 579, 185, 115, () => (location.href = '../trial/')),
  S(866, 579, 245, 115, () => {
    nav.match = { p1: 'fire', p2: 'lightning', p2Name: 'Tadan', p2Lv: 18, mode: 'local' };
    nav.go('versus');
  }),
  S(1136, 579, 203, 115, go('roster')),
  S(1136, 114, 202, 142, () => say('Daily Streak: day 3 of 7. Come back tomorrow.')),
  S(1136, 276, 202, 150, () => say('Daily Quests: win 3 fights, land 50 combos, play Zombie Survival')),
  S(95, 610, 205, 52, go('roster')),
  S(372, 610, 205, 52, go('roster')),
  S(120, 210, 450, 360, go('roster')),
  S(304, 15, 152, 48, go('ranked')),
  S(22, 12, 80, 74, go('customise'), { round: true }),
  ...topRight(),
]);
pages.road = refPage('Champion Road', 'champion-road-map', () => [
  S(24, 14, 62, 62, go('lobby')),
  S(1117, 650, 232, 100, () => road()),
  S(668, 520, 78, 115, () => road(), { round: true }),
  S(762, 14, 140, 42, go('ranked')),
  ...topRight(),
]);
function road(): void {
  nav.match = { p1: 'fire', p2: 'lightning', p2Name: 'Tadan', p2Lv: 18, mode: 'road' };
  nav.go('versus');
}
// hero roster: card positions in the picture and the hero on each card
const CARDS: Array<[number, number, El]> = [
  [52, 103, 'fire'], [191, 103, 'water'], [331, 103, 'lightning'], [469, 103, 'ice'],
  [52, 298, 'earth'], [191, 298, 'wind'], [331, 298, 'leaf'], [469, 298, 'light'],
  [52, 491, 'light'], [191, 491, 'gravity'], [331, 491, 'time'],
];
let rosterPick: El = profile.hero;
pages.roster = refPage('Avatar Roster', 'hero-roster', () => [
  S(28, 18, 125, 42, go('lobby')),
  ...CARDS.map(([x, y, el], i) => S(x, y, 126, 178, () => ((rosterPick = el), say(`${el.charAt(0).toUpperCase() + el.slice(1)} picked. Press SELECT.`)), { on: () => rosterPick === el && CARDS.findIndex((c) => c[2] === el) === i })),
  S(686, 655, 210, 72, () => {
    profile.hero = rosterPick;
    save();
    nav.go('lobby');
  }),
  S(1229, 617, 100, 102, () => {
    if (!profile.squad.includes(rosterPick)) profile.squad[1] = rosterPick;
    save();
    say('Added to your squad');
  }),
  S(1009, 210, 92, 36, () => say('Class: Vanguard')),
  S(1108, 210, 92, 36, () => say('Class: Striker')),
  S(1207, 210, 92, 36, () => say('Class: Warden')),
  ...topRight(),
], { enter: () => (rosterPick = profile.hero) });
// customise: tabs, the 3 x 4 item grid, aura grid, element row, palette, name, create
let cTab = 0;
let cItem = 4;
let cAura = 0;
let cEl = 0;
let cCol = 3;
let cName = '';
const cSpots = (): Spot[] => {
  const s: Spot[] = [S(22, 17, 113, 48, go('lobby'))];
  for (let i = 0; i < 4; i++) s.push(S(53 + i * 95, 160, 80, 54, () => (cTab = i), { on: () => cTab === i }));
  for (let i = 0; i < 12; i++) s.push(S(69 + (i % 3) * 110, 265 + Math.floor(i / 3) * 111, 97, 98, () => (cItem = i), { on: () => cItem === i }));
  for (let i = 0; i < 3; i++) s.push(S(1003 + i * 103, 128, 100, 44, () => say(['Auras', 'Effects', 'Colors'][i])));
  for (let i = 0; i < 9; i++) s.push(S(1007 + (i % 3) * 105, 179 + Math.floor(i / 3) * 106, 94, 94, () => (cAura = i), { on: () => cAura === i }));
  for (let i = 0; i < 10; i++) s.push(S(485 + i * 45.8, 575, 40, 65, () => ((cEl = i), (profile.hero = ELS[i]), save()), { on: () => cEl === i }));
  for (let i = 0; i < 10; i++) s.push(S(1005 + (i % 5) * 64, 555 + Math.floor(i / 5) * 81, 54, 54, () => (cCol = i), { round: true, on: () => cCol === i }));
  s.push(S(512, 648, 352, 42, () => say('Type a name, then press CREATE')));
  s.push(S(588, 700, 200, 56, () => {
    profile.name = cName.trim() || profile.name;
    save();
    nav.go('roster');
  }));
  s.push(...topRight());
  return s;
};
pages.customise = {
  ...refPage('Character Customization', 'customise-screen', cSpots),
  enter() {
    cName = '';
    cEl = Math.max(0, ELS.indexOf(profile.hero));
  },
  key(e) {
    if (e.code === 'Escape') return nav.go('lobby');
    if (e.key === 'Backspace') cName = cName.slice(0, -1);
    else if (e.key.length === 1 && cName.length < 12 && /[\w \-]/.test(e.key)) cName += e.key;
  },
  draw(g) {
    drawRef(g, 'customise-screen', cSpots());
    if (cName) {
      // the typed name goes into the picture's name field
      chamfer(g, 516, 652, 344, 34, 4);
      g.fillStyle = '#0a1a36';
      g.fill();
      text(g, cName + (Math.floor(performance.now() / 500) % 2 ? '|' : ''), 688, 670, { size: 26, align: 'center', col: '#dff8ff' });
    }
  },
};
// shop: tabs, 4 x 3 item grid with prices from the picture, buy, try on
const PRICES = [500, 1200, 1200, 1200, 500, 1200, 3000, 3000, 500, 1200, 3000, 3000];
let shopSel = 7;
const shopSpots = (): Spot[] => [
  S(28, 17, 147, 55, go('lobby')),
  ...[0, 1, 2, 3].map((i) => S(72 + i * 130, 187, 120, 44, () => say(['Visors', 'Capes', 'Auras', 'Trails'][i]))),
  ...PRICES.map((_, i) => S(71 + (i % 4) * 132, 254 + Math.floor(i / 4) * 155, 117, 140, () => (shopSel = i), { on: () => shopSel === i })),
  S(836, 573, 321, 138, () => {
    const id = `shop:${shopSel}`;
    const price = PRICES[shopSel];
    if (profile.owned.includes(id)) return say('Already yours, equipped');
    if (profile.coins < price) return say(`Needs ${price} coins. You have ${profile.coins}.`);
    profile.coins -= price;
    profile.owned.push(id);
    save();
    say(`Bought for ${price} coins. ${profile.coins} left.`);
  }),
  S(1262, 650, 76, 44, () => say('Try on switched'), { round: true }),
  ...topRight(),
];
pages.shop = refPage('Cosmetic Shop', 'shop-screen', shopSpots);
pages.ranked = refPage('Rank Ladder', 'rank-ladder', () => [
  S(841, 636, 338, 92, () => {
    nav.match = { p1: 'fire', p2: 'water', p2Name: 'Root', p2Lv: 22, mode: 'ranked' };
    nav.go('versus');
  }),
  S(22, 12, 80, 74, go('lobby'), { round: true }),
  ...topRight(),
]);
// versus: the picture, then the fight starts by itself (or on a click)
let vsT = 0;
pages.versus = {
  ...refPage('Versus', 'versus-screen', () => [S(0, 0, W, H, go('fight'))]),
  enter: () => (vsT = 0),
  step() {
    if (++vsT > 200) nav.go('fight');
  },
};
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
pages.icons = refPage('Icons', 'element-icons', () => [S(0, 0, W, H, go('gallery'))]);
pages.keyart = refPage('Key art', 'key-art-landscape', () => [S(0, 0, W, H, go('lobby'))]);
pages.poster = refPage('Key art portrait', 'key-art-portrait', () => [S(0, 0, W, H, go('lobby'))], {}, 'portrait');
pages.bestiary = refPage('Zombies', 'zombie-enemies-sheet', () => [S(0, 0, W, H, go('zombie'))], { key: (e) => (e.code === 'Escape' ? nav.go('lobby') : undefined) });
void click;
void H;
