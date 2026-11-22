// Fight HUD: names, element icons, HP, MP and guard bars, the benched avatar's small HP bar, statuses,
// timer, round pips, combo counter and banners. DOM, updated only when values change.

import { ELEMENTS } from '../content/elements';
import type { StatusId } from '../content/moves';
import { elementIcon, statusIcon } from '../render/icons';
import { activeOf, fighterById } from '../sim/step';
import type { Fighter, Match } from '../sim/types';
import { h } from './dom';

interface Side {
  root: HTMLElement;
  name: HTMLElement;
  icon: HTMLElement;
  hp: HTMLElement;
  hpLag: HTMLElement;
  mp: HTMLElement;
  gs: HTMLElement;
  bench: HTMLElement;
  benchHp: HTMLElement;
  benchIcon: HTMLElement;
  status: HTMLElement;
  pips: HTMLElement;
  lag: number;
  last: string;
}

export class Hud {
  readonly el = h('div', 'hud');
  private sides: [Side, Side];
  private timer = h('div', 'hud-timer');
  private center = h('div', 'hud-center');
  private combo = h('div', 'hud-combo');
  private banner = h('div', 'banner');
  private sub = h('div', 'banner-sub');
  private bannerT = 0;
  private comboT = 0;
  readonly pauseBtn = h('button', 'hud-pause', 'II');
  private infoRight: HTMLElement | null = null;

  constructor(private labels: [string, string], readonly mode: Match['mode']) {
    this.sides = [this.side(0), this.side(1)];
    this.pauseBtn.type = 'button';
    this.pauseBtn.setAttribute('aria-label', 'Pause');
    this.center.append(this.timer, this.pauseBtn);
    const top = h('div', 'hud-top');
    top.append(this.sides[0].root, this.center, this.sides[1].root);
    this.el.append(top, this.combo, this.banner, this.sub);
    if (mode === 'zombie') {
      this.sides[1].root.classList.add('zinfo');
      this.sides[1].root.replaceChildren();
      this.infoRight = h('div', 'zstats');
      this.sides[1].root.appendChild(this.infoRight);
    }
  }

  private side(i: 0 | 1): Side {
    const root = h('div', `hud-side s${i}`);
    const head = h('div', 'hud-head');
    const icon = h('span', 'hud-icon');
    const name = h('span', 'hud-name', this.labels[i]);
    const pips = h('span', 'hud-pips');
    head.append(icon, name, pips);
    const bar = h('div', 'bar hp');
    const hpLag = h('div', 'fill lag');
    const hp = h('div', 'fill');
    bar.append(hpLag, hp);
    const mpBar = h('div', 'bar mp');
    const mp = h('div', 'fill');
    mpBar.appendChild(mp);
    const gsBar = h('div', 'bar gs');
    const gs = h('div', 'fill');
    gsBar.appendChild(gs);
    const bench = h('div', 'hud-bench');
    const benchIcon = h('span', 'hud-icon small');
    const bBar = h('div', 'bar bhp');
    const benchHp = h('div', 'fill');
    bBar.appendChild(benchHp);
    bench.append(benchIcon, bBar);
    const status = h('div', 'hud-status');
    root.append(head, bar, mpBar, gsBar, bench, status);
    return { root, name, icon, hp, hpLag, mp, gs, bench, benchHp, benchIcon, status, pips, lag: 1, last: '' };
  }

  setLabel(i: 0 | 1, text: string): void {
    this.sides[i].name.textContent = text;
  }

  show(text: string, sub = '', ms = 1100, cls = ''): void {
    this.banner.textContent = text;
    this.banner.className = `banner show ${cls}`;
    this.sub.textContent = sub;
    this.sub.className = `banner-sub ${sub ? 'show' : ''}`;
    this.bannerT = ms;
  }

  comboHits(n: number, team: 0 | 1): void {
    if (n < 2) return;
    this.combo.textContent = `${n} HITS`;
    this.combo.className = `hud-combo show t${team}`;
    this.comboT = 900;
  }

  update(m: Match, dt: number): void {
    if (this.bannerT > 0 && (this.bannerT -= dt) <= 0) {
      this.banner.className = 'banner';
      this.sub.className = 'banner-sub';
    }
    if (this.comboT > 0 && (this.comboT -= dt) <= 0) this.combo.className = 'hud-combo';
    const sec = Math.ceil(m.timer / 60);
    this.timer.textContent = m.mode === 'duel' ? String(Math.max(0, sec)) : m.mode === 'zombie' ? `W${m.wave}` : '∞';
    this.timer.classList.toggle('low', m.mode === 'duel' && sec <= 10);
    for (const t of [0, 1] as const) {
      if (t === 1 && m.mode === 'zombie') {
        const alive = m.fighters.filter((f) => f.team === 1 && !f.down).length;
        const txt = `Wave ${m.wave} · Zombies ${alive + m.waveLeft} · KOs ${m.kills}`;
        if (this.infoRight && this.infoRight.textContent !== txt) this.infoRight.textContent = txt;
        continue;
      }
      const f = activeOf(m, t);
      if (!f) continue;
      this.updateSide(this.sides[t], f, m, t, dt);
    }
  }

  private updateSide(s: Side, f: Fighter, m: Match, team: 0 | 1, dt: number): void {
    const hpPct = Math.max(0, f.hp / f.hpMax);
    s.lag = s.lag > hpPct ? Math.max(hpPct, s.lag - dt / 1400) : hpPct;
    s.hp.style.width = `${hpPct * 100}%`;
    s.hpLag.style.width = `${s.lag * 100}%`;
    s.hp.classList.toggle('low', hpPct < 0.25);
    s.mp.style.width = `${f.mp / 10}%`;
    s.gs.style.width = `${f.gs / 10}%`;
    const key = `${f.id}`;
    if (s.last !== key) {
      s.last = key;
      s.icon.innerHTML = elementIcon(f.spec.element, 22);
      s.name.textContent = `${f.spec.name} · Lv ${f.spec.level}`;
      s.root.style.setProperty('--el', ELEMENTS[f.spec.element].css[0]);
    }
    const other = m.teams[team].members.map((id) => fighterById(m, id)!).find((o) => o && o.id !== f.id);
    s.bench.hidden = !other;
    if (other) {
      s.benchHp.style.width = `${Math.max(0, other.hp / other.hpMax) * 100}%`;
      s.bench.classList.toggle('out', other.down);
      const bk = `b${other.id}`;
      if (s.benchIcon.dataset.k !== bk) {
        s.benchIcon.dataset.k = bk;
        s.benchIcon.innerHTML = elementIcon(other.spec.element, 16);
      }
    }
    const st = (Object.keys(f.status) as StatusId[]).filter((k) => f.status[k] > 0).join(',');
    if (s.status.dataset.k !== st) {
      s.status.dataset.k = st;
      s.status.innerHTML = st ? st.split(',').map((k) => statusIcon(k as StatusId, 16)).join('') : '';
    }
    const wins = m.teams[team].wins;
    const pip = m.mode === 'duel' ? '●'.repeat(wins) + '○'.repeat(Math.max(0, m.winsNeeded - wins)) : '';
    if (s.pips.textContent !== pip) s.pips.textContent = pip;
  }
}
