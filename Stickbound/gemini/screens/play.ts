/**
 * Playable screens: the 1v1 Fight with its HUD (gemini/extra/fight-hud.png), Zombie Survival with its HUD
 * (zombie-survival-hud.png) and the pause and settings screen (pause-menu.png).
 * Keys: A D move, W jump, S guard, J attack (x4 combo), K heavy, L dash, U I O powers, P ultimate, Esc pause.
 * Player 2 (Local 2P): arrows, Numpad 1 attack, 2 heavy, 3 dash, 4 5 6 powers, 0 ultimate.
 */
import { coin, elementCoin, rain } from './art';
import { fmt, dim } from './common';
import { drawArena, drawCut, drawStage, loadHudRefs, patch, pauseMusic, startMusic, stopMusic, useStage } from './hudref';
import { resumeFlags } from './refs';
import { Hero, MP_ULT, blip, drawEffects, drawFloaters, floater, heroAI, makeWorld, noKeys, sparks, stepWorld, type Keys, type World } from './fight';
import { NAMES, drawHero, stillPose } from './heroes';
import { matesOf, nav, pages, type PageName } from './nav';
import { addXp, profile, rollDay, save, type El } from './save';
import { C, H, W, bar, chamfer, cyanButton, goldButton, input, neon, panel, region, text, type G } from './ui';
import { newZGame, stepZGame, type ZGame } from './zmode';

// ---------------------------------------------------------------- keys
const P1: Record<keyof Keys, string[]> = {
  left: ['KeyA'], right: ['KeyD'], up: ['KeyW', 'Space'], guard: ['KeyS'], attack: ['KeyJ'], heavy: ['KeyK'], dash: ['KeyL'], p1: ['KeyU'], p2: ['KeyI'], p3: ['KeyO'], ult: ['KeyP'], swap: ['KeyQ'],
};
const P2: Record<keyof Keys, string[]> = {
  left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], guard: ['ArrowDown'], attack: ['Numpad1', 'Comma'], heavy: ['Numpad2', 'Period'], dash: ['Numpad3', 'Slash'], p1: ['Numpad4'], p2: ['Numpad5'], p3: ['Numpad6'], ult: ['Numpad0'], swap: ['Numpad7', 'Quote'],
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
/** the touch buttons cut from the picture; pressing one holds that key */
function pad(g: G, name: string, cx: number, cy: number): void {
  drawCut(g, name, cx - 103, cy - 103, 206, 206, 'circle');
  touchZone(cx, cy - 55, 38, 'up');
  touchZone(cx + 55, cy, 38, 'right');
  touchZone(cx, cy + 55, 38, 'guard');
  touchZone(cx - 55, cy, 38, 'left');
}
function zombieControls(g: G): void {
  const N = 'zombie-survival-hud';
  pad(g, N, 147, 628);
  drawCut(g, N, 1236, 467, 102, 110, 'rect');
  touchZone(1287, 522, 50, 'p1');
  drawCut(g, N, 1068, 630, 104, 104, 'rect');
  touchZone(1120, 682, 50, 'guard');
  drawCut(g, N, 1196, 596, 142, 144, 'rect');
  touchZone(1267, 668, 68, 'attack');
}

// ---------------------------------------------------------------- fight
interface FightState {
  w: World;
  /** the active hero of each side */
  a: Hero;
  b: Hero;
  /** each side's squad (active and benched); each hero keeps its own HP and MP */
  sa: Hero[];
  sb: Hero[];
  /** frames left before a side can swap again (commit frames) */
  swapT: [number, number];
  /** frames since a side's active hero went down (the partner then comes in) */
  downT: [number, number];
  /** the swap chip was tapped (touch and mouse) */
  tapSwap: boolean;
  timeUp: boolean;
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
/** test hook for the move checks (gemini/screens shots): the running fight */
(window as unknown as Record<string, unknown>).__fight = () => F;
const FGROUND = 650;
/** fighters at the size their moves were designed for (the labs use 0.74), so the arena has room to move */
const FSCALE = 0.74;
function newRound(f: FightState | null): FightState {
  const m = nav.match;
  // both sides fight with their real stats: hero level and chosen class (the roster panel shows the same numbers)
  const local = m.mode === 'local';
  const [ma, mb] = matesOf(m);
  const mine = (el: El, x: number) => new Hero(el, x, 1, 1, FGROUND, profile.heroLv[el], profile.cls[el]);
  const theirs = (el: El, x: number) => new Hero(el, x, -1, 2, FGROUND, local ? profile.heroLv[el] : m.p2Lv, local ? profile.cls[el] : undefined);
  const sa = [mine(m.p1, 380), ...(ma ? [mine(ma, 380)] : [])];
  const sb = [theirs(m.p2, 996), ...(mb ? [theirs(mb, 996)] : [])];
  for (const h of [...sa, ...sb]) h.scale = FSCALE;
  const [a, b] = [sa[0], sb[0]];
  // the world reads the active heroes each frame, so a swap changes who can be hit
  const live: { st?: FightState } = {};
  const w = makeWorld(FGROUND, 60, 1316, () => (live.st ? [live.st.a, live.st.b] : [a, b]));
  const fresh = { w, a, b, sa, sb, swapT: [0, 0] as [number, number], downT: [0, 0] as [number, number], tapSwap: false, timeUp: false, timer: 60 * 60, phase: 'intro' as const, phaseT: 0 };
  const st: FightState = f
    ? { ...f, ...fresh, round: f.round + 1 }
    : { ...fresh, wins: [0, 0], round: 1, comboShow: 0, comboN: 0, comboSide: 1 };
  live.st = st;
  w.onHit = (by) => {
    if (by.team === 1) profile.qHits++;
    st.comboN = by.chain;
    st.comboSide = by.team === 1 ? 1 : 2;
    if (by.chain >= 2) st.comboShow = 80;
  };
  return st;
}
// ---------------------------------------------------------------- tag swap (master prompt: Squad of 2, Swap)
const SWAP_COMMIT = 40;
const SWAP_INVULN = 30;
const benchOf = (f: FightState, side: 1 | 2): Hero | null => {
  const cur = side === 1 ? f.a : f.b;
  return (side === 1 ? f.sa : f.sb).find((h) => h !== cur) ?? null;
};
/** brings the benched hero in where the active one stands; `forced` when the active one is down */
function trySwap(f: FightState, side: 1 | 2, forced = false): boolean {
  const cur = side === 1 ? f.a : f.b;
  const next = benchOf(f, side);
  if (!next || next.ko) return false;
  if (!forced) {
    const busy = !!cur.clip && cur.clipName !== 'hurt';
    const held = !!(cur.status.freeze || cur.status.stop || cur.status.bubble || cur.status.root);
    if (f.swapT[side - 1] > 0 || cur.ko || busy || cur.stun > 0 || !cur.grounded || held) return false;
  }
  Object.assign(next, { x: cur.x, feet: f.w.ground, vx: 0, vy: 0, grounded: true, facing: cur.facing, clip: null, clipName: '', stun: 0, chain: 0, beam: 0, guarding: false });
  next.invuln = SWAP_INVULN;
  next.prev = { ...cur.prev };
  cur.guarding = false;
  cur.beam = 0;
  const c = next.chest();
  sparks(f.w, c.x, c.y, 22, `rgb(${next.kit.fx.mid})`, 11);
  floater(f.w, next.x, c.y - 140 * next.scale, NAMES[next.el].toUpperCase(), `rgb(${next.kit.fx.mid})`, 28);
  blip('cast');
  if (side === 1) f.a = next;
  else f.b = next;
  f.swapT[side - 1] = SWAP_COMMIT;
  f.downT[side - 1] = 0;
  return true;
}
/** the benched hero slowly gets MP and a little HP back */
function restBench(f: FightState): void {
  for (const side of [1, 2] as const) {
    const h = benchOf(f, side);
    if (!h || h.ko) continue;
    h.mp = Math.min(100, h.mp + 0.12);
    h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.0001);
    if (f.swapT[side - 1] > 0) f.swapT[side - 1]--;
  }
}
const sideDown = (list: Hero[]) => list.every((h) => h.ko);
const hpShare = (list: Hero[]) => list.reduce((s, h) => s + h.hp, 0) / list.reduce((s, h) => s + h.maxHp, 0);
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
  if (m.mode !== 'local') {
    profile.streak = won ? profile.streak + 1 : 0;
    rollDay();
    if (won) profile.qWins++;
  }
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
/** training and the tutorial: no clock, no knock-outs, every skill free to use */
const practice = (): boolean => nav.match.mode === 'training' || nav.match.mode === 'tutorial';
// ---------------------------------------------------------------- tutorial (first run, with the starting hero)
interface TutStep {
  say: string;
  keys: string;
  /** frames the action has to be held (walk, guard); 1 = once */
  hold?: number;
  done: (a: Hero) => boolean;
}
const TUT: TutStep[] = [
  { say: 'Walk left and right', keys: 'A  /  D', hold: 45, done: (a) => Math.abs(a.vx) > 3 },
  { say: 'Jump', keys: 'W  or  SPACE', done: (a) => !a.grounded },
  { say: 'Punch combo: tap attack four times', keys: 'J  J  J  J', done: (a) => a.clipName === 'rising' },
  { say: 'Heavy strike', keys: 'K', done: (a) => a.clipName === 'heavy' },
  { say: 'Element dash', keys: 'L', done: (a) => a.clipName === 'dash' },
  { say: 'Power I: {0}', keys: 'U', done: (a) => a.clipName === a.powerName(0) },
  { say: 'Power II: {1}', keys: 'I', done: (a) => a.clipName === a.powerName(1) },
  { say: 'Power III: {2}', keys: 'O', done: (a) => a.clipName === a.powerName(2) },
  { say: 'Guard: hold it to block', keys: 'S', hold: 30, done: (a) => a.guarding },
  { say: 'Ultimate: {u}', keys: 'P', done: (a) => a.clipName === 'ult' },
];
const tut = { step: 0, held: 0, nice: 0 };
function tutText(s: TutStep, a: Hero): string {
  return s.say.replace('{0}', a.kit.powers[0].name).replace('{1}', a.kit.powers[1].name).replace('{2}', a.kit.powers[2].name).replace('{u}', a.kit.ult);
}
function stepTutorial(a: Hero): void {
  if (tut.nice > 0) {
    if (--tut.nice === 0) {
      tut.step++;
      tut.held = 0;
    }
    return;
  }
  const s = TUT[tut.step];
  if (!s) return;
  if (s.done(a)) tut.held++;
  else if ((s.hold ?? 1) > 1) tut.held = Math.max(0, tut.held - 1);
  if (tut.held >= (s.hold ?? 1)) tut.nice = 45;
}
function tutorialPanel(g: G, f: FightState, t: number): void {
  const a = f.a;
  const s = TUT[tut.step];
  if (!s) {
    dim(g, 0.55);
    panel(g, 388, 210, 600, 330, { col: '#ffd24a', cut: 16, brackets: true });
    text(g, 'TUTORIAL COMPLETE', W / 2, 270, { size: 50, align: 'center', weight: 900, col: '#ffe08a', glow: '#ffb43a', blur: 20 });
    text(g, `${profile.name}, you are ready to fight with ${NAMES[a.el]}.`, W / 2, 330, { size: 24, align: 'center' });
    text(g, 'Next: pick a partner hero for your squad.', W / 2, 368, { size: 22, align: 'center', col: '#cfe4ff' });
    goldButton(g, 508, 420, 360, 76, 'PICK PARTNER', { size: 36, t, act: () => {
      profile.tutorial = true;
      save();
      nav.go('partner');
    } });
    return;
  }
  const y = 168;
  panel(g, 388, y, 600, 112, { col: tut.nice > 0 ? C.green : C.cyan, cut: 12, brackets: true });
  text(g, `TUTORIAL  ${tut.step + 1} / ${TUT.length}`, 410, y + 24, { size: 18, col: '#9fd8ff', weight: 800 });
  text(g, tutText(s, a), W / 2, y + 56, { size: 30, align: 'center', weight: 800 });
  if (tut.nice > 0) text(g, 'NICE!', W / 2, y + 92, { size: 26, align: 'center', weight: 900, col: C.green, glow: C.green, blur: 12 });
  else text(g, s.keys, W / 2, y + 92, { size: 24, align: 'center', weight: 800, col: '#ffd24a' });
  if ((s.hold ?? 1) > 1 && tut.nice === 0) bar(g, 410, y + 100, 556, 6, tut.held / (s.hold ?? 1), [C.cyanDeep, C.cyan], { glow: false });
  text(g, 'Skip', 960, y + 24, { size: 16, align: 'right', col: '#9fb8d8' });
  region(910, y + 10, 60, 28, () => (tut.step = TUT.length));
}

pages.fight = {
  title: 'Fight',
  heroes: () => [nav.match.p1, nav.match.p2, ...matesOf(nav.match).filter((e): e is El => !!e)],
  load: () => Promise.all([loadHudRefs(), useStage(nav.match.arena ?? nav.match.p2)]).then(() => undefined),
  enter() {
    startMusic();
    if (resumeFlags.fight && F) {
      resumeFlags.fight = false;
      return;
    }
    F = newRound(null);
    tut.step = tut.held = tut.nice = 0;
  },
  leave(next: PageName) {
    if (next === 'pause' || next === 'settings') pauseMusic();
    else stopMusic();
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
    const mode = nav.match.mode;
    const local = mode === 'local';
    const ka = f.phase === 'fight' ? read(P1, true) : noKeys();
    const kb = f.phase !== 'fight' || practice() ? noKeys() : local ? read(P2) : heroAI(b, a, w, mode === 'road' ? 0.7 + Math.min(0.3, profile.road / 60) : 1);
    if (f.phase === 'fight') {
      // tag swap: a fresh press of Swap (or a tap on the partner chip)
      if ((ka.swap && !a.prev.swap) || f.tapSwap) trySwap(f, 1);
      if (local && kb.swap && !b.prev.swap) trySwap(f, 2);
      // the AI brings its partner in when its hero is low and the partner is fresher
      const bb = benchOf(f, 2);
      if (!local && bb && !bb.ko && b.hp / b.maxHp < 0.35 && bb.hp / bb.maxHp > 0.5 && w.frame % 45 === 0) trySwap(f, 2);
      // a downed hero is replaced by the partner after the knock-down
      for (const side of [1, 2] as const) {
        const cur = side === 1 ? f.a : f.b;
        if (cur.ko && ++f.downT[side - 1] > 70) trySwap(f, side, true);
      }
    }
    f.tapSwap = false;
    if (f.a !== a || f.b !== b) return;
    if (practice()) {
      // every skill free; the sparring dummy gets back up
      a.mp = MP_ULT;
      if (a.ko || a.hp < a.maxHp * 0.3) Object.assign(a, { ko: false, hp: a.maxHp, clip: null, clipName: '' });
      if (b.ko && b.clipName === 'ko' && b.frame >= (b.clip?.frames ?? 1) - 1) Object.assign(b, { ko: false, hp: b.maxHp, clip: null, clipName: '' });
    }
    // the heroes walk freely through each other (no body push); hits come from hit boxes only
    a.step(w, ka);
    b.step(w, kb);
    restBench(f);
    stepWorld(w, [a, b]);
    if (f.phase === 'intro' && f.phaseT > (practice() ? 40 : 100)) {
      f.phase = 'fight';
      f.phaseT = 0;
    } else if (f.phase === 'fight' && practice()) {
      if (mode === 'tutorial') stepTutorial(a);
    } else if (f.phase === 'fight') {
      f.timer--;
      // a round ends when both heroes of one side are down, or on time-out (higher total HP share wins)
      const downA = sideDown(f.sa);
      const downB = sideDown(f.sb);
      if (downA || downB || f.timer <= 0) {
        const p1wins = downB || (!downA && hpShare(f.sa) >= hpShare(f.sb));
        f.wins[p1wins ? 0 : 1]++;
        f.timeUp = !downA && !downB;
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
    drawStage(g, FGROUND, w.frame, w.flash / 14, Math.min(1, w.dim / 40));
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
    if (f.phase === 'intro' && !practice()) {
      const s = f.phaseT < 60 ? `ROUND ${f.round}` : 'FIGHT!';
      const k = (f.phaseT % 60) / 60;
      text(g, s, W / 2, 330, { size: 100 + (1 - k) * 30, align: 'center', weight: 900, italic: true, col: '#ffe08a', stroke: '#4a1a00', sw: 8, glow: '#ffb43a', blur: 30 });
    }
    if (f.phase === 'ko') {
      text(g, f.timeUp ? 'TIME!' : 'K.O.', W / 2, 330, { size: 130, align: 'center', weight: 900, italic: true, col: '#ff5a3a', stroke: '#2a0000', sw: 10, glow: '#ff3b1a', blur: 40 });
    }
    if (nav.match.mode === 'tutorial') tutorialPanel(g, f, t);
    else if (nav.match.mode === 'training') {
      text(g, 'TRAINING · every skill is free · the dummy does not hit back · Esc to leave', W / 2, 165, { size: 20, align: 'center', col: '#cfe4ff', stroke: '#02060f', sw: 4 });
    }
    // pause button
    chamfer(g, W / 2 - 22, 104, 44, 30, 6);
    g.fillStyle = 'rgba(10,20,40,0.8)';
    g.fill();
    neon(g, C.cyan, 1.2, 6);
    text(g, 'II', W / 2, 120, { size: 18, align: 'center', weight: 800 });
    region(W / 2 - 22, 104, 44, 30, pause);
  },
};
/**
 * The round portrait under each HP bar (the picture's partner slot): the benched hero, its small HP bar, and
 * for the player the Swap key. Tapping the player's chip swaps too.
 */
function benchChip(g: G, f: FightState, side: 1 | 2): void {
  const cx = side === 1 ? 155 : 1221;
  const cy = 158;
  const h = benchOf(f, side);
  g.save();
  g.beginPath();
  g.arc(cx, cy, 31, 0, Math.PI * 2);
  g.fillStyle = '#071226';
  g.fill();
  if (h) {
    g.clip();
    const { pose } = stillPose(h.el, 'fight', f.w.frame);
    drawHero(g, h.el, { pose, face: h.ko ? 'ko' : 'normal', x: cx + (side === 1 ? -4 : 4), feet: cy + 118, scale: 0.42, facing: side === 1 ? 1 : -1, t: f.w.frame, alpha: h.ko ? 0.35 : 1 });
  }
  g.restore();
  if (!h) return;
  // commit frames after a swap: the ring fills back up
  const ready = 1 - f.swapT[side - 1] / SWAP_COMMIT;
  g.save();
  g.lineWidth = 3;
  g.strokeStyle = h.ko ? '#5a6070' : `rgb(${h.kit.fx.mid})`;
  g.shadowColor = g.strokeStyle;
  g.shadowBlur = 8;
  g.beginPath();
  g.arc(cx, cy, 32, -Math.PI / 2, -Math.PI / 2 + ready * Math.PI * 2);
  g.stroke();
  g.restore();
  bar(g, cx - 32, cy + 40, 64, 8, h.hp / h.maxHp, profile.colorblind ? ['#2a6aff', '#7ab8ff'] : ['#3ad84a', '#d8ff4a'], { back: '#050a18', glow: false });
  const local = nav.match.mode === 'local';
  if (side === 1 || local) {
    const kx = side === 1 ? cx + 46 : cx - 46;
    text(g, h.ko ? 'DOWN' : side === 1 ? 'Q SWAP' : '7 SWAP', kx, cy + 4, { size: 15, weight: 800, align: side === 1 ? 'left' : 'right', col: h.ko ? '#8a90a0' : '#ffe08a', stroke: '#02060f', sw: 4 });
  }
  if (side === 1) region(cx - 34, cy - 34, 68, 68, () => (f.tapSwap = true));
}
function fightHud(g: G, f: FightState, t: number): void {
  const N = 'fight-hud';
  const m = nav.match;
  const local = m.mode === 'local';
  drawCut(g, N, 0, 0, W, 210, 'strip', [430, 946, 130]);
  if (f.a.el !== 'fire') elementCoin(g, f.a.el, 56, 65, 44);
  if (f.b.el !== 'water') elementCoin(g, f.b.el, 1320, 65, 44);
  const n1 = local ? 'Player 1' : profile.name;
  const n2 = local ? 'Player 2' : m.p2Name;
  patch(g, N, 120, 22, 215, 28, 345, 36);
  text(g, n1, 124, 36, { size: 22 });
  text(g, `Lv. ${profile.heroLv[f.a.el]}`, 132 + n1.length * 12, 36, { size: 22, col: '#ffd24a' });
  patch(g, N, 1062, 22, 200, 28, 1040, 36);
  text(g, `Lv. ${local ? profile.heroLv[f.b.el] : m.p2Lv}`, 1252, 36, { size: 22, align: 'right', col: '#ffd24a' });
  benchChip(g, f, 1);
  benchChip(g, f, 2);
  text(g, n2, 1176, 36, { size: 22, align: 'right' });
  const cb = profile.colorblind;
  bar(g, 179, 58, 434, 27, f.a.hp / f.a.maxHp, cb ? ['#2a6aff', '#7ab8ff'] : ['#3ad84a', '#d8ff4a'], { seg: 4, back: '#050a18' });
  bar(g, 179, 91, 196, 14, f.a.mp / 100, ['#1a8ad0', '#3fe6ff'], { seg: 2, back: '#050a18' });
  g.save();
  g.translate(W, 0);
  g.scale(-1, 1);
  bar(g, 182, 58, 428, 27, f.b.hp / f.b.maxHp, cb ? ['#ffb43a', '#ffe08a'] : ['#ff2a2a', '#ffb43a'], { seg: 4, back: '#050a18' });
  bar(g, 181, 91, 190, 14, f.b.mp / 100, ['#1a8ad0', '#3fe6ff'], { seg: 2, back: '#050a18' });
  g.restore();
  patch(g, N, 646, 46, 84, 52, 650, 50);
  text(g, practice() ? '--' : String(Math.max(0, Math.ceil(f.timer / 60))), 688, 73, { size: 52, align: 'center', weight: 800 });
  const pips = (xs: number[], wins: number, sx: number) => {
    patch(g, N, xs[0] - 16, 98, xs[2] - xs[0] + 32, 24, sx, 110);
    xs.forEach((px, i) => {
      g.save();
      g.beginPath();
      g.arc(px, 110, 9, 0, Math.PI * 2);
      g.fillStyle = i < wins ? '#ffb43a' : '#0a1430';
      g.shadowColor = '#ffb43a';
      g.shadowBlur = i < wins ? 12 : 0;
      g.fill();
      g.strokeStyle = '#c8d0e0';
      g.lineWidth = 2;
      g.stroke();
      g.restore();
    });
  };
  pips([592, 560, 529], f.wins[0], 506);
  pips([782, 813, 846], f.wins[1], 870);
  if (f.comboShow > 0 && f.comboN >= 2) {
    const x = f.comboSide === 1 ? W - 150 : 170;
    g.save();
    g.translate(x, 260);
    const pop = f.comboShow > 70 ? 1.2 : 1;
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
pages.zombie = {
  title: 'Zombie Survival',
  heroes: () => [profile.hero],
  load: () => Promise.all([loadHudRefs(), useStage('lightning')]).then(() => undefined),
  leave(next: PageName) {
    if (next === 'pause' || next === 'settings') pauseMusic();
    else stopMusic();
  },
  enter() {
    startMusic();
    if (resumeFlags.zombie && Z) {
      resumeFlags.zombie = false;
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
      rollDay();
      profile.qZombie++;
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
    drawArena(g, 0.5);
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
    zombieControls(g);
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
function zombieHud(g: G, z: ZGame, t: number): void {
  const N = 'zombie-survival-hud';
  const h = z.hero;
  drawCut(g, N, 0, 0, W, 176, 'strip', [560, 900, 128]);
  if (h.el !== 'lightning') elementCoin(g, h.el, 56, 59, 38);
  patch(g, N, 114, 20, 150, 32, 270, 30);
  const nm = profile.name || NAMES[h.el];
  text(g, nm, 118, 37, { size: 21 });
  text(g, `Lv. ${profile.heroLv[h.el]}`, 124 + nm.length * 12, 37, { size: 21, col: '#ffd24a' });
  bar(g, 142, 55, 290, 23, h.hp / h.maxHp, profile.colorblind ? ['#2a6aff', '#7ab8ff'] : ['#3ad84a', '#d8ff4a'], { seg: 10, back: '#050a18' });
  bar(g, 142, 86, 128, 13, h.mp / 100, ['#1a8ad0', '#3fe6ff'], { seg: 3, back: '#050a18' });
  patch(g, N, 584, 34, 208, 52, 590, 38);
  text(g, `WAVE ${Math.max(1, z.wave)}`, 688, 61, { size: 52, align: 'center', weight: 900, col: '#ffd24a', stroke: '#3a1000', sw: 3 });
  patch(g, N, 968, 56, 40, 28, 962, 70);
  text(g, String(z.remaining), 970, 70, { size: 21, col: '#ffd24a' });
  patch(g, N, 1228, 80, 112, 30, 1224, 95);
  text(g, fmt(z.score), 1232, 95, { size: 23, col: '#ffd24a' });
  patch(g, N, 1292, 119, 48, 32, 1320, 113);
  text(g, `x${z.mult}`, 1296, 135, { size: 28, col: '#ffd24a', weight: 900 });
  if (z.boss && z.boss.alive()) {
    const b = z.boss;
    text(g, b.spec.name.toUpperCase(), 688, 118, { size: 22, align: 'center', col: '#ff8a8a', weight: 800 });
    bar(g, 438, 132, 500, 18, b.hp / b.maxHp, ['#a01010', '#ff4a2a'], { seg: 10, skew: 6, edge: '#ff6a4a' });
  }
  if (z.banner > 0) {
    g.save();
    g.globalAlpha = Math.min(1, z.banner / 20);
    text(g, z.bannerText, W / 2, 300, { size: 84, align: 'center', weight: 900, italic: true, col: z.bannerText.includes('BOSS') ? '#ff6a4a' : '#ffd24a', stroke: '#2a0a00', sw: 8, glow: '#ff9a2a', blur: 26 });
    if (z.bannerText.includes('BOSS') && z.boss) text(g, z.boss.spec.text, W / 2, 360, { size: 22, align: 'center', col: '#ffffff' });
    g.restore();
  }
  void t;
}

