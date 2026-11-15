import { SURVIVE_MAX_DEATHS, objectiveText, type LevelDef } from '@orb/shared';
import type { OfflineSource } from '../game/sources';
import type { Ui } from '../ui/ui';

export interface LevelResult {
  won: boolean;
  stars: number;
  elapsed: number;
  deaths: number;
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
      case 'kills':
        return `${me.kills} / ${o.n}`;
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
    if (o.type === 'kills') won = me.kills >= o.n;
    else if (o.type === 'coins' || o.type === 'hold') won = me.score >= o.n;
    else if (o.type === 'survive') {
      lost = me.deaths > SURVIVE_MAX_DEATHS;
      won = !lost && timeUp;
    } else if (o.type === 'boss') {
      const boss = Array.from(sim.players.values()).find((p) => p.boss);
      won = !!boss && !boss.alive && boss.deaths > 0;
    }
    if (!won && !lost && timeUp) lost = true;
    if (!won && !lost) return;
    this.done = true;
    window.clearInterval(this.timer);
    this.src.paused = true;
    let stars = 0;
    if (won) {
      stars = 1;
      const quick = o.type === 'survive' ? me.deaths <= 1 : elapsed <= this.level.par;
      if (quick) stars++;
      if (me.deaths === 0) stars++;
    }
    this.onDone({ won, stars, elapsed, deaths: me.deaths });
  }
}
