import Phaser from 'phaser';
import type { Room } from 'colyseus.js';
import {
  DUEL_COUNTDOWN,
  DUEL_FLOOR,
  DUEL_H,
  DUEL_ROUNDS_TO_WIN,
  DUEL_W,
  Duel,
  ELEMENTS,
  MSG_INPUT,
  MSG_READY,
  RANK_INFO,
  fighterView,
  getSkill,
  type DuelEvent,
  type FighterView,
  type InputMessage,
  type SkillInstance,
} from '@orb/shared';
import { sfx } from '../audio';
import { presentation } from '../presentation';
import type { TouchControls } from '../ui/touch';
import type { Ui } from '../ui/ui';
import { esc, hex } from '../ui/ui';
import { drawBurst, drawShot, lookOf, type SkillLook } from '../art/skillfx';

export interface DuelSnap {
  fighters: FighterView[];
  shots: Array<{ x: number; y: number; vx: number; color: number; skill: number }>;
  phase: string;
  timer: number;
  round: number;
  winner: string;
  waiting: boolean;
}
export interface DuelSource {
  readonly online: boolean;
  readonly localId: string;
  update(dt: number): void;
  view(): DuelSnap | null;
  send(i: InputMessage): void;
  confirm(): void;
  onEvent: (e: DuelEvent) => void;
  dispose(): void;
}

/** Practice duel against a bot, fully offline. */
export class OfflineDuel implements DuelSource {
  readonly online = false;
  readonly localId = 'me';
  onEvent: (e: DuelEvent) => void = () => {};
  readonly duel: Duel;
  constructor(name: string, loadout: unknown, instances: SkillInstance[], level: number, botSkill = 0.5) {
    this.duel = new Duel(Math.random, botSkill);
    this.duel.add('me', { name, loadout, instances, level });
    this.duel.add('bot', { name: 'Practice Shadow', bot: true, level });
  }
  update(dt: number): void {
    this.duel.step(Math.min(dt, 0.05));
    for (const e of this.duel.drainEvents()) this.onEvent(e);
  }
  view(): DuelSnap {
    const d = this.duel;
    return {
      fighters: d.fighters.map((f) => fighterView(f, d)),
      shots: d.shots.map((s) => ({ x: s.x, y: s.y, vx: s.vx, color: s.color, skill: s.skill })),
      phase: d.phase,
      timer: Math.max(0, d.timer),
      round: d.round,
      winner: d.winner,
      waiting: d.fighters.length < 2,
    };
  }
  send(i: InputMessage): void {
    this.duel.input('me', { moveX: i.moveX, moveY: i.moveY, aim: 0, shooting: i.shooting, seq: i.seq, skill: i.skill ?? 0, moves: i.moves ?? 0 });
  }
  confirm(): void {
    this.duel.confirm('me');
  }
  dispose(): void {
    this.onEvent = () => {};
  }
}

/** Ranked duel on the server. */
export class OnlineDuel implements DuelSource {
  readonly online = true;
  onEvent: (e: DuelEvent) => void = () => {};
  private snap: DuelSnap | null = null;
  /** World rating result sent by the server when the match ends. */
  rated: { rating: number; delta: number; rank: number; tier: string } | null = null;
  constructor(private room: Room) {
    room.onMessage('duel', (e: DuelEvent) => this.onEvent(e));
    room.onMessage('rated', (r: { rating: number; delta: number; rank: number; tier: string }) => (this.rated = r));
    room.onStateChange((s: any) => this.ingest(s));
    if ((room.state as any)?.fighters) this.ingest(room.state);
  }
  get localId(): string {
    return this.room.sessionId;
  }
  private ingest(s: any): void {
    const fighters: FighterView[] = [];
    s.fighters.forEach((f: any, id: string) => fighters.push({ ...f.toJSON(), id }));
    const shots: DuelSnap['shots'] = [];
    s.shots.forEach((x: any) => shots.push({ x: x.x, y: x.y, vx: x.vx, color: x.color, skill: x.skill }));
    this.snap = { fighters, shots, phase: s.phase, timer: s.timer, round: s.round, winner: s.winner, waiting: s.waiting };
  }
  update(): void {}
  view(): DuelSnap | null {
    return this.snap;
  }
  send(i: InputMessage): void {
    try {
      this.room.send(MSG_INPUT, i);
    } catch {
      /* closing */
    }
  }
  confirm(): void {
    try {
      this.room.send(MSG_READY);
    } catch {
      /* closing */
    }
  }
  dispose(): void {
    this.onEvent = () => {};
  }
}

interface Fx {
  kind: 'spark' | 'beam' | 'text' | 'burst' | 'swoosh';
  look?: SkillLook;
  x: number;
  y: number;
  dir: number;
  len: number;
  color: number;
  born: number;
  ms: number;
  text?: Phaser.GameObjects.Text;
}

/** Side-view duel renderer in a "shadow" style: black silhouettes in front of a sunset. */
export class DuelScene extends Phaser.Scene {
  ui!: Ui;
  touch!: TouchControls;
  /** Called once when the match ends with true when you won. */
  onMatchEnd: (won: boolean, snap: DuelSnap) => void = () => {};
  private src: DuelSource | null = null;
  private g!: Phaser.GameObjects.Graphics;
  private bg!: Phaser.GameObjects.Graphics;
  private texts: Phaser.GameObjects.Text[] = [];
  private big!: Phaser.GameObjects.Text;
  private fxs: Fx[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private skillBits = 0;
  private moveBits = 0;
  private moveZones: Array<{ x: number; y: number; bit: number; label: string }> = [];
  private moveTexts: Phaser.GameObjects.Text[] = [];
  private seq = 0;
  private lastSend = 0;
  private ended = false;
  private confirmed = false;
  private lastCount = 0;
  private skillZones: Phaser.GameObjects.Zone[] = [];
  /** Offline practice can be paused. */
  paused = false;
  private punchTap = false;
  private skillTexts: Phaser.GameObjects.Text[] = [];
  /** One graphics object per fighter, drawn around the feet and scaled up. */
  private bodies: Phaser.GameObjects.Graphics[] = [];
  constructor() {
    super('duel');
  }
  create(): void {
    this.bg = this.add.graphics().setDepth(0);
    this.g = this.add.graphics().setDepth(10);
    this.drawBackground();
    const font = { fontFamily: 'Bangers, Impact, sans-serif', color: '#ffe9a8', stroke: '#1b0a3a', strokeThickness: 8 };
    this.big = this.add.text(DUEL_W / 2, 330, '', { ...font, fontSize: '140px' }).setOrigin(0.5).setDepth(40);
    for (let i = 0; i < 4; i++)
      this.texts.push(
        this.add
          .text(0, 0, '', { fontFamily: 'Rajdhani, sans-serif', fontStyle: 'bold', fontSize: '26px', color: '#f4eeff', stroke: '#000', strokeThickness: 4 })
          .setDepth(30),
      );
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,Z,Q,J,K,L,UP,DOWN,LEFT,RIGHT,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
    const sk = (s: number) => (e: KeyboardEvent) => {
      if (!e.repeat) this.skillBits |= 1 << s;
    };
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].forEach((k, i) => kb.on(`keydown-${k}`, sk(i)));
    const mv = (b: number) => (e: KeyboardEvent) => {
      if (!e.repeat) this.moveBits |= b;
    };
    kb.on('keydown-K', mv(1));
    kb.on('keydown-L', mv(2));
    // On-screen move buttons (also for touch): punch, kick, weapon.
    const mz = [
      { x: DUEL_W - 330, y: DUEL_H - 175, bit: 0, label: 'PUNCH\nJ' },
      { x: DUEL_W - 215, y: DUEL_H - 175, bit: 1, label: 'KICK\nK' },
      { x: DUEL_W - 100, y: DUEL_H - 175, bit: 2, label: 'WEAPON\nL' },
    ];
    for (const m of mz) {
      const z = this.add.zone(m.x, m.y, 100, 70).setInteractive().setDepth(31);
      z.on('pointerdown', () => {
        if (m.bit === 0) this.punchTap = true;
        else this.moveBits |= m.bit;
      });
      this.moveZones.push(m);
      this.moveTexts.push(
        this.add
          .text(m.x, m.y, m.label, { fontFamily: 'Bangers, Impact, sans-serif', fontSize: '22px', color: '#ffe9a8', align: 'center' })
          .setOrigin(0.5)
          .setDepth(32),
      );
    }
    for (let i = 0; i < 5; i++) {
      const z = this.add.zone(DUEL_W / 2 - 300 + i * 150, DUEL_H - 55, 140, 80).setInteractive().setDepth(31);
      z.on('pointerdown', () => (this.skillBits |= 1 << i));
      this.skillZones.push(z);
      this.skillTexts.push(
        this.add
          .text(DUEL_W / 2 - 300 + i * 150, DUEL_H - 55, '', {
            fontFamily: 'Rajdhani, sans-serif',
            fontStyle: 'bold',
            fontSize: '17px',
            color: '#f4eeff',
            align: 'center',
            wordWrap: { width: 128 },
          })
          .setOrigin(0.5)
          .setDepth(32),
      );
    }
    this.input.mouse?.disableContextMenu();
  }
  setSource(src: DuelSource | null): void {
    this.src?.dispose();
    this.src = src;
    this.ended = false;
    this.confirmed = false;
    this.fxs = [];
    this.skillBits = 0;
    this.big?.setText('');
    if (src) src.onEvent = (e) => this.onEvent(e);
    else {
      this.ui?.hideLobby();
      this.bodies.forEach((b) => b.clear());
      this.skillTexts.forEach((t) => t.setText(''));
      this.texts.forEach((t) => t.setText(''));
    }
  }
  get active(): boolean {
    return !!this.src;
  }

  private drawBackground(): void {
    const b = this.bg;
    const bands = [0x2b0f3a, 0x4a1748, 0x7a2448, 0xb23b3b, 0xe2643a, 0xf7a24a];
    bands.forEach((c, i) => b.fillStyle(c, 1).fillRect(0, (i * DUEL_FLOOR) / bands.length, DUEL_W, DUEL_FLOOR / bands.length + 2));
    b.fillStyle(0xffd38a, 0.9).fillCircle(DUEL_W / 2, 520, 170);
    b.fillStyle(0xfff0c0, 0.5).fillCircle(DUEL_W / 2, 520, 120);
    // mountains
    b.fillStyle(0x1a0a22, 1);
    b.fillPoints([{ x: 0, y: 640 }, { x: 220, y: 470 }, { x: 420, y: 600 }, { x: 640, y: 430 }, { x: 900, y: 610 }, { x: 1150, y: 450 }, { x: 1380, y: 590 }, { x: 1600, y: 480 }, { x: 1600, y: DUEL_FLOOR }, { x: 0, y: DUEL_FLOOR }], true);
    // temple pillars and a gate
    b.fillStyle(0x0c0410, 1);
    for (const x of [120, 300, 1300, 1480]) b.fillRect(x - 18, 420, 36, DUEL_FLOOR - 420);
    b.fillRect(80, 400, 260, 26).fillRect(1260, 400, 260, 26);
    // floor
    b.fillStyle(0x080208, 1).fillRect(0, DUEL_FLOOR, DUEL_W, DUEL_H - DUEL_FLOOR);
    b.lineStyle(3, 0xf7a24a, 0.6).lineBetween(0, DUEL_FLOOR, DUEL_W, DUEL_FLOOR);
  }

  private onEvent(e: DuelEvent): void {
    const now = performance.now();
    const me = this.src?.localId;
    if (e.t === 'hit') {
      this.fxs.push({ kind: 'spark', x: e.x, y: e.y, dir: 0, len: e.blocked ? 30 : 60, color: e.blocked ? 0x80d8ff : 0xffe58a, born: now, ms: 260 });
      this.popText(e.x, e.y - 30, e.blocked ? 'BLOCK' : String(e.dmg), e.blocked ? '#80d8ff' : '#ffe58a');
      if (e.id === me && presentation.prefs.motion && presentation.prefs.shake) this.cameras.main.shake(e.blocked ? 60 : 140, e.blocked ? 0.003 : 0.008);
      sfx.hit();
    } else if (e.t === 'skill') {
      const s = getSkill(e.skill);
      const look = lookOf(e.skill, e.power);
      const big = ['nova', 'cleave', 'heal', 'shield', 'buff'].includes(e.kind);
      this.fxs.push({ kind: 'burst', x: e.x + (e.kind === 'cleave' ? e.dir * 90 : 0), y: e.y, dir: e.dir, len: big ? 170 : 90, color: look.color, born: now, ms: 700, look });
      this.fxs.push({ kind: 'burst', x: e.x, y: e.y, dir: e.dir, len: 60, color: look.accent, born: now + 120, ms: 600, look: { ...look, style: (look.style + 3) % 6 } });
      this.popText(e.x, e.y - 100, s.name.toUpperCase(), '#' + look.color.toString(16).padStart(6, '0'));
      if (e.id === this.src?.localId && presentation.prefs.motion) this.cameras.main.flash(90, (look.color >> 16) & 255, (look.color >> 8) & 255, look.color & 255, false);
      sfx.skill(e.kind);
    } else if (e.t === 'beam') {
      const look = lookOf(e.skill);
      this.fxs.push({ kind: 'beam', x: e.x, y: e.y, dir: e.dir, len: e.len, color: look.color, born: now, ms: 520, look });
    } else if (e.t === 'move') {
      const heavy = /slam|thrust|blast|uppercut|flying|sweep|slash/.test(e.move);
      this.fxs.push({ kind: 'swoosh', x: e.x, y: e.move === 'sweep' ? e.y + 110 : e.y, dir: e.dir, len: heavy ? 140 : 90, color: heavy ? 0xffe58a : 0xffffff, born: now + 60, ms: 260 });
      if (heavy) this.popText(e.x + e.dir * 60, e.y - 60, e.move.toUpperCase(), '#ffe9a8');
    } else if (e.t === 'ko') {
      this.big.setText('K.O.!');
      if (presentation.prefs.motion && presentation.prefs.shake) this.cameras.main.shake(400, 0.015);
      sfx.kill();
    } else if (e.t === 'roundEnd') {
      if (!this.big.text) this.big.setText(e.winner === me ? 'ROUND WON' : 'ROUND LOST');
      sfx.roundEnd();
    } else if (e.t === 'round') {
      this.big.setText(`ROUND ${e.round}`);
    }
  }
  private popText(x: number, y: number, text: string, color: string): void {
    const t = this.add
      .text(x, y, text, { fontFamily: 'Bangers, Impact, sans-serif', fontSize: '38px', color, stroke: '#1b0a3a', strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(35);
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  update(_t: number, deltaMs: number): void {
    const g = this.g;
    g.clear();
    const src = this.src;
    if (!src) return;
    const dt = Math.min(deltaMs / 1000, 0.05);
    const now = performance.now();
    if (!(this.paused && !src.online)) src.update(dt);
    const snap = src.view();
    if (!snap) return;
    const me = snap.fighters.find((f) => f.id === src.localId);
    const foe = snap.fighters.find((f) => f.id !== src.localId);
    // input
    const k = this.keys;
    let mx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.Q.isDown || k.LEFT.isDown ? 1 : 0);
    let my = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.Z.isDown || k.UP.isDown || k.SPACE.isDown ? 1 : 0);
    const p = this.input.activePointer;
    const onButtons = p.y > DUEL_H - 220 && (p.y > DUEL_H - 100 || p.x > DUEL_W - 390);
    let attack = k.J.isDown || this.punchTap || (p.isDown && p.leftButtonDown() && !onButtons);
    this.punchTap = false;
    if (this.touch?.enabled) {
      const t = this.touch.state;
      if (Math.hypot(t.moveX, t.moveY) > 0.25) {
        mx = Math.abs(t.moveX) > 0.3 ? Math.sign(t.moveX) : 0;
        my = t.moveY < -0.6 ? -1 : t.moveY > 0.6 ? 1 : 0;
      }
      attack = attack || t.aiming;
    }
    const fighting = snap.phase === 'fight';
    if (now - this.lastSend >= (src.online ? 50 : 0)) {
      this.lastSend = now;
      this.seq++;
      src.send({
        moveX: fighting ? mx : 0,
        moveY: fighting ? my : 0,
        aimAngle: 0,
        shooting: fighting && attack,
        seq: this.seq,
        skill: fighting ? this.skillBits : 0,
        moves: fighting ? this.moveBits : 0,
      });
      this.skillBits = 0;
      this.moveBits = 0;
    }
    // world
    for (const s of snap.shots) drawShot(g, s.x, s.y, s.vx, lookOf(s.skill), now);
    // move buttons
    for (const m of this.moveZones) {
      const ready = m.bit !== 2 || !me || me.wcd <= 0;
      g.fillStyle(0x000000, 0.55).fillRoundedRect(m.x - 50, m.y - 35, 100, 70, 14);
      g.lineStyle(3, ready ? 0xffc93c : 0x555555, 1).strokeRoundedRect(m.x - 50, m.y - 35, 100, 70, 14);
    }
    snap.fighters.forEach((f, i) => {
      let b = this.bodies[i];
      if (!b) {
        b = this.add.graphics().setDepth(12);
        this.bodies[i] = b;
      }
      b.clear();
      this.drawFighter(b, { ...f, x: 0, y: 0 }, now);
      b.setPosition(f.x, f.y).setScale(1.35);
    });
    for (let i = snap.fighters.length; i < this.bodies.length; i++) this.bodies[i].clear();
    this.fxs = this.fxs.filter((f) => now - f.born < f.ms);
    for (const f of this.fxs) {
      const q = (now - f.born) / f.ms;
      if (q < 0) continue;
      if (f.kind === 'burst' && f.look) {
        drawBurst(g, f.x, f.y, f.len, q, f.look);
        continue;
      }
      if (f.kind === 'swoosh') {
        g.lineStyle(10 * (1 - q) + 2, f.color, 0.9 * (1 - q)).beginPath();
        g.arc(f.x, f.y, f.len, f.dir > 0 ? -1.2 : Math.PI - 1.2 + 2.4 * 0, f.dir > 0 ? 1.2 : Math.PI + 1.2, false);
        g.strokePath();
        continue;
      }
      if (f.kind === 'beam') {
        const sc = f.look?.scale ?? 1;
        const zig = f.look && f.look.style % 2 === 1;
        g.lineStyle((50 * (1 - q) + 6) * sc, f.color, 0.5 * (1 - q)).lineBetween(f.x, f.y, f.x + f.dir * f.len, f.y);
        if (zig) {
          const seg = 12;
          g.lineStyle(5, 0xffffff, 1 - q).beginPath();
          g.moveTo(f.x, f.y);
          for (let i = 1; i <= seg; i++) g.lineTo(f.x + (f.dir * f.len * i) / seg, f.y + (i % 2 ? -14 : 14) * sc);
          g.strokePath();
        } else g.lineStyle((12 * (1 - q) + 2) * sc, 0xffffff, 1 - q).lineBetween(f.x, f.y, f.x + f.dir * f.len, f.y);
        continue;
      } else {
        g.lineStyle(6 * (1 - q) + 2, f.color, 1 - q).strokeCircle(f.x, f.y, f.len * (0.3 + q));
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.lineBetween(f.x + Math.cos(a) * f.len * q * 0.5, f.y + Math.sin(a) * f.len * q * 0.5, f.x + Math.cos(a) * f.len * (0.4 + q), f.y + Math.sin(a) * f.len * (0.4 + q));
        }
      }
    }
    this.drawHud(g, snap, me, foe, now);
    this.lobby(snap, me, foe);
    if (snap.phase === 'matchEnd' && !this.ended && me) {
      this.ended = true;
      const won = snap.winner === me.id;
      this.big.setText(won ? 'VICTORY' : 'DEFEAT');
      this.onMatchEnd(won, snap);
    }
  }

  private lobby(snap: DuelSnap, me?: FighterView, foe?: FighterView): void {
    if (snap.phase !== 'lobby') {
      if (this.ui.lobbyVisible) this.ui.hideLobby();
      if (snap.phase === 'countdown') {
        const n = Math.ceil(snap.timer);
        if (n !== this.lastCount && n > 0) {
          this.lastCount = n;
          this.big.setText(String(n));
          sfx.click();
        }
      } else if (snap.phase === 'fight' && this.lastCount > 0) {
        this.lastCount = 0;
        this.big.setText('FIGHT!');
        sfx.reward();
        this.time.delayedCall(700, () => {
          if (this.big.text === 'FIGHT!') this.big.setText('');
        });
      }
      return;
    }
    if (this.confirmed || !me) return;
    const card = (f: FighterView | undefined, title: string) => {
      if (!f) return `<div class="lp"><b>${title}</b><div class="sub">Searching for an opponent... a ranked bot joins if nobody is found.</div></div>`;
      const skills = f.skills
        .split(',')
        .filter(Boolean)
        .map(Number)
        .map((id) => {
          const s = getSkill(id);
          return `<div class="lsk"><b style="color:${hex(RANK_INFO[s.rank].color)}">[${s.rank}]</b> <b>${esc(s.name)}</b> <i>${esc(s.kind)}</i><br /><i>${esc(s.desc)}</i></div>`;
        })
        .join('');
      return `<div class="lp" style="border-color:${hex(f.color)}"><b style="color:${hex(f.color)}">${esc(f.name)}</b>${f.bot && !this.src?.online ? ' <span class="tag">Practice</span>' : ''} ${f.ready ? '<span class="tag">Ready</span>' : ''}<div>${f.maxHp} HP</div>${skills}</div>`;
    };
    const key = `${me.ready}|${foe?.id ?? ''}|${foe?.ready ?? ''}`;
    if (!this.ui.lobbyVisible || this.ui.lobbyKey !== key) {
      const body = this.ui.showLobby(`<h2>Ranked duel</h2>
        <div class="sub">1v1, best of ${DUEL_ROUNDS_TO_WIN * 2 - 1} rounds. Starts when both confirm or in <b id="lobbytime">25</b>s. Summons, mines, stealth, portals, zones and out-of-battle skills do not work in duels.</div>
        <div class="lbar"><button data-lconfirm="1">Confirm</button></div>
        <div class="lteam">${card(me, 'You')}${card(foe, 'Opponent')}</div>
        <p class="sub"><span class="kc">A</span><span class="kc">D</span> move &middot; <span class="kc">W</span>/<span class="kc">Space</span> jump &middot; <span class="kc">S</span> block &middot; <span class="kc">J</span>/click punch (x3 combo) &middot; <span class="kc">K</span> kick (in the air: flying kick, with S: sweep) &middot; <span class="kc">L</span> weapon strike &middot; <span class="kc">1</span>-<span class="kc">5</span> skills &middot; <span class="kc">P</span> pause</p>`);
      this.ui.lobbyKey = key;
      body.querySelector('[data-lconfirm]')?.addEventListener('click', () => {
        this.confirmed = true;
        this.src?.confirm();
        this.ui.hideLobby();
      });
    }
    const t = document.getElementById('lobbytime');
    if (t) t.textContent = String(Math.ceil(snap.timer));
    void DUEL_COUNTDOWN;
  }

  private drawHud(g: Phaser.GameObjects.Graphics, snap: DuelSnap, me: FighterView | undefined, foe: FighterView | undefined, now: number): void {
    const bar = (f: FighterView | undefined, left: boolean, ti: number) => {
      const w = 620;
      const x = left ? 40 : DUEL_W - 40 - w;
      g.fillStyle(0x000000, 0.6).fillRect(x - 4, 26, w + 8, 34);
      if (!f) return;
      const frac = Math.max(0, f.hp / f.maxHp);
      g.fillStyle(0x3a0d16, 1).fillRect(x, 30, w, 26);
      g.fillStyle(frac > 0.3 ? 0xffc93c : 0xff4d5e, 1).fillRect(left ? x : x + w * (1 - frac), 30, w * frac, 26);
      g.fillStyle(0x4dd2ff, 1).fillRect(left ? x : x + w * (1 - f.mp / 100), 62, w * (f.mp / 100), 6);
      for (let i = 0; i < DUEL_ROUNDS_TO_WIN; i++)
        g.fillStyle(i < f.wins ? 0xffc93c : 0x333333, 1).fillCircle(left ? x + 14 + i * 26 : x + w - 14 - i * 26, 86, 9);
      this.texts[ti]
        .setText(`${f.name}  ${f.hp}/${f.maxHp}`)
        .setPosition(left ? x : x + w, 98)
        .setOrigin(left ? 0 : 1, 0);
    };
    bar(me, true, 0);
    bar(foe, false, 1);
    this.texts[2].setText(snap.phase === 'fight' ? String(Math.ceil(snap.timer)) : `R${snap.round}`).setPosition(DUEL_W / 2, 30).setOrigin(0.5, 0).setFontSize(44);
    // skill boxes
    const ids = me?.skills ? me.skills.split(',').map(Number) : [];
    const cds = me?.cds ? me.cds.split(',') : [];
    const lines: string[] = [];
    ids.forEach((id, i) => {
      const s = getSkill(id);
      const [rem, tot] = (cds[i] ?? '0:1').split(':').map(Number);
      const x = DUEL_W / 2 - 300 + i * 150;
      const y = DUEL_H - 55;
      const col = ELEMENTS[s.element]?.color ?? RANK_INFO[s.rank].color;
      g.fillStyle(0x000000, 0.65).fillRoundedRect(x - 68, y - 38, 136, 76, 10);
      g.lineStyle(3, col, rem > 0 ? 0.4 : 1).strokeRoundedRect(x - 68, y - 38, 136, 76, 10);
      if (rem > 0) g.fillStyle(0x000000, 0.6).fillRect(x - 66, y - 36, 132 * Math.min(1, rem / Math.max(0.1, tot)), 72);
      lines.push(`${i + 1}`);
      this.skillTexts[i]?.setText(`${i + 1}  ${s.name}${rem > 0 ? `\n${Math.ceil(rem)}s` : ''}`);
    });
    for (let i = ids.length; i < this.skillTexts.length; i++) this.skillTexts[i].setText('');
    this.texts[3].setText('');
    void lines;
    void now;
  }

  /** A fighter silhouette posed by its current action. */
  private drawFighter(g: Phaser.GameObjects.Graphics, f: FighterView, now: number): void {
    const s = f.facing;
    const x = f.x;
    const y = f.y;
    const t = f.actT;
    const ink = 0x050208;
    const rim = f.color;
    const bob = f.act === 'idle' ? Math.sin(now / 220) * 3 : 0;
    const walk = f.act === 'walk' ? Math.sin(now / 90) : 0;
    let lean = 0;
    let hipY = y - 70 + bob;
    if (f.act === 'block') hipY += 10;
    if (f.act === 'hurt') lean = -0.25;
    if (f.act === 'ko' || f.act === 'down') {
      g.fillStyle(ink, 1).fillEllipse(x, y - 12, 150, 26);
      g.fillCircle(x - s * 80, y - 16, 16);
      g.lineStyle(2, rim, 0.6).strokeEllipse(x, y - 12, 150, 26);
      return;
    }
    const mv = f.act === 'attack' ? f.move : '';
    if (mv === 'sweep') hipY += 40;
    if (mv === 'uppercut') lean = 0.2;
    const neck = { x: x + s * lean * 40, y: hipY - 55 };
    const head = { x: neck.x + s * 4, y: neck.y - 22 };
    // aura when buffed or shielded
    if (f.shield) g.lineStyle(6, 0x80d8ff, 0.5 + 0.3 * Math.sin(now / 80)).strokeEllipse(x, y - 80, 130, 190);
    if (f.buff) g.fillStyle(0xff5e3a, 0.15 + 0.1 * Math.sin(now / 70)).fillEllipse(x, y - 80, 150, 210);
    // legs
    const legLen = 70;
    const kick = (mv === 'kick' || mv === 'flying kick') && t > 0.06 && t < 0.32;
    let legA = kick ? { x: x + s * 92, y: hipY - (mv === 'flying kick' ? 5 : 25) } : { x: x + s * (14 + walk * 22), y: y };
    if (mv === 'sweep' && t > 0.08 && t < 0.3) legA = { x: x + s * 105, y: y - 4 };
    const legB = { x: x - s * (14 + walk * 22), y: y };
    if (f.act === 'jump') {
      legA.y = hipY + 30;
      legB.y = hipY + 36;
    }
    g.lineStyle(16, ink, 1);
    g.lineBetween(x, hipY, legA.x, legA.y);
    g.lineBetween(x, hipY, legB.x, legB.y);
    void legLen;
    // torso
    g.lineStyle(26, ink, 1).lineBetween(x, hipY, neck.x, neck.y);
    // arms
    const punch = (mv === 'jab' || mv === 'cross') && t > 0.06 && t < 0.2;
    const upper = mv === 'uppercut' && t > 0.1 && t < 0.28;
    const strike = !!mv && !['jab', 'cross', 'uppercut', 'kick', 'flying kick', 'sweep'].includes(mv) && t > 0.08;
    const cast = f.act === 'cast';
    const shoulder = { x: neck.x, y: neck.y + 10 };
    let handF = { x: shoulder.x + s * 30, y: shoulder.y + 30 };
    let handB = { x: shoulder.x - s * 20, y: shoulder.y + 34 };
    if (punch) handF = { x: shoulder.x + s * 80, y: shoulder.y };
    if (upper) handF = { x: shoulder.x + s * 40, y: shoulder.y - 70 };
    if (strike) {
      const k = Math.min(1, (t - 0.08) / 0.2);
      const ang = -1.4 + k * 2;
      handF = { x: shoulder.x + s * Math.cos(ang) * 80, y: shoulder.y + Math.sin(ang) * 80 };
      g.lineStyle(4, rim, 0.5 * (1 - k)).beginPath();
      g.arc(shoulder.x, shoulder.y, 110, s > 0 ? -1.4 : Math.PI - 0.6, s > 0 ? 0.6 : Math.PI + 1.4, false);
      g.strokePath();
    }
    if (cast) handF = { x: shoulder.x + s * 70, y: shoulder.y - 20 };
    if (f.act === 'block') {
      handF = { x: shoulder.x + s * 22, y: shoulder.y - 22 };
      handB = { x: shoulder.x + s * 14, y: shoulder.y - 10 };
    }
    g.lineStyle(12, ink, 1);
    g.lineBetween(shoulder.x, shoulder.y, handB.x, handB.y);
    g.lineBetween(shoulder.x, shoulder.y, handF.x, handF.y);
    // weapon in the front hand
    this.drawWeapon(g, f.weapon, handF.x, handF.y, s, rim);
    // head and glowing eyes
    g.fillStyle(ink, 1).fillCircle(head.x, head.y, 18);
    g.fillStyle(rim, 1).fillCircle(head.x + s * 8, head.y - 3, 3.5);
    // rim light so silhouettes read against the sunset
    g.lineStyle(2, rim, 0.8).strokeCircle(head.x, head.y, 19);
    g.lineStyle(2, rim, 0.5).lineBetween(x + s * 2, hipY, neck.x + s * 2, neck.y);
    if (f.acc === 1) g.fillStyle(0xffc93c, 1).fillTriangle(head.x - 14, head.y - 14, head.x, head.y - 36, head.x + 14, head.y - 14);
    if (f.acc === 2) {
      g.fillStyle(ink, 1).fillTriangle(head.x - 14, head.y - 10, head.x - 22, head.y - 34, head.x - 4, head.y - 16);
      g.fillTriangle(head.x + 14, head.y - 10, head.x + 22, head.y - 34, head.x + 4, head.y - 16);
    }
    if (f.acc === 3) g.lineStyle(3, 0xffe9a8, 0.9).strokeEllipse(head.x, head.y - 26, 34, 9);
    if (f.acc === 4) g.fillStyle(ink, 1).fillTriangle(head.x - 22, head.y - 10, head.x + 22, head.y - 10, head.x + s * 6, head.y - 50);
    if (f.acc === 5) g.lineStyle(5, 0xff1744, 1).lineBetween(head.x - 18, head.y - 6, head.x + 18, head.y - 6);
    if (f.acc === 6) {
      g.fillStyle(ink, 1).fillTriangle(head.x - 16, head.y - 8, head.x - 12, head.y - 30, head.x - 2, head.y - 14);
      g.fillTriangle(head.x + 16, head.y - 8, head.x + 12, head.y - 30, head.x + 2, head.y - 14);
    }
    if (f.acc === 7) g.fillStyle(0x4dd2ff, 0.9).fillRect(head.x - 12 + s * 4, head.y - 6, 24, 6);
    if (f.acc === 8) {
      g.lineStyle(2, ink, 1).lineBetween(head.x, head.y - 18, head.x + 6, head.y - 38);
      g.fillStyle(0xff4da6, 1).fillCircle(head.x + 6, head.y - 40, 4);
    }
  }
  private drawWeapon(g: Phaser.GameObjects.Graphics, w: number, hx: number, hy: number, s: number, rim: number): void {
    const ink = 0x050208;
    g.lineStyle(2, rim, 0.6);
    switch (w) {
      case 1:
        g.fillStyle(ink, 1).fillRect(hx - (s < 0 ? 46 : 0), hy - 7, 46, 14).strokeRect(hx - (s < 0 ? 46 : 0), hy - 7, 46, 14);
        break;
      case 2:
        g.fillStyle(ink, 1).fillRect(hx - (s < 0 ? 80 : 0), hy - 4, 80, 8).strokeRect(hx - (s < 0 ? 80 : 0), hy - 4, 80, 8);
        break;
      case 3:
        g.fillStyle(ink, 1).fillRect(hx - (s < 0 ? 34 : 0), hy - 6, 34, 12).fillRect(hx + s * 10 - 4, hy, 8, 18);
        break;
      case 4:
        g.fillStyle(ink, 1).fillCircle(hx + s * 18, hy, 16).strokeCircle(hx + s * 18, hy, 16);
        break;
      case 5:
        g.fillStyle(ink, 1).fillRect(hx - (s < 0 ? 30 : 0), hy - 10, 30, 7).fillRect(hx - (s < 0 ? 30 : 0), hy + 3, 30, 7);
        break;
      default:
        // a blade for the default blaster in duels
        g.lineStyle(6, ink, 1).lineBetween(hx, hy, hx + s * 60, hy - 50);
        g.lineStyle(2, rim, 0.7).lineBetween(hx, hy, hx + s * 60, hy - 50);
    }
  }
}
