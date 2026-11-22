// The fight: steps the deterministic sim at 60 Hz from controllers or bots, renders stick figures, effects and the
// HUD, and turns sim events into juice (hit-stop is in the sim; shake, sparks, banners, sounds are here).

import Phaser from 'phaser';
import { audio, type Track } from '../audio/synth';
import { ELEMENTS } from '../content/elements';
import { POWERS_BY_ELEMENT, RANK_MP_OFF } from '../content/powers';
import type { Controller } from '../core/input';
import { arenaById, FLOOR_Y, WORLD_H, WORLD_W, type ArenaDef } from '../render/arenas';
import { elementColors, lookOf, poseFor, type ViewState } from '../render/fighterView';
import { PhaserPen, type Pen } from '../render/pen';
import { drawStick, solve } from '../render/rig';
import { drawEffect, drawStatusFx, Particles, wx, wy } from '../render/vfx';
import { botInput } from '../sim/ai';
import { activeOf, fighterById, getMove, hurtbox, moveBox, reviveTeam } from '../sim/step';
import type { Ev, Fighter, Match } from '../sim/types';
import { step } from '../sim/step';
import { settings } from '../meta/settings';
import { Hud } from '../ui/hud';
import { TouchPad } from '../ui/touchPad';
import type { TouchController } from '../core/input';
import { h } from '../ui/dom';

export interface FightSetup {
  match: Match;
  controllers: [Controller | null, Controller | null];
  arena: string;
  labels: [string, string];
  music: Track;
  touch: TouchController | null;
  tutorial?: TutorialStep[];
  onEnd: (m: Match, quit: boolean) => void;
  /** optional rewarded revive for Zombie Survival; resolves true if the player watched the ad */
  onRevive?: () => Promise<boolean>;
  /** called with each frame's sim events (match statistics for quests and results) */
  onEvents?: (evs: Ev[], m: Match) => void;
  /** extra pause-menu items (Training options) */
  pauseItems?: { label: string; run: (m: Match) => void }[];
  showHitboxes?: boolean;
}

export interface TutorialStep {
  text: string;
  done: (m: Match, evs: Ev[]) => boolean;
}

/** Rim pen: draws a light outline behind figures on dark arenas. */
class RimPen implements Pen {
  constructor(private p: Pen, private color: number) {}
  line(x1: number, y1: number, x2: number, y2: number, w: number, _c: number, a = 1): void {
    this.p.line(x1, y1, x2, y2, w + 5, this.color, a * 0.85);
  }
  circle(x: number, y: number, r: number, fill: number | null, stroke: number | null, w = 2, a = 1): void {
    if (fill !== null || stroke !== null) this.p.circle(x, y, r + (stroke !== null ? w / 2 : 0) + 2.5, this.color, null, 0, a * 0.85);
  }
  poly(): void {}
}

export class FightScene extends Phaser.Scene {
  private setup!: FightSetup;
  private m!: Match;
  private arena!: ArenaDef;
  private g!: Phaser.GameObjects.Graphics;
  private pen!: PhaserPen;
  private rim!: RimPen;
  private parts = new Particles();
  private views = new Map<number, ViewState>();
  private hud!: Hud;
  private pad: TouchPad | null = null;
  private acc = 0;
  private paused = false;
  private ended = false;
  private endT = 0;
  private texts: Phaser.GameObjects.Text[] = [];
  private shake = 0;
  private zoomPulse = 0;
  private tutorialI = 0;
  private tutorialEl: HTMLElement | null = null;
  private pauseEl: HTMLElement | null = null;
  private camX = WORLD_W / 2;
  private time0 = 0;
  hitboxes = false;

  constructor() {
    super('fight');
  }

  init(setup: FightSetup): void {
    this.setup = setup;
    this.m = setup.match;
    this.arena = arenaById(setup.arena);
    this.acc = 0;
    this.paused = false;
    this.ended = false;
    this.endT = 0;
    this.views.clear();
    this.parts = new Particles();
    this.parts.reduced = settings.reducedFlash;
    this.tutorialI = 0;
    this.hitboxes = !!setup.showHitboxes;
    this.texts = [];
  }

  create(): void {
    document.body.dataset.screen = 'fight';
    const bg = this.add.graphics();
    this.arena.draw(bg, this.arena);
    this.g = this.add.graphics();
    this.pen = new PhaserPen(this.g);
    this.rim = new RimPen(this.pen, 0xdfe8ff);
    this.cameras.main.setBackgroundColor(this.arena.sky[0]);
    this.fitCamera(true);
    this.scale.on('resize', this.onResize, this);
    this.events.once('shutdown', () => this.cleanup());

    const ui = document.getElementById('ui')!;
    this.hud = new Hud(this.setup.labels, this.m.mode);
    ui.appendChild(this.hud.el);
    this.hud.pauseBtn.addEventListener('click', () => this.togglePause());
    if (this.setup.touch) {
      this.pad = new TouchPad(this.setup.touch, settings.oneHand);
      ui.appendChild(this.pad.el);
    }
    if (this.setup.tutorial?.length) {
      this.tutorialEl = h('div', 'tutorial');
      ui.appendChild(this.tutorialEl);
      this.showTutorial();
    }
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    audio.play(this.setup.music);
    this.time0 = this.time.now;
  }

  private cleanup(): void {
    this.hud?.el.remove();
    this.pad?.el.remove();
    this.tutorialEl?.remove();
    this.pauseEl?.remove();
    this.scale.off('resize', this.onResize, this);
    audio.tension = 0;
  }

  private onResize(): void {
    if (this.sys.isActive()) this.fitCamera(true);
  }

  // ---- camera ---------------------------------------------------------------------------------------------

  private fitCamera(snap = false): void {
    const cam = this.cameras?.main;
    if (!cam) return;
    const vw = this.scale.width;
    const vh = this.scale.height;
    const fs = this.m.fighters.filter((f) => f.onField && !f.down);
    let minX = WORLD_W / 2;
    let maxX = WORLD_W / 2;
    if (fs.length) {
      minX = Math.min(...fs.map((f) => wx(f.x)));
      maxX = Math.max(...fs.map((f) => wx(f.x)));
    }
    const span = Math.max(420, maxX - minX + 360);
    const fitAll = Math.min(vw / WORLD_W, vh / WORLD_H);
    // portrait screens zoom in on the fighters instead of showing the whole arena tiny
    let zoom = vw < vh ? Math.min(vw / span, (vh * 0.55) / 360) : Math.max(fitAll, Math.min(vw / span, fitAll * 1.12));
    zoom *= 1 + this.zoomPulse;
    zoom = Math.max(0.2, zoom);
    cam.setZoom(zoom);
    const targetX = (minX + maxX) / 2;
    this.camX = snap ? targetX : this.camX + (targetX - this.camX) * 0.12;
    const halfW = vw / zoom / 2;
    const cx = halfW * 2 >= WORLD_W ? WORLD_W / 2 : Math.max(halfW, Math.min(WORLD_W - halfW, this.camX));
    const viewH = vh / zoom;
    // with touch buttons on a landscape screen, the floor sits higher so the buttons cover ground, not fighters
    const floorFrac = vw < vh ? 0.62 : this.pad ? (vh < 560 ? 0.64 : 0.74) : 0.86;
    const cy = FLOOR_Y - viewH * floorFrac + viewH / 2;
    const sx = this.shake > 0 && settings.shake ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake > 0 && settings.shake ? (Math.random() - 0.5) * this.shake : 0;
    cam.centerOn(cx + sx, cy + sy);
  }

  // ---- loop --------------------------------------------------------------------------------------------------

  override update(_t: number, delta: number): void {
    const dt = Math.min(delta, 100);
    if (!this.paused && !this.ended) {
      const speed = this.m.slowmo > 0 && !settings.reducedMotion ? 0.35 : 1;
      this.acc += dt * speed;
      let n = 0;
      while (this.acc >= 1000 / 60 && n < 4) {
        this.acc -= 1000 / 60;
        n++;
        this.tick();
      }
    }
    if (this.m.phase === 'over' && !this.ended) {
      this.endT += dt;
      if (this.endT > 1700) {
        void this.finish(false);
        // finish() may stop this scene; nothing below may touch its camera or objects then
        if (this.ended) return;
      }
    }
    this.shake = Math.max(0, this.shake - dt * 0.05);
    this.zoomPulse = Math.max(0, this.zoomPulse - dt * 0.0006);
    this.parts.update();
    this.fitCamera();
    this.draw();
    this.hud.update(this.m, dt);
    this.updatePad();
    const me = activeOf(this.m, 0);
    if (me) audio.tension = this.m.phase === 'fight' ? Math.min(1, 1.2 - me.hp / me.hpMax + (this.m.timer < 600 ? 0.4 : 0)) : 0;
  }

  private tick(): void {
    const [c0, c1] = this.setup.controllers;
    const a = c0 ? c0.read() : botInput(this.m, 0);
    const b = c1 ? c1.read() : botInput(this.m, 1);
    step(this.m, a, b);
    if (this.m.events.length) {
      this.handleEvents(this.m.events);
      this.setup.onEvents?.(this.m.events, this.m);
    }
    if (this.setup.tutorial && this.tutorialI < this.setup.tutorial.length) {
      if (this.setup.tutorial[this.tutorialI]!.done(this.m, this.m.events)) {
        this.tutorialI++;
        this.showTutorial();
      }
    }
  }

  private showTutorial(): void {
    if (!this.tutorialEl || !this.setup.tutorial) return;
    const s = this.setup.tutorial[this.tutorialI];
    this.tutorialEl.innerHTML = s ? s.text : '';
    this.tutorialEl.classList.toggle('show', !!s);
  }

  private updatePad(): void {
    if (!this.pad) return;
    const f = activeOf(this.m, 0);
    if (!f || f.spec.kind !== 'stick') return;
    const costs = POWERS_BY_ELEMENT[f.spec.element].map((p, i) => Math.max(0, (p.mp ?? 0) - RANK_MP_OFF[Math.max(1, f.spec.ranks[i]!)]!));
    this.pad.setPowers(f.spec.element, f.spec.ranks, costs, f.mp);
  }

  // ---- events -> juice ----------------------------------------------------------------------------------------

  private handleEvents(evs: Ev[]): void {
    for (const e of evs) {
      switch (e.t) {
        case 'hit': {
          const x = wx(e.x);
          const y = wy(e.y);
          const col = e.el ? ELEMENTS[e.el].color[0] : 0xffffff;
          if (e.perfect) {
            this.parts.ring(x, y, 0xffd84a, 70, 20);
            this.parts.burst(x, y, 0xffd84a, 14, 6);
            this.hud.show('PERFECT GUARD', '', 700, 'gold');
            audio.sfx('perfect');
          } else if (e.guarded) {
            this.parts.burst(x, y, 0x9fd8ff, 6, 4);
            audio.sfx('guard');
          } else {
            this.parts.burst(x, y, col, e.heavy ? 16 : 9, e.heavy ? 8 : 5);
            if (e.el) this.parts.burst(x, y, 0xffffff, 6, 3);
            this.parts.ring(x, y, col, e.heavy ? 50 : 28, 12);
            this.shake = Math.max(this.shake, Math.min(18, 3 + e.dmg / 8));
            audio.sfx(e.dmg >= 90 ? 'hitH' : e.dmg >= 45 ? 'hitM' : 'hitL');
            if (settings.damageNumbers) this.damageText(x, y - 20, String(e.dmg), e.strong ? '#ffd84a' : '#ffffff');
            const v = fighterById(this.m, e.victim);
            if (v) this.hud.comboHits(v.combo, v.team === 0 ? 1 : 0);
            if (e.strong) this.damageText(x, y - 46, 'STRONG!', '#ffd84a', 15);
          }
          break;
        }
        case 'power': {
          const f = fighterById(this.m, e.who);
          if (f) {
            audio.sfx(`power:${f.spec.element}`);
            this.parts.ring(wx(f.x), wy(f.y) - 60, ELEMENTS[f.spec.element].color[0], 60, 14);
            const mv = getMove(e.move);
            if (mv && (mv.mp ?? 0) >= 50) this.zoomPulse = 0.05;
          }
          break;
        }
        case 'move':
          audio.sfx('whoosh', e.move === 'heavy' ? 1.6 : 1);
          break;
        case 'whiff':
          break;
        case 'swap':
          audio.sfx('swap');
          this.parts.ring(wx(activeOf(this.m, e.team)!.x), FLOOR_Y - 60, 0xffffff, 60, 14);
          break;
        case 'ko': {
          const f = fighterById(this.m, e.who);
          audio.sfx(f && f.spec.kind !== 'stick' ? 'zombie' : 'ko');
          if (f) this.parts.burst(wx(f.x), wy(f.y) - 60, ELEMENTS[f.spec.element].color[0], 20, 7);
          this.shake = 14;
          break;
        }
        case 'gbreak':
          this.hud.show('GUARD BREAK', '', 700, 'red');
          audio.sfx('gbreak');
          break;
        case 'round':
          this.hud.show(this.m.mode === 'duel' ? `ROUND ${e.n}` : this.m.mode === 'zombie' ? 'SURVIVE' : 'TRAINING', '', 1300);
          break;
        case 'fight':
          this.hud.show('FIGHT!', '', 700, 'go');
          audio.sfx('bell');
          break;
        case 'roundEnd': {
          const name = e.winner === 0 || e.winner === 1 ? this.setup.labels[e.winner] : 'Nobody';
          this.hud.show(e.timeout ? 'TIME!' : 'K.O.', e.winner === 2 ? 'Draw' : `${name} wins the round`, 1800, 'big');
          this.zoomPulse = 0.08;
          break;
        }
        case 'matchEnd':
          if (this.m.mode === 'zombie') this.hud.show('OVERRUN', `Wave ${this.m.wave} · ${this.m.kills} KOs`, 2000, 'big red');
          else this.hud.show(e.winner === 0 ? 'VICTORY' : e.winner === 1 ? 'DEFEAT' : 'DRAW', '', 2000, e.winner === 0 ? 'big gold' : 'big');
          audio.play(e.winner === 0 && this.m.mode !== 'zombie' ? 'victory' : null);
          break;
        case 'wave':
          this.hud.show(e.boss ? `BOSS WAVE ${e.n}` : `WAVE ${e.n}`, '', 1300, e.boss ? 'red' : '');
          if (e.boss) audio.play('boss');
          break;
        case 'pickup':
          audio.sfx('coin');
          break;
        case 'status':
          audio.sfx('status');
          break;
        case 'jump':
        case 'land':
        case 'dash': {
          const f = fighterById(this.m, e.who);
          if (f) this.parts.dust(wx(f.x), FLOOR_Y, e.t === 'land' ? 5 : 3);
          if (e.t === 'jump') audio.sfx('jump');
          if (e.t === 'dash') audio.sfx('dash');
          break;
        }
      }
    }
  }

  private damageText(x: number, y: number, txt: string, color: string, size = 22): void {
    let t = this.texts.find((q) => !q.visible);
    if (!t) {
      if (this.texts.length > 12) return;
      t = this.add.text(0, 0, '', { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: `${size}px`, color, stroke: '#16161d', strokeThickness: 5 }).setOrigin(0.5).setDepth(1000);
      this.texts.push(t);
    }
    t.setText(txt).setColor(color).setFontSize(size).setPosition(x, y).setAlpha(1).setVisible(true).setScale(1.25);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, scale: 1, duration: 650, ease: 'Quad.easeOut', onComplete: () => t!.setVisible(false) });
  }

  // ---- drawing ---------------------------------------------------------------------------------------------------

  private view(f: Fighter): ViewState {
    let v = this.views.get(f.id);
    if (!v) {
      v = { walk: 0, cloth: [], prevHand: null, look: lookOf(f) };
      this.views.set(f.id, v);
    }
    return v;
  }

  private draw(): void {
    const g = this.g;
    g.clear();
    const time = (this.time.now - this.time0) / 1000;
    const m = this.m;
    // floor effects under fighters
    for (const e of m.effects) if (e.groundOnly || e.kind === 'zone' || e.kind === 'trap' || e.kind === 'wall') drawEffect(this.pen, e, time, this.parts, this.hitboxes);
    for (const p of m.pickups) {
      const x = wx(p.x);
      const c = p.kind === 'hp' ? 0x4ade80 : p.kind === 'mp' ? 0x38bdf8 : 0xffd84a;
      this.pen.circle(x, FLOOR_Y - 22 - Math.sin(time * 5 + p.id) * 4, 13, c, 0x16161d, 3);
      this.pen.line(x - 6, FLOOR_Y - 22, x + 6, FLOOR_Y - 22, 3, 0xffffff);
      if (p.kind !== 'mp') this.pen.line(x, FLOOR_Y - 28, x, FLOOR_Y - 16, 3, 0xffffff);
    }
    const fs = m.fighters.filter((f) => f.onField || (f.down && f.st === 'ko' && f.koT < 70));
    fs.sort((a, b) => (a.team === 0 ? 1 : 0) - (b.team === 0 ? 1 : 0));
    for (const f of fs) this.drawFighter(f, time);
    for (const e of m.effects) if (!(e.groundOnly || e.kind === 'zone' || e.kind === 'trap' || e.kind === 'wall')) drawEffect(this.pen, e, time, this.parts, this.hitboxes);
    this.parts.draw(this.pen);
    if (this.hitboxes) this.drawHitboxes();
  }

  private drawFighter(f: Fighter, time: number): void {
    const v = this.view(f);
    const s = (f.spec.scale ?? 100) / 100;
    const { pose, expr, alpha } = poseFor(f, v, time);
    const x = wx(f.x);
    const y = wy(f.y);
    // ground shadow
    const shadowW = 30 * s * Math.max(0.4, 1 - -f.y / 30000);
    this.pen.line(x - shadowW, FLOOR_Y + 2, x + shadowW, FLOOR_Y + 2, 7, 0x000000, 0.16 * alpha);
    const j = solve(pose, x, y, f.face, s);
    const [elc, ell] = elementColors(f, v.look);
    const mv = f.move ? getMove(f.move) : undefined;
    const activeMove = mv && f.mf > mv.startup && f.mf <= mv.startup + mv.active;
    // smear trail on the striking limb
    if (activeMove && v.prevHand && mv?.box) {
      const hand = mv.anim === 'kick' || mv.anim === 'knee' || mv.anim === 'airkick' || mv.anim === 'spin' ? j.aFoot : mv.anim === 'jab2' ? j.bHand : j.aHand;
      this.pen.line(v.prevHand[0], v.prevHand[1], hand[0], hand[1], 16 * s, mv.element ? elc : 0xffffff, 0.45);
      v.prevHand = hand;
    } else v.prevHand = mv?.box ? [j.aHand[0], j.aHand[1]] : null;
    // power beams and melee power glow
    if (activeMove && mv?.element && mv.box) {
      const [l, t, r, b] = moveBox(f, mv.box);
      const yy = (wy(t) + wy(b)) / 2;
      if (mv.anim === 'beam') {
        this.pen.line(wx(l), yy, wx(r), yy, (wy(b) - wy(t)) * 0.9, elc, 0.55);
        this.pen.line(wx(l), yy, wx(r), yy, (wy(b) - wy(t)) * 0.35, 0xffffff, 0.85);
      } else this.pen.circle((wx(l) + wx(r)) / 2, yy, (wx(r) - wx(l)) * 0.45, elc, null, 0, 0.25);
    }
    const aura = f.st === 'move' && mv?.element ? 1 : f.spec.kind === 'boss' ? 0.8 : f.onField && f.team === 0 ? 0.25 : 0.15;
    const opts = {
      look: v.look,
      element: elc,
      elementLight: ell,
      expression: expr,
      aura,
      alpha,
      cloth: v.cloth,
      zombie: f.spec.kind !== 'stick',
      time,
      teamColor: this.m.mode === 'duel' ? (f.team === 0 ? 0x2f8cff : 0xff4d6d) : undefined,
    };
    if (this.arena.dark) drawStick(this.rim, j, f.face, s, opts);
    drawStick(this.pen, j, f.face, s, opts);
    drawStatusFx(this.pen, f, j.head[0], j.head[1], time, this.parts);
    if (f.st === 'guard') this.pen.circle(j.aHand[0] + f.face * 10, j.aHand[1], 26 * s, null, 0x9fd8ff, 4, 0.6);
  }

  private drawHitboxes(): void {
    for (const f of this.m.fighters) {
      if (!f.onField) continue;
      const [l, t, r, b] = hurtbox(f);
      this.pen.poly([wx(l), wy(t), wx(r), wy(t), wx(r), wy(b), wx(l), wy(b)], f.invuln > 0 ? 0x888888 : 0x22c55e, 0.25);
      const mv = f.move ? getMove(f.move) : undefined;
      if (mv?.box && f.mf > mv.startup && f.mf <= mv.startup + mv.active) {
        const [a, c, d, e] = moveBox(f, mv.box);
        this.pen.poly([wx(a), wy(c), wx(d), wy(c), wx(d), wy(e), wx(a), wy(e)], 0xff2d2d, 0.35);
      }
    }
  }

  // ---- pause and end -----------------------------------------------------------------------------------------

  togglePause(): void {
    if (this.ended) return;
    this.paused = !this.paused;
    if (this.paused) this.showPause();
    else this.hidePause();
  }

  private showPause(): void {
    const ui = document.getElementById('ui')!;
    this.pauseEl = h('div', 'pause-layer');
    const panel = h('div', 'panel pause-panel');
    panel.appendChild(h('h2', '', 'Paused'));
    const add = (label: string, fn: () => void, cls = 'btn') => {
      const b = h('button', cls, label);
      b.type = 'button';
      b.addEventListener('click', fn);
      panel.appendChild(b);
      return b;
    };
    add('Resume', () => this.togglePause(), 'btn primary').focus();
    for (const it of this.setup.pauseItems ?? []) add(it.label, () => it.run(this.m));
    add(this.hitboxes ? 'Hide hitboxes' : 'Show hitboxes', () => {
      this.hitboxes = !this.hitboxes;
      this.togglePause();
    });
    add('Quit fight', () => this.finish(true));
    this.pauseEl.appendChild(panel);
    ui.appendChild(this.pauseEl);
    document.body.dataset.screen = 'pause';
    window.dispatchEvent(new CustomEvent('elementick:pause', { detail: true }));
  }

  private hidePause(): void {
    this.pauseEl?.remove();
    this.pauseEl = null;
    document.body.dataset.screen = 'fight';
    window.dispatchEvent(new CustomEvent('elementick:pause', { detail: false }));
  }

  /** Pause from outside (tab hidden, ads). */
  forcePause(): void {
    if (!this.paused && !this.ended && this.m.phase !== 'over') this.togglePause();
  }

  private async finish(quit: boolean): Promise<void> {
    if (this.ended) return;
    if (!quit && this.m.mode === 'zombie' && this.setup.onRevive && !this.revived) {
      this.revived = true;
      this.paused = true;
      const ok = await this.setup.onRevive();
      this.paused = false;
      if (ok) {
        reviveTeam(this.m);
        this.endT = 0;
        this.hud.show('BACK IN!', '', 1000, 'go');
        audio.play('zombie');
        return;
      }
    }
    this.ended = true;
    this.hidePause();
    this.setup.onEnd(this.m, quit);
  }

  private revived = false;
}
