/**
 * Menu screens part 2: cosmetic shop, rank ladder, versus intro, victory, level up, the icons sheet, the two key
 * art pieces and the zombie line-up. Matched to gemini/extra/, drawn in code. Coins are earned in play only.
 */
import { EL, bolt, capeIcon, check, chest, coin, comet, confetti, elementCoin, elementIcon, embers, flame, glyph, lock, rain, rankBadge, swirlIcon, trailIcon, visorIcon, xpStar, city, spotlight, podium } from './art';
import { backdrop, cap, dim, fmt, heroStand, logo, topBar } from './common';
import { NAMES, drawHero, stillPose } from './heroes';
import { nav, pages } from './nav';
import { ELS, TIERS, profile, save, tierOf, xpNeed, type El } from './save';
import { C, H, W, bar, chamfer, cyanButton, glowDot, goldButton, goldGrad, hexPath, neon, panel, pill, region, rng, text, type G } from './ui';
import { ZSPEC, drawZombie, type ZType } from './zombies';

// ---------------------------------------------------------------- shop
interface Item {
  id: string;
  tab: number;
  price: number;
  col: string;
  v: number;
  isNew?: boolean;
}
const SHOP: Item[] = [];
const TAB_COLS = [C.cyan, C.pink, '#ffb43a', '#3fb8ff'];
for (let tab = 0; tab < 4; tab++) {
  for (let i = 0; i < 12; i++) {
    const cols = [C.cyan, '#ff4fd8', '#ff5a3a', '#7ad8ff', '#b45cff', '#ff9a3a', '#5dff7a', '#ffd24a'];
    SHOP.push({ id: `${['visor', 'cape', 'aura', 'trail'][tab]}:${i}`, tab, price: [500, 1200, 3000][Math.floor(i / 4)] ?? 500, col: cols[(i + tab) % cols.length], v: i % 4, isNew: i % 5 === 0 });
  }
}
let shopTab = 1;
let shopSel = '';
let tryOn = true;
let equipAfter = true;
let shopMsg = '';
let shopMsgT = 0;
function shopIcon(g: G, it: Item, x: number, y: number, s: number, t: number): void {
  if (it.tab === 0) visorIcon(g, x, y, s, it.col, it.v);
  else if (it.tab === 1) capeIcon(g, x, y, s, it.col, '#200a20');
  else if (it.tab === 2) swirlIcon(g, x, y, s * 0.9, it.col, t);
  else if (it.v % 2) trailIcon(g, x, y, s, it.col);
  else comet(g, x, y, s * 0.6, [it.col, '#ffffff', '#ffffff']);
}
pages.shop = {
  title: 'Cosmetic Shop',
  heroes: () => [profile.hero],
  draw(g, t) {
    backdrop(g);
    topBar(g, { back: 'lobby', title: undefined });
    panel(g, 34, 92, 460, 640, { col: C.cyan, cut: 14 });
    text(g, 'COSMETIC SHOP', 264, 140, { size: 40, align: 'center', weight: 800, glow: C.cyan, blur: 8 });
    ['VISORS', 'CAPES', 'AURAS', 'TRAILS'].forEach((n, i) => {
      cyanButton(g, 50 + i * 108, 176, 100, 40, n, { size: 19, on: shopTab === i, col: TAB_COLS[i], act: () => (shopTab = i) });
    });
    const items = SHOP.filter((s) => s.tab === shopTab);
    items.slice(0, 12).forEach((it, i) => {
      const bx = 56 + (i % 4) * 106;
      const by = 232 + Math.floor(i / 4) * 160;
      const owned = profile.owned.includes(it.id);
      const eq = Object.values(profile.equipped).includes(it.id);
      const sel = shopSel === it.id;
      chamfer(g, bx, by, 96, 146, 8);
      g.fillStyle = 'rgba(10,26,54,0.92)';
      g.fill();
      neon(g, sel ? '#ffd24a' : it.price >= 3000 ? '#ffb43a' : it.price >= 1200 ? C.purple : C.cyan, sel ? 3.5 : 1.6, sel ? 20 : 8);
      shopIcon(g, it, bx + 48, by + 62, 34, t);
      if (it.isNew) {
        chamfer(g, bx + 50, by - 6, 50, 22, 5);
        g.fillStyle = '#d8202a';
        g.fill();
        text(g, 'NEW', bx + 75, by + 5, { size: 14, align: 'center', weight: 800 });
      }
      if (eq) text(g, 'EQUIPPED', bx + 48, by + 108, { size: 15, align: 'center', col: '#5dff7a' });
      else if (owned) text(g, 'OWNED', bx + 48, by + 108, { size: 15, align: 'center', col: '#9fe0ff' });
      coin(g, bx + 22, by + 130, 9);
      text(g, String(it.price), bx + 58, by + 131, { size: 18, align: 'center' });
      region(bx, by, 96, 146, () => (shopSel = it.id));
    });
    // scroll bar
    g.fillStyle = 'rgba(63,214,255,0.25)';
    g.fillRect(478, 232, 5, 470);
    g.fillStyle = C.cyan;
    g.fillRect(478, 232, 5, 120);
    // preview
    const it = SHOP.find((s) => s.id === shopSel);
    const col = tryOn && it ? it.col : EL[profile.hero].line;
    heroStand(g, profile.hero, 960, 455, 0.95, 'fight', t, { podiumW: 175, aura: tryOn && it?.tab === 2 ? 0.9 : 0.45, col });
    if (tryOn && it) {
      if (it.tab === 3) trailIcon(g, 860, 300, 70, it.col);
      if (it.tab === 1) {
        g.save();
        g.globalAlpha = 0.6;
        capeIcon(g, 935, 330, 80, it.col, '#200a20');
        g.restore();
      }
      if (it.tab === 0) visorIcon(g, 975, 205, 30, it.col, it.v);
    }
    bolt(g, 900, 180, 880, 360, Math.floor(t / 4), '#fffbd0', 2);
    bolt(g, 1040, 200, 1060, 380, Math.floor(t / 4) + 9, '#fffbd0', 2);
    const owned = it ? profile.owned.includes(it.id) : false;
    goldButton(g, 838, 588, 250, 150, owned ? 'EQUIP' : 'BUY', { size: 72, t, act: () => buy() });
    if (it && !owned) {
      check(g, 880, 700, 10, equipAfter ? '#5dff7a' : '#556');
      text(g, 'Equip', 898, 701, { size: 22, col: '#5a3200' });
      coin(g, 975, 700, 12);
      text(g, String(it.price), 994, 701, { size: 24, col: '#5a3200' });
      region(860, 685, 80, 32, () => (equipAfter = !equipAfter));
    } else if (!it) text(g, 'Pick an item', 963, 704, { size: 20, col: '#5a3200', align: 'center' });
    text(g, 'TRY ON', 1180, 680, { size: 20 });
    g.save();
    g.beginPath();
    g.roundRect(1258, 662, 64, 34, 17);
    g.fillStyle = tryOn ? '#1a6aa0' : '#2a2a3a';
    g.fill();
    neon(g, C.cyan, 1.5, 6);
    g.beginPath();
    g.arc(tryOn ? 1305 : 1275, 679, 13, 0, Math.PI * 2);
    g.fillStyle = tryOn ? C.cyan : '#888';
    g.fill();
    g.restore();
    region(1250, 655, 80, 48, () => (tryOn = !tryOn));
    if (shopMsgT > 0) {
      shopMsgT--;
      text(g, shopMsg, 963, 560, { size: 26, align: 'center', col: '#ffe08a', glow: '#000', blur: 6 });
    }
  },
};
function buy(): void {
  const it = SHOP.find((s) => s.id === shopSel);
  if (!it) return;
  const slot = ['visor', 'cape', 'aura', 'trail'][it.tab];
  if (!profile.owned.includes(it.id)) {
    if (profile.coins < it.price) {
      shopMsg = 'Not enough coins. Win fights to earn more.';
      shopMsgT = 120;
      return;
    }
    profile.coins -= it.price;
    profile.owned.push(it.id);
    shopMsg = 'Bought!';
    shopMsgT = 90;
    if (equipAfter) profile.equipped[slot] = it.id;
  } else {
    profile.equipped[slot] = it.id;
    shopMsg = 'Equipped';
    shopMsgT = 60;
  }
  save();
}

// ---------------------------------------------------------------- rank ladder
const BOARD: Array<[string, El]> = [['Nova_01', 'fire'], ['VoidX', 'water'], ['Chrono', 'lightning'], ['', 'fire'], ['Shadow_AI', 'gravity'], ['Glitch', 'wind'], ['Vortex', 'water'], ['Catalyst', 'fire'], ['Ember', 'fire'], ['Quill', 'leaf']];
pages.ranked = {
  title: 'Rank Ladder',
  heroes: () => [profile.hero],
  draw(g, t) {
    backdrop(g);
    topBar(g, { back: 'lobby' });
    podium(g, 230, 560, 170, '#3fb8ff', t);
    // vertical title
    g.save();
    g.translate(56, 330);
    g.rotate(-Math.PI / 2);
    text(g, 'RANK LADDER', 0, 0, { size: 46, align: 'center', weight: 800, glow: C.cyan, blur: 10, col: '#dff8ff' });
    g.restore();
    chamfer(g, 92, 110, 6, 600, 0);
    // ladder
    const tr = tierOf(profile.rp);
    const cur = TIERS.indexOf(tr.tier);
    g.save();
    const lg = g.createLinearGradient(0, 120, 0, 720);
    lg.addColorStop(0, '#ff9a5a');
    lg.addColorStop(0.4, '#ffd24a');
    lg.addColorStop(0.6, '#3fe6ff');
    lg.addColorStop(1, '#ff4fd8');
    g.strokeStyle = lg;
    g.lineWidth = 10;
    g.shadowColor = '#3fe6ff';
    g.shadowBlur = 16;
    g.beginPath();
    g.moveTo(326, 120);
    g.lineTo(326, 720);
    g.stroke();
    g.restore();
    TIERS.forEach((tier, i) => {
      const y = 148 + i * 110;
      const isCur = i === cur;
      const x = i >= 3 ? 268 : 326;
      rankBadge(g, tier, x, y, isCur ? 46 : 34, true);
      if (isCur) {
        for (let k = 0; k < 3; k++) bolt(g, x + 40, y - 20 + k * 14, x + 90 + k * 30, y - 30 + k * 20, Math.floor(t / 5) + k, '#fff3a0', 2);
      }
      const lx = 380;
      chamfer(g, lx, y - 22, isCur ? 180 : 150, 44, [0, 10, 0, 10]);
      g.fillStyle = isCur ? 'rgba(90,60,10,0.85)' : 'rgba(10,20,44,0.85)';
      g.fill();
      neon(g, isCur ? '#ffd24a' : i === 0 ? '#ff9a5a' : C.cyan, isCur ? 2.5 : 1.5, isCur ? 16 : 8);
      text(g, isCur ? `${tier.toUpperCase()} - ${['I', 'II', 'III'][tr.div - 1]}` : tier.toUpperCase(), lx + 20, y + 1, { size: 24, col: isCur ? '#ffe9a0' : '#ffd2b0' });
      if (isCur) {
        text(g, `Rating: ${profile.rp} RP`, 150, y - 14, { size: 18, align: 'left' });
        bar(g, 145, y + 4, 125, 10, ((profile.rp - 750) % 100) / 100, ['#a03ad0', '#ff4fd8'], {});
      }
    });
    // leaderboard
    chamfer(g, 858, 88, 330, 40, [16, 16, 0, 0]);
    g.fillStyle = 'rgba(8,20,44,0.92)';
    g.fill();
    neon(g, C.cyan, 1.5, 8);
    text(g, 'Season Ends: 14d 05h 22m', 1023, 109, { size: 19, align: 'center', col: '#cfe8ff' });
    panel(g, 680, 128, 660, 615, { col: C.cyan, cut: 16, brackets: true });
    text(g, 'SEASON 4 LEADERBOARD', 1010, 162, { size: 32, align: 'center', weight: 800 });
    const rows = BOARD.map(([n, el], i) => ({ name: n || profile.name, el: n ? el : profile.hero, rp: n ? 2150 - i * 10 - (i ? 160 : 0) : profile.rp + 500, me: !n }));
    rows.sort((a, b) => b.rp - a.rp);
    rows.slice(0, 8).forEach((r, i) => {
      const y = 190 + i * 54;
      chamfer(g, 712, y, 572, 44, 8);
      g.fillStyle = r.me ? 'rgba(90,60,10,0.85)' : 'rgba(10,30,60,0.85)';
      g.fill();
      neon(g, r.me ? '#ffd24a' : C.cyan, r.me ? 2.5 : 1.2, r.me ? 16 : 6);
      text(g, `#${i + 1}`, 732, y + 23, { size: 24, col: i < 3 ? ['#ffd24a', '#dfe8ff', '#ff9a5a'][i] : '#dff8ff' });
      text(g, r.name, 820, y + 23, { size: 24, col: r.me ? '#ffd24a' : '#ffffff' });
      glyph(g, r.el, 1100, y + 22, 13);
      text(g, `${r.rp} RP`, 1266, y + 23, { size: 24, align: 'right', col: r.me ? '#ffd24a' : '#ffffff' });
    });
    g.fillStyle = 'rgba(63,214,255,0.3)';
    g.fillRect(1300, 190, 5, 420);
    g.fillStyle = C.cyan;
    g.fillRect(1300, 190, 5, 140);
    goldButton(g, 842, 640, 330, 86, 'FIND MATCH', { size: 46, t, act: () => {
      const r = rng(Math.floor(t));
      const el = ELS[Math.floor(r() * ELS.length)];
      const names = ['Nova_01', 'VoidX', 'Chrono', 'Glitch', 'Vortex', 'Catalyst', 'Shadow_AI'];
      nav.match = { p1: profile.hero, p2: el, p2Name: names[Math.floor(r() * names.length)], p2Lv: 18 + Math.floor(r() * 10), mode: 'ranked' };
      nav.go('versus');
    } });
    for (const [x, d] of [[770, 1], [1240, -1]] as const) {
      for (let k = 0; k < 3; k++) {
        g.save();
        g.translate(x + k * 18 * d, 683);
        g.scale(d, 1);
        g.strokeStyle = '#ffb43a';
        g.lineWidth = 6;
        g.shadowColor = '#ffb43a';
        g.shadowBlur = 10;
        g.globalAlpha = 0.4 + 0.6 * ((Math.floor(t / 8) + k) % 3 === 0 ? 1 : 0.4);
        g.beginPath();
        g.moveTo(-6, -14);
        g.lineTo(6, 0);
        g.lineTo(-6, 14);
        g.stroke();
        g.restore();
      }
    }
  },
};

// ---------------------------------------------------------------- versus
let vsT = 0;
pages.versus = {
  title: 'Versus',
  heroes: () => [nav.match.p1, nav.match.p2],
  enter() {
    vsT = 0;
  },
  step() {
    vsT++;
  },
  draw(g, t) {
    const m = nav.match;
    const a = EL[m.p1];
    const b = EL[m.p2];
    // halves
    g.save();
    g.fillStyle = a.deep;
    g.fillRect(0, 0, W, H);
    const lg = g.createRadialGradient(330, 380, 0, 330, 380, 700);
    lg.addColorStop(0, a.line + 'aa');
    lg.addColorStop(1, '#0a0408');
    g.fillStyle = lg;
    g.fillRect(0, 0, W, H);
    g.beginPath();
    g.moveTo(760, 0);
    g.lineTo(W, 0);
    g.lineTo(W, H);
    g.lineTo(560, H);
    g.closePath();
    g.save();
    g.clip();
    const rg = g.createRadialGradient(1050, 380, 0, 1050, 380, 700);
    rg.addColorStop(0, b.line + 'aa');
    rg.addColorStop(1, '#030a10');
    g.fillStyle = rg;
    g.fillRect(0, 0, W, H);
    rain(g, t, 120, 0.35);
    // room lines
    g.strokeStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 12; i++) g.strokeRect(700 + i * 60, 480, 60, 40);
    g.restore();
    g.restore();
    embers(g, t, 0, 0, 700, H, a.light, 60, 2, 4);
    // split glow
    g.save();
    g.strokeStyle = '#ffffff';
    g.lineWidth = 6;
    g.shadowColor = b.line;
    g.shadowBlur = 30;
    g.beginPath();
    g.moveTo(760, 0);
    g.lineTo(560, H);
    g.stroke();
    g.restore();
    const slide = Math.min(1, vsT / 25);
    const e = 1 - Math.pow(1 - slide, 3);
    const pa = stillPose(m.p1, 'fight', t);
    const pb = stillPose(m.p2, 'lunge', t);
    drawHero(g, m.p1, { pose: pa.pose, face: 'attack', x: -200 + 520 * e, feet: 640, scale: 1.35, facing: 1, t, aura: 0.6 });
    drawHero(g, m.p2, { pose: pb.pose, face: 'attack', x: W + 200 - 520 * e, feet: 640, scale: 1.35, facing: -1, t, aura: 0.6 });
    // VS
    const vs = Math.min(1, Math.max(0, (vsT - 15) / 15));
    g.save();
    g.translate(660, 320);
    g.scale(0.6 + vs * 0.4 + (vs < 1 ? 0.4 * (1 - vs) : 0), 0.6 + vs * 0.4 + (vs < 1 ? 0.4 * (1 - vs) : 0));
    g.globalAlpha = vs;
    g.font = `italic 900 190px Bahnschrift, 'Arial Black', sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.strokeStyle = '#1a1a2a';
    g.lineWidth = 18;
    g.strokeText('VS', 0, 0);
    const vg = g.createLinearGradient(-120, -80, 120, 80);
    vg.addColorStop(0, '#fff2c0');
    vg.addColorStop(0.45, '#c8b8a0');
    vg.addColorStop(0.55, '#9ad8ff');
    vg.addColorStop(1, '#e0f8ff');
    g.fillStyle = vg;
    g.shadowColor = '#ffffff';
    g.shadowBlur = 30;
    g.fillText('VS', 0, 0);
    g.restore();
    // plates
    const plate = (x: number, el: El, name: string, lv: number, mate: El) => {
      const col = EL[el].line;
      panel(g, x, 555, 420, 115, { col, cut: 14, fill: 'rgba(10,8,20,0.82)' });
      g.save();
      g.beginPath();
      g.arc(x + 62, 612, 40, 0, Math.PI * 2);
      g.fillStyle = EL[el].deep;
      g.fill();
      neon(g, col, 2.5, 14);
      g.restore();
      glyph(g, el, x + 62, 612, 24);
      text(g, name.toUpperCase(), x + 260, 594, { size: 50, align: 'center', weight: 800, col: el === 'fire' ? '#ffe08a' : '#e0faff', glow: col });
      text(g, EL[el].name.toUpperCase(), x + 130, 640, { size: 22, col });
      text(g, `Lv ${lv}`, x + 390, 640, { size: 22, align: 'right' });
      pill(g, x + 70, 692, 160, 40, col);
      elementCoin(g, mate, x + 96, 712, 16);
      text(g, NAMES[mate], x + 120, 713, { size: 20 });
    };
    plate(50, m.p1, m.mode === 'local' ? 'Player 1' : profile.name, profile.heroLv[m.p1], profile.squad[1] ?? 'lightning');
    plate(906, m.p2, m.p2Name, m.p2Lv, m.p2 === 'light' ? 'gravity' : 'light');
    if (vsT > 40) text(g, m.mode === 'local' ? 'P1: A D W S  J K L  U I O P      P2: arrows  Numpad 1 2 3  4 5 6  0' : 'Click to fight', W / 2, 30, { size: 20, align: 'center', col: '#ffffff' });
    if (vsT > 210) nav.go('fight');
    region(0, 0, W, H, () => nav.go('fight'));
  },
};

// ---------------------------------------------------------------- victory
let vicT = 0;
pages.victory = {
  title: 'Victory',
  heroes: () => [nav.match.p1, nav.match.p2],
  enter() {
    vicT = 0;
  },
  step() {
    vicT++;
  },
  draw(g, t) {
    const r = nav.result ?? { winner: 1, mode: 'quick', xp: 1500, coins: 500, levelUp: true };
    const won = r.winner === 1 || r.mode === 'local';
    const el = r.mode === 'local' && r.winner === 2 ? nav.match.p2 : nav.match.p1;
    backdrop(g);
    heroStand(g, el, 330, 520, 1.0, won ? 'victory' : 'idle', t, { podiumW: 230, aura: won ? 0.6 : 0.1 });
    if (won) confetti(g, t, 60);
    topBar(g);
    // banner
    const title = r.mode === 'local' ? `PLAYER ${r.winner} WINS!` : won ? 'VICTORY!' : 'DEFEAT';
    g.save();
    const bg = g.createLinearGradient(80, 0, 620, 0);
    bg.addColorStop(0, 'rgba(255,140,40,0)');
    bg.addColorStop(0.5, won ? 'rgba(255,140,40,0.55)' : 'rgba(120,30,60,0.6)');
    bg.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = bg;
    g.fillRect(60, 100, 600, 110);
    g.restore();
    const sc = Math.min(1, vicT / 14);
    g.save();
    g.translate(390, 155);
    g.scale(1.6 - sc * 0.6, 1.6 - sc * 0.6);
    text(g, title, 0, 0, { size: 82, align: 'center', weight: 900, col: won ? goldGrad(g, -40, 40) : '#ff8aa0', stroke: '#4a1a00', sw: 8, glow: won ? '#ffb43a' : '#ff3b6a', blur: 24 });
    g.restore();
    pill(g, 240, 640, 230, 46, EL[el].line, 'rgba(30,14,8,0.85)');
    elementCoin(g, el, 268, 663, 18);
    text(g, `${el === nav.match.p1 ? profile.name : nav.match.p2Name} - Lv ${profile.heroLv[el]}`, 294, 664, { size: 22 });
    // rewards panel
    panel(g, 750, 172, 590, 410, { col: '#ffb43a', cut: 16, brackets: true });
    const xpK = Math.min(1, vicT / 60);
    text(g, 'XP GAINED', 795, 222, { size: 26 });
    text(g, `+${Math.round(r.xp * xpK)} XP`, 1175, 222, { size: 26, align: 'right' });
    text(g, 'XP', 795, 264, { size: 34, weight: 800 });
    bar(g, 852, 248, 324, 32, Math.min(1, (profile.xp / xpNeed(profile.level)) * xpK + (r.levelUp ? 0 : 0)), ['#ff6a1a', '#ffb43a'], { edge: '#ffb43a', skew: 6 });
    if (r.levelUp) {
      text(g, 'LEVEL', 1255, 225, { size: 32, align: 'center', weight: 900, col: goldGrad(g, 205, 245), stroke: '#4a1a00', sw: 4 });
      text(g, 'UP!', 1255, 262, { size: 32, align: 'center', weight: 900, col: goldGrad(g, 245, 280), stroke: '#4a1a00', sw: 4 });
      region(1200, 200, 120, 80, () => nav.go('levelup'));
    }
    chamfer(g, 782, 330, 520, 64, 10);
    g.fillStyle = 'rgba(10,40,70,0.75)';
    g.fill();
    neon(g, C.cyan, 1.5, 8);
    text(g, 'COIN REWARDS', 800, 362, { size: 26 });
    text(g, `+${Math.round(r.coins * xpK)}`, 1170, 362, { size: 36, align: 'right', weight: 800 });
    coin(g, 1230, 362, 30);
    text(g, r.score !== undefined ? `Score ${fmt(r.score)} · wave ${r.wave}` : r.rp !== undefined ? `Rank ${r.rp >= 0 ? '+' : ''}${r.rp} RP` : 'Rewards', 795, 432, { size: 24 });
    const icons: Array<(x: number, y: number) => void> = [
      (x, y) => chest(g, x, y + 6, 26),
      (x, y) => elementCoin(g, el, x, y, 28),
      (x, y) => elementCoin(g, 'lightning', x, y, 28),
      (x, y) => xpStar(g, x, y, 26),
    ];
    icons.forEach((f, i) => {
      const bx = 792 + i * 102;
      chamfer(g, bx, 456, 84, 84, 8);
      g.fillStyle = 'rgba(10,26,54,0.9)';
      g.fill();
      neon(g, [C.cyan, '#ffb43a', C.pink, C.cyan][i], 1.6, 10);
      f(bx + 42, 498);
    });
    goldButton(g, 752, 632, 330, 100, r.mode === 'road' && won ? 'NEXT FIGHT' : 'PLAY AGAIN', { size: 46, t, act: () => nav.go(r.score !== undefined ? 'zombie' : r.mode === 'road' ? 'road' : 'versus') });
    cyanButton(g, 1116, 632, 220, 100, 'LOBBY', { size: 46, act: () => nav.go(r.levelUp ? 'levelup' : 'lobby') });
  },
};

// ---------------------------------------------------------------- level up
pages.levelup = {
  title: 'Level Up',
  heroes: () => [profile.hero],
  draw(g, t) {
    g.drawImage(city('dark'), 0, 0);
    dim(g, 0.55);
    topBar(g, { embers: true, rank: false });
    const el = profile.hero;
    const col = EL[el];
    // portal rings
    for (let i = 0; i < 4; i++) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = i % 2 ? col.line : '#ffe9a0';
      g.lineWidth = 6 - i;
      g.shadowColor = col.line;
      g.shadowBlur = 30;
      g.globalAlpha = 0.6;
      g.beginPath();
      g.ellipse(280, 330, 200 - i * 22, 230 - i * 22, 0, t / (40 + i * 10), t / (40 + i * 10) + Math.PI * 1.7);
      g.stroke();
      g.restore();
    }
    embers(g, t, 60, 80, 460, 520, col.light, 80, 4, 4);
    heroStand(g, el, 280, 560, 0.95, 'cheer', t, { podiumW: 200, aura: 0.9, light: false });
    // badge
    g.save();
    hexPath(g, 688, 270, 170, 1.08);
    const bg = g.createLinearGradient(0, 80, 0, 460);
    bg.addColorStop(0, '#3a2a1a');
    bg.addColorStop(1, '#1a1008');
    g.fillStyle = bg;
    g.fill();
    neon(g, '#ffd24a', 5, 30);
    hexPath(g, 688, 270, 150, 1.08);
    g.strokeStyle = '#ffe9a0';
    g.lineWidth = 2;
    g.stroke();
    g.restore();
    glowDot(g, 688, 420, 200, 'rgb(255,200,80)', 0.4);
    text(g, 'LEVEL', 688, 200, { size: 92, align: 'center', weight: 900, col: goldGrad(g, 160, 240), stroke: '#4a2200', sw: 6, glow: '#ffb43a', blur: 18 });
    text(g, 'UP', 688, 320, { size: 150, align: 'center', weight: 900, col: goldGrad(g, 250, 390), stroke: '#4a2200', sw: 8, glow: '#ffb43a', blur: 18 });
    hexPath(g, 688, 485, 62, 1.0);
    g.fillStyle = '#2a2e3a';
    g.fill();
    neon(g, '#c8d0e0', 3, 10);
    text(g, 'LEVEL', 688, 462, { size: 20, align: 'center' });
    text(g, String(profile.level), 688, 500, { size: 52, align: 'center', weight: 900 });
    chamfer(g, 556, 625, 264, 70, 12);
    g.fillStyle = 'rgba(14,20,40,0.9)';
    g.fill();
    neon(g, '#ffd24a', 2.5, 14);
    text(g, 'CONTINUE  ›', 688, 661, { size: 36, align: 'center', col: '#ffe08a', weight: 800 });
    text(g, 'Tap to dismiss', 688, 722, { size: 20, align: 'center', col: '#c8d8f0', weight: 500 });
    region(556, 625, 264, 70, () => nav.go('lobby'));
    // skill
    panel(g, 1062, 115, 280, 315, { col: C.cyan, cut: 14 });
    text(g, 'NEW SKILL UNLOCKED', 1202, 145, { size: 21, align: 'center' });
    g.save();
    g.beginPath();
    g.arc(1202, 262, 62, 0, Math.PI * 2);
    g.fillStyle = col.deep;
    g.fill();
    neon(g, col.line, 3, 26);
    g.restore();
    embers(g, t, 1130, 190, 150, 150, col.light, 20, 7, 3);
    comet(g, 1202, 262, 44, [col.line, col.light, '#ffffff']);
    const skill = ['Inferno Burst', 'Tidal Burst', 'Frost Nova', 'Storm Burst', 'Cyclone Burst', 'Quake Burst', 'Bloom Burst', 'Solar Burst', 'Void Burst', 'Chrono Burst'][ELS.indexOf(el)];
    text(g, skill.toUpperCase(), 1202, 385, { size: 26, align: 'center', weight: 800 });
    panel(g, 1062, 455, 280, 265, { col: C.cyan, cut: 14 });
    text(g, 'STAT INCREASE', 1202, 482, { size: 22, align: 'center' });
    const rows: Array<[string, number, string, number]> = [['ATTACK', 15, '#ffb43a', 0.75], ['HEALTH', 40, '#3fe6ff', 0.6], ['ENERGY', 10, '#3fe6ff', 0.35]];
    rows.forEach(([n, v, c, f], i) => {
      const y = 520 + i * 58;
      glyph(g, (['fire', 'leaf', 'lightning'] as El[])[i], 1085, y + 6, 10);
      text(g, n, 1102, y, { size: 20 });
      text(g, `+${v}`, 1285, y, { size: 20, align: 'right' });
      bar(g, 1102, y + 16, 190, 12, f, [c, c], {});
      g.save();
      g.fillStyle = '#5dff7a';
      g.shadowColor = '#5dff7a';
      g.shadowBlur = 10;
      g.beginPath();
      g.moveTo(1315, y - 6);
      g.lineTo(1327, y + 8);
      g.lineTo(1303, y + 8);
      g.closePath();
      g.fill();
      g.fillRect(1311, y + 8, 8, 14);
      g.restore();
    });
    text(g, 'Tap to dismiss', 1202, 745, { size: 20, align: 'center', col: '#c8d8f0', weight: 500 });
    region(0, 0, W, H, () => nav.go('lobby'));
    region(556, 625, 264, 70, () => nav.go('lobby'));
  },
};

// ---------------------------------------------------------------- icons sheet
pages.icons = {
  title: 'Icons',
  draw(g, t) {
    g.fillStyle = '#0a0d1c';
    g.fillRect(0, 0, W, H);
    ELS.forEach((el, i) => elementIcon(g, el, 92 + i * 130, 160, 56));
    g.strokeStyle = 'rgba(80,140,220,0.3)';
    g.beginPath();
    g.moveTo(100, 275);
    g.lineTo(1280, 275);
    g.stroke();
    TIERS.forEach((tier, i) => rankBadge(g, tier, 140 + i * 215, 410, 70));
    coin(g, 150, 610, 62);
    xpStar(g, 365, 610, 64);
    comet(g, 590, 610, 64);
    chest(g, 820, 625, 70, 0.4 + 0.2 * Math.sin(t / 20));
    text(g, 'All drawn in code. Click to go back.', W - 30, H - 24, { size: 16, align: 'right', col: '#6a80a8', weight: 500 });
    region(0, 0, W, H, () => nav.go('gallery'));
  },
};

// ---------------------------------------------------------------- key art
function clash(g: G, x: number, y: number, t: number, s: number): void {
  glowDot(g, x, y, 260 * s, 'rgb(255,200,120)', 0.7);
  g.save();
  g.globalCompositeOperation = 'lighter';
  const r = rng(Math.floor(t / 3));
  for (let i = 0; i < 18; i++) {
    const a = r() * Math.PI * 2;
    const len = (80 + r() * 200) * s;
    g.strokeStyle = r() < 0.5 ? 'rgba(255,200,120,0.8)' : 'rgba(160,230,255,0.8)';
    g.lineWidth = 2 + r() * 3;
    g.beginPath();
    g.moveTo(x + Math.cos(a) * 30 * s, y + Math.sin(a) * 30 * s);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  g.restore();
}
pages.keyart = {
  title: 'Key art',
  heroes: () => ['fire', 'lightning'],
  draw(g, t) {
    backdrop(g);
    rain(g, t, 120, 0.2);
    const a = stillPose('fire', 'cast', t);
    const b = stillPose('lightning', 'lunge', t);
    drawHero(g, 'fire', { pose: a.pose, face: 'attack', x: 360, feet: 690, scale: 1.12, facing: 1, t, aura: 0.8 });
    drawHero(g, 'lightning', { pose: b.pose, face: 'attack', x: 1000, feet: 690, scale: 1.12, facing: -1, t, aura: 0.8 });
    // fireball meeting a lightning burst
    for (let i = 0; i < 6; i++) flame(g, 560 + i * 26, 430 + Math.sin(t / 6 + i) * 8, 50 - i * 4, ['#ff3b1a', '#ff8a1a', '#ffe14a']);
    for (let i = 0; i < 6; i++) bolt(g, 720, 430, 860 + i * 70, 300 + i * 50, Math.floor(t / 3) + i, '#fffbd0', 3);
    clash(g, 690, 430, t, 1);
    logo(g, 688, 120, 0.72, t);
    region(0, 0, W, H, () => nav.go('gallery'));
  },
};
pages.poster = {
  title: 'Key art portrait',
  heroes: () => ['fire', 'lightning'],
  draw(g, t) {
    g.fillStyle = '#05060f';
    g.fillRect(0, 0, W, H);
    const pw = 516;
    const px = (W - pw) / 2;
    g.save();
    g.beginPath();
    g.rect(px, 0, pw, H);
    g.clip();
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0a0a30');
    sky.addColorStop(0.6, '#2a1a6a');
    sky.addColorStop(1, '#0a0820');
    g.fillStyle = sky;
    g.fillRect(px, 0, pw, H);
    // rooftops seen from above
    const r = rng(9);
    for (let i = 0; i < 26; i++) {
      const bx = px + r() * pw;
      const bw = 30 + r() * 70;
      const top = 470 + r() * 200;
      g.fillStyle = r() < 0.5 ? '#141a44' : '#0c1030';
      g.fillRect(bx - bw / 2, top, bw, H - top);
      for (let wy = top + 8; wy < H; wy += 12) {
        if (r() < 0.4) {
          g.fillStyle = r() < 0.5 ? 'rgba(90,220,255,0.6)' : 'rgba(255,90,220,0.6)';
          g.fillRect(bx - bw / 2 + 5 + r() * (bw - 10), wy, 3, 4);
        }
      }
    }
    spotlight(g, px + 120, 300, 10, 160, H, 'rgb(120,200,255)', 0.25);
    spotlight(g, px + 400, 300, 10, 160, H, 'rgb(120,200,255)', 0.25);
    embers(g, t, px, 0, pw, H, '#ffb43a', 70, 3, 3);
    const a = stillPose('fire', 'kick', t);
    const b = stillPose('lightning', 'punch', t);
    drawHero(g, 'fire', { pose: a.pose, face: 'attack', x: px + 165, feet: 470, scale: 0.72, facing: 1, t, aura: 0.8 });
    drawHero(g, 'lightning', { pose: b.pose, face: 'attack', x: px + 360, feet: 460, scale: 0.72, facing: -1, t, aura: 0.8 });
    for (let i = 0; i < 4; i++) bolt(g, px + 330, 300, px + 470 + i * 20, 200 + i * 60, Math.floor(t / 3) + i, '#fffbd0', 2);
    clash(g, px + 262, 300, t, 0.6);
    logo(g, px + pw / 2, 95, 0.4, t, false);
    g.restore();
    text(g, 'Portrait poster (848 x 1264 in the mock-up). Click to go back.', W / 2, H - 20, { size: 15, align: 'center', col: '#6a80a8', weight: 500 });
    region(0, 0, W, H, () => nav.go('gallery'));
  },
};

// ---------------------------------------------------------------- zombie line-up
const LINEUP: Array<[ZType, number, number, number]> = [
  ['walker', 175, 360, 0.95],
  ['runner', 470, 360, 0.95],
  ['brute', 830, 385, 0.62],
  ['spitter', 1180, 360, 0.95],
  ['bomber', 520, 700, 0.95],
  ['officer', 830, 700, 0.95],
  ['titan', 1180, 720, 0.5],
];
let pick = -1;
pages.bestiary = {
  title: 'Zombies',
  draw(g, t) {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#120c2a');
    bg.addColorStop(1, '#2a1040');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    const r = rng(4);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(80,40,140,${0.2 + r() * 0.3})`;
      g.fillRect(r() < 0.5 ? r() * 120 : W - r() * 120, r() * H, 14, 14);
    }
    topBar(g, { back: 'lobby', title: 'ZOMBIE SURVIVAL', xpBar: false });
    LINEUP.forEach(([type, x, feet, s], i) => {
      const sp = ZSPEC[type];
      g.save();
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath();
      g.ellipse(x, feet + 6, 110 * (sp.boss ? 1.5 : 1), 14, 0, 0, Math.PI * 2);
      g.fill();
      g.translate(x, feet);
      g.scale(s, s);
      g.translate(-x, -feet);
      const st = type === 'runner' ? 'walk' : 'idle';
      drawZombie(g, { type, x, feet, facing: 1, phase: type === 'runner' ? t / 6 : t / 40, state: st, k: 0, t, flash: 0, seed: i * 7, shieldHp: 260 });
      g.restore();
      g.save();
      g.beginPath();
      g.arc(x - 110, feet - 250 * s * sp.size + 10, 15, 0, Math.PI * 2);
      neon(g, '#6ab0ff', 1.5, 6);
      g.restore();
      text(g, sp.boss ? 'B' : String(i < 4 ? i + 1 : i), x - 110, feet - 250 * s * sp.size + 11, { size: 16, align: 'center' });
      text(g, sp.name, x, feet + 30, { size: 24, align: 'center' });
      region(x - 90, feet - 250 * s * sp.size, 180, 250 * s * sp.size + 40, () => (pick = i));
    });
    if (pick >= 0) {
      const sp = ZSPEC[LINEUP[pick][0]];
      panel(g, 30, 470, 340, 170, { col: sp.line, cut: 12 });
      text(g, sp.name.toUpperCase(), 50, 500, { size: 28, col: sp.line });
      text(g, `HP ${sp.hp} · hits for ${sp.dmg}`, 50, 532, { size: 18 });
      const words = sp.text.split(' ');
      let line = '';
      let y = 562;
      for (const wd of words) {
        if ((line + wd).length > 34) {
          text(g, line, 50, y, { size: 17, col: '#cfe4ff', weight: 500 });
          y += 24;
          line = '';
        }
        line += wd + ' ';
      }
      text(g, line, 50, y, { size: 17, col: '#cfe4ff', weight: 500 });
    } else text(g, 'Click a zombie to read about it', 40, 600, { size: 18, col: '#9fb0d8', weight: 500 });
    goldButton(g, 40, 660, 300, 84, 'SURVIVE', { sub: 'Start Zombie Survival', size: 40, t, act: () => nav.go('zombie') });
    void cap;
    void lock;
    void elementIcon;
  },
};
