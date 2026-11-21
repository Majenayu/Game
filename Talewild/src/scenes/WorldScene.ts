// The overworld: tile map, player, Nib, NPCs, talking, doors, camera and autosave.

import Phaser from 'phaser';
import { bus } from '../core/events';
import { FixedStep } from '../core/fixedStep';
import type { Dir } from '../core/input';
import { hash32, Rng } from '../core/rng';
import { t } from '../core/i18n';
import { NPC_LOOKS, DEFAULT_LOOK } from '../content/looks';
import { getContext, type GameContext } from '../game/context';
import { TEXT_SPEED_CPS } from '../game/settings';
import { buildNibPortrait, buildPortrait } from '../render/characters';
import { buildTilemap, cameraBounds, ensureCharacter, ensureNib, NIB_KEY, zoomFor } from '../render/mapRender';
import { runScript, type ScriptHost } from '../script/runner';
import { DIR_VEC, GridMover } from '../world/grid';
import type { MapData } from '../world/mapData';
import { NpcBrain } from '../world/npc';
import { TILE_SIZE } from '../world/tiles';
import { getDialogue, getFlow, getUi } from '../game/flow';
import { Actor } from './actor';

const EMOTE_GLYPH: Record<string, string> = { heart: '♥', note: '♪', surprise: '!', dots: '…' };
const AUTOSAVE_MS = 120_000;

export class WorldScene extends Phaser.Scene {
  private ctx!: GameContext;
  private map!: MapData;
  private player!: Actor;
  private nib!: Actor;
  private nibTarget: [number, number] | null = null;
  private npcs: { actor: Actor; brain: NpcBrain; script: string }[] = [];
  private fixed = new FixedStep();
  private scripting = false;
  private transitioning = false;
  private runToggled = false;

  constructor() {
    super('world');
  }

  create(): void {
    this.ctx = getContext();
    const session = this.ctx.session!;
    const p = session.player;
    this.map = this.ctx.chapter.maps[p.map]!;
    this.scripting = false;
    this.transitioning = false;
    this.npcs = [];
    this.fixed.reset();

    buildTilemap(this, this.map);
    ensureNib(this);

    const playerKey = ensureCharacter(this, p.look);
    this.player = new Actor(this, 'player', playerKey, new GridMover(p.x, p.y, p.facing));

    // Nib starts on the tile behind the player if it is free.
    const [bx, by] = DIR_VEC[opposite(p.facing)];
    const nx = p.x + bx;
    const ny = p.y + by;
    const nibFree = !this.map.isSolid(nx, ny) && !this.map.warpAt(nx, ny);
    this.nib = new Actor(this, 'nib', NIB_KEY, new GridMover(nibFree ? nx : p.x, nibFree ? ny : p.y, p.facing), 'nib');

    for (const n of this.map.npcs()) {
      const look = NPC_LOOKS[n.look] ?? DEFAULT_LOOK;
      const brain = new NpcBrain({ move: n.move, homeX: n.x, homeY: n.y, radius: n.radius, path: n.path, facing: n.facing }, new Rng(hash32(`${this.map.id}:${n.name}`)));
      this.npcs.push({ actor: new Actor(this, n.name, ensureCharacter(this, look), brain.mover), brain, script: n.script });
    }

    const cam = this.cameras.main;
    const fit = () => {
      cam.setZoom(zoomFor(this.scale.width, this.scale.height));
      cameraBounds(cam, this.map);
    };
    fit();
    this.scale.on('resize', fit, this);
    this.events.once('shutdown', () => this.scale.off('resize', fit, this));
    cam.startFollow(this.player.sprite, true, 0.2, 0.2, 0, 8);
    cam.roundPixels = true;
    cam.fadeIn(this.ctx.settings.reducedMotion ? 0 : 220, 20, 17, 42);

    this.time.addEvent({
      delay: AUTOSAVE_MS,
      loop: true,
      callback: () => {
        if (!this.scripting && !this.transitioning && this.ctx.autosave()) getUi().toast(t('toast.autosaved'), 1400);
      },
    });

    this.ctx.setWorldActive(true);
    bus.emit('map:enter', { map: this.map.id });
    getUi().toast(t(`map.${this.map.id}`), 1800);
    if (!session.state.has('seen_move_hint')) {
      session.state.set('seen_move_hint');
      getUi().toast(this.ctx.input.lastSource === 'touch' || matchMedia('(pointer: coarse)').matches ? t('hint.moveTouch') : t('hint.move'), 4500);
    }
  }

  override update(_time: number, delta: number): void {
    if (this.ctx.focusPaused) return;
    this.ctx.session!.playMs += delta;
    this.fixed.advance(delta, (ms) => this.tick(ms));
    this.player.sync();
    this.nib.sync();
    for (const n of this.npcs) n.actor.sync();
  }

  // ---- simulation -------------------------------------------------------------------------------------------

  private blockedForPlayer = (x: number, y: number): boolean =>
    this.map.isSolid(x, y) || this.npcs.some((n) => n.actor.occupies(x, y));

  private blockedForNpc = (self: Actor) => (x: number, y: number): boolean =>
    this.map.isSolid(x, y) ||
    !!this.map.warpAt(x, y) ||
    this.player.occupies(x, y) ||
    this.nib.occupies(x, y) ||
    this.npcs.some((n) => n.actor !== self && n.actor.occupies(x, y));

  private tick(ms: number): void {
    for (const n of this.npcs) n.brain.update(ms, this.blockedForNpc(n.actor));
    // During a door fade the session already points at the next map; nothing here may overwrite it.
    if (this.transitioning) return;

    const input = this.ctx.input;
    const ui = getUi();
    const frozen = ui.busy || this.scripting || this.transitioning;
    const pm = this.player.mover;

    let want: Dir | null = null;
    let run = false;
    if (!frozen) {
      if (input.consume('menu')) {
        pm.stop();
        getFlow().openPause();
        return;
      }
      if (!pm.moving && input.consume('interact')) {
        this.interact();
        return;
      }
      if (this.ctx.settings.runToggle) {
        if (input.consume('run')) this.runToggled = !this.runToggled;
        run = this.runToggled;
      } else run = input.isHeld('run');
      want = input.direction();
    }

    const res = pm.update(ms, want, run, this.blockedForPlayer);
    if (res.started) this.nibTarget = [pm.prevX, pm.prevY];
    this.updateNib(ms, run);
    this.ctx.session!.player = { ...this.ctx.session!.player, x: pm.x, y: pm.y, facing: pm.facing };
    if (res.arrived) {
      // When a held key chains the next step at once, the tile we arrived on is the one just left.
      const [ax, ay] = res.started ? [pm.prevX, pm.prevY] : [pm.x, pm.y];
      const warp = this.map.warpAt(ax, ay);
      if (warp) this.warp(warp.toMap, warp.toSpawn);
    }
  }

  private updateNib(ms: number, run: boolean): void {
    const m = this.nib.mover;
    let want: Dir | null = null;
    if (!m.moving && this.nibTarget) {
      const [tx, ty] = this.nibTarget;
      const dx = tx - m.x;
      const dy = ty - m.y;
      if (dx === 0 && dy === 0) this.nibTarget = null;
      else if (Math.abs(dx) + Math.abs(dy) > 1) {
        m.teleport(tx, ty, this.player.mover.facing);
        this.nibTarget = null;
      } else want = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
    }
    m.update(ms, want, run, () => false, false);
    if (!m.moving && !want && !this.nibTarget) m.face(this.player.mover.facing);
  }

  // ---- interaction ------------------------------------------------------------------------------------------

  private interact(): void {
    const [fx, fy] = this.player.mover.front();
    const npc = this.npcs.find((n) => n.actor.mover.x === fx && n.actor.mover.y === fy && !n.actor.mover.moving);
    if (npc) {
      npc.brain.talking = true;
      npc.brain.lookAt(this.player.mover.x, this.player.mover.y);
      void this.run(npc.script, () => (npc.brain.talking = false));
      return;
    }
    if (this.nib.mover.x === fx && this.nib.mover.y === fy) {
      void this.run('nib');
      return;
    }
    const sign = this.map.signAt(fx, fy);
    if (sign) void this.run(sign.script);
  }

  private async run(scriptId: string, done?: () => void): Promise<void> {
    const script = this.ctx.chapter.scripts[scriptId];
    if (!script) {
      console.warn(`missing script ${scriptId}`);
      done?.();
      return;
    }
    this.scripting = true;
    this.player.mover.stop();
    const ui = getUi();
    const dialogue = getDialogue();
    dialogue.speed = TEXT_SPEED_CPS[this.ctx.settings.textSpeed];
    try {
      await runScript(script, this.host(), this.ctx.session!.state);
    } catch (e) {
      console.error(e);
    } finally {
      ui.remove(dialogue);
      this.scripting = false;
      this.ctx.input.endFrame();
      done?.();
      this.cameras.main.startFollow(this.player.sprite, true, 0.2, 0.2, 0, 8);
    }
  }

  private actorByName(name: string): Actor | undefined {
    if (name === 'player') return this.player;
    if (name === 'nib') return this.nib;
    return this.npcs.find((n) => n.actor.name === name)?.actor;
  }

  private host(): ScriptHost {
    const ui = getUi();
    const dialogue = getDialogue();
    const portraitFor = (who?: string): HTMLCanvasElement | null => {
      if (!who) return null;
      if (who === 'nib') return buildNibPortrait();
      const look = NPC_LOOKS[who];
      return look ? buildPortrait(look) : null;
    };
    return {
      say: (who, key) => {
        ui.push(dialogue);
        const name = who ? t(`name.${who}`) : null;
        return dialogue.say(name, t(key, { name: this.ctx.session!.player.name }), portraitFor(who));
      },
      choose: (keys) => dialogue.choose(keys.map((k) => t(k))),
      camera: (target) =>
        new Promise<void>((resolve) => {
          const cam = this.cameras.main;
          const ms = this.ctx.settings.reducedMotion ? 0 : target === 'player' ? 500 : target.ms;
          const x = target === 'player' ? this.player.sprite.x : (target.x + 0.5) * TILE_SIZE;
          const y = target === 'player' ? this.player.sprite.y - 16 : (target.y + 0.5) * TILE_SIZE;
          cam.stopFollow();
          ui.remove(dialogue);
          if (ms === 0) {
            cam.centerOn(x, y);
            resolve();
            return;
          }
          cam.pan(x, y, ms, 'Sine.easeInOut', true, (_c: Phaser.Cameras.Scene2D.Camera, progress: number) => {
            if (progress >= 1) resolve();
          });
        }),
      wait: (ms) => new Promise((r) => this.time.delayedCall(ms, r)),
      face: (actor, dir) => this.actorByName(actor)?.mover.face(dir),
      emote: (actor, icon) => this.emote(actor, icon),
      battle: async () => {
        ui.toast('Battles arrive in Phase 2.');
      },
      gave: (item, n) => ui.toast(t('toast.got', { item: t(`item.${item}`), n })),
    };
  }

  private emote(actorName: string, icon: string): Promise<void> {
    const a = this.actorByName(actorName);
    if (!a) return Promise.resolve();
    const x = a.sprite.x;
    const y = a.sprite.y - a.sprite.height - 6;
    const bubble = this.add.container(x, y).setDepth(5000);
    const g = this.add.graphics();
    g.fillStyle(0xfff8e6, 1).lineStyle(2, 0x2b1d2e, 1);
    g.fillRoundedRect(-11, -11, 22, 20, 6).strokeRoundedRect(-11, -11, 22, 20, 6);
    const txt = this.add.text(0, -1, EMOTE_GLYPH[icon] ?? '!', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '16px', color: icon === 'heart' ? '#d8304c' : '#2b1d2e', fontStyle: 'bold' }).setOrigin(0.5);
    bubble.add([g, txt]);
    return new Promise((resolve) => {
      this.tweens.add({ targets: bubble, y: y - 6, duration: this.ctx.settings.reducedMotion ? 0 : 180, yoyo: true, hold: 520, onComplete: () => (bubble.destroy(), resolve()) });
    });
  }

  // ---- warps and debug ----------------------------------------------------------------------------------------

  private warp(toMap: string, toSpawn: string): void {
    const target = this.ctx.chapter.maps[toMap];
    const sp = target?.spawn(toSpawn);
    if (!target || !sp) {
      console.error(`bad warp to ${toMap}:${toSpawn}`);
      return;
    }
    this.transitioning = true;
    const s = this.ctx.session!;
    s.player = { ...s.player, map: toMap, x: sp.x, y: sp.y, facing: sp.facing };
    this.ctx.autosave();
    const cam = this.cameras.main;
    const restart = () => this.scene.restart();
    if (this.ctx.settings.reducedMotion) restart();
    else {
      cam.fadeOut(180, 20, 17, 42);
      cam.once('camerafadeoutcomplete', restart);
    }
  }

  /** Debug teleport (also used by end-to-end tests with ?debug=1). */
  teleport(map: string, x: number, y: number, facing: Dir): void {
    const s = this.ctx.session!;
    s.player = { ...s.player, map, x, y, facing };
    this.scene.restart();
  }

  /** True while an event script runs (dialogue may be hidden during camera moves). */
  get isScripting(): boolean {
    return this.scripting;
  }

  where(): string {
    const m = this.player?.mover;
    return m ? `${this.map.id} ${m.x},${m.y} ${m.facing}` : '';
  }
}

function opposite(d: Dir): Dir {
  return d === 'up' ? 'down' : d === 'down' ? 'up' : d === 'left' ? 'right' : 'left';
}

