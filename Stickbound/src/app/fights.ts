// Starts fights: builds controllers, hands a FightSetup to the Phaser FightScene, counts match statistics from sim
// events, and reports the result. Also owns gameplayStart/Stop for the platform.
import type { Track } from '../audio/synth';
import { GamepadController, KeyboardController, MultiController, P1_KEYS, P2_KEYS, TouchController, type Controller } from '../core/input';
import { settings } from '../meta/settings';
import { ELEMENTS } from '../content/elements';
import type { MatchSummary } from '../meta/profile';
import { FightScene, type FightSetup, type TutorialStep } from '../scenes/FightScene';
import { fighterById } from '../sim/step';
import type { Ev, Match } from '../sim/types';
import { TouchPad } from '../ui/touchPad';
import { app } from './state';

export interface FightStats {
  hits: number;
  powers: number;
  perfect: number;
  swaps: number;
  damage: number;
  kos: number;
  falls: number;
  maxCombo: number;
  powerUse: Record<string, number>;
}

export interface FightResult {
  match: Match;
  quit: boolean;
  /** team 0 won the match */
  win: boolean;
  stats: FightStats;
  seconds: number;
}

export interface FightConfig {
  match: Match;
  arena: string;
  labels: [string, string];
  music: Track;
  /** 'solo' = keyboard+pad+touch vs bot; 'local' = two keyboard halves / two pads */
  input: 'solo' | 'local';
  tutorial?: TutorialStep[];
  onRevive?: () => Promise<boolean>;
  pauseItems?: FightSetup['pauseItems'];
  showHitboxes?: boolean;
  done: (r: FightResult) => void;
}

let current: { setup: FightSetup; cfg: FightConfig } | null = null;

export const currentFight = () => current;

function soloController(): { ctl: Controller; touch: TouchController | null } {
  const touch = TouchPad.wanted() ? new TouchController() : null;
  const parts: Controller[] = [new KeyboardController(() => settings.keys), new GamepadController(0)];
  if (touch) parts.push(touch);
  return { ctl: new MultiController(parts), touch };
}

export function summary(mode: MatchSummary['mode'], r: FightResult): MatchSummary {
  const s = r.stats;
  return {
    mode,
    win: r.win,
    roundsWon: r.match.teams[0].wins,
    kos: s.kos,
    falls: s.falls,
    hits: s.hits,
    powers: s.powers,
    perfect: s.perfect,
    swaps: s.swaps,
    damage: s.damage,
    wave: r.match.mode === 'zombie' ? r.match.wave : undefined,
    powerUse: s.powerUse,
  };
}

export function startFight(cfg: FightConfig): void {
  const game = app.game!;
  let controllers: [Controller | null, Controller | null];
  let touch: TouchController | null = null;
  if (cfg.input === 'local') {
    controllers = [
      new MultiController([new KeyboardController(() => P1_KEYS), new GamepadController(0)]),
      new MultiController([new KeyboardController(() => P2_KEYS), new GamepadController(1)]),
    ];
  } else {
    const s = soloController();
    touch = s.touch;
    controllers = [s.ctl, null];
  }
  const stats: FightStats = { hits: 0, powers: 0, perfect: 0, swaps: 0, damage: 0, kos: 0, falls: 0, maxCombo: 0, powerUse: {} };
  const t0 = performance.now();
  const onEvents = (evs: Ev[], m: Match) => {
    for (const e of evs) {
      if (e.t === 'hit') {
        const atk = fighterById(m, e.attacker);
        const vic = fighterById(m, e.victim);
        if (atk?.team === 0 && !e.guarded) {
          stats.hits++;
          stats.damage += e.dmg;
          if (vic) stats.maxCombo = Math.max(stats.maxCombo, vic.combo);
        }
        if (vic?.team === 0 && e.perfect) stats.perfect++;
      } else if (e.t === 'power') {
        const f = fighterById(m, e.who);
        if (f?.team === 0) {
          stats.powers++;
          stats.powerUse[e.move] = (stats.powerUse[e.move] ?? 0) + 1;
        }
      } else if (e.t === 'swap') {
        if (e.team === 0) stats.swaps++;
      } else if (e.t === 'ko') {
        const f = fighterById(m, e.who);
        if (f?.team === 1) stats.kos++;
        else if (f?.team === 0) stats.falls++;
      }
    }
  };
  const setup: FightSetup = {
    match: cfg.match,
    controllers,
    arena: cfg.arena,
    labels: cfg.labels,
    music: cfg.music,
    touch,
    tutorial: cfg.tutorial,
    onRevive: cfg.onRevive,
    pauseItems: cfg.pauseItems,
    showHitboxes: cfg.showHitboxes,
    onEvents,
    onEnd: (m, quit) => {
      current = null;
      app.platform.gameplayStop();
      const win = !quit && m.winner === 0 && m.mode !== 'zombie';
      game.scene.stop('fight');
      game.scene.start('backdrop', { arena: cfg.arena });
      cfg.done({ match: m, quit, win, stats, seconds: (performance.now() - t0) / 1000 });
    },
  };
  current = { setup, cfg };
  document.getElementById('screens')!.replaceChildren();
  if (!settings.reducedMotion) {
    const lead = cfg.match.fighters.find((f) => f.team === 0);
    const sw = document.createElement('div');
    sw.className = 'swirl';
    if (lead) {
      sw.style.setProperty('--el', ELEMENTS[lead.spec.element].css[0]);
      sw.style.setProperty('--el2', ELEMENTS[lead.spec.element].css[1]);
    }
    document.getElementById('ui')!.appendChild(sw);
    setTimeout(() => sw.remove(), 450);
  }
  game.scene.stop('backdrop');
  game.scene.start('fight', setup);
  app.platform.gameplayStart();
}

/** The running FightScene, if any (pause on tab hidden or ads). */
export function fightScene(): FightScene | null {
  const s = app.game?.scene.getScene('fight') as FightScene | undefined;
  return s && app.game!.scene.isActive('fight') ? s : null;
}

/** Test hook: hand the player's side to a strong bot. */
export function autopilot(difficulty = 5): boolean {
  if (!current) return false;
  const m = current.setup.match;
  for (const f of m.fighters) if (f.team === 0) f.ai = { seed: f.id * 131, next: 0, hold: 0, bits: 0, difficulty };
  current.setup.controllers[0] = null;
  return true;
}
