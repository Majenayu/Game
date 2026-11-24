/**
 * The player's way in, on the owner's pictures from gemini/extra/ (nothing redesigned):
 *   title (logo-wordmark) -> register (logo-wordmark: type a name) -> starter (hero-roster: pick the one starting
 *   hero) -> tutorial fight with that hero (play.ts) -> partner (hero-roster: pick a second hero) -> lobby.
 * The lobby, roster, Champion Road, Rank Ladder and Versus pictures get the player's live values painted over them
 * in the picture's own colours: name, levels, rank, coins, streak, quests, and the player's own two heroes (drawn
 * with the hero rig, over a soft blur of the painted hero when the picture shows a different one).
 */
import { EL, elementCoin, elementIcon, lock } from './art';
import { fmt } from './common';
import { sample } from '../trial/anims';
import { clipsOf, kitOf, heroStats, CLASS_LIST, CLASSES, NAMES, drawHero, heroShadow, stillPose, type Still } from './heroes';
import { colourAt, patch } from './hudref';
import { Hero, drawEffects, drawFloaters, makeWorld, noKeys, stepWorld, type World } from './fight';
import { nav, pages, type Match } from './nav';
import { S, drawPicture, drawSpots, drawToast, go, loadRef, ref, say, topRight, type Spot } from './refs';
import { ELS, QUESTS, dailyClaim, profile, save, tierOf, today, xpNeed, type El } from './save';
import { goldButton, neon } from './ui';
import { C, H, W, bar, chamfer, rrect, text, type G } from './ui';

// ---------------------------------------------------------------- helpers
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const veils = new Map<string, HTMLCanvasElement>();
/** soft blur over a painted hero, so the player's own hero can stand in its place */
function veil(g: G, name: string, cx: number, cy: number, rx: number, ry: number): void {
  const key = `${name}:${cx}:${cy}:${rx}:${ry}`;
  let c = veils.get(key);
  const im = ref(name);
  if (!im) return;
  if (!c) {
    c = document.createElement('canvas');
    c.width = rx * 2;
    c.height = ry * 2;
    const x = c.getContext('2d')!;
    const k = im.width / W;
    const pad = 60;
    x.filter = 'blur(34px) brightness(0.3) saturate(0.45)';
    x.drawImage(im, (cx - rx - pad) * k, (cy - ry - pad) * k, (rx * 2 + pad * 2) * k, (ry * 2 + pad * 2) * k, -pad, -pad, rx * 2 + pad * 2, ry * 2 + pad * 2);
    x.filter = 'none';
    x.globalCompositeOperation = 'destination-in';
    x.save();
    x.translate(rx, ry);
    x.scale(1, ry / rx);
    const gr = x.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0.74, 'rgba(0,0,0,1)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr;
    x.fillRect(-rx, -rx, rx * 2, rx * 2);
    x.restore();
    veils.set(key, c);
  }
  g.drawImage(c, cx - rx, cy - ry);
}
/** one of the player's heroes standing on a picture */
function stand(g: G, el: El, x: number, feet: number, scale: number, t: number, kind: Still = 'fight', facing: 1 | -1 = 1): void {
  const { pose, face } = stillPose(el, kind, t);
  heroShadow(g, x, feet, scale, 0.3);
  drawHero(g, el, { pose, face, x, feet, scale, facing, t, aura: 0.55 });
}
/** text on a patch of the picture's own colour */
function label(g: G, pic: string, x: number, y: number, w: number, h: number, sx: number, sy: number, s: string, o: Parameters<typeof text>[4] = {}): void {
  patch(g, pic, x, y, w, h, sx, sy);
  const al = o.align ?? 'left';
  const tx = al === 'center' ? x + w / 2 : al === 'right' ? x + w - 2 : x + 2;
  text(g, s, tx, y + h / 2 + 1, { size: Math.min(26, h - 4), max: w - 4, ...o });
}
const heroLv = (el: El) => profile.heroLv[el] ?? 1;
const partnerOf = (): El => profile.partner ?? (profile.hero === 'water' ? 'fire' : 'water');

// ---------------------------------------------------------------- matches
function dummyFor(el: El): El {
  return el === 'earth' ? 'water' : 'earth';
}
function match(mode: Match['mode'], p2: El, p2Name: string, p2Lv: number, arena?: El): void {
  nav.match = { p1: profile.hero, p2, p2Name, p2Lv, mode, arena: arena ?? p2 };
  nav.go(mode === 'training' || mode === 'tutorial' ? 'fight' : 'versus');
}
export function startTutorial(): void {
  match('tutorial', dummyFor(profile.hero), 'Sparring Dummy', 1, profile.hero);
}
/** Champion Road: 41 champions, each one a hero of another element, one level higher each stage */
function champion(i: number): El {
  const order = ELS.filter((e) => e !== profile.hero);
  return order[(i * 4 + 1) % order.length];
}
const champLv = (i: number) => 1 + i * 2;
function roadBattle(): void {
  if (profile.road >= 41) return say('All 41 champions beaten. Champion Road is complete!');
  const el = champion(profile.road);
  match('road', el, NAMES[el], champLv(profile.road));
}
function rankedBattle(): void {
  const pool = ELS.filter((e) => e !== profile.hero);
  const el = pool[Math.floor(Math.random() * pool.length)];
  match('ranked', el, NAMES[el], Math.max(1, profile.level + Math.floor(Math.random() * 5) - 2));
}
/** where the logo screen leads, depending on how far the player got */
function nextStep(): void {
  if (!profile.name) nav.go('register');
  else if (!profile.registered) nav.go('starter');
  else if (!profile.tutorial) startTutorial();
  else if (!profile.partner) nav.go('partner');
  else nav.go('lobby');
}

// ---------------------------------------------------------------- title
pages.title = {
  title: 'Elementick',
  load: () => loadRef('logo-wordmark').then(() => undefined),
  draw(g, t) {
    drawPicture(g, 'logo-wordmark');
    const a = 0.55 + Math.sin(t / 18) * 0.45;
    g.save();
    g.globalAlpha = a;
    text(g, profile.registered ? `TAP TO PLAY, ${profile.name.toUpperCase()}` : 'TAP TO START', W / 2, 680, { size: 30, align: 'center', weight: 800, col: '#eaf6ff', glow: C.cyan, blur: 16, spacing: 3 });
    g.restore();
    drawSpots(g, [S(0, 0, W, H, nextStep)]);
    drawToast(g);
  },
  key: (e) => (e.code === 'Enter' || e.code === 'Space' ? nextStep() : undefined),
};

// ---------------------------------------------------------------- register: the name, on the logo picture
let cName = '';
let nameBox: HTMLInputElement | null = null;
function box(): HTMLInputElement {
  if (nameBox) return nameBox;
  const el = document.createElement('input');
  el.type = 'text';
  el.maxLength = 12;
  el.autocomplete = 'off';
  el.setAttribute('aria-label', 'Your name');
  el.style.cssText = 'position:fixed;left:-1000px;top:0;width:200px;opacity:0;';
  el.addEventListener('input', () => {
    el.value = el.value.replace(/[^\w \-]/g, '').slice(0, 12);
    cName = el.value;
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') registerName();
  });
  document.body.appendChild(el);
  nameBox = el;
  return el;
}
function registerName(): void {
  const n = cName.trim();
  if (n.length < 2) return say('Type your name first (2 to 12 letters)');
  const first = !profile.registered;
  profile.name = n;
  save();
  nameBox?.blur();
  if (first) nav.go('starter');
  else {
    say(`Name saved: ${n}`);
    nav.go('lobby');
  }
}
const FIELD = { x: 300, y: 606, w: 360, h: 56 };
pages.register = {
  title: 'Register',
  load: () => loadRef('logo-wordmark').then(() => undefined),
  enter() {
    cName = profile.name;
    const b = box();
    b.value = cName;
    // desktop: type straight away; phones get the keyboard on a tap in the field
    if (!matchMedia('(pointer: coarse)').matches) b.focus();
  },
  leave() {
    nameBox?.blur();
  },
  key(e) {
    if (document.activeElement === nameBox) return;
    if (e.code === 'Escape') return nav.go(profile.registered ? 'lobby' : 'title');
    if (e.key === 'Enter') return registerName();
    if (e.key === 'Backspace') cName = cName.slice(0, -1);
    else if (e.key.length === 1 && cName.length < 12 && /[\w \-]/.test(e.key)) cName += e.key;
  },
  draw(g, t) {
    drawPicture(g, 'logo-wordmark');
    const { x, y, w, h } = FIELD;
    text(g, profile.registered ? 'CHANGE YOUR NAME' : 'STEP 1 OF 3 · ENTER YOUR NAME', x + w / 2, y - 22, { size: 20, align: 'center', weight: 800, col: '#ffd24a', spacing: 2 });
    chamfer(g, x, y, w, h, 10);
    g.fillStyle = 'rgba(6,16,36,0.92)';
    g.fill();
    neon(g, C.cyan, 2, 14);
    const focused = document.activeElement === nameBox || !matchMedia('(pointer: coarse)').matches;
    const caret = focused && Math.floor(performance.now() / 500) % 2 ? '|' : '';
    if (cName) text(g, cName + caret, x + w / 2, y + h / 2 + 1, { size: 30, align: 'center', col: '#dff8ff' });
    else text(g, `ENTER NAME${caret}`, x + w / 2, y + h / 2 + 1, { size: 26, align: 'center', col: '#6f93b8' });
    goldButton(g, x + w / 2 - 100, y + h + 16, 200, 58, profile.registered ? 'SAVE' : 'NEXT', { size: 30, t, act: registerName });
    drawSpots(g, [
      S(x, y, w, h, () => {
        const b = box();
        b.value = cName;
        b.focus();
      }),
    ]);
    drawToast(g, 516);
  },
};
/** the customise picture was taken out of gemini/extra; its link goes to the name page */
pages.customise = pages.register;

// ---------------------------------------------------------------- roster and partner pick (hero-roster.png)
/** the painted card frames hold the 10 heroes; the picture's 11th frame (52, 491) is painted over with the background */
const CARDS: Array<[number, number, El]> = [
  [52, 103, 'fire'], [191, 103, 'water'], [331, 103, 'lightning'], [469, 103, 'ice'],
  [52, 298, 'earth'], [191, 298, 'wind'], [331, 298, 'leaf'], [469, 298, 'light'],
  [191, 491, 'gravity'], [331, 491, 'time'],
];
const CW = 126;
const CH = 178;
export const classOf = (el: El): string => profile.cls[el] ?? CLASSES[el];
/** the same numbers the fights use (heroStats in heroes.ts): they grow with the hero's level and follow the class */
const statsOf = (el: El): number[] => heroStats(el, heroLv(el), classOf(el));
let pick: El = 'fire';
const partnerMode = () => nav.name === 'partner';
const starterMode = () => nav.name === 'starter';
/** after the partner pick the roster is view only */
const viewOnly = () => !starterMode() && !partnerMode() && !!profile.partner;
const inSquad = (el: El) => el === profile.hero || el === profile.partner;
function choose(): void {
  if (starterMode()) {
    profile.hero = pick;
    profile.partner = null;
    profile.squad = [pick];
    profile.registered = true;
    save();
    startTutorial();
    return;
  }
  if (partnerMode()) {
    if (pick === profile.hero) return say(`${NAMES[pick]} already leads your squad. Pick another hero.`);
    profile.partner = pick;
    profile.squad = [profile.hero, pick];
    save();
    say(`Squad ready: ${NAMES[profile.hero]} and ${NAMES[pick]}. Welcome, ${profile.name}!`, 240);
    nav.go('lobby');
    return;
  }
  say(inSquad(pick) ? `${NAMES[pick]} is in your squad` : `${NAMES[pick]} is locked. View only for now.`);
}
const rosterSpots = (): Spot[] => [
  S(28, 18, 125, 42, () => (starterMode() ? nav.go('register') : partnerMode() && !profile.partner ? say('Pick a partner first, then press SELECT') : nav.go('lobby'))),
  ...CARDS.map(([x, y, el]) =>
    S(x, y, CW, CH, () => {
      if (partnerMode() && el === profile.hero) return say(`${NAMES[el]} already leads your squad. Pick a partner.`);
      pick = el;
      showT = 0;
      say(`${NAMES[el]} · ${cap(el)} · ${classOf(el)}`);
    }, {
      on: () => el === pick,
      off: () => false,
    }),
  ),
  S(686, 655, 210, 72, choose),
  ...CLASS_LIST.map((c, i) =>
    S(1009 + i * 104, 210, 104, 36, () => {
      if (c === CLASSES[pick]) delete profile.cls[pick];
      else profile.cls[pick] = c;
      save();
      say(`${NAMES[pick]} now plays as a ${c}`);
    }),
  ),
  ...topRight(),
];

/** the card art: the hero's own rig in a celebration pose on a dark card in the element's colour */
function card(g: G, x: number, y: number, el: El, t: number, i: number): void {
  const ix = x + 7;
  const iy = y + 7;
  const iw = CW - 14;
  const ih = CH - 14;
  g.save();
  rrect(g, ix, iy, iw, ih, 9);
  g.clip();
  const col = EL[el];
  const gr = g.createLinearGradient(0, iy, 0, iy + ih);
  gr.addColorStop(0, col.deep);
  gr.addColorStop(1, '#04070f');
  g.fillStyle = gr;
  g.fillRect(ix, iy, iw, ih);
  if (el) {
    const glow = g.createRadialGradient(ix + iw / 2, iy + ih * 0.42, 4, ix + iw / 2, iy + ih * 0.42, iw * 0.75);
    glow.addColorStop(0, hexA(col.line, 0.45));
    glow.addColorStop(1, hexA(col.line, 0));
    g.fillStyle = glow;
    g.fillRect(ix, iy, iw, ih);
    const c = clipsOf(el).victory;
    const f = 30 + ((t + i * 23) % 60);
    drawHero(g, el, { pose: sample(c, f), face: 'attack', x: ix + iw / 2 + 4, feet: iy + ih + 34, scale: 0.4, t, aura: 0.25 });
    const locked = viewOnly() && !inSquad(el);
    // the leader, while a partner is picked: shown bright, with a gold band at the foot instead of the level box
    const lead = partnerMode() && el === profile.hero;
    if (locked) {
      g.fillStyle = 'rgba(2,6,15,0.55)';
      g.fillRect(ix, iy, iw, ih);
    }
    if (lead) {
      const gb = g.createLinearGradient(0, iy + ih - 30, 0, iy + ih);
      gb.addColorStop(0, '#f6c25a');
      gb.addColorStop(1, '#b8741c');
      g.fillStyle = gb;
      g.fillRect(ix, iy + ih - 30, iw, 30);
      text(g, `LEADER · Lv ${heroLv(el)}`, ix + iw / 2, iy + ih - 14, { size: 16, align: 'center', weight: 800, col: '#2a1400', max: iw - 8 });
    } else {
      g.fillStyle = 'rgba(2,6,15,0.7)';
      g.fillRect(ix + iw - 64, iy + ih - 32, 64, 32);
      text(g, `Lv ${heroLv(el)}`, ix + iw - 6, iy + ih - 15, { size: 21, align: 'right', weight: 800 });
    }
    if (locked) lock(g, ix + iw - 16, iy + 18, 12);
  }
  g.restore();
  elementIcon(g, el, x + 24, y + 26, 13);
}
function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
/** fills a box by blending, row by row, the picture's colours just left and right of it */
const fills = new Map<string, HTMLCanvasElement>();
function inpaint(g: G, P: string, x: number, y: number, w: number, h: number): void {
  const key = `${P}:${x}:${y}:${w}:${h}`;
  let c = fills.get(key);
  if (!c && ref(P)) {
    c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cg = c.getContext('2d')!;
    for (let r = 0; r < h; r++) {
      const gr = cg.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, colourAt(P, x - 4, y + r));
      gr.addColorStop(1, colourAt(P, x + w + 4, y + r));
      cg.fillStyle = gr;
      cg.fillRect(0, r, w, 1);
    }
    cg.filter = 'blur(3px)';
    cg.drawImage(c, 0, 0);
    fills.set(key, c);
  }
  if (c) g.drawImage(c, x, y);
}
/**
 * The painted fire hero and his orange glow are removed from the whole stage: the area above the platform is filled
 * from the colours either side, the spotlight is drawn again, and the platform top glows in the picked hero's colour.
 */
function stageBack(g: G, P: string, el: El): void {
  inpaint(g, P, 604, 90, 372, 378);
  g.save();
  g.globalCompositeOperation = 'lighter';
  const cone = g.createLinearGradient(0, 0, 0, 480);
  cone.addColorStop(0, 'rgba(90,170,255,0.30)');
  cone.addColorStop(1, 'rgba(60,140,255,0.06)');
  g.fillStyle = cone;
  g.filter = 'blur(18px)';
  g.beginPath();
  g.moveTo(712, 0);
  g.lineTo(868, 0);
  g.lineTo(958, 480);
  g.lineTo(622, 480);
  g.closePath();
  g.fill();
  g.restore();
  // platform top
  g.save();
  g.beginPath();
  g.ellipse(792, 490, 150, 24, 0, 0, Math.PI * 2);
  const top = g.createRadialGradient(792, 490, 10, 792, 490, 150);
  top.addColorStop(0, hexA(EL[el].light, 0.55));
  top.addColorStop(0.55, hexA(EL[el].line, 0.35));
  top.addColorStop(1, '#0a1838');
  g.fillStyle = '#0a1838';
  g.fill();
  g.fillStyle = top;
  g.fill();
  g.shadowColor = EL[el].line;
  g.shadowBlur = 16;
  g.strokeStyle = EL[el].line;
  g.lineWidth = 3;
  g.stroke();
  g.beginPath();
  g.ellipse(792, 490, 112, 17, 0, 0, Math.PI * 2);
  g.lineWidth = 2;
  g.strokeStyle = hexA(EL[el].light, 0.8);
  g.stroke();
  g.restore();
}
/**
 * The stage show: the picked hero plays a celebration, then every move one after another, with the same designed
 * effects as in a fight (a real Hero in a small World, see fight.ts and moves.ts). The world is narrow (span) so the
 * powers land on the platform.
 */
let showT = 0;
let show: { el: El; cls: string; w: World; h: Hero; list: string[]; i: number; gap: number } | null = null;
function stageShow(el: El, tick = false): { w: World; h: Hero } {
  if (!show || show.el !== el || show.cls !== classOf(el)) {
    const h = new Hero(el, 790, 1, 1, 494, heroLv(el), classOf(el));
    h.scale = 0.8;
    const w = makeWorld(494, 670, 910, () => [h]);
    w.span = 0.3;
    const c = clipsOf(el);
    const k = kitOf(el);
    const list = ['victory', 'jab', 'cross', 'kick', 'heavy', k.powers[0].clip, k.powers[1].clip, k.powers[2].clip, 'rising', 'dash', 'ult', 'taunt'].filter((n) => c[n]);
    show = { el, cls: classOf(el), w, h, list, i: -1, gap: 0 };
  }
  const s = show;
  if (!tick) return s;
  if (showT <= 1) {
    s.i = -1;
    s.gap = 0;
  }
  if (!s.h.clip && ++s.gap >= 24) {
    s.gap = 0;
    s.i = (s.i + 1) % s.list.length;
    s.h.x = 790;
    s.h.facing = 1;
    s.h.mp = 100;
    s.h.start(s.list[s.i]);
  }
  s.h.step(s.w, noKeys());
  stepWorld(s.w, [s.h]);
  return s;
}function rosterDraw(g: G, t: number): void {
  const P = 'hero-roster';
  drawPicture(g, P);
  // the picture's empty 11th frame is painted over with the background round it
  inpaint(g, P, 44, 484, 140, 194);
  CARDS.forEach(([x, y, el], i) => card(g, x, y, el, t, i));
  // the picked hero on the stage, playing its celebration and moves
  stageBack(g, P, pick);
  inpaint(g, P, 636, 531, 308, 113);
  const s = stageShow(pick);
  g.save();
  g.beginPath();
  g.rect(604, 40, 372, 520);
  g.clip();
  drawEffects(g, s.w, false);
  s.h.draw(g, s.w);
  drawEffects(g, s.w, true);
  drawFloaters(g, s.w);
  g.restore();
  const mv = s.h.clip && !['hurt', 'ko'].includes(s.h.clipName) ? s.h.clip.name : '';
  if (mv) text(g, mv.toUpperCase(), 790, 568, { size: 22, align: 'center', weight: 800, col: EL[pick].light, stroke: '#02060f', sw: 4, spacing: 1 });
  // name, class and stats
  label(g, P, 1010, 124, 300, 42, 1320, 150, NAMES[pick].toUpperCase(), { size: 40, weight: 800, col: '#dff4ff' });
  patch(g, P, 1010, 168, 300, 26, 1320, 180);
  text(g, 'CLASS:', 1013, 181, { size: 21, col: '#dff4ff' });
  text(g, classOf(pick).toUpperCase(), 1093, 181, { size: 21, col: '#ffc93a' });
  patch(g, P, 1006, 206, 320, 44, 1003, 228);
  CLASS_LIST.forEach((c, i) => {
    const x = 1009 + i * 104;
    const on = classOf(pick) === c;
    chamfer(g, x + 2, 211, 100, 34, 6);
    if (on) {
      const gr = g.createLinearGradient(0, 211, 0, 245);
      gr.addColorStop(0, '#f6c25a');
      gr.addColorStop(1, '#b8741c');
      g.fillStyle = gr;
    } else g.fillStyle = 'rgba(16,40,72,0.92)';
    g.fill();
    g.strokeStyle = on ? '#ffe7a0' : 'rgba(90,170,230,0.55)';
    g.lineWidth = 1.5;
    g.stroke();
    text(g, c, x + 52, 229, { size: 18, align: 'center', weight: 700, col: on ? '#2a1400' : '#cfe4ff' });
  });
  // bars are full at 150, so they keep filling as the hero levels up
  statsOf(pick).forEach((v, i) => {
    const y = 287 + i * 47.2;
    bar(g, 1056, y, 218, 12, Math.min(1, v / 150), ['#ff8a1a', '#ffd24a'], { back: '#0a1430' });
    label(g, P, 1282, y - 22, 40, 30, 1330, y - 6, String(v), { size: 24, align: 'right' });
  });
  // squad: leader and partner (the ADD slot is covered: the squad is two heroes)
  // each slot's inside is filled edge to edge, so none of the painted heroes shows round our own
  const slot = (x: number, el: El | null, sub: string) => {
    const sx = x + 2;
    g.save();
    rrect(g, sx, 619, 97, 97, 8);
    g.clip();
    const gr = g.createLinearGradient(0, 619, 0, 716);
    gr.addColorStop(0, el ? EL[el].deep : '#141a2c');
    gr.addColorStop(1, '#04070f');
    g.fillStyle = gr;
    g.fillRect(sx, 619, 97, 97);
    if (el) {
      stand(g, el, sx + 52, 712, 0.27, t, 'idle');
      g.fillStyle = 'rgba(2,6,15,0.7)';
      g.fillRect(sx, 690, 97, 26);
      text(g, sub, sx + 92, 704, { size: 17, align: 'right', weight: 800, col: '#eaf6ff', max: 66 });
    } else text(g, '?', sx + 48, 668, { size: 40, align: 'center', col: '#6a8ab0' });
    g.restore();
    if (el) elementIcon(g, el, sx + 14, 703, 10);
  };
  const lead = starterMode() ? pick : profile.hero;
  slot(995, lead, `Lv ${heroLv(lead)}`);
  slot(1110, starterMode() ? null : partnerMode() ? (pick === profile.hero ? null : pick) : profile.partner, partnerMode() ? NAMES[pick] : profile.partner ? NAMES[profile.partner] : '');
  patch(g, P, 1228, 616, 102, 104, 1232, 612);
  // SELECT: works in the starter and partner steps; afterwards the roster is view only
  if (viewOnly()) {
    inpaint(g, P, 678, 646, 226, 90);
    chamfer(g, 692, 660, 196, 62, 10);
    g.fillStyle = 'rgba(14,30,56,0.94)';
    g.fill();
    g.strokeStyle = 'rgba(120,170,220,0.6)';
    g.lineWidth = 2;
    g.stroke();
    lock(g, 714, 690, 12);
    text(g, inSquad(pick) ? 'IN SQUAD' : 'VIEW ONLY', 806, 692, { size: 24, align: 'center', weight: 800, col: '#9fb8d8' });
  }
  // top bar
  topBar(g, P, { xp: [804, 26, 138, 20], rank: [1012, 25, 88, 26], coins: [1168, 22, 100, 28] });
  xpExtras(g, 767.5, 39, 802, 54, 120);
  if (starterMode()) text(g, 'STEP 2 OF 3 · PICK YOUR FIRST HERO, THEN SELECT', 172, 82, { size: 17, weight: 800, col: '#ffd24a', stroke: '#02060f', sw: 4, spacing: 1 });
  if (partnerMode()) text(g, 'STEP 3 OF 3 · PICK A PARTNER, THEN SELECT', 172, 82, { size: 17, weight: 800, col: '#ffd24a', stroke: '#02060f', sw: 4, spacing: 1 });
  if (viewOnly()) text(g, 'VIEW ONLY · TAP A HERO TO SEE THEM · TAP A CLASS TO SWITCH', 172, 82, { size: 17, weight: 800, col: '#9fd8ff', stroke: '#02060f', sw: 4, spacing: 1 });
  drawSpots(g, rosterSpots());
  // the message sits under the stage, between the cards and the panel, so it covers no card or name
  drawToast(g, 590, 790, 380);
}
const rosterPage = (title: string) => ({
  title,
  heroes: () => ELS,
  load: () => Promise.all([loadRef('hero-roster'), loadRef('fight-hud')]).then(() => undefined),
  enter() {
    showT = 0;
    pick = nav.name === 'partner' ? (profile.partner ?? (profile.hero === 'water' ? 'lightning' : 'water')) : profile.hero;
    if (nav.name === 'starter') say(`Hi ${profile.name}! Pick the one hero you start with`, 300);
    if (nav.name === 'partner') say(`Tutorial done! Pick a partner hero to fight beside ${NAMES[profile.hero]}`, 300);
  },
  // the stage hero runs at the fixed 60 Hz step, not at the screen's draw rate
  step() {
    showT++;
    stageShow(pick, true);
  },
  draw: rosterDraw,
});
pages.roster = rosterPage('Avatar Roster');
pages.partner = rosterPage('Pick your partner');
pages.starter = rosterPage('Pick your first hero');

// ---------------------------------------------------------------- shared top bar values
interface Bar {
  xp?: [number, number, number, number];
  rank?: [number, number, number, number];
  streak?: [number, number, number, number];
  coins?: [number, number, number, number];
}
/**
 * The painted XP badge also has a half-full ring and a row of four dashes that never change. Both are painted over
 * here and drawn again from the real XP: the ring and the dashes fill with xp / xpNeed(level).
 */
function xpExtras(g: G, cx: number, cy: number, dx: number, dy: number, dw: number): void {
  const k = Math.max(0, Math.min(1, profile.xp / xpNeed(profile.level)));
  g.save();
  g.lineCap = 'butt';
  g.lineWidth = 7;
  g.strokeStyle = '#0b1d38';
  g.beginPath();
  g.arc(cx, cy, 24.5, 0, Math.PI * 2);
  g.stroke();
  if (k > 0) {
    g.lineWidth = 5;
    g.strokeStyle = '#3fe6ff';
    g.shadowColor = '#3fe6ff';
    g.shadowBlur = 6;
    g.beginPath();
    g.arc(cx, cy, 24.5, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
    g.stroke();
  }
  g.restore();
  const seg = (dw - 9) / 4;
  for (let i = 0; i < 4; i++) {
    const x = dx + i * (seg + 3);
    const fill = Math.max(0, Math.min(1, k * 4 - i));
    g.fillStyle = '#0a1a33';
    g.fillRect(x - 1, dy - 1, seg + 2, 9);
    if (fill > 0) {
      g.fillStyle = '#3fd0f0';
      g.fillRect(x, dy + 1, seg * fill, 5);
    }
  }
}
function topBar(g: G, P: string, b: Bar): void {
  if (b.xp) {
    const [x, y, w, h] = b.xp;
    const need = xpNeed(profile.level);
    bar(g, x, y, w, h, profile.xp / need, ['#1a9fd0', '#3fe6ff'], { skew: 6, back: '#06122a' });
    text(g, `Lv ${profile.level}`, x + 8, y + h / 2 + 1, { size: Math.max(13, h - 4), weight: 800, col: '#ffffff', stroke: '#02060f', sw: 3 });
    text(g, `${fmt(profile.xp)} / ${fmt(need)} XP`, x + w - 6, y + h / 2 + 1, { size: Math.max(11, h - 8), weight: 700, align: 'right', col: '#dff8ff', stroke: '#02060f', sw: 3 });
  }
  if (b.rank) {
    const [x, y, w, h] = b.rank;
    label(g, P, x, y, w, h, x + w + 4, y + h / 2, cap(tierOf(profile.rp).tier), { size: 22, col: '#f4dcc4' });
  }
  if (b.streak) {
    const [x, y, w, h] = b.streak;
    label(g, P, x, y, w, h, x + w + 4, y + h / 2, `Win Streak ${profile.streak}`, { size: 20 });
  }
  if (b.coins) {
    const [x, y, w, h] = b.coins;
    label(g, P, x, y, w, h, x + w + 6, y + h / 2, fmt(profile.coins), { size: 22, col: '#ffe08a' });
  }
}

// ---------------------------------------------------------------- lobby (lobby.png)
const coinSpot = () => S(1118, 14, 180, 44, () => say(`${fmt(profile.coins)} coins. Win fights and claim the Daily Streak to earn more.`));
const settingsSpot = () => S(1310, 16, 46, 42, () => ((nav.back = nav.name), nav.go('settings')), { round: true });
const lobbySpots = (): Spot[] => [
  S(715, 269, 333, 138, go('road')),
  S(663, 445, 185, 114, go('road')),
  S(866, 445, 245, 114, go('ranked')),
  S(1136, 445, 203, 114, go('zombie')),
  S(663, 579, 185, 115, () => match('training', dummyFor(profile.hero), 'Sparring Dummy', 1, profile.hero)),
  S(866, 579, 245, 115, () => match('local', partnerOf(), 'Player 2', heroLv(partnerOf()), profile.hero)),
  S(1136, 579, 203, 115, go('roster')),
  S(1136, 114, 202, 142, () => {
    const r = dailyClaim();
    say(r.ok ? `Daily Streak day ${r.day}: +${r.coins} coins!` : `Already claimed today (day ${r.day} of 7). Come back tomorrow.`);
  }, { on: () => profile.claimed !== today() }),
  S(1136, 276, 202, 150, () => say(QUESTS().map(([n, v, goal]) => `${n} ${Math.min(v, goal)}/${goal}`).join('  ·  '), 260)),
  S(95, 610, 205, 52, go('roster')),
  S(372, 610, 205, 52, go('roster')),
  S(120, 210, 450, 360, go('roster')),
  S(304, 15, 152, 48, go('ranked')),
  S(22, 12, 80, 74, go('register'), { round: true }),
  coinSpot(),
  settingsSpot(),
];
pages.lobby = {
  title: 'Lobby',
  heroes: () => [profile.hero, partnerOf()],
  load: () => Promise.all([loadRef('lobby'), loadRef('fight-hud')]).then(() => undefined),
  enter() {
    if (!profile.registered) nav.go(profile.name ? 'starter' : 'register');
  },
  key: (e) => (e.code === 'Escape' ? nav.go('title') : undefined),
  draw(g, t) {
    const P = 'lobby';
    drawPicture(g, P);
    const lead = profile.hero;
    const mate = partnerOf();
    // the player's two heroes on the platform
    if (lead !== 'fire') veil(g, P, 205, 392, 190, 222);
    if (mate !== 'lightning') veil(g, P, 470, 380, 175, 222);
    if (mate !== 'lightning') stand(g, mate, 462, 572, 1.12, t + 40, 'fight', -1);
    if (lead !== 'fire') stand(g, lead, 222, 574, 1.18, t, 'fight', 1);
    // name plates
    label(g, P, 140, 616, 150, 30, 146, 644, `${profile.name} - Lv ${heroLv(lead)}`, { size: 22 });
    if (lead !== 'fire') elementCoin(g, lead, 116, 630, 17);
    label(g, P, 414, 615, 152, 30, 420, 642, `${NAMES[mate]} - Lv ${heroLv(mate)}`, { size: 22 });
    if (mate !== 'lightning') elementCoin(g, mate, 392, 629, 17);
    // daily quests progress
    QUESTS().forEach(([, v, goal], i) => bar(g, 1183, 332 + i * 30.5, 138, 12, v / goal, i === 0 ? ['#1a9fd0', '#3fe6ff'] : ['#a64dff', '#ff4fd8'], { back: '#0a1430' }));
    topBar(g, P, { xp: [104, 29, 170, 24], rank: [345, 27, 100, 26], streak: [958, 22, 134, 28], coins: [1168, 22, 100, 28] });
    drawSpots(g, lobbySpots());
    drawToast(g);
  },
};

// ---------------------------------------------------------------- Champion Road (champion-road-map.png)
pages.road = {
  title: 'Champion Road',
  heroes: () => [profile.hero],
  load: () => Promise.all([loadRef('champion-road-map'), loadRef('fight-hud')]).then(() => undefined),
  draw(g, t) {
    const P = 'champion-road-map';
    drawPicture(g, P);
    label(g, P, 176, 106, 186, 26, 370, 110, `${profile.road} / 41 CHAMPIONS`, { size: 21, col: '#e8f0ff' });
    bar(g, 104, 136, 322, 16, profile.road / 41, ['#c87a12', '#ffd24a'], { skew: 5, back: '#0a1430' });
    const next = champion(Math.min(40, profile.road));
    const district = Math.min(8, Math.floor(profile.road / 5) + 1);
    label(g, P, 1124, 481, 214, 28, 1124, 478, `DISTRICT ${district} - CHAMPION ${Math.min(41, profile.road + 1)}`, { size: 18, align: 'center' });
    label(g, P, 1124, 543, 214, 26, 1124, 540, profile.road >= 41 ? 'Road complete!' : `Next: ${NAMES[next]} - Lv ${champLv(profile.road)}`, { size: 19, align: 'center', col: '#ffd24a' });
    label(g, P, 1124, 512, 214, 27, 1124, 509, `Active: ${NAMES[profile.hero]} - Lv ${heroLv(profile.hero)}`, { size: 18, align: 'center', col: '#ffe9a8' });
    label(g, P, 200, 582, 116, 22, 320, 580, `${district - 1}/8 Complete`, { size: 17, col: '#e8f0ff' });
    // the player's hero on the NEXT stop
    if (profile.hero !== 'fire') {
      veil(g, P, 704, 566, 44, 50);
      stand(g, profile.hero, 704, 600, 0.2, t, 'idle');
    }
    topBar(g, P, { rank: [808, 24, 86, 26], streak: [958, 22, 134, 28], coins: [1168, 22, 100, 28] });
    drawSpots(g, [S(24, 14, 62, 62, go('lobby')), S(1117, 650, 232, 100, roadBattle), S(668, 520, 78, 115, roadBattle, { round: true }), S(762, 14, 140, 42, go('ranked')), ...topRight()]);
    drawToast(g);
  },
};

// ---------------------------------------------------------------- Rank Ladder (rank-ladder.png)
pages.ranked = {
  title: 'Rank Ladder',
  load: () => loadRef('rank-ladder').then(() => undefined),
  draw(g) {
    drawPicture(g, 'rank-ladder');
    drawSpots(g, [S(841, 636, 338, 92, rankedBattle), S(22, 12, 80, 74, go('lobby'), { round: true }), ...topRight()]);
    drawToast(g);
  },
};

// ---------------------------------------------------------------- Versus (versus-screen.png), then the fight starts
let vsT = 0;
pages.versus = {
  title: 'Versus',
  heroes: () => [nav.match.p1, nav.match.p2, partnerOf()],
  load: () => Promise.all([loadRef('versus-screen'), loadRef('fight-hud')]).then(() => undefined),
  enter: () => (vsT = 0),
  step() {
    if (++vsT > 210) nav.go('fight');
  },
  draw(g, t) {
    const P = 'versus-screen';
    const m = nav.match;
    const local = m.mode === 'local';
    drawPicture(g, P);
    if (m.p1 !== 'fire') {
      veil(g, P, 290, 300, 250, 270);
      stand(g, m.p1, 300, 552, 1.3, t, 'fight', 1);
    }
    if (m.p2 !== 'water') {
      veil(g, P, 1110, 290, 270, 280);
      stand(g, m.p2, 1080, 552, 1.3, t + 30, 'fight', -1);
    }
    // left plate: the player
    label(g, P, 160, 568, 268, 48, 160, 566, local ? 'PLAYER 1' : profile.name.toUpperCase(), { size: 44, align: 'center', weight: 800, col: '#ffc93a' });
    label(g, P, 184, 624, 120, 24, 180, 624, m.p1.toUpperCase(), { size: 20, col: '#ff9a3a' });
    label(g, P, 324, 624, 76, 24, 404, 624, `Lv ${heroLv(m.p1)}`, { size: 20, align: 'right', col: '#ffd8b0' });
    if (m.p1 !== 'fire') elementCoin(g, m.p1, 118, 606, 34);
    // right plate: the opponent
    label(g, P, 960, 568, 248, 48, 956, 566, local ? 'PLAYER 2' : m.p2Name.toUpperCase(), { size: 44, align: 'center', weight: 800, col: '#bff4ff' });
    label(g, P, 982, 624, 120, 24, 976, 624, m.p2.toUpperCase(), { size: 20, col: '#5fdcff' });
    label(g, P, 1122, 624, 76, 24, 1202, 624, `Lv ${m.p2Lv}`, { size: 20, align: 'right', col: '#cfeeff' });
    if (m.p2 !== 'water') elementCoin(g, m.p2, 1258, 606, 34);
    // partner chip under the player
    const mate = local ? m.p2 : partnerOf();
    label(g, P, 212, 696, 82, 26, 300, 690, NAMES[mate], { size: 20 });
    if (mate !== 'lightning') elementCoin(g, mate, 175, 708, 19);
    const left = Math.max(0, Math.ceil((210 - vsT) / 60));
    text(g, `FIGHT IN ${left}  ·  TAP TO START`, W / 2, 742, { size: 20, align: 'center', col: '#eaf6ff', stroke: '#02060f', sw: 4 });
    drawSpots(g, [S(0, 0, W, H, go('fight'))]);
  },
};
