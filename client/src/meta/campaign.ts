import { SURVIVE_MAX_DEATHS, objectiveText, type LevelDef } from '@orb/shared';
import type { OfflineSource } from '../game/sources';
import type { Ui } from '../ui/ui';

export interface LevelResult {
  won: boolean;
  stars: number;
  elapsed: number;
  deaths: number;
  hpPercent: number;
}

export function starsForHp(hpPercent: number): number {
  return hpPercent > 75 ? 3 : hpPercent > 50 ? 2 : 1;
}

/** Watches an offline simulation and decides when a campaign level is won or lost. */
export class LevelRunner {
  private timer = 0;
  private done = false;

  constructor(
    private level: LevelDef,
    private src: OfflineSource,
    private ui: Ui,
    private onDone: (r: LevelResult) => void,
  ) {}

  start(): void {
    this.timer = window.setInterval(() => this.tick(), 100);
    this.tick();
  }

  stop(): void {
    window.clearInterval(this.timer);
    this.done = true;
  }

  private progress(): string {
    const sim = this.src.sim;
    const me = sim.players.get(this.src.localId);
    if (!me) return '';
    const o = this.level.obj;
    switch (o.type) {
      case 'kills': {
        const enemy = Array.from(sim.players.values()).find((p) => p.bot && !p.boss);
        return `${enemy && enemy.alive ? 'Enemy HP ' + enemy.hp : 'Enemy defeated'} \u00b7 Your HP ${me.hp}/${me.maxHp}`;
      }
      case 'coins':
        return `${me.score} / ${o.n}`;
      case 'hold':
        return `${me.score} / ${o.n}s`;
      case 'survive':
        return `${Math.floor(this.level.time - sim.timeLeft)} / ${o.n}s  \u00b7  deaths ${me.deaths}/${SURVIVE_MAX_DEATHS}`;
      case 'boss': {
        const boss = Array.from(sim.players.values()).find((p) => p.boss);
        return boss ? `Boss HP ${boss.hp}/${boss.maxHp}` : '';
      }
    }
  }

  private tick(): void {
    if (this.done) return;
    const sim = this.src.sim;
    const me = sim.players.get(this.src.localId);
    if (!me) return;
    this.ui.setObjective(`${objectiveText(this.level)}   ${this.progress()}`);
    const o = this.level.obj;
    const elapsed = Math.min(this.level.time, this.level.time - sim.timeLeft);
    const timeUp = sim.phase === 'scoreboard';
    let won = false;
    let lost = false;
    if (o.type === 'kills') {
      const enemy = Array.from(sim.players.values()).find((p) => p.bot && !p.boss);
      won = !!enemy && !enemy.alive && me.alive;
      lost = !me.alive;
    }
    else if (o.type === 'coins' || o.type === 'hold') won = me.score >= o.n;
    else if (o.type === 'survive') {
      lost = me.deaths > SURVIVE_MAX_DEATHS;
      won = !lost && timeUp;
    } else if (o.type === 'boss') {
      const boss = Array.from(sim.players.values()).find((p) => p.boss);
      won = !!boss && !boss.alive && boss.deaths > 0 && me.alive;
      lost = !me.alive;
    }
    if (!won && !lost && timeUp) lost = true;
    if (!won && !lost) return;
    this.done = true;
    window.clearInterval(this.timer);
    this.src.paused = true;
    const hpPercent = me.maxHp > 0 ? (me.hp / me.maxHp) * 100 : 0;
    const stars = won ? starsForHp(hpPercent) : 0;
    this.onDone({ won, stars, elapsed, deaths: me.deaths, hpPercent });
  }
}
