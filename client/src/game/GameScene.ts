import Phaser from 'phaser';
import {
  BULLET_RADIUS,
  MAX_HP,
  OBSTACLES,
  PICKUP_RADIUS,
  PLAYER_RADIUS,
  RESPAWN_DELAY,
  SCOREBOARD_TIME,
  WORLD_H,
  WORLD_W,
  type PlayerView,
  type SimEvent,
} from '@orb/shared';
import { sfx } from '../audio';
import type { TouchControls } from '../ui/touch';
import type { Ui } from '../ui/ui';
import { Predictor } from './predict';
import { OnlineSource } from './sources';
import type { GameSource } from './types';

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

export interface SceneHooks {
  /** True while the player is actively in a live round (drives SDK gameplayStart/Stop). */
  onPlayingChange(playing: boolean): void;
  onRoundEnd(): void;
}

export class GameScene extends Phaser.Scene {
  ui!: Ui;
  touch!: TouchControls;
  hooks: SceneHooks = { onPlayingChange: () => {}, onRoundEnd: () => {} };

  private source: GameSource | null = null;
  private predictor = new Predictor();
  private g!: Phaser.GameObjects.Graphics;
  private names = new Map<string, Phaser.GameObjects.Text>();
  private particles: Particle[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private seq = 0;
  private lastSend = 0;
  private lastSentAt = 0;
  private knownBullets = new Set<string>();
  private lastOtherShot = 0;
  private prevPhase: 'play' | 'scoreboard' | null = null;
  private scoreboardStart = 0;
  private deadSince = 0;
  private wasPlaying = false;
  private localAim = 0;

  constructor() {
    super('game');
  }

  create(): void {
    this.drawArena();
    this.g = this.add.graphics().setDepth(10);
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.mouse?.disableContextMenu();
    this.game.events.on(Phaser.Core.Events.BLUR, () => {
      for (const k of Object.values(this.keys)) k.reset();
    });
  }

  setSource(src: GameSource | null): void {
    this.source?.dispose();
    this.source = src;
    this.prevPhase = null;
    this.knownBullets.clear();
    this.particles = [];
    this.predictor = new Predictor();
    this.seq = 0;
    this.deadSince = 0;
    this.ui.hideScoreboard();
    this.ui.banner(null);
    this.clearNames();
    if (!src) {
      this.setPlaying(false);
      return;
    }
    src.onEvent = (ev) => this.handleEvent(ev);
    if (src instanceof OnlineSource) {
      src.onServerState = (me) => {
        if (!me) return;
        if (!me.alive || this.prevPhase === 'scoreboard') this.predictor.reset(me.x, me.y);
        else this.predictor.onServer(me.x, me.y, me.seq, (performance.now() - this.lastSentAt) / 1000);
      };
    }
  }

  get hasSource(): boolean {
    return this.source !== null;
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
  }

  private drawArena(): void {
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x0b0e1a, 1).fillRect(0, 0, WORLD_W, WORLD_H);
    bg.lineStyle(1, 0x161c38, 1);
    for (let x = 0; x <= WORLD_W; x += 100) bg.lineBetween(x, 0, x, WORLD_H);
    for (let y = 0; y <= WORLD_H; y += 100) bg.lineBetween(0, y, WORLD_W, y);
    for (const o of OBSTACLES) {
      bg.fillStyle(0x4a5bd0, 0.12).fillRoundedRect(o.x - 8, o.y - 8, o.w + 16, o.h + 16, 8);
      bg.fillStyle(0x1b2247, 1).fillRoundedRect(o.x, o.y, o.w, o.h, 4);
      bg.lineStyle(2, 0x5b6cf0, 1).strokeRoundedRect(o.x, o.y, o.w, o.h, 4);
    }
    bg.lineStyle(6, 0x4dd2ff, 0.25).strokeRect(0, 0, WORLD_W, WORLD_H);
    bg.lineStyle(2, 0x4dd2ff, 0.9).strokeRect(1, 1, WORLD_W - 2, WORLD_H - 2);
  }

  // ---- events --------------------------------------------------------------

  private handleEvent(ev: SimEvent): void {
    const me = this.source?.localId;
    switch (ev.t) {
      case 'hit':
        this.burst(ev.x, ev.y, 0xff5e8a, 8);
        if (ev.id === me) {
          sfx.hit();
          this.cameras.main.shake(120, 0.006);
        } else if (ev.by === me) sfx.hit();
        break;
      case 'kill':
        this.burst(ev.x, ev.y, 0xffffff, 26);
        if (ev.id === me) {
          sfx.kill();
          this.cameras.main.shake(220, 0.012);
          this.deadSince = performance.now();
        } else if (ev.by === me) sfx.kill();
        break;
      case 'pickup':
        this.burst(ev.x, ev.y, 0xffc93c, 14);
        if (ev.id === me) sfx.pickup();
        break;
      case 'respawn':
        this.burst(ev.x, ev.y, 0x4dd2ff, 12);
        if (ev.id === me) sfx.respawn();
        break;
      case 'roundEnd':
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

    const meView = snap.players.find((p) => p.id === src.localId);
    const playing = snap.phase === 'play' && !document.hidden;
    this.setPlaying(playing);

    // local input and prediction
    let px = meView?.x ?? WORLD_W / 2;
    let py = meView?.y ?? WORLD_H / 2;
    const canMove = !!meView && meView.alive && snap.phase === 'play';
    if (src.online) {
      if (!this.predictor.initialised && meView) this.predictor.reset(meView.x, meView.y);
      px = this.predictor.x;
      py = this.predictor.y;
    }
    const input = this.readInput(px, py);
    this.localAim = input.aim;
    const send = canMove ? input : { moveX: 0, moveY: 0, aim: input.aim, shooting: false };

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
        });
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
      });
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

    this.handlePhase(snap.phase, players, snap.winner, now);
    this.detectShots(snap.bullets, src.localId, now);
    this.render(g, players, snap, src.localId, now, dt);

    if (me) {
      this.ui.updateHud(now, me, players, snap.timeLeft);
      if (snap.phase === 'scoreboard') {
        this.ui.banner(null);
      } else if (!me.alive) {
        const left = Math.max(1, Math.ceil(RESPAWN_DELAY - (now - (this.deadSince || now)) / 1000));
        this.ui.banner(`Respawning in ${left}`);
      } else if (me.rapid) {
        this.ui.banner('RAPID FIRE!');
      } else {
        this.ui.banner(null);
      }
      if (me.alive) this.deadSince = 0;
      else if (!this.deadSince) this.deadSince = now;
    }
  }

  private handlePhase(
    phase: 'play' | 'scoreboard',
    players: PlayerView[],
    winner: string,
    now: number,
  ): void {
    if (phase !== this.prevPhase) {
      if (phase === 'scoreboard') {
        this.scoreboardStart = now;
        this.hooks.onRoundEnd();
      } else {
        this.ui.hideScoreboard();
      }
      this.prevPhase = phase;
    }
    if (phase === 'scoreboard') {
      const left = SCOREBOARD_TIME - (now - this.scoreboardStart) / 1000;
      this.ui.showScoreboard(players, this.source!.localId, winner, left);
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

  private render(
    g: Phaser.GameObjects.Graphics,
    players: PlayerView[],
    snap: NonNullable<ReturnType<GameSource['view']>>,
    meId: string,
    now: number,
    dt: number,
  ): void {
    // pickups
    const pulse = 1 + Math.sin(now / 160) * 0.15;
    for (const pk of snap.pickups) {
      g.fillStyle(0xffc93c, 0.15).fillCircle(pk.x, pk.y, PICKUP_RADIUS * 2 * pulse);
      g.lineStyle(3, 0xffc93c, 1).strokeCircle(pk.x, pk.y, PICKUP_RADIUS * pulse);
      g.fillStyle(0xffc93c, 1).fillCircle(pk.x, pk.y, 5);
    }

    // bullets
    const colorOf = new Map(players.map((p) => [p.id, p.color]));
    for (const b of snap.bullets) {
      const c = colorOf.get(b.owner) ?? 0xffffff;
      g.fillStyle(c, 0.25).fillCircle(b.x, b.y, BULLET_RADIUS * 2.2);
      g.fillStyle(0xffffff, 1).fillCircle(b.x, b.y, BULLET_RADIUS * 0.8);
      g.fillStyle(c, 0.9).fillCircle(b.x, b.y, BULLET_RADIUS);
    }

    // players
    const alive = new Set<string>();
    for (const p of players) {
      alive.add(p.id);
      let label = this.names.get(p.id);
      if (!label) {
        label = this.add
          .text(0, 0, p.name, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '15px', color: '#e8ecff' })
          .setOrigin(0.5)
          .setDepth(11)
          .setShadow(0, 0, '#000', 4, true, true);
        this.names.set(p.id, label);
      }
      label.setVisible(p.alive);
      if (!p.alive) continue;
      label.setText(p.name).setPosition(p.x, p.y + PLAYER_RADIUS + 16);
      const blink = p.invuln ? 0.45 + 0.35 * Math.sin(now / 70) : 1;
      g.fillStyle(p.color, 0.08 * blink).fillCircle(p.x, p.y, PLAYER_RADIUS * 2.4);
      g.fillStyle(p.color, 0.18 * blink).fillCircle(p.x, p.y, PLAYER_RADIUS * 1.6);
      g.lineStyle(5, p.color, blink).lineBetween(
        p.x + Math.cos(p.aim) * 8,
        p.y + Math.sin(p.aim) * 8,
        p.x + Math.cos(p.aim) * (PLAYER_RADIUS + 10),
        p.y + Math.sin(p.aim) * (PLAYER_RADIUS + 10),
      );
      g.fillStyle(p.color, blink).fillCircle(p.x, p.y, PLAYER_RADIUS);
      g.fillStyle(0xffffff, 0.5 * blink).fillCircle(p.x - 6, p.y - 6, PLAYER_RADIUS * 0.4);
      if (p.rapid)
        g.lineStyle(3, 0xffc93c, 1).strokeCircle(p.x, p.y, PLAYER_RADIUS + 5 + Math.sin(now / 80) * 2);
      if (p.id === meId) g.lineStyle(2, 0xffffff, 0.9).strokeCircle(p.x, p.y, PLAYER_RADIUS + 3);
      for (let i = 0; i < MAX_HP; i++) {
        const hx = p.x + (i - (MAX_HP - 1) / 2) * 13;
        const hy = p.y - PLAYER_RADIUS - 12;
        g.fillStyle(i < p.hp ? 0xff5e8a : 0x2a2f4a, 1).fillCircle(hx, hy, 4);
      }
    }
    for (const [id, t] of this.names) {
      if (!alive.has(id)) {
        t.destroy();
        this.names.delete(id);
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
