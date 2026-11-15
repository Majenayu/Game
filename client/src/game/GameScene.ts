import Phaser from 'phaser';
import {
  COUNTDOWN_SECONDS,
  EMOTES,
  MP_COST_SCALE,
  getSkill,
  type Kind,
  EFFECTS,
  ELEMENTS,
  MODES,
  PICKUP_RADIUS,
  PLAYER_RADIUS,
  RARITIES,
  RESPAWN_DELAY,
  SCOREBOARD_TIME,
  TEAM_COLORS,
  WORLD_H,
  WORLD_W,
  getMap,
  powerupFromId,
  powerupName,
  type EffectId,
  type MapDef,
  type ModeId,
  type PlayerView,
  type SimEvent,
} from '@orb/shared';
import { sfx } from '../audio';
import type { TouchControls } from '../ui/touch';
import type { Ui } from '../ui/ui';
import { Predictor } from './predict';
import { OnlineSource } from './sources';
import type { GameSource, Snapshot } from './types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: number;
  size: number;
}

/** A short lived visual from a beam or swing event. */
interface Fx {
  kind: 'beam' | 'swing' | 'ring';
  x: number;
  y: number;
  angle: number;
  size: number;
  color: number;
  born: number;
  ms: number;
}

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

export interface RoundResult {
  mode: ModeId;
  players: PlayerView[];
  meId: string;
  winner: string;
  winnerTeam: number;
  teamScore: [number, number];
  won: boolean;
  me?: PlayerView;
}

export interface SceneHooks {
  /** True while the player is actively in a live round (drives SDK gameplayStart/Stop). */
  onPlayingChange(playing: boolean): void;
  /** Called once when a round ends. May return HTML (rewards) to show on the scoreboard. */
  onRoundEnd(result: RoundResult): string;
  /** Every simulation event, with the local player id. */
  onEvent(ev: SimEvent, meId: string): void;
  /** Every frame with the latest view (lobby panel). */
  onFrame?(snap: Snapshot, me: PlayerView | undefined, players: PlayerView[]): void;
}

const TRAIL_MS = 450;
const ZONE_COLOR: Record<string, number> = {
  barrier: 0x4dd2ff,
  heal: 0x7dff6b,
  slow: 0xb77dff,
  pull: 0xff5e8a,
};

export class GameScene extends Phaser.Scene {
  ui!: Ui;
  touch!: TouchControls;
  hooks: SceneHooks = { onPlayingChange: () => {}, onRoundEnd: () => '', onEvent: () => {} };

  private source: GameSource | null = null;
  private predictor = new Predictor();
  private bg!: Phaser.GameObjects.Graphics;
  private g!: Phaser.GameObjects.Graphics;
  private map!: MapDef;
  private names = new Map<string, Phaser.GameObjects.Text>();
  /** Quick-chat bubbles above orbs, removed when they expire. */
  private bubbles = new Map<string, { text: Phaser.GameObjects.Text; until: number }>();
  private particles: Particle[] = [];
  private fxs: Fx[] = [];
  private trails = new Map<string, TrailPoint[]>();
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private seq = 0;
  private lastSend = 0;
  private lastSentAt = 0;
  private skillBits = 0;
  private knownBullets = new Set<string>();
  private lastOtherShot = 0;
  private lastOtherSkill = 0;
  private prevPhase: 'play' | 'scoreboard' | null = null;
  private prevMode: ModeId | null = null;
  private prevRound = 0;
  private scoreboardStart = 0;
  private rewardHtml = '';
  private deadSince = 0;
  private wasPlaying = false;
  private localAim = 0;
  /** Hide the end of round scoreboard (campaign levels show their own result). */
  suppressBoard = false;
  /** Auto skills: casts attack and defence skills by itself and aims them at the nearest enemy. */
  autoSkills = localStorage.getItem('orb.auto') === '1';
  private nextAuto = 0;
  private autoTarget: { x: number; y: number } | null = null;
  private autoAim = 0;
  private autoAimUntil = 0;
  private lastHold = 0;
  private goUntil = 0;

  constructor() {
    super('game');
  }

  create(): void {
    this.bg = this.add.graphics().setDepth(0);
    this.g = this.add.graphics().setDepth(10);
    this.applyMap('neon');
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E,SHIFT') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    kb.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    // event based, so even a very quick tap (down and up inside one frame) always counts
    const skillKey = (slot: number) => (ev: KeyboardEvent) => {
      if (!ev.repeat) this.queueSkill(slot);
    };
    kb.on('keydown-SPACE', skillKey(0));
    kb.on('keydown-E', skillKey(1));
    kb.on('keydown-SHIFT', skillKey(1));
    kb.on('keydown-ONE', skillKey(0));
    kb.on('keydown-TWO', skillKey(1));
    kb.on('keydown-THREE', skillKey(2));
    kb.on('keydown-FOUR', skillKey(3));
    kb.on('keydown-FIVE', skillKey(4));
    this.input.mouse?.disableContextMenu();
    this.game.events.on(Phaser.Core.Events.BLUR, () => {
      for (const k of Object.values(this.keys)) k.reset();
    });
  }

  toggleAuto(on = !this.autoSkills): boolean {
    this.autoSkills = on;
    localStorage.setItem('orb.auto', on ? '1' : '0');
    return on;
  }
  /** Picks a ready skill by situation: defend when hurt, attack enemies in range. */
  private runAuto(me: PlayerView, players: PlayerView[], snap: Snapshot, now: number): void {
    this.autoTarget = null;
    if (!this.autoSkills || !me.alive || me.hold > 0) return;
    const team = MODES[snap.mode].team;
    let target: PlayerView | null = null;
    let best = 1e9;
    for (const o of players) {
      if (o.id === me.id || !o.alive || o.hidden || (team && o.team === me.team)) continue;
      const d = Math.hypot(o.x - me.x, o.y - me.y);
      if (d < best) {
        best = d;
        target = o;
      }
    }
    // Auto also aims and fires the main weapon at the nearest enemy in range, every frame.
    if (target && best < 650) this.autoTarget = { x: target.x, y: target.y };
    if (me.casting > 0) {
      this.autoAimUntil = Math.max(this.autoAimUntil, now + 120);
      return;
    }
    if (now < this.nextAuto) return;
    this.nextAuto = now + 160;
    const ids = me.skills ? me.skills.split(',').map(Number) : [];
    const cds = me.cds ? me.cds.split(',').map((c) => Number(c.split(':')[0])) : [];
    const ready: Array<{ slot: number; kind: Kind; range: number }> = [];
    ids.forEach((id, slot) => {
      if (!Number.isFinite(id) || (cds[slot] ?? 0) > 0) return;
      const s = getSkill(id);
      if (s.kind === 'world' || me.mp < s.base.mp * MP_COST_SCALE) return;
      ready.push({ slot, kind: s.kind, range: s.base.range || 500 });
    });
    if (!ready.length) return;
    const pick = (kinds: Kind[], maxDist = 1e9) =>
      ready.find((r) => kinds.includes(r.kind) && best <= Math.min(maxDist, r.range + 60));
    const low = me.hp <= Math.max(1, Math.floor(me.maxHp / 3));
    let choice: { slot: number } | undefined;
    if (low) choice = ready.find((r) => ['heal', 'shield', 'barrier', 'stealth'].includes(r.kind));
    if (!choice && target) {
      choice =
        pick(['cleave', 'nova', 'pull', 'slow'], 190) ??
        pick(['beam', 'projectile', 'volley', 'ambush'], 760) ??
        pick(['summon', 'mine', 'buff', 'aura'], 420) ??
        (best < 220 ? ready.find((r) => r.kind === 'shield' || r.kind === 'barrier') : undefined);
    }
    if (!choice) return;
    if (target) {
      this.autoAim = Math.atan2(target.y - me.y, target.x - me.x);
      this.autoAimUntil = now + 600;
    }
    this.queueSkill(choice.slot);
  }
  /** Queue a skill press (slot 0 to 4). Sent with the next input message. */
  queueSkill(slot: number): void {
    this.skillBits |= 1 << slot;
  }

  setSource(src: GameSource | null): void {
    this.source?.dispose();
    this.source = src;
    this.prevPhase = null;
    this.prevMode = null;
    this.prevRound = 0;
    this.knownBullets.clear();
    this.particles = [];
    this.fxs = [];
    this.trails.clear();
    this.predictor = new Predictor();
    this.seq = 0;
    this.skillBits = 0;
    this.deadSince = 0;
    this.rewardHtml = '';
    this.ui.hideScoreboard();
    this.ui.banner(null);
    this.clearNames();
    if (!src) {
      this.setPlaying(false);
      return;
    }
    src.onEvent = (ev) => this.handleEvent(ev);
    src.onEmote = (id, e) => this.showEmote(id, e);
    if (src instanceof OnlineSource) {
      src.onServerState = (me) => {
        if (!me) return;
        this.predictor.speed = me.spd;
        if (!me.alive || this.prevPhase === 'scoreboard') this.predictor.reset(me.x, me.y);
        else this.predictor.onServer(me.x, me.y, me.seq, (performance.now() - this.lastSentAt) / 1000);
      };
    }
  }

  get activeSource(): GameSource | null {
    return this.source;
  }
  get hasSource(): boolean {
    return this.source !== null;
  }

  get mapId(): string {
    return this.map?.id ?? 'neon';
  }

  private setPlaying(p: boolean): void {
    if (p !== this.wasPlaying) {
      this.wasPlaying = p;
      this.hooks.onPlayingChange(p);
    }
  }

  private clearNames(): void {
    for (const t of this.names.values()) t.destroy();
    this.names.clear();
    for (const b of this.bubbles.values()) b.text.destroy();
    this.bubbles.clear();
  }
  /** Sends a quick-chat line from the local player. */
  sendEmote(e: number): void {
    this.source?.sendEmote(e);
  }
  private showEmote(id: string, e: number): void {
    const line = EMOTES[e];
    if (!line) return;
    let b = this.bubbles.get(id);
    if (!b) {
      const text = this.add
        .text(0, 0, '', {
          fontFamily: 'Rajdhani, Trebuchet MS, sans-serif',
          fontStyle: 'bold',
          fontSize: '18px',
          color: '#1b0a3a',
          backgroundColor: '#ffe9a8',
          padding: { x: 8, y: 3 },
        })
        .setOrigin(0.5, 1)
        .setDepth(31);
      b = { text, until: 0 };
      this.bubbles.set(id, b);
    }
    b.text.setText(line).setVisible(true);
    b.until = performance.now() + 2600;
    sfx.click();
  }

  // ---- arena drawing ---------------------------------------------------------

  private applyMap(id: string): void {
    this.map = getMap(id);
    this.predictor.obstacles = this.map.obstacles;
    const m = this.map;
    const t = m.theme;
    const bg = this.bg;
    bg.clear();
    bg.fillStyle(t.bg, 1).fillRect(0, 0, WORLD_W, WORLD_H);
    bg.lineStyle(1, t.grid, 1);
    for (let x = 0; x <= WORLD_W; x += 100) bg.lineBetween(x, 0, x, WORLD_H);
    for (let y = 0; y <= WORLD_H; y += 100) bg.lineBetween(0, y, WORLD_W, y);
    for (const h of m.hazards) {
      bg.fillStyle(t.hazard, 0.28).fillRoundedRect(h.x, h.y, h.w, h.h, 10);
      bg.lineStyle(2, t.hazard, 0.9).strokeRoundedRect(h.x, h.y, h.w, h.h, 10);
    }
    for (const o of m.obstacles) {
      bg.fillStyle(t.wallLine, 0.12).fillRoundedRect(o.x - 8, o.y - 8, o.w + 16, o.h + 16, 8);
      bg.fillStyle(t.wall, 1).fillRoundedRect(o.x, o.y, o.w, o.h, 4);
      bg.lineStyle(2, t.wallLine, 1).strokeRoundedRect(o.x, o.y, o.w, o.h, 4);
    }
    bg.lineStyle(6, t.accent, 0.25).strokeRect(0, 0, WORLD_W, WORLD_H);
    bg.lineStyle(2, t.accent, 0.9).strokeRect(1, 1, WORLD_W - 2, WORLD_H - 2);
  }

  // ---- events --------------------------------------------------------------

  private handleEvent(ev: SimEvent): void {
    const me = this.source?.localId ?? '';
    this.hooks.onEvent(ev, me);
    switch (ev.t) {
      case 'hit':
        this.burst(ev.x, ev.y, 0xff5e8a, 8);
        if (ev.id === me || ev.by === me) this.pop(ev.x, ev.y - 34, 'HIT!', '#ffffff', 26);
        if (ev.id === me) {
          sfx.hit();
          this.cameras.main.shake(120, 0.006);
        } else if (ev.by === me) sfx.hit();
        break;
      case 'kill':
        this.burst(ev.x, ev.y, 0xffffff, 26);
        this.pop(ev.x, ev.y - 40, 'K.O.!', '#ffe58a', 44);
        if (ev.id === me) {
          sfx.kill();
          this.cameras.main.shake(220, 0.012);
          this.deadSince = performance.now();
        } else if (ev.by === me) {
          sfx.kill();
          this.ui.notify('Eliminated!', '#ffc93c');
        }
        break;
      case 'pickup': {
        this.burst(ev.x, ev.y, 0xffc93c, 14);
        if (ev.id === me) {
          sfx.pickup();
          const pu = powerupFromId(ev.pu);
          if (pu)
            this.ui.notify(powerupName(pu), '#' + RARITIES[pu.rarity].color.toString(16).padStart(6, '0'));
        }
        break;
      }
      case 'coin':
        this.burst(ev.x, ev.y, 0xffd54f, 5);
        if (ev.id === me) sfx.coin();
        break;
      case 'cast': {
        this.burst(ev.x, ev.y, 0xffffff, 4);
        if (ev.id === me) sfx.skill('cast');
        break;
      }
      case 'skill': {
        const col = ELEMENTS[ev.element]?.color ?? 0xffffff;
        const wide = ['nova', 'aura', 'barrier', 'heal', 'slow', 'pull', 'shield'].includes(ev.kind);
        this.burst(ev.x, ev.y, col, wide ? 60 : 36);
        const t0 = performance.now();
        this.fxs.push({ kind: 'ring', x: ev.x, y: ev.y, angle: 0, size: wide ? 260 : 150, color: col, born: t0, ms: 800 });
        this.fxs.push({ kind: 'ring', x: ev.x, y: ev.y, angle: 0, size: wide ? 170 : 100, color: 0xffffff, born: t0 + 90, ms: 650 });
        const sk = getSkill(ev.skill);
        if (sk) {
          const hexCol = '#' + col.toString(16).padStart(6, '0');
          this.pop(ev.x, ev.y - 58, sk.name.toUpperCase(), hexCol, ev.id === me ? 30 : 22);
        }
        if (ev.id === me) this.cameras.main.flash(120, (col >> 16) & 255, (col >> 8) & 255, col & 255, false);
        if (ev.id === me) sfx.skill(ev.kind);
        else if (performance.now() - this.lastOtherSkill > 150) {
          this.lastOtherSkill = performance.now();
          sfx.skill(ev.kind);
        }
        break;
      }
      case 'beam':
        this.fxs.push({
          kind: 'beam',
          x: ev.x,
          y: ev.y,
          angle: ev.angle,
          size: ev.len,
          color: ELEMENTS[ev.element]?.color ?? 0xffffff,
          born: performance.now(),
          ms: 650,
        });
        break;
      case 'swing':
        this.fxs.push({
          kind: 'swing',
          x: ev.x,
          y: ev.y,
          angle: ev.angle,
          size: ev.r,
          color: ELEMENTS[ev.element]?.color ?? 0xffffff,
          born: performance.now(),
          ms: 520,
        });
        break;
      case 'shield':
        this.burst(ev.x, ev.y, 0x7dff6b, 10);
        sfx.shieldBreak();
        break;
      case 'boom':
        this.burst(ev.x, ev.y, 0xff8a3c, 30);
        sfx.boom();
        if (this.source && Math.hypot(ev.x - this.predictor.x, ev.y - this.predictor.y) < 400)
          this.cameras.main.shake(140, 0.005);
        break;
      case 'respawn':
        this.burst(ev.x, ev.y, 0x4dd2ff, 12);
        if (ev.id === me) sfx.respawn();
        break;
      case 'roundEnd':
        sfx.roundEnd();
        break;
      case 'form': {
        this.burst(ev.x, ev.y, 0xff1744, 80);
        this.fxs.push({ kind: 'ring', x: ev.x, y: ev.y, angle: 0, size: 420, color: 0xff1744, born: performance.now(), ms: 1100 });
        this.pop(ev.x, ev.y - 80, ev.name.toUpperCase() + '!', '#ff5e8a', 46);
        this.ui.notify(`Boss form change: ${ev.name}! Stronger attack and defence.`, '#ff5e8a', 3500);
        this.cameras.main.shake(400, 0.015);
        sfx.boom();
        break;
      }
      case 'domain':
        this.ui.notify(`DOMAIN EXPANSION: ${ev.name}`, '#' + ev.color.toString(16).padStart(6, '0'), 4500);
        this.cameras.main.flash(500, (ev.color >> 16) & 255, (ev.color >> 8) & 255, ev.color & 255, false);
        sfx.roundEnd();
        break;
      default:
        break;
    }
  }

  private burst(x: number, y: number, color: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 260;
      const life = 0.3 + Math.random() * 0.4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life,
        max: life,
        color,
        size: 2 + Math.random() * 3,
      });
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }

  // ---- input ---------------------------------------------------------------

  private readInput(
    px: number,
    py: number,
  ): { moveX: number; moveY: number; aim: number; shooting: boolean } {
    const k = this.keys;
    let mx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let my = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    let aim = this.localAim;
    let shooting = false;
    if (this.touch.enabled) {
      const t = this.touch.state;
      if (Math.hypot(t.moveX, t.moveY) > 0.12) {
        mx = t.moveX;
        my = t.moveY;
      }
      if (t.aiming) {
        aim = t.aimAngle;
        shooting = true;
      }
    } else {
      const p = this.input.activePointer;
      aim = Math.atan2(p.worldY - py, p.worldX - px);
      shooting = p.isDown && p.leftButtonDown();
    }
    return { moveX: mx, moveY: my, aim, shooting };
  }

  // ---- frame ---------------------------------------------------------------

  update(_time: number, deltaMs: number): void {
    const g = this.g;
    g.clear();
    const src = this.source;
    if (!src) {
      this.setPlaying(false);
      return;
    }
    const dt = Math.min(deltaMs / 1000, 0.05);
    const now = performance.now();
    src.update(dt);
    const snap = src.view(now);
    if (!snap) return;

    if (snap.mapId !== this.map.id) this.applyMap(snap.mapId);
    this.announceMode(snap);

    const meView = snap.players.find((p) => p.id === src.localId);
    const playing = snap.phase === 'play' && !document.hidden;
    this.setPlaying(playing);

    let px = meView?.x ?? WORLD_W / 2;
    let py = meView?.y ?? WORLD_H / 2;
    const canMove = !!meView && meView.alive && snap.phase === 'play' && meView.hold <= 0;
    if (src.online) {
      if (!this.predictor.initialised && meView) this.predictor.reset(meView.x, meView.y);
      if (meView) this.predictor.speed = meView.spd;
      px = this.predictor.x;
      py = this.predictor.y;
    }
    const input = this.readInput(px, py);
    if (this.autoSkills && this.autoTarget) {
      input.aim = Math.atan2(this.autoTarget.y - py, this.autoTarget.x - px);
      input.shooting = true;
    }
    if (now < this.autoAimUntil) input.aim = this.autoAim;
    this.localAim = input.aim;
    const send = canMove ? input : { moveX: 0, moveY: 0, aim: input.aim, shooting: false };
    if (!canMove) this.skillBits = 0;

    if (src.online) {
      if (canMove) this.predictor.step(send.moveX, send.moveY, dt);
      if (now - this.lastSend >= 50) {
        this.lastSend = now;
        this.lastSentAt = now;
        this.seq++;
        src.sendInput({
          moveX: send.moveX,
          moveY: send.moveY,
          aimAngle: send.aim,
          shooting: send.shooting,
          seq: this.seq,
          skill: this.skillBits,
        });
        this.skillBits = 0;
        this.predictor.recordSent(this.seq, send.moveX, send.moveY);
      }
    } else {
      this.seq++;
      src.sendInput({
        moveX: send.moveX,
        moveY: send.moveY,
        aimAngle: send.aim,
        shooting: send.shooting,
        seq: this.seq,
        skill: this.skillBits,
      });
      this.skillBits = 0;
    }

    const players: PlayerView[] = snap.players.map((p) =>
      p.id === src.localId
        ? {
            ...p,
            x: src.online ? this.predictor.x : p.x,
            y: src.online ? this.predictor.y : p.y,
            aim: this.localAim,
          }
        : p,
    );
    const me = players.find((p) => p.id === src.localId);

    this.handlePhase(snap, players, me, now);
    this.detectShots(snap.bullets, src.localId, now);
    this.render(g, players, snap, src.localId, now, dt);
    this.hooks.onFrame?.(snap, me, players);

    if (me) {
      this.runAuto(me, players, snap, now);
      // 3, 2, 1, GO! (only after the lobby, while the countdown runs)
      if (snap.phase === 'play' && snap.lobby <= 0 && me.hold > 0 && me.hold <= COUNTDOWN_SECONDS + 0.05) {
        const n = Math.ceil(me.hold);
        if (n !== this.lastHold) {
          this.lastHold = n;
          sfx.click();
        }
        this.ui.countdown(String(n));
      } else if (this.lastHold > 0 && me.hold <= 0) {
        this.lastHold = 0;
        this.goUntil = now + 800;
        sfx.reward();
        this.ui.countdown('GO!');
      } else if (now > this.goUntil) this.ui.countdown(null);
      this.ui.updateHud(now, me, players, snap);
      if (snap.phase === 'scoreboard') {
        this.ui.banner(null);
      } else if (!me.alive) {
        const left = Math.max(1, Math.ceil(RESPAWN_DELAY - (now - (this.deadSince || now)) / 1000));
        this.ui.banner(`Respawning in ${left}`);
      } else {
        this.ui.banner(null);
      }
      if (me.alive) this.deadSince = 0;
      else if (!this.deadSince) this.deadSince = now;
    }
  }

  private announceMode(snap: Snapshot): void {
    if (snap.mode !== this.prevMode || (snap.round !== this.prevRound && snap.phase === 'play')) {
      this.prevMode = snap.mode;
      this.prevRound = snap.round;
      this.ui.notify(`${MODES[snap.mode].name} on ${getMap(snap.mapId).name}`, '#4dd2ff', 3200);
      this.ui.notify(MODES[snap.mode].desc, '#e8ecff', 3200);
    }
  }

  private handlePhase(snap: Snapshot, players: PlayerView[], me: PlayerView | undefined, now: number): void {
    const phase = snap.phase;
    if (phase !== this.prevPhase) {
      if (phase === 'scoreboard') {
        this.scoreboardStart = now;
        const sorted = [...players].sort(
          (a, b) => b.score - a.score || b.kills - a.kills || a.deaths - b.deaths,
        );
        const team = MODES[snap.mode].team;
        const won =
          !!me &&
          (team
            ? snap.winnerTeam >= 0 && me.team === snap.winnerTeam
            : !!snap.winner && sorted[0]?.id === me.id);
        this.rewardHtml = this.hooks.onRoundEnd({
          mode: snap.mode,
          players: sorted,
          meId: this.source!.localId,
          winner: snap.winner,
          winnerTeam: snap.winnerTeam,
          teamScore: snap.teamScore,
          won,
          me,
        });
      } else {
        this.ui.hideScoreboard();
      }
      this.prevPhase = phase;
    }
    if (phase === 'scoreboard' && !this.suppressBoard) {
      const left = SCOREBOARD_TIME - (now - this.scoreboardStart) / 1000;
      this.ui.showScoreboard(players, this.source!.localId, snap, left, this.rewardHtml);
    }
  }

  private detectShots(bullets: { id: string; owner: string }[], me: string, now: number): void {
    const seen = new Set<string>();
    for (const b of bullets) {
      seen.add(b.id);
      if (this.knownBullets.has(b.id)) continue;
      if (b.owner === me) sfx.shoot(1);
      else if (now - this.lastOtherShot > 90) {
        this.lastOtherShot = now;
        sfx.shoot(0.3);
      }
    }
    this.knownBullets = seen;
  }

  // ---- drawing -------------------------------------------------------------

  private drawBullet(
    g: Phaser.GameObjects.Graphics,
    b: Snapshot['bullets'][number],
    color: number,
    now: number,
  ): void {
    const r = b.r;
    const ang = Math.atan2(b.vy, b.vx);
    switch (b.kind) {
      case 1: {
        const pts = [0, 1, 2, 3].map((i) => {
          const a = ang + (i * Math.PI) / 2;
          const d = i % 2 === 0 ? r * 1.9 : r * 1.1;
          return { x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d };
        });
        g.fillStyle(color, 0.25).fillCircle(b.x, b.y, r * 2.2);
        g.fillStyle(color, 1).fillPoints(pts, true);
        break;
      }
      case 2:
        g.lineStyle(3, color, 1).strokeCircle(b.x, b.y, r * 1.4);
        g.fillStyle(0xffffff, 0.9).fillCircle(b.x, b.y, r * 0.5);
        break;
      case 3:
        for (let i = 1; i <= 4; i++) {
          g.fillStyle(color, 0.5 - i * 0.1).fillCircle(
            b.x - Math.cos(ang) * i * 9,
            b.y - Math.sin(ang) * i * 9,
            r * (1 - i * 0.15),
          );
        }
        g.fillStyle(0xffffff, 1).fillCircle(b.x, b.y, r * 0.8);
        break;
      case 4: {
        const pts: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < 10; i++) {
          const a = now / 150 + (i * Math.PI) / 5;
          const d = i % 2 === 0 ? r * 2 : r * 0.9;
          pts.push({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d });
        }
        g.fillStyle(color, 0.25).fillCircle(b.x, b.y, r * 2.4);
        g.fillStyle(color, 1).fillPoints(pts, true);
        break;
      }
      default:
        g.fillStyle(color, 0.25).fillCircle(b.x, b.y, r * 2.2);
        g.fillStyle(0xffffff, 1).fillCircle(b.x, b.y, r * 0.8);
        g.fillStyle(color, 0.9).fillCircle(b.x, b.y, r);
    }
  }

  /** Floating comic-style text (hit and K.O. pops). */
  private pop(x: number, y: number, text: string, color: string, size: number): void {
    const t = this.add
      .text(x, y, text, {
        fontFamily: 'Bangers, Impact, sans-serif',
        fontSize: `${size}px`,
        color,
        stroke: '#1b0a3a',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({
      targets: t,
      y: y - 48,
      alpha: 0,
      scale: 1.35,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  /** Eyes that follow the aim, a mouth, and a hurt expression at low HP. */
  private drawFace(g: Phaser.GameObjects.Graphics, p: PlayerView, blink: number, now: number): void {
    const lx = Math.cos(p.aim);
    const ly = Math.sin(p.aim);
    const fx = p.x + lx * 4;
    const fy = p.y + ly * 3 + 1;
    const hurt = p.hp <= p.maxHp * 0.34 && p.maxHp > 1;
    const blinking = Math.sin(now / 1700 + p.x * 0.01) > 0.985;
    for (const s of [-1, 1]) {
      const ex = fx + s * 7.5;
      const ey = fy - 2;
      if (blinking) {
        g.lineStyle(2, 0x1b1030, 1).lineBetween(ex - 4, ey, ex + 4, ey);
        continue;
      }
      g.fillStyle(0xffffff, blink).fillEllipse(ex, ey, 10, hurt ? 9 : 13);
      g.fillStyle(0x1b1030, 1).fillCircle(ex + lx * 2.4, ey + ly * 3, 3.6);
      g.fillStyle(0xffffff, 1).fillCircle(ex + lx * 2.4 - 1, ey + ly * 3 - 1.4, 1.2);
    }
    g.lineStyle(2, 0x1b1030, 1);
    g.beginPath();
    if (hurt) g.arc(fx, fy + 12, 5, Math.PI * 1.1, Math.PI * 1.9, false);
    else g.arc(fx, fy + 4, 5.5, Math.PI * 0.15, Math.PI * 0.85, false);
    g.strokePath();
  }

  /** A small accessory per character so each one reads at a glance. */
  /** The barrel shows which main weapon an orb carries. */
  private drawWeapon(g: Phaser.GameObjects.Graphics, p: PlayerView, a: number): void {
    const R = PLAYER_RADIUS;
    const cx = Math.cos(p.aim);
    const cy = Math.sin(p.aim);
    const nx = -cy;
    const ny = cx;
    const bar = (off: number, from: number, to: number, w: number, col = p.color) =>
      g
        .lineStyle(w, col, a)
        .lineBetween(p.x + cx * from + nx * off, p.y + cy * from + ny * off, p.x + cx * to + nx * off, p.y + cy * to + ny * off);
    switch (p.weapon) {
      case 1: // scatter: wide short muzzle
        for (const o of [-6, 0, 6]) bar(o, 8, R + 8, 4);
        break;
      case 2: // rail: long thin barrel with a glowing tip
        bar(0, 8, R + 22, 4, 0xdfe8ff);
        g.fillStyle(0x4dd2ff, a).fillCircle(p.x + cx * (R + 22), p.y + cy * (R + 22), 3.5);
        break;
      case 3: // smg: short barrel with a magazine
        bar(0, 8, R + 7, 5);
        bar(4, 10, 16, 6, 0x333a55);
        break;
      case 4: // mortar: thick tube
        bar(0, 6, R + 9, 12, 0x5a4a7a);
        bar(0, R + 5, R + 9, 14, p.color);
        break;
      case 5: // twin pistols
        bar(-5, 8, R + 9, 4);
        bar(5, 8, R + 9, 4);
        break;
      default:
        bar(0, 8, R + 10, 5);
    }
  }
  /** Hats and charms (looks only). */
  private drawAccessory(g: Phaser.GameObjects.Graphics, p: PlayerView, a: number): void {
    const R = PLAYER_RADIUS;
    const x = p.x;
    const y = p.y - R;
    switch (p.acc) {
      case 1: // crown
        g.fillStyle(0xffc93c, a).fillPoints(
          [
            { x: x - 13, y: y + 2 },
            { x: x - 13, y: y - 10 },
            { x: x - 6, y: y - 4 },
            { x: x, y: y - 14 },
            { x: x + 6, y: y - 4 },
            { x: x + 13, y: y - 10 },
            { x: x + 13, y: y + 2 },
          ],
          true,
        );
        g.fillStyle(0xff4da6, a).fillCircle(x, y - 3, 2.5);
        break;
      case 2: // horns
        g.fillStyle(0xf4eeff, a).fillTriangle(x - 15, y + 6, x - 20, y - 12, x - 8, y + 2);
        g.fillTriangle(x + 15, y + 6, x + 20, y - 12, x + 8, y + 2);
        break;
      case 3: // halo
        g.lineStyle(3, 0xffe9a8, a * 0.9).strokeEllipse(x, y - 10, 30, 9);
        break;
      case 4: // wizard hat
        g.fillStyle(0x5b3fd0, a).fillTriangle(x - 16, y + 4, x + 16, y + 4, x + 4, y - 26);
        g.fillStyle(0xffe58a, a).fillCircle(x + 2, y - 8, 2.5);
        break;
      case 5: // headband
        g.lineStyle(5, 0xff1744, a).beginPath();
        g.arc(p.x, p.y, R - 3, Math.PI * 1.15, Math.PI * 1.85, false);
        g.strokePath();
        g.lineBetween(x + 16, y + 10, x + 26, y + 16);
        break;
      case 6: // cat ears
        g.fillStyle(p.color, a).fillTriangle(x - 16, y + 8, x - 14, y - 10, x - 4, y + 2);
        g.fillTriangle(x + 16, y + 8, x + 14, y - 10, x + 4, y + 2);
        g.fillStyle(0xff9ec7, a).fillTriangle(x - 13, y + 5, x - 12, y - 5, x - 7, y + 2);
        g.fillTriangle(x + 13, y + 5, x + 12, y - 5, x + 7, y + 2);
        break;
      case 7: // visor
        g.fillStyle(0x4dd2ff, a * 0.85).fillRoundedRect(p.x - 15, p.y - 9, 30, 8, 4);
        break;
      case 8: // antenna
        g.lineStyle(2, 0xdfe8ff, a).lineBetween(x, y + 2, x + 4, y - 16);
        g.fillStyle(0xff4da6, a).fillCircle(x + 4, y - 17, 4);
        break;
      default:
        break;
    }
  }
  private drawGear(g: Phaser.GameObjects.Graphics, p: PlayerView): void {
    const R = PLAYER_RADIUS;
    const x = p.x;
    const y = p.y;
    switch (p.char) {
      case 'nova':
        g.lineStyle(3, 0xffe58a, 0.95).strokeEllipse(x, y - R - 3, 22, 7);
        break;
      case 'bolt':
        g.fillStyle(0xffe14d, 1).fillPoints(
          [
            { x: x + 2, y: y - R - 14 },
            { x: x - 5, y: y - R - 2 },
            { x: x, y: y - R - 3 },
            { x: x - 3, y: y - R + 4 },
            { x: x + 6, y: y - R - 8 },
            { x: x + 1, y: y - R - 8 },
          ],
          true,
        );
        break;
      case 'titan':
        g.lineStyle(5, 0x9aa6c8, 1).beginPath();
        g.arc(x, y, R - 2, Math.PI * 1.12, Math.PI * 1.88, false);
        g.strokePath();
        g.fillStyle(0xffc93c, 1).fillCircle(x, y - R + 2, 3);
        break;
      case 'viper':
        g.fillStyle(0xe0334f, 1).fillTriangle(x - 16, y - R + 8, x - 9, y - R - 10, x - 4, y - R + 2);
        g.fillTriangle(x + 16, y - R + 8, x + 9, y - R - 10, x + 4, y - R + 2);
        break;
      case 'ghost':
        for (let i = -1; i <= 1; i++) g.fillStyle(p.color, 0.8).fillCircle(x + i * 11, y + R - 1, 7);
        break;
      case 'medic':
        g.fillStyle(0xffffff, 1).fillCircle(x, y - R + 6, 8);
        g.fillStyle(0xe0334f, 1)
          .fillRect(x - 5, y - R + 4, 10, 4)
          .fillRect(x - 2, y - R + 1, 4, 10);
        break;
      case 'sniper':
        g.lineStyle(2, 0x4dd2ff, 1).strokeCircle(x + 8, y - 2, 8);
        g.lineBetween(x + 14, y + 3, x + 20, y + 11);
        break;
      default:
        break;
    }
  }
  private drawTrail(g: Phaser.GameObjects.Graphics, p: PlayerView, now: number): void {
    let pts = this.trails.get(p.id);
    if (!pts) {
      pts = [];
      this.trails.set(p.id, pts);
    }
    if (p.alive && p.trail > 0) {
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 5) pts.push({ x: p.x, y: p.y, t: now });
    }
    while (pts.length && now - pts[0].t > TRAIL_MS) pts.shift();
    if (!p.alive) pts.length = 0;
    if (p.trail <= 0 || pts.length < 2) return;
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i];
      const k = 1 - (now - q.t) / TRAIL_MS;
      if (p.trail === 1)
        g.fillStyle(p.color, k).fillCircle(q.x + Math.sin(i * 7) * 6, q.y + Math.cos(i * 5) * 6, 2 + k * 3);
      else if (p.trail === 3) g.lineStyle(2, p.color, k * 0.8).strokeCircle(q.x, q.y, 4 + (1 - k) * 14);
      else if (i > 0) {
        const a = pts[i - 1];
        if (p.trail === 2) g.lineStyle(2 + k * 16, p.color, k * 0.5).lineBetween(a.x, a.y, q.x, q.y);
        else if (p.trail === 4) g.lineStyle(3, 0xffffff, k).lineBetween(a.x, a.y, q.x, q.y);
        else if (p.trail === 5) {
          const c = Phaser.Display.Color.HSVToRGB(
            (((now / 600 + i * 0.07) % 1) + 1) % 1,
            1,
            1,
          ) as Phaser.Types.Display.ColorObject;
          g.lineStyle(6 * k + 1, Phaser.Display.Color.GetColor(c.r, c.g, c.b), k).lineBetween(
            a.x,
            a.y,
            q.x,
            q.y,
          );
        }
      }
    }
  }

  private render(
    g: Phaser.GameObjects.Graphics,
    players: PlayerView[],
    snap: Snapshot,
    meId: string,
    now: number,
    dt: number,
  ): void {
    const t = this.map.theme;
    const team = MODES[snap.mode].team;
    if (snap.domain) {
      // Domain expansion: the whole arena glows in the owner's colour
      const pulse = 0.1 + 0.05 * Math.sin(now / 300);
      g.fillStyle(snap.domain.color, pulse).fillRect(0, 0, WORLD_W, WORLD_H);
      g.lineStyle(10, snap.domain.color, 0.6).strokeRect(5, 5, WORLD_W - 10, WORLD_H - 10);
    }
    // hazards pulse
    for (const h of this.map.hazards) {
      g.fillStyle(t.hazard, 0.12 + 0.12 * Math.sin(now / 250)).fillRoundedRect(h.x, h.y, h.w, h.h, 10);
    }
    // hill zone
    if (snap.mode === 'hill') {
      const hz = this.map.hill;
      const holder = snap.hillHolder;
      const col =
        holder === '*'
          ? 0xff1744
          : holder
            ? (players.find((p) => p.id === holder)?.color ?? 0xffffff)
            : t.accent;
      g.fillStyle(col, 0.12 + 0.05 * Math.sin(now / 300)).fillCircle(hz.x, hz.y, hz.r);
      g.lineStyle(4, col, 0.9).strokeCircle(hz.x, hz.y, hz.r);
      g.lineStyle(2, col, 0.4).strokeCircle(hz.x, hz.y, hz.r * (0.6 + 0.1 * Math.sin(now / 400)));
    }
    // coins
    for (const c of snap.coins) {
      const big = c.v > 1;
      const r = big ? 14 : 10;
      g.fillStyle(0xffd54f, 0.2).fillCircle(c.x, c.y, r * 2);
      g.fillStyle(big ? 0xff9800 : 0xffd54f, 1).fillCircle(c.x, c.y, r);
      g.lineStyle(2, 0xfff59d, 1).strokeCircle(c.x, c.y, r * 0.6);
    }
    // pickups
    const pulse = 1 + Math.sin(now / 160) * 0.15;
    for (const pk of snap.pickups) {
      const pu = powerupFromId(pk.pu);
      const ec = pu ? EFFECTS[pu.effect].color : 0xffc93c;
      const rc = pu ? RARITIES[pu.rarity].color : 0xffffff;
      g.fillStyle(ec, 0.18).fillCircle(pk.x, pk.y, PICKUP_RADIUS * 2.2 * pulse);
      g.lineStyle(3, rc, 1).strokeCircle(pk.x, pk.y, PICKUP_RADIUS * pulse);
      g.fillStyle(ec, 1).fillCircle(pk.x, pk.y, 8);
      if (pu && pu.rarity >= 2) g.lineStyle(2, rc, 0.5).strokeCircle(pk.x, pk.y, PICKUP_RADIUS * 1.7 * pulse);
    }
    // mines
    const colorOf = new Map(players.map((p) => [p.id, p.color]));
    for (const m of snap.mines) {
      const c = colorOf.get(m.owner) ?? 0xffffff;
      g.fillStyle(c, 0.2).fillCircle(m.x, m.y, 24);
      g.fillStyle(m.armed ? 0xff1744 : c, m.armed ? 0.6 + 0.4 * Math.sin(now / 120) : 0.5).fillCircle(
        m.x,
        m.y,
        9,
      );
      g.lineStyle(2, c, 1).strokeCircle(m.x, m.y, 14);
    }

    // zones
    for (const z of snap.zones) {
      const zc = ZONE_COLOR[z.kind] ?? 0xffffff;
      const wob = 0.5 + 0.5 * Math.sin(now / 280);
      g.fillStyle(zc, 0.1 + 0.06 * wob).fillCircle(z.x, z.y, z.r);
      g.lineStyle(3, zc, 0.8).strokeCircle(z.x, z.y, z.r);
      if (z.kind === 'pull')
        g.lineStyle(2, zc, 0.5).strokeCircle(z.x, z.y, z.r * (1 - 0.7 * ((now / 700) % 1)));
      else if (z.kind === 'heal')
        g.lineStyle(2, zc, 0.5).strokeCircle(z.x, z.y, z.r * (0.3 + 0.7 * ((now / 900) % 1)));
      else if (z.kind === 'barrier') g.lineStyle(2, 0xffffff, 0.35).strokeCircle(z.x, z.y, z.r - 6);
    }
    // pets
    for (const q of snap.pets) {
      const bob = Math.sin(now / 200 + q.x * 0.01) * 3;
      g.fillStyle(q.color, 0.25).fillCircle(q.x, q.y + bob, 16);
      g.fillStyle(q.color, 1).fillCircle(q.x, q.y + bob, 9);
      g.fillStyle(0x1b1030, 1)
        .fillCircle(q.x - 3, q.y + bob - 2, 1.8)
        .fillCircle(q.x + 3, q.y + bob - 2, 1.8);
    }

    // trails below players
    const aliveIds = new Set(players.map((p) => p.id));
    for (const p of players) this.drawTrail(g, p, now);
    for (const id of Array.from(this.trails.keys())) if (!aliveIds.has(id)) this.trails.delete(id);

    // bullets
    for (const b of snap.bullets) this.drawBullet(g, b, colorOf.get(b.owner) ?? 0xffffff, now);

    // players
    const alive = new Set<string>();
    for (const p of players) {
      alive.add(p.id);
      let label = this.names.get(p.id);
      if (!label) {
        label = this.add
          .text(0, 0, p.name, {
            fontFamily: 'Rajdhani, Trebuchet MS, sans-serif',
            fontStyle: 'bold',
            fontSize: '17px',
            color: '#f4eeff',
          })
          .setOrigin(0.5)
          .setDepth(11)
          .setShadow(0, 0, '#000', 4, true, true);
        this.names.set(p.id, label);
      }
      const ghost = p.hidden && p.id !== meId;
      label.setVisible(p.alive).setAlpha(ghost ? 0.25 : 1);
      if (!p.alive) continue;
      label.setText(p.boss ? `${p.name} (boss)` : p.name).setPosition(p.x, p.y + PLAYER_RADIUS + 16);
      const bubble = this.bubbles.get(p.id);
      if (bubble) {
        if (now > bubble.until) {
          bubble.text.destroy();
          this.bubbles.delete(p.id);
        } else bubble.text.setPosition(p.x, p.y - PLAYER_RADIUS - 14).setAlpha(ghost ? 0.25 : 1);
      }
      if (team) label.setColor(p.team === 0 ? '#80b4ff' : '#ff8a9a');
      const blink = (p.invuln ? 0.45 + 0.35 * Math.sin(now / 70) : 1) * (ghost ? 0.25 : 1);
      g.fillStyle(p.color, 0.08 * blink).fillCircle(p.x, p.y, PLAYER_RADIUS * 2.4);
      g.fillStyle(p.color, 0.18 * blink).fillCircle(p.x, p.y, PLAYER_RADIUS * 1.6);
      this.drawWeapon(g, p, blink);
      g.fillStyle(p.color, blink).fillCircle(p.x, p.y, PLAYER_RADIUS);
      g.fillStyle(0xffffff, 0.5 * blink).fillCircle(p.x - 6, p.y - 6, PLAYER_RADIUS * 0.4);
      this.drawFace(g, p, blink, now);
      this.drawGear(g, p);
      this.drawAccessory(g, p, blink);
      if (p.casting > 0) {
        const cc = 0xffe58a;
        const k = (now / 120) % 1;
        g.lineStyle(3, cc, 0.9).strokeCircle(p.x, p.y, PLAYER_RADIUS + 10 + k * 22);
        g.lineStyle(2, cc, 0.5).strokeCircle(p.x, p.y, PLAYER_RADIUS + 28 - k * 16);
      }
      if (team)
        g.lineStyle(4, TEAM_COLORS[p.team === 0 ? 0 : 1], 0.95).strokeCircle(p.x, p.y, PLAYER_RADIUS + 8);
      if (p.boss)
        g.lineStyle(4, 0xff1744, 0.9).strokeCircle(p.x, p.y, PLAYER_RADIUS + 12 + Math.sin(now / 120) * 2);
      if (p.shield > 0) {
        for (let i = 0; i < Math.min(p.shield, 3); i++)
          g.lineStyle(3, 0x7dff6b, 0.9).strokeCircle(p.x, p.y, PLAYER_RADIUS + 4 + i * 4);
      }
      if (p.slow) g.lineStyle(3, 0x80d8ff, 0.8).strokeCircle(p.x, p.y, PLAYER_RADIUS + 2);
      if (p.id === meId) g.lineStyle(2, 0xffffff, 0.9).strokeCircle(p.x, p.y, PLAYER_RADIUS + 3);
      // hp
      {
        // HP bar (green > yellow > red); bosses get a wide bar with 25% form marks
        const w = p.boss ? 90 : 50;
        const frac = Math.max(0, Math.min(1, p.hp / Math.max(1, p.maxHp)));
        const col = frac > 0.6 ? 0x5bf09a : frac > 0.3 ? 0xffc93c : 0xff4d5e;
        const by = p.y - PLAYER_RADIUS - (p.boss ? 20 : 16);
        g.fillStyle(0x0b0e1a, 0.9).fillRect(p.x - w / 2 - 1, by - 1, w + 2, 9);
        g.fillStyle(0x2a2f4a, 1).fillRect(p.x - w / 2, by, w, 7);
        g.fillStyle(col, 1).fillRect(p.x - w / 2, by, w * frac, 7);
        if (p.boss) for (const m of [0.25, 0.5, 0.75]) g.fillStyle(0xffffff, 0.7).fillRect(p.x - w / 2 + w * m - 1, by, 2, 7);
        if (p.boss && p.form > 0) {
          const fc = [0xffffff, 0x4dd2ff, 0xb77dff, 0xff1744][p.form];
          g.lineStyle(4 + p.form * 2, fc, 0.5 + 0.3 * Math.sin(now / 90)).strokeCircle(p.x, p.y, PLAYER_RADIUS + 8 + p.form * 4);
        }
      }
      // effect dots
      if (p.fx) {
        const fx = p.fx.split(',');
        fx.forEach((f, i) => {
          const [id, r] = f.split(':');
          const e = EFFECTS[id as EffectId];
          if (!e) return;
          const ex = p.x + (i - (fx.length - 1) / 2) * 11;
          g.fillStyle(e.color, 1).fillCircle(ex, p.y - PLAYER_RADIUS - 26, 4);
          g.lineStyle(1.5, RARITIES[Number(r)]?.color ?? 0xffffff, 1).strokeCircle(
            ex,
            p.y - PLAYER_RADIUS - 26,
            5.5,
          );
        });
      }
    }
    for (const [id, tx] of this.names) {
      if (!alive.has(id)) {
        tx.destroy();
        this.names.delete(id);
      }
    }

    // beams, swings and rings
    this.fxs = this.fxs.filter((f) => now - f.born < f.ms);
    for (const f of this.fxs) {
      const k = (now - f.born) / f.ms;
      if (f.kind === 'beam') {
        const ex = f.x + Math.cos(f.angle) * f.size;
        const ey = f.y + Math.sin(f.angle) * f.size;
        g.lineStyle(44 * (1 - k) + 4, f.color, 0.3 * (1 - k)).lineBetween(f.x, f.y, ex, ey);
        g.lineStyle(20 * (1 - k) + 3, f.color, 0.8 * (1 - k)).lineBetween(f.x, f.y, ex, ey);
        g.lineStyle(7 * (1 - k) + 1, 0xffffff, 1 - k).lineBetween(f.x, f.y, ex, ey);
        g.fillStyle(f.color, 0.6 * (1 - k)).fillCircle(ex, ey, 26 * (1 - k) + 6);
      } else if (f.kind === 'swing') {
        g.fillStyle(f.color, 0.25 * (1 - k)).slice(f.x, f.y, f.size * (0.6 + 0.4 * k), f.angle - 1.1, f.angle + 1.1, false).fillPath();
        g.lineStyle(22 * (1 - k) + 3, f.color, 1 - k).beginPath();
        g.arc(f.x, f.y, f.size * (0.6 + 0.4 * k), f.angle - 1.1, f.angle + 1.1, false);
        g.strokePath();
      } else {
        if (k < 0) continue;
        g.fillStyle(f.color, 0.12 * (1 - k)).fillCircle(f.x, f.y, f.size * (0.3 + 0.7 * k));
        g.lineStyle(10 * (1 - k) + 2, f.color, 1 - k).strokeCircle(f.x, f.y, f.size * (0.3 + 0.7 * k));
      }
    }

    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.life -= dt;
      if (q.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.96;
      q.vy *= 0.96;
      g.fillStyle(q.color, q.life / q.max).fillCircle(q.x, q.y, q.size);
    }
  }
}
