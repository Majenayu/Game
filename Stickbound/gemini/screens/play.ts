/**
 * Playable screens: the 1v1 Fight with its HUD (gemini/extra/fight-hud.png), Zombie Survival with its HUD
 * (zombie-survival-hud.png) and the pause and settings screen (pause-menu.png).
 * Keys: A D move, W jump, S guard, J attack (x4 combo), K heavy, L dash, U I O powers, P ultimate, Esc pause.
 * Player 2 (Local 2P): arrows, Numpad 1 attack, 2 heavy, 3 dash, 4 5 6 powers, 0 ultimate.
 */
import { EL, city, coin, elementCoin, glyph, rain, rankBadge } from './art';
import { backdrop, fmt, dim } from './common';
import { Hero, drawEffects, drawFloaters, heroAI, makeWorld, noKeys, stepWorld, type Keys, type World } from './fight';
import { NAMES } from './heroes';
import { nav, pages } from './nav';
import { addXp, profile, save, tierOf } from './save';
import { C, H, W, bar, chamfer, cyanButton, goldButton, hexPath, input, neon, panel, region, text, type G } from './ui';
import { ZSPEC } from './zombies';
import { ZGROUND, newZGame, stepZGame, type ZGame } from './zmode';

// ---------------------------------------------------------------- keys
const P1: Record<keyof Keys, string[]> = {
  left: ['KeyA'], right: ['KeyD'], up: ['KeyW', 'Space'], guard: ['KeyS'], attack: ['KeyJ'], heavy: ['KeyK'], dash: ['KeyL'], p1: ['KeyU'], p2: ['KeyI'], p3: ['KeyO'], ult: ['KeyP'],
};
const P2: Record<keyof Keys, string[]> = {
  left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], guard: ['ArrowDown'], attack: ['Numpad1', 'Comma'], heavy: ['Numpad2', 'Period'], dash: ['Numpad3', 'Slash'], p1: ['Numpad4'], p2: ['Numpad5'], p3: ['Numpad6'], ult: ['Numpad0'],
};
function read(map: Record<keyof Keys, string[]>, touch = false): Keys {
  const k = noKeys();
  for (const n of Object.keys(map) as Array<keyof Keys>) k[n] = map[n].some((c) => input.held.has(c)) || (touch && virt.has(n));
  return k;
}
/** on-screen buttons held this frame (touch and mouse) */
const virt = new Set<keyof Keys>();
function touchZone(x: number, y: number, r: number, key: keyof Keys): boolean {
  const on = input.pointers.some((p) => Math.hypot(p.x - x, p.y - y) < r);
  if (on) virt.add(key);
  return on;
}
function dpad(g: G, x: number, y: number): void {
  g.save();
  g.globalAlpha = 0.75;
  g.beginPath();
  g.arc(x, y, 92, 0, Math.PI * 2);
  g.fillStyle = 'rgba(20,40,80,0.25)';
  g.fill();
  neon(g, 'rgba(120,200,255,0.5)', 1.5, 6);
  const arms: Array<[number, number, keyof Keys, number]> = [[0, -52, 'up', 0], [52, 0, 'right', 1], [0, 52, 'guard', 2], [-52, 0, 'left', 3]];
  for (const [dx, dy, key, rot] of arms) {
    const on = touchZone(x + dx, y + dy, 40, key);
    chamfer(g, x + dx - 32, y + dy - 32, 64, 64, 10);
    g.fillStyle = on ? 'rgba(63,214,255,0.45)' : 'rgba(40,70,120,0.55)';
    g.fill();
    neon(g, '#8ad8ff', 1.5, 6);
    g.save();
    g.translate(x + dx, y + dy);
    g.rotate((rot * Math.PI) / 2);
    g.fillStyle = '#dff4ff';
    g.beginPath();
    g.moveTo(0, -14);
    g.lineTo(12, 6);
    g.lineTo(-12, 6);
    g.closePath();
    g.fill();
    g.restore();
  }
  g.restore();
}
function roundBtn(g: G, x: number, y: number, r: number, key: keyof Keys, draw: () => void, sq = false): void {
  const on = touchZone(x, y, r + 6, key);
  g.save();
  g.globalAlpha = 0.85;
  if (sq) chamfer(g, x - r, y - r, r * 2, r * 2, r * 0.3);
  else {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
  }
  g.fillStyle = on ? 'rgba(63,214,255,0.4)' : 'rgba(14,30,60,0.6)';
  g.fill();
  neon(g, '#8ad8ff', 2, 10);
  g.restore();
  draw();
}

// ---------------------------------------------------------------- fight
interface FightState {
  w: World;
  a: Hero;
  b: Hero;
  wins: [number, number];
  round: number;
  timer: number;
  phase: 'intro' | 'fight' | 'ko' | 'done';
  phaseT: number;
  comboShow: number;
  comboN: number;
  comboSide: 1 | 2;
}
let F: FightState | null = null;
const FGROUND = 650;
function newRound(f: FightState | null): FightState {
  const m = nav.match;
  const a = new Hero(m.p1, 420, 1, 1, FGROUND, 1000);
  const b = new Hero(m.p2, 956, -1, 2, FGROUND, 1000);
  a.scale = b.scale = 1.05;
  const w = makeWorld(FGROUND, 70, 1306, () => [a, b]);
  const st: FightState = f
    ? { ...f, w, a, b, timer: 60 * 60, phase: 'intro', phaseT: 0, round: f.round + 1 }
    : { w, a, b, wins: [0, 0], round: 1, timer: 60 * 60, phase: 'intro', phaseT: 0, comboShow: 0, comboN: 0, comboSide: 1 };
  w.onHit = (by) => {
    st.comboN = by.chain;
    st.comboSide = by === a ? 1 : 2;
    if (by.chain >= 2) st.comboShow = 80;
  };
  return st;
}
function finishMatch(f: FightState): void {
  const m = nav.match;
  const winner: 1 | 2 = f.wins[0] > f.wins[1] ? 1 : 2;
  const won = winner === 1;
  const xp = m.mode === 'local' ? 300 : won ? 1500 : 400;
  const coins = m.mode === 'local' ? 100 : won ? 500 : 100;
  let rp: number | undefined;
  if (m.mode === 'ranked') {
    rp = won ? 25 : -15;
    profile.rp = Math.max(0, profile.rp + rp);
  }
  if (m.mode === 'road' && won) profile.road = Math.min(41, profile.road + 1);
  profile.streak = won ? profile.streak + 1 : 0;
  profile.wins += won ? 1 : 0;
  profile.coins += coins;
  const levelUp = addXp(xp);
  save();
  nav.result = { winner, mode: m.mode, xp, coins, levelUp, rp };
  nav.go('victory');
}
function pause(): void {
  const c = document.querySelector<HTMLCanvasElement>('#c');
  if (c) {
    const s = document.createElement('canvas');
    s.width = W;
    s.height = H;
    s.getContext('2d')!.drawImage(c, 0, 0, W, H);
    nav.snapshot = s;
  }
  nav.back = nav.name;
  nav.go('pause');
}
let resumeFight = false;
pages.fight = {
  title: 'Fight',
  heroes: () => [nav.match.p1, nav.match.p2],
  enter() {
    if (resumeFight && F) {
      resumeFight = false;
      return;
    }
    F = newRound(null);
  },
  key(e) {
    if (e.code === 'Escape') pause();
  },
  step() {
    const f = F;
    if (!f) return;
    const { w, a, b } = f;
    f.phaseT++;
    if (f.comboShow > 0) f.comboShow--;
    if (w.hitstop > 0) {
      w.hitstop--;
      return;
    }
    const local = nav.match.mode === 'local';
    const ka = f.phase === 'fight' ? read(P1, true) : noKeys();
    const kb = f.phase === 'fight' ? (local ? read(P2) : heroAI(b, a, w, nav.match.mode === 'road' ? 0.7 + Math.min(0.3, profile.road / 60) : 1)) : noKeys();
    a.step(w, ka);
    b.step(w, kb);
    // keep them from walking through each other
    const gap = b.x - a.x;
    if (Math.abs(gap) < 60 && a.grounded && b.grounded) {
      const push = (60 - Math.abs(gap)) / 2;
      const s = Math.sign(gap) || 1;
      a.x -= push * s;
      b.x += push * s;
    }
    stepWorld(w, [a, b]);
    if (f.phase === 'intro' && f.phaseT > 100) {
      f.phase = 'fight';
      f.phaseT = 0;
    } else if (f.phase === 'fight') {
      f.timer--;
      if (a.ko || b.ko || f.timer <= 0) {
        const p1wins = b.ko || (!a.ko && a.hp / a.maxHp >= b.hp / b.maxHp);
        f.wins[p1wins ? 0 : 1]++;
        f.phase = 'ko';
        f.phaseT = 0;
        if (!a.ko && p1wins) a.play('victory');
        if (!b.ko && !p1wins) b.play('victory');
      }
    } else if (f.phase === 'ko' && f.phaseT > 150) {
      if (f.wins[0] >= 2 || f.wins[1] >= 2) {
        f.phase = 'done';
        finishMatch(f);
      } else F = newRound(f);
    }
  },
  draw(g, t) {
    const f = F;
    if (!f) return;
    virt.clear();
    const { w, a, b } = f;
    const sh = profile.shake && !profile.reduced ? w.shake : 0;
    g.save();
    g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    backdrop(g);
    drawEffects(g, w, false);
    b.draw(g, w);
    a.draw(g, w);
    drawEffects(g, w, true);
    drawFloaters(g, w);
    g.restore();
    if (w.dim > 0) {
      g.fillStyle = `rgba(0,0,10,${Math.min(0.55, w.dim / 40) * 0.8})`;
      g.fillRect(0, 0, W, H);
      const ul = a.clipName === 'ult' ? a : b.clipName === 'ult' ? b : null;
      if (ul) {
        drawEffects(g, w, false);
        ul.draw(g, w);
        drawEffects(g, w, true);
        text(g, ul.kit.ultBanner, W / 2, 230, { size: 64, align: 'center', weight: 900, italic: true, col: `rgb(${ul.kit.fx.core})`, glow: `rgb(${ul.kit.fx.glow})`, blur: 30, stroke: '#000', sw: 6 });
      }
    }
    if (w.flash > 0) {
      g.fillStyle = `rgba(255,255,255,${w.flash / 14})`;
      g.fillRect(0, 0, W, H);
    }
    fightHud(g, f, t);
    if (f.phase === 'intro') {
      const s = f.phaseT < 60 ? `ROUND ${f.round}` : 'FIGHT!';
      const k = (f.phaseT % 60) / 60;
      text(g, s, W / 2, 330, { size: 100 + (1 - k) * 30, align: 'center', weight: 900, italic: true, col: '#ffe08a', stroke: '#4a1a00', sw: 8, glow: '#ffb43a', blur: 30 });
    }
    if (f.phase === 'ko') {
      const timeUp = !a.ko && !b.ko;
      text(g, timeUp ? 'TIME!' : 'K.O.', W / 2, 330, { size: 130, align: 'center', weight: 900, italic: true, col: '#ff5a3a', stroke: '#2a0000', sw: 10, glow: '#ff3b1a', blur: 40 });
    }
    // touch controls
    dpad(g, 118, 640);
    roundBtn(g, 1290, 690, 54, 'attack', () => text(g, 'J', 1290, 691, { size: 36, align: 'center', weight: 800 }), true);
    roundBtn(g, 1295, 552, 38, 'p1', () => glyph(g, a.el, 1295, 552, 18));
    roundBtn(g, 1185, 612, 38, 'p2', () => glyph(g, a.el, 1185, 612, 18));
    roundBtn(g, 1160, 718, 38, 'p3', () => glyph(g, a.el, 1160, 718, 18));
    roundBtn(g, 1196, 500, 28, 'ult', () => text(g, 'ULT', 1196, 501, { size: 15, align: 'center', weight: 800, col: a.mp >= 100 ? '#ffd24a' : '#7a8aa8' }));
    // pause button
    chamfer(g, W / 2 - 22, 104, 44, 30, 6);
    g.fillStyle = 'rgba(10,20,40,0.8)';
    g.fill();
    neon(g, C.cyan, 1.2, 6);
    text(g, 'II', W / 2, 120, { size: 18, align: 'center', weight: 800 });
    region(W / 2 - 22, 104, 44, 30, pause);
  },
};
function fightHud(g: G, f: FightState, t: number): void {
  const m = nav.match;
  const side = (h: Hero, right: boolean, name: string, lv: number, mate: string, wins: number) => {
    const s = right ? -1 : 1;
    const ox = right ? W : 0;
    const X = (x: number) => ox + s * x;
    const el = h.el;
    // name tab
    g.save();
    g.beginPath();
    g.moveTo(X(70), 14);
    g.lineTo(X(370), 14);
    g.lineTo(X(392), 40);
    g.lineTo(X(70), 40);
    g.closePath();
    g.fillStyle = 'rgba(8,16,34,0.85)';
    g.fill();
    neon(g, C.cyan, 1.2, 6);
    g.restore();
    if (right) {
      text(g, `Lv. ${lv}`, X(120), 28, { size: 22, align: 'right', col: '#ffd24a' });
      text(g, name, X(120) - 80, 28, { size: 22, align: 'right' });
    } else {
      text(g, name, X(120), 28, { size: 22 });
      text(g, `Lv. ${lv}`, X(120) + name.length * 12 + 12, 28, { size: 22, col: '#ffd24a' });
    }
    // HP
    text(g, 'HP', X(130), 62, { size: 20, align: right ? 'right' : 'left' });
    const hpCols = profile.colorblind ? ['#2a6aff', '#7ab8ff'] : right ? ['#ff2a2a', '#ffb43a'] : ['#3ad84a', '#d8ff4a'];
    const bx = right ? W - 160 - 450 : 160;
    g.save();
    if (right) {
      g.translate(W, 0);
      g.scale(-1, 1);
    }
    bar(g, 160, 50, 450, 24, h.hp / h.maxHp, right ? [hpCols[0], hpCols[1]] : hpCols, { seg: 4, skew: 10, edge: '#3fa8ff' });
    bar(g, 160, 82, 220, 12, h.mp / 100, ['#1a8ad0', '#3fe6ff'], { seg: 2, skew: 6, edge: '#3fa8ff' });
    g.restore();
    void bx;
    text(g, 'MP', X(130), 89, { size: 18, align: right ? 'right' : 'left' });
    // round pips
    for (let i = 0; i < 3; i++) {
      const px = X(560 - i * 32);
      g.save();
      g.beginPath();
      g.arc(px, 98, 11, 0, Math.PI * 2);
      g.fillStyle = i < wins ? '#ffb43a' : 'rgba(10,20,40,0.8)';
      g.shadowColor = '#ffb43a';
      g.shadowBlur = i < wins ? 14 : 0;
      g.fill();
      g.strokeStyle = '#c8d0e0';
      g.lineWidth = 2;
      g.stroke();
      g.restore();
    }
    // portrait
    g.save();
    g.beginPath();
    g.arc(X(56), 58, 46, 0, Math.PI * 2);
    g.fillStyle = EL[el].deep;
    g.fill();
    neon(g, EL[el].line, 4, 20);
    g.restore();
    glyph(g, el, X(56), 58, 26);
    // companion
    g.save();
    g.beginPath();
    g.arc(X(150), 140, 24, 0, Math.PI * 2);
    g.fillStyle = '#0a1226';
    g.fill();
    neon(g, '#8ad8ff', 2, 10);
    g.restore();
    text(g, mate.slice(0, 1), X(150), 141, { size: 20, align: 'center' });
  };
  const local = m.mode === 'local';
  side(f.a, false, local ? 'Player 1' : profile.name, profile.heroLv[m.p1], NAMES[profile.squad[1] ?? 'lightning'], f.wins[0]);
  side(f.b, true, local ? 'Player 2' : m.p2Name, m.p2Lv, 'L', f.wins[1]);
  // timer
  g.save();
  hexPath(g, W / 2, 58, 50, 0.72);
  g.fillStyle = 'rgba(8,16,34,0.92)';
  g.fill();
  neon(g, C.cyan, 2.5, 14);
  g.restore();
  text(g, String(Math.max(0, Math.ceil(f.timer / 60))), W / 2, 60, { size: 50, align: 'center', weight: 800 });
  // combo
  if (f.comboShow > 0 && f.comboN >= 2) {
    const x = f.comboSide === 1 ? W - 150 : 170;
    const pop = f.comboShow > 70 ? 1.2 : 1;
    g.save();
    g.translate(x, 260);
    g.scale(pop, pop);
    text(g, 'COMBO!', 60, -46, { size: 22, align: 'center', italic: true, col: '#ffd24a', weight: 800 });
    text(g, `${f.comboN}`, -70, 0, { size: 96, align: 'center', italic: true, weight: 900, col: '#ffd24a', stroke: '#4a1a00', sw: 6, glow: '#ffb43a', blur: 20 });
    text(g, 'HITS', 40, 4, { size: 64, align: 'center', italic: true, weight: 900, col: '#ffffff', stroke: '#0a2040', sw: 6, glow: C.cyan, blur: 16 });
    g.fillStyle = C.cyan;
    g.fillRect(-110, 48, 220, 4);
    g.restore();
  }
  void t;
}

// ---------------------------------------------------------------- zombie survival
let Z: ZGame | null = null;
let zRewarded = false;
let resumeZombie = false;
pages.zombie = {
  title: 'Zombie Survival',
  heroes: () => [profile.hero],
  enter() {
    if (resumeZombie && Z) {
      resumeZombie = false;
      return;
    }
    const wave = Number(new URLSearchParams(location.search).get('wave') ?? '1') || 1;
    Z = newZGame(profile.hero, Math.max(1, Math.min(50, wave)));
    zRewarded = false;
  },
  key(e) {
    if (e.code === 'Escape') pause();
  },
  step() {
    if (!Z) return;
    stepZGame(Z, read(P1, true));
    if (Z.over && Z.overTimer > 90 && !zRewarded) {
      zRewarded = true;
      const coins = Math.floor(Z.score / 200);
      const xp = Math.floor(Z.score / 40);
      profile.coins += coins;
      profile.best = Math.max(profile.best, Z.score);
      const up = addXp(xp);
      save();
      nav.result = { winner: 2, mode: 'quick', xp, coins, levelUp: up, score: Z.score, wave: Z.wave };
    }
  },
  draw(g, t) {
    const z = Z;
    if (!z) return;
    virt.clear();
    const { w, hero } = z;
    const sh = profile.shake && !profile.reduced ? w.shake : 0;
    g.save();
    g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    g.drawImage(city('ruin', 560), 0, 0);
    // green haze
    const fog = g.createLinearGradient(0, 420, 0, 700);
    fog.addColorStop(0, 'rgba(60,255,120,0)');
    fog.addColorStop(1, 'rgba(60,255,120,0.08)');
    g.fillStyle = fog;
    g.fillRect(0, 420, W, 300);
    drawEffects(g, w, false);
    const back = z.zs.filter((q) => q.spec.boss);
    for (const q of back) q.draw(g);
    for (const q of z.zs) if (!q.spec.boss) q.draw(g);
    hero.draw(g, w);
    drawEffects(g, w, true);
    drawFloaters(g, w);
    g.restore();
    rain(g, t, 140, 0.22);
    if (w.flash > 0) {
      g.fillStyle = `rgba(255,255,255,${w.flash / 14})`;
      g.fillRect(0, 0, W, H);
    }
    zombieHud(g, z, t);
    dpad(g, 118, 640);
    roundBtn(g, 1290, 690, 54, 'attack', () => swordIcon(g, 1290, 690), true);
    roundBtn(g, 1170, 705, 40, 'guard', () => shieldIcon(g, 1170, 705), true);
    roundBtn(g, 1290, 560, 40, 'p1', () => glyph(g, hero.el, 1290, 560, 18), true);
    roundBtn(g, 1180, 590, 30, 'p3', () => glyph(g, hero.el, 1180, 590, 14));
    roundBtn(g, 1240, 470, 26, 'ult', () => text(g, 'ULT', 1240, 471, { size: 14, align: 'center', weight: 800, col: hero.mp >= 100 ? '#ffd24a' : '#7a8aa8' }));
    if (z.over && z.overTimer > 90) {
      dim(g, 0.6);
      panel(g, 420, 190, 536, 380, { col: '#ff4a4a', cut: 16, brackets: true });
      text(g, 'OVERRUN', W / 2, 250, { size: 70, align: 'center', weight: 900, col: '#ff8a8a', glow: '#ff3b3b', blur: 20 });
      text(g, `Wave ${z.wave} · ${z.kills} zombies`, W / 2, 320, { size: 28, align: 'center' });
      text(g, `SCORE ${fmt(z.score)}`, W / 2, 370, { size: 40, align: 'center', col: '#ffd24a', weight: 800 });
      text(g, `Best ${fmt(profile.best)}`, W / 2, 412, { size: 22, align: 'center', col: '#cfe4ff' });
      coin(g, W / 2 - 60, 450, 16);
      text(g, `+${Math.floor(z.score / 200)}   XP +${Math.floor(z.score / 40)}`, W / 2 - 36, 451, { size: 22 });
      goldButton(g, 460, 490, 220, 64, 'RETRY', { size: 34, t, act: () => {
        Z = null;
        pages.zombie.enter?.();
      } });
      cyanButton(g, 700, 490, 220, 64, 'LOBBY', { size: 34, act: () => nav.go(nav.result?.levelUp ? 'levelup' : 'lobby') });
    }
    // pause button
    chamfer(g, 30, 160, 44, 30, 6);
    g.fillStyle = 'rgba(10,20,40,0.8)';
    g.fill();
    neon(g, C.cyan, 1.2, 6);
    text(g, 'II', 52, 176, { size: 18, align: 'center', weight: 800 });
    region(30, 160, 44, 30, pause);
  },
};
function swordIcon(g: G, x: number, y: number): void {
  g.save();
  g.translate(x, y);
  g.rotate(-0.8);
  g.fillStyle = '#dff4ff';
  g.shadowColor = C.cyan;
  g.shadowBlur = 10;
  g.beginPath();
  g.moveTo(-4, 10);
  g.lineTo(-4, -26);
  g.lineTo(0, -34);
  g.lineTo(4, -26);
  g.lineTo(4, 10);
  g.closePath();
  g.fill();
  g.fillRect(-14, 10, 28, 5);
  g.fillRect(-3, 15, 6, 14);
  g.restore();
}
function shieldIcon(g: G, x: number, y: number): void {
  g.save();
  g.translate(x, y);
  g.fillStyle = 'rgba(200,230,255,0.85)';
  g.shadowColor = C.cyan;
  g.shadowBlur = 10;
  g.beginPath();
  g.moveTo(0, -20);
  g.lineTo(17, -13);
  g.quadraticCurveTo(16, 10, 0, 22);
  g.quadraticCurveTo(-16, 10, -17, -13);
  g.closePath();
  g.fill();
  g.restore();
}
function zombieHud(g: G, z: ZGame, t: number): void {
  const h = z.hero;
  // portrait and bars
  g.save();
  g.beginPath();
  g.arc(58, 56, 40, 0, Math.PI * 2);
  g.fillStyle = EL[h.el].deep;
  g.fill();
  neon(g, EL[h.el].line, 4, 20);
  g.restore();
  glyph(g, h.el, 58, 56, 24);
  text(g, NAMES[h.el], 112, 30, { size: 22 });
  text(g, `Lv. ${profile.heroLv[h.el]}`, 112 + NAMES[h.el].length * 12 + 10, 30, { size: 22, col: '#ffd24a' });
  text(g, 'HP', 112, 62, { size: 18 });
  bar(g, 145, 52, 290, 20, h.hp / h.maxHp, profile.colorblind ? ['#2a6aff', '#7ab8ff'] : ['#3ad84a', '#d8ff4a'], { seg: 10, skew: 8, edge: '#3fa8ff' });
  text(g, 'MP', 112, 90, { size: 18 });
  bar(g, 145, 82, 190, 12, h.mp / 100, ['#1a8ad0', '#3fe6ff'], { seg: 3, skew: 6, edge: '#3fa8ff' });
  // wave
  chamfer(g, 548, 14, 280, 84, 12);
  const wg = g.createLinearGradient(0, 14, 0, 98);
  wg.addColorStop(0, '#5a1a10');
  wg.addColorStop(1, '#2a0a08');
  g.fillStyle = wg;
  g.fill();
  neon(g, '#ffb43a', 3, 20);
  text(g, `WAVE ${Math.max(1, z.wave)}`, 688, 58, { size: 50, align: 'center', weight: 900, col: '#ffd24a', stroke: '#3a1000', sw: 4 });
  chamfer(g, 842, 26, 196, 64, 8);
  g.fillStyle = 'rgba(8,16,34,0.85)';
  g.fill();
  text(g, 'ZOMBIES', 940, 46, { size: 21, align: 'center' });
  text(g, `REMAINING: ${z.remaining}`, 940, 72, { size: 21, align: 'center', col: '#ffffff' });
  // score
  panel(g, 1128, 66, 222, 98, { col: C.cyan, cut: 12 });
  text(g, `SCORE: ${fmt(z.score)}`, 1239, 98, { size: 22, align: 'center', col: '#ffffff' });
  text(g, 'MULTIPLIER', 1215, 134, { size: 22, align: 'center' });
  text(g, `x${z.mult}`, 1318, 134, { size: 30, align: 'center', col: '#ffd24a', weight: 900 });
  // boss bar
  if (z.boss && z.boss.alive()) {
    const b = z.boss;
    text(g, b.spec.name.toUpperCase(), 688, 118, { size: 22, align: 'center', col: '#ff8a8a', weight: 800 });
    bar(g, 438, 132, 500, 18, b.hp / b.maxHp, ['#a01010', '#ff4a2a'], { seg: 10, skew: 6, edge: '#ff6a4a' });
  }
  // banner
  if (z.banner > 0) {
    const a = Math.min(1, z.banner / 20);
    g.save();
    g.globalAlpha = a;
    text(g, z.bannerText, W / 2, 300, { size: 84, align: 'center', weight: 900, italic: true, col: z.bannerText.includes('BOSS') ? '#ff6a4a' : '#ffd24a', stroke: '#2a0a00', sw: 8, glow: '#ff9a2a', blur: 26 });
    if (z.bannerText.includes('BOSS') && z.boss) text(g, z.boss.spec.text, W / 2, 360, { size: 22, align: 'center', col: '#ffffff' });
    g.restore();
  }
  void ZSPEC;
  void ZGROUND;
  void t;
}

// ---------------------------------------------------------------- pause and settings
let ctrlView = false;
function pauseDraw(g: G, t: number, menu: boolean): void {
  if (!menu && nav.snapshot) {
    g.save();
    g.filter = 'blur(5px) brightness(0.55)';
    g.drawImage(nav.snapshot, 0, 0);
    g.restore();
  } else {
    backdrop(g);
    dim(g, 0.55);
  }
  // title
  text(g, menu ? 'SETTINGS' : 'GAME PAUSED', W / 2, 92, { size: 84, align: 'center', weight: 900, col: '#dff8ff', glow: C.cyan, blur: 24 });
  for (const [x, d, col] of [[330, 1, C.cyan], [1040, -1, C.purple]] as const) {
    for (let k = 0; k < 3; k++) {
      g.save();
      g.translate(x + k * 18 * d, 94);
      g.scale(d, 1);
      g.strokeStyle = col;
      g.lineWidth = 5;
      g.shadowColor = col;
      g.shadowBlur = 8;
      g.beginPath();
      g.moveTo(-6, -12);
      g.lineTo(6, 0);
      g.lineTo(-6, 12);
      g.stroke();
      g.restore();
    }
  }
  // left
  panel(g, 98, 188, 538, 540, { col: C.purple, cut: 16, brackets: true });
  text(g, menu ? 'MENU' : 'PAUSE', 367, 230, { size: 40, align: 'center', weight: 800, col: '#e0b8ff', glow: C.purple });
  const back = nav.back === 'pause' || nav.back === 'settings' ? 'lobby' : nav.back;
  const resume = () => {
    if (back === 'fight') resumeFight = true;
    if (back === 'zombie') resumeZombie = true;
    nav.go(back);
  };
  goldButton(g, 218, 290, 300, 76, menu ? 'BACK' : 'RESUME', { size: 34, t, act: resume });
  cyanButton(g, 218, 390, 300, 70, 'CONTROLS', { size: 32, on: ctrlView, act: () => (ctrlView = !ctrlView) });
  cyanButton(g, 218, 485, 300, 70, 'SETTINGS', { size: 32, on: !ctrlView, act: () => (ctrlView = false) });
  cyanButton(g, 218, 580, 300, 70, menu ? 'ALL SCREENS' : 'QUIT MATCH', { size: 32, col: menu ? C.cyan : '#ff4a5a', act: () => nav.go(menu ? 'gallery' : 'lobby') });
  // right
  panel(g, 730, 188, 552, 540, { col: C.cyan, cut: 16, brackets: true });
  if (ctrlView) {
    text(g, 'CONTROLS', 1006, 230, { size: 40, align: 'center', weight: 800 });
    const rows: Array<[string, string]> = [['Move / run', 'A D'], ['Jump', 'W / Space'], ['Guard', 'S'], ['Attack (x4 combo)', 'J'], ['Heavy', 'K'], ['Dash', 'L'], ['Powers I / II / III', 'U I O'], ['Ultimate (100 MP)', 'P'], ['Pause', 'Esc'], ['Player 2', 'Arrows, Numpad 1-6, 0']];
    rows.forEach(([a, b], i) => {
      text(g, a, 770, 280 + i * 42, { size: 22 });
      text(g, b, 1250, 280 + i * 42, { size: 22, align: 'right', col: '#ffd24a' });
    });
    return;
  }
  text(g, 'SETTINGS', 1006, 230, { size: 40, align: 'center', weight: 800 });
  text(g, 'AUDIO', 760, 276, { size: 26 });
  const slider = (label: string, y: number, v: number, set: (v: number) => void) => {
    text(g, label, 760, y + 10, { size: 22 });
    const x0 = 922;
    const ww = 330;
    chamfer(g, x0, y, ww, 22, 6);
    g.fillStyle = 'rgba(6,14,30,0.9)';
    g.fill();
    neon(g, '#5a8ad0', 1, 4);
    for (let i = 0; i < 14; i++) {
      const on = i / 14 < v;
      g.fillStyle = on ? (i < 9 ? '#d04ad8' : '#6a8aff') : 'rgba(255,255,255,0.08)';
      g.fillRect(x0 + 6 + i * 23, y + 5, 19, 12);
    }
    g.fillStyle = '#9ff0ff';
    g.shadowColor = '#9ff0ff';
    g.fillRect(x0 + 4 + v * (ww - 12), y - 4, 8, 30);
    region(x0, y - 6, ww, 34, () => set(Math.max(0, Math.min(1, (input.mx - x0) / ww))));
  };
  slider('MUSIC', 300, profile.music, (v) => ((profile.music = v), save()));
  slider('SOUND FX', 346, profile.sfx, (v) => ((profile.sfx = v), save()));
  text(g, 'GRAPHICS', 760, 410, { size: 26 });
  text(g, 'GRAPHICS', 760, 456, { size: 22 });
  (['high', 'medium', 'low'] as const).forEach((q, i) => {
    const on = profile.graphics === q;
    if (on) goldButton(g, 925 + i * 112, 436, 102, 40, q.toUpperCase(), { size: 20, t, act: () => ((profile.graphics = q), save()) });
    else cyanButton(g, 925 + i * 112, 436, 102, 40, q.toUpperCase(), { size: 20, act: () => ((profile.graphics = q), save()) });
  });
  text(g, 'ACCESSIBILITY', 760, 510, { size: 26 });
  const toggle = (label: string, y: number, on: boolean, set: () => void) => {
    text(g, label, 760, y, { size: 22 });
    g.save();
    g.beginPath();
    g.roundRect(1170, y - 14, 84, 28, 8);
    g.fillStyle = 'rgba(60,10,20,0.8)';
    g.fill();
    neon(g, '#a03a4a', 1, 4);
    g.beginPath();
    g.roundRect(on ? 1172 : 1212, y - 11, 40, 22, 6);
    g.fillStyle = on ? C.cyan : '#6a6a7a';
    g.shadowColor = C.cyan;
    g.shadowBlur = on ? 12 : 0;
    g.fill();
    g.restore();
    region(1160, y - 18, 100, 36, set);
  };
  toggle('REDUCED MOTION', 556, profile.reduced, () => ((profile.reduced = !profile.reduced), save()));
  toggle('SCREEN SHAKE', 600, profile.shake, () => ((profile.shake = !profile.shake), save()));
  toggle('COLORBLIND MODE', 644, profile.colorblind, () => ((profile.colorblind = !profile.colorblind), save()));
  text(g, `Rank: ${tierOf(profile.rp).tier}`, 760, 696, { size: 16, col: '#7fb0d8', weight: 500 });
  rankBadge(g, tierOf(profile.rp).tier, 870, 694, 12, true);
  void elementCoin;
}
pages.pause = {
  title: 'Paused',
  key(e) {
    if (e.code === 'Escape') {
      if (nav.back === 'fight') resumeFight = true;
      if (nav.back === 'zombie') resumeZombie = true;
      nav.go(nav.back === 'pause' ? 'lobby' : nav.back);
    }
  },
  draw(g, t) {
    pauseDraw(g, t, false);
  },
};
pages.settings = {
  title: 'Settings',
  draw(g, t) {
    pauseDraw(g, t, true);
  },
};
