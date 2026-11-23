/**
 * The player's way in, on the owner's pictures from gemini/extra/ (nothing redesigned):
 *   title (logo-wordmark) -> register (logo-wordmark: type a name) -> starter (hero-roster: pick the one starting
 *   hero) -> tutorial fight with that hero (play.ts) -> partner (hero-roster: pick a second hero) -> lobby.
 * The lobby, roster, Champion Road, Rank Ladder and Versus pictures get the player's live values painted over them
 * in the picture's own colours: name, levels, rank, coins, streak, quests, and the player's own two heroes (drawn
 * with the hero rig, over a soft blur of the painted hero when the picture shows a different one).
 */
import { elementCoin } from './art';
import { fmt } from './common';
import { kitOf, CLASSES, NAMES, drawHero, heroShadow, stillPose, type Still } from './heroes';
import { patch } from './hudref';
import { nav, pages, type Match } from './nav';
import { S, drawPicture, drawSpots, drawToast, go, loadRef, ref, say, topRight, type Spot } from './refs';
import { ELS, QUESTS, dailyClaim, profile, save, tierOf, today, xpNeed, type El } from './save';
import { goldButton, neon } from './ui';
import { C, H, W, bar, chamfer, text, type G } from './ui';

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
const CARDS: Array<[number, number, El]> = [
  [52, 103, 'fire'], [191, 103, 'water'], [331, 103, 'lightning'], [469, 103, 'ice'],
  [52, 298, 'earth'], [191, 298, 'wind'], [331, 298, 'leaf'], [469, 298, 'light'],
  [52, 491, 'light'], [191, 491, 'gravity'], [331, 491, 'time'],
];
/** per-element stat lines for the stats panel: vitality, might, spirit, guard, resolve, speed */
const STATS: Record<El, number[]> = {
  fire: [84, 92, 70, 65, 78, 88], water: [86, 72, 90, 80, 84, 74], ice: [80, 76, 82, 92, 80, 64], lightning: [70, 84, 80, 62, 72, 96],
  wind: [72, 74, 78, 64, 76, 98], earth: [96, 90, 62, 94, 88, 56], leaf: [88, 68, 86, 78, 90, 72], light: [74, 80, 92, 70, 82, 86],
  gravity: [90, 88, 84, 82, 86, 60], time: [76, 78, 94, 74, 92, 80],
};
let pick: El = 'fire';
const partnerMode = () => nav.name === 'partner';
const starterMode = () => nav.name === 'starter';
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
  if (pick === profile.hero) return say(`${NAMES[pick]} already leads your squad`);
  const old = profile.hero;
  profile.hero = pick;
  if (profile.partner === pick) profile.partner = old;
  profile.squad = [profile.hero, partnerOf()];
  save();
  say(`${NAMES[pick]} now leads your squad`);
}
function addPartner(): void {
  if (starterMode()) return say('Pick your first hero, then press SELECT');
  if (pick === profile.hero) return say(`${NAMES[pick]} is your leader. Pick another hero as partner.`);
  if (partnerMode()) return choose();
  profile.partner = pick;
  profile.squad = [profile.hero, pick];
  save();
  say(`${NAMES[pick]} joined your squad as partner`);
}
const rosterSpots = (): Spot[] => [
  S(28, 18, 125, 42, () => (starterMode() ? nav.go('register') : partnerMode() && !profile.partner ? say('Pick a partner first, then press SELECT') : nav.go('lobby'))),
  ...CARDS.map(([x, y, el], i) =>
    S(x, y, 126, 178, () => ((pick = el), say(`${NAMES[el]} · ${cap(el)} · ${CLASSES[el]}`)), {
      on: () => pick === el && CARDS.findIndex((c) => c[2] === el) === i,
      off: () => partnerMode() && el === profile.hero,
    }),
  ),
  S(686, 655, 210, 72, choose),
  S(1229, 617, 100, 102, addPartner),
  ...(['Vanguard', 'Striker', 'Warden'] as const).map((c, i) => S(1009 + i * 99, 210, 92, 36, () => say(`${c}: ${ELS.filter((e) => CLASSES[e] === c).map((e) => NAMES[e]).join(', ')}`), { on: () => CLASSES[pick] === c })),
  ...topRight(),
];
function rosterDraw(g: G, t: number): void {
  const P = 'hero-roster';
  drawPicture(g, P);
  // level on every card
  for (const [x, y, el] of CARDS) label(g, P, x + 58, y + 140, 62, 28, x + 54, y + 150, `Lv ${heroLv(el)}`, { size: 22, align: 'right' });
  // the picked hero on the stage
  if (pick !== 'fire') {
    veil(g, P, 790, 300, 210, 236);
    stand(g, pick, 790, 492, 0.98, t);
  }
  // name, class and stats
  label(g, P, 1010, 124, 300, 42, 1320, 150, NAMES[pick].toUpperCase(), { size: 40, weight: 800, col: '#dff4ff' });
  patch(g, P, 1010, 168, 300, 26, 1320, 180);
  text(g, 'CLASS:', 1013, 181, { size: 21, col: '#dff4ff' });
  text(g, CLASSES[pick].toUpperCase(), 1093, 181, { size: 21, col: '#ffc93a' });
  STATS[pick].forEach((v, i) => {
    const y = 287 + i * 47.2;
    bar(g, 1056, y, 218, 12, v / 100, ['#ff8a1a', '#ffd24a'], { back: '#0a1430' });
    label(g, P, 1282, y - 22, 40, 30, 1330, y - 6, String(v), { size: 24, align: 'right' });
  });
  // the three powers under the stage
  const k = kitOf(pick);
  if (pick !== 'fire') for (const x of [692, 789, 886]) elementCoin(g, pick, x, 590, 33);
  patch(g, P, 640, 606, 300, 34, 650, 645);
  k.powers.forEach((p, i) => text(g, p.name, [692, 789, 886][i], 618, { size: 14, align: 'center', max: 96 }));
  // squad: leader and partner
  const slot = (x: number, el: El | null, sub: string) => {
    patch(g, P, x + 6, 622, 90, 90, x + 8, 626);
    if (el) {
      stand(g, el, x + 51, 700, 0.27, t, 'idle');
      text(g, sub, x + 51, 704, { size: 15, align: 'center', col: '#eaf6ff', stroke: '#02060f', sw: 3, max: 88 });
    } else text(g, '?', x + 51, 666, { size: 40, align: 'center', col: '#6a8ab0' });
  };
  const lead = starterMode() ? pick : profile.hero;
  slot(995, lead, `Lv ${heroLv(lead)}`);
  slot(1110, starterMode() ? null : profile.partner, profile.partner ? NAMES[profile.partner] : '');
  // top bar
  topBar(g, P, { xp: [804, 28, 136, 18], rank: [1012, 25, 88, 26], coins: [1168, 22, 100, 28] });
  if (starterMode()) text(g, 'STEP 2 OF 3 · PICK YOUR FIRST HERO, THEN SELECT', 172, 82, { size: 17, weight: 800, col: '#ffd24a', stroke: '#02060f', sw: 4, spacing: 1 });
  if (partnerMode()) text(g, 'STEP 3 OF 3 · PICK A PARTNER, THEN SELECT', 172, 82, { size: 17, weight: 800, col: '#ffd24a', stroke: '#02060f', sw: 4, spacing: 1 });
  drawSpots(g, rosterSpots());
  drawToast(g, 104);
}
const rosterPage = (title: string) => ({
  title,
  heroes: () => ELS,
  load: () => Promise.all([loadRef('hero-roster'), loadRef('fight-hud')]).then(() => undefined),
  enter() {
    pick = nav.name === 'partner' ? (profile.partner ?? (profile.hero === 'water' ? 'lightning' : 'water')) : profile.hero;
    if (nav.name === 'starter') say(`Hi ${profile.name}! Pick the one hero you start with`, 300);
    if (nav.name === 'partner') say(`Tutorial done! Pick a partner hero to fight beside ${NAMES[profile.hero]}`, 300);
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
function topBar(g: G, P: string, b: Bar): void {
  if (b.xp) {
    const [x, y, w, h] = b.xp;
    bar(g, x, y, w, h, profile.xp / xpNeed(profile.level), ['#1a9fd0', '#3fe6ff'], { skew: 6, back: '#06122a' });
    text(g, `Lv ${profile.level}`, x + 8, y + h / 2 + 1, { size: Math.max(13, h - 4), weight: 800, col: '#ffffff', stroke: '#02060f', sw: 3 });
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
