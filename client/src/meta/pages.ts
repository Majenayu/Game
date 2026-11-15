import {
  BULLET_FX,
  CHARACTER_LIST,
  COLORS,
  EFFECT_LIST,
  LEVELS,
  MAP_LIST,
  MODES,
  MODE_LIST,
  MODS,
  POWERUP_TOTAL,
  RARITIES,
  SKILL_LIST,
  TRAILS,
  objectiveText,
  powerupFromId,
  type LevelDef,
  type ModeId,
} from '@orb/shared';
import { ALL_FIGURES, MAJEN, uniqueSvg } from '../art/bestiary';
import { sfx } from '../audio';
import { ENABLE_ADS } from '../platform/crazygames';
import type { Ui } from '../ui/ui';
import { esc, hex } from '../ui/ui';
import {
  DAILY_POOL,
  DAILY_REWARDS,
  EXTRA_SPIN_COST,
  WEEKLY_POOL,
  WHEEL,
  type Progress,
  type ShopKind,
} from './economy';

export interface PageActions {
  playOnline(mode: ModeId | 'mix', map: string): void;
  playOffline(mode: ModeId, map: string): void;
  startLevel(level: LevelDef): void;
  /** Shows the rewarded-ad flow for an extra spin. Resolves true when granted. */
  watchAd(): Promise<boolean>;
}

export type PageName =
  'arenas' | 'campaign' | 'loadout' | 'shop' | 'daily' | 'quests' | 'spin' | 'dex' | 'bestiary';

const TITLES: Record<PageName, string> = {
  arenas: 'Arenas & Modes',
  campaign: 'Campaign',
  loadout: 'Loadout',
  shop: 'Shop',
  daily: 'Daily Reward',
  quests: 'Quests',
  spin: 'Lucky Draw',
  dex: 'Powerup Collection',
  bestiary: 'Bestiary',
};

export class Pages {
  current: PageName | null = null;
  private mode: ModeId = 'dm';
  private shopTab: ShopKind = 'char';
  private wheelBusy = false;
  private spinMsg = '';

  constructor(
    private ui: Ui,
    private pr: Progress,
    private actions: PageActions,
  ) {}

  open(name: PageName): void {
    this.current = name;
    this.render();
  }

  close(): void {
    this.current = null;
    this.ui.hidePage();
  }

  render(): void {
    if (!this.current) return;
    const name = this.current;
    const body = this.ui.showPage(TITLES[name], this.html(name));
    this.bind(name, body);
    const l = this.pr.level;
    this.ui.setStatus(l.level, l.into, l.need, this.pr.data.coins);
  }

  // ---- html builders ----------------------------------------------------------

  private html(name: PageName): string {
    switch (name) {
      case 'arenas':
        return this.arenasHtml();
      case 'campaign':
        return this.campaignHtml();
      case 'loadout':
        return this.loadoutHtml();
      case 'shop':
        return this.shopHtml();
      case 'daily':
        return this.dailyHtml();
      case 'quests':
        return this.questsHtml();
      case 'spin':
        return this.spinHtml();
      case 'dex':
        return this.dexHtml();
      case 'bestiary':
        return this.bestiaryHtml();
    }
  }

  private arenasHtml(): string {
    const lvl = this.pr.level.level;
    const tabs = MODE_LIST.map(
      (m) => `<button class="${m === this.mode ? 'on' : ''}" data-mode="${m}">${MODES[m].name}</button>`,
    ).join('');
    const maps = MAP_LIST.map((m) => {
      const locked = lvl < m.level;
      return `<div class="card ${locked ? 'locked' : ''}">
        <b style="color:${hex(m.theme.accent)}">${esc(m.name)}</b>
        <div class="d">${locked ? `Unlocks at level ${m.level}` : `${m.obstacles.length} walls${m.hazards.length ? ', lava' : ''}`}</div>
        <button data-online="${m.id}" ${locked ? 'disabled' : ''}>Play online</button>
        <button class="ghost" data-offline="${m.id}" ${locked ? 'disabled' : ''}>vs bots</button>
      </div>`;
    }).join('');
    return `<div class="tabs">${tabs}</div>
      <p class="sub">${esc(MODES[this.mode].desc)} (${MODES[this.mode].roundTime}s rounds)</p>
      <div class="row"><div class="grow"><b>Quick Play: Mixed Arenas</b><div class="sub" style="margin:0">Every round changes the mode and the map. Best for finding real players.</div></div><button data-quick="1">Play</button></div>
      <h3>Pick an arena</h3><div class="cards">${maps}</div>`;
  }

  private campaignHtml(): string {
    const rows = LEVELS.map((l) => {
      const unlocked = this.pr.levelUnlocked(l);
      const stars = this.pr.data.campaign[String(l.id)] ?? 0;
      const st = [1, 2, 3].map((i) => `<span class="star ${i <= stars ? 'on' : ''}">&#9733;</span>`).join('');
      return `<div class="row ${unlocked ? '' : 'locked'}">
        <div style="width:28px;font-size:18px;color:var(--gold)">${l.id}</div>
        <div class="grow"><b>${esc(l.name)}${l.boss ? ' <span class="tag" style="color:#ff1744;border-color:#ff1744">BOSS</span>' : ''}</b>
          <div class="sub" style="margin:0">${esc(objectiveText(l))} &middot; ${MODES[l.mode].name} &middot; ${l.bots} enemies</div></div>
        <div style="font-size:20px">${st}</div>
        <button data-level="${l.id}" ${unlocked ? '' : 'disabled'}>${unlocked ? 'Play' : 'Locked'}</button>
      </div>`;
    }).join('');
    return `<p class="sub">Stars earned: ${this.pr.totalStars()} / ${LEVELS.length * 3}. Star 1: clear it. Star 2: beat the par time. Star 3: clear without dying.</p>${rows}`;
  }

  private loadoutHtml(): string {
    const l = this.pr.data.loadout;
    const owned = this.pr.data.owned;
    const chars = CHARACTER_LIST.filter((c) => owned.chars.includes(c.id))
      .map(
        (
          c,
        ) => `<div class="card ${l.char === c.id ? 'sel' : ''}"><b>${esc(c.name)}</b><div class="d">${esc(c.desc)}<br />HP ${c.hp} &middot; Speed ${Math.round(c.speed * 100)}%</div>
        <button data-equip="char:${c.id}" ${l.char === c.id ? 'disabled' : ''}>${l.char === c.id ? 'Equipped' : 'Equip'}</button></div>`,
      )
      .join('');
    const skillCard = (slot: number) =>
      SKILL_LIST.filter((s) => owned.skills.includes(s.id))
        .map(
          (
            s,
          ) => `<div class="card ${l.skills[slot] === s.id ? 'sel' : ''}"><b style="color:${hex(s.color)}">${esc(s.name)}</b><div class="d">${esc(s.desc)} (${s.cd}s)</div>
          <button data-equip="skill:${s.id}:${slot}" ${l.skills[slot] === s.id ? 'disabled' : ''}>${l.skills[slot] === s.id ? 'Equipped' : 'Equip'}</button></div>`,
        )
        .join('');
    const cos = (kind: 'color' | 'trail' | 'bfx') => {
      const list = kind === 'color' ? COLORS : kind === 'trail' ? TRAILS : BULLET_FX;
      const key = kind === 'color' ? 'colors' : kind === 'trail' ? 'trails' : 'bfx';
      const cur = kind === 'color' ? l.color : kind === 'trail' ? l.trail : l.bfx;
      return list
        .filter((c) => (owned[key] as number[]).includes(c.id))
        .map(
          (
            c,
          ) => `<div class="card ${cur === c.id ? 'sel' : ''}">${c.hex !== undefined ? `<span class="swatch" style="color:${hex(c.hex)};background:${hex(c.hex)}"></span>` : ''}<b>${esc(c.name)}</b>
          <button data-equip="${kind}:${c.id}" ${cur === c.id ? 'disabled' : ''}>${cur === c.id ? 'Equipped' : 'Equip'}</button></div>`,
        )
        .join('');
    };
    return `<p class="sub">Your loadout is used in every online match, arena and campaign level. Buy more in the Shop.</p>
      <h3>Character</h3><div class="cards">${chars}</div>
      <h3>Skill 1 (Space)</h3><div class="cards">${skillCard(0)}</div>
      <h3>Skill 2 (E)</h3><div class="cards">${skillCard(1)}</div>
      <h3>Orb color</h3><div class="cards">${cos('color')}</div>
      <h3>Trail</h3><div class="cards">${cos('trail')}</div>
      <h3>Bullets</h3><div class="cards">${cos('bfx')}</div>`;
  }

  private shopHtml(): string {
    const pr = this.pr;
    const lvl = pr.level.level;
    const tabs = (
      [
        ['char', 'Characters'],
        ['skill', 'Skills'],
        ['color', 'Colors'],
        ['trail', 'Trails'],
        ['bfx', 'Bullets'],
      ] as Array<[ShopKind, string]>
    )
      .map(([k, n]) => `<button class="${k === this.shopTab ? 'on' : ''}" data-shoptab="${k}">${n}</button>`)
      .join('');
    type Item = {
      id: string | number;
      name: string;
      desc: string;
      price: number;
      level: number;
      swatch?: number;
      color?: number;
    };
    let items: Item[] = [];
    if (this.shopTab === 'char')
      items = CHARACTER_LIST.map((c) => ({
        id: c.id,
        name: c.name,
        desc: `${c.desc} HP ${c.hp}`,
        price: c.price,
        level: c.level,
      }));
    if (this.shopTab === 'skill')
      items = SKILL_LIST.map((s) => ({
        id: s.id,
        name: s.name,
        desc: s.desc,
        price: s.price,
        level: s.level,
        color: s.color,
      }));
    if (this.shopTab === 'color')
      items = COLORS.map((c) => ({
        id: c.id,
        name: c.name,
        desc: '',
        price: c.price,
        level: c.level,
        swatch: c.hex,
      }));
    if (this.shopTab === 'trail')
      items = TRAILS.map((c) => ({
        id: c.id,
        name: c.name,
        desc: 'Leaves a trail behind your orb.',
        price: c.price,
        level: c.level,
      }));
    if (this.shopTab === 'bfx')
      items = BULLET_FX.map((c) => ({
        id: c.id,
        name: c.name,
        desc: 'Bullet style.',
        price: c.price,
        level: c.level,
      }));
    const cards = items
      .map((it) => {
        const own = pr.owns(this.shopTab, it.id);
        const locked = !own && lvl < it.level;
        const btn = own
          ? '<button disabled>Owned</button>'
          : locked
            ? `<button disabled>Level ${it.level}</button>`
            : `<button data-buy="${this.shopTab}:${it.id}" ${pr.data.coins < it.price ? 'class="ghost"' : ''}>&#9679; ${it.price}</button>`;
        return `<div class="card ${locked ? 'locked' : ''}">${it.swatch !== undefined ? `<span class="swatch" style="color:${hex(it.swatch)};background:${hex(it.swatch)}"></span>` : ''}
          <b ${it.color ? `style="color:${hex(it.color)}"` : ''}>${esc(it.name)}</b><div class="d">${esc(it.desc)}</div>${btn}</div>`;
      })
      .join('');
    return `<div class="tabs">${tabs}</div><div class="cards">${cards}</div>`;
  }

  private dailyHtml(): string {
    const st = this.pr.dailyStatus();
    const days = DAILY_REWARDS.map((c, i) => {
      const day = i + 1;
      const done = !st.canClaim ? day <= ((this.pr.data.daily.streak - 1) % 7) + 1 : day < st.nextDay;
      const now = st.canClaim && day === st.nextDay;
      return `<div class="day ${done ? 'done' : ''} ${now ? 'now' : ''}">Day ${day}<b>&#9679; ${c}</b>${done ? '&#10003;' : ''}</div>`;
    }).join('');
    return `<p class="sub">Log in every day to keep your streak. Day 7 pays the most, then the cycle restarts. Streak: ${st.streak} day(s).</p>
      <div class="days">${days}</div>
      <div style="text-align:center"><button data-claimdaily="1" ${st.canClaim ? '' : 'disabled'}>${st.canClaim ? `Claim day ${st.nextDay}` : 'Come back tomorrow'}</button></div>`;
  }

  private questRow(q: { id: string; progress: number; claimed: boolean }): string {
    const def = this.pr.questDef(q.id);
    if (!def) return '';
    const done = q.progress >= def.target;
    return `<div class="row"><div class="grow"><b>${esc(def.text)}</b>
        <div class="bar"><div style="width:${Math.min(100, (q.progress / def.target) * 100)}%"></div></div>
        <div class="sub" style="margin:2px 0 0">${Math.min(q.progress, def.target)} / ${def.target} &middot; reward &#9679; ${def.coins} + ${def.xp} XP</div></div>
        <button data-claimq="${q.id}" ${done && !q.claimed ? '' : 'disabled'}>${q.claimed ? 'Claimed' : done ? 'Claim' : 'In progress'}</button></div>`;
  }

  private questsHtml(): string {
    this.pr.ensureQuests();
    const q = this.pr.data.quests;
    return `<h3>Daily quests</h3>${q.list.map((x) => this.questRow(x)).join('')}<h3>Weekly quests</h3>${q.weekList.map((x) => this.questRow(x)).join('')}
      <p class="sub">New daily quests appear every day, weekly quests every Monday.</p>`;
  }

  private spinHtml(): string {
    const st = this.pr.spinStatus();
    return `<div class="wheelbox"><p class="sub">One free spin every day. Extra spins cost ${EXTRA_SPIN_COST} coins${ENABLE_ADS ? ' or a short ad' : ''}.</p>
      <div id="wheelwrap"><div id="pointer"></div><canvas id="wheel" width="300" height="300"></canvas></div>
      <div id="spinresult" style="min-height:26px;color:var(--gold);font-size:18px">${esc(this.spinMsg)}</div>
      <button data-spin="1">${st.free ? 'Spin (free)' : `Spin (${EXTRA_SPIN_COST} coins)`}</button>
      ${!st.free && ENABLE_ADS ? '<button class="ghost" data-spinad="1">Watch ad for a spin</button>' : ''}</div>`;
  }

  private bestiaryHtml(): string {
    const card = (f: (typeof ALL_FIGURES)[number]) => `
      <div class="boss ${f.id === MAJEN.id ? 'champion' : ''}">
        <div class="art">${uniqueSvg(f.svg, 'dex')}</div>
        <div><b style="color:${f.color}">${esc(f.name)}</b><div class="tt">${esc(f.title)} &middot; ${esc(f.element)}</div>
        <div class="lore">${esc(f.lore)}</div><div class="hint">${esc(f.hint)}</div></div>
      </div>`;
    return `<p class="sub">Meet the champion and the bosses of the world. Each boss has a secret condition. Find it, and it falls.</p>
      <div class="bossgrid">${ALL_FIGURES.map(card).join('')}</div>`;
  }

  private dexHtml(): string {
    const have = new Set(this.pr.data.dex);
    const per = EFFECT_LIST.map((e, ei) => {
      let n = 0;
      for (let i = 0; i < RARITIES.length * MODS.length; i++)
        if (have.has(ei * RARITIES.length * MODS.length + i)) n++;
      const total = RARITIES.length * MODS.length;
      return `<div class="row"><div class="grow"><b style="color:${hex(e.color)}">${esc(e.name)}</b><div class="sub" style="margin:0">${esc(e.desc)}</div>
        <div class="bar"><div style="width:${(n / total) * 100}%;background:${hex(e.color)}"></div></div></div><div>${n} / ${total}</div></div>`;
    }).join('');
    let grid = '';
    for (let i = 0; i < POWERUP_TOTAL; i++) {
      const pu = powerupFromId(i)!;
      const c = hex(EFFECT_LIST.find((e) => e.id === pu.effect)!.color);
      grid += have.has(i)
        ? `<i style="background:${c};border-color:${hex(RARITIES[pu.rarity].color)}"></i>`
        : '<i></i>';
    }
    return `<p class="sub">Discovered ${have.size} of ${POWERUP_TOTAL} unique powerups: 12 effects x 4 rarities x 21 modifiers. Grab powerups in matches to fill the collection.</p>
      <div class="dexgrid">${grid}</div><h3>By effect</h3>${per}`;
  }

  // ---- behaviour --------------------------------------------------------------

  private bind(name: PageName, body: HTMLElement): void {
    const on = (sel: string, fn: (el: HTMLElement) => void) =>
      body.querySelectorAll<HTMLElement>(sel).forEach((el) =>
        el.addEventListener('click', () => {
          sfx.click();
          fn(el);
        }),
      );
    const pr = this.pr;
    const note = (t: string, c = '#e8ecff') => this.ui.notify(t, c);
    const levelUps = (ls: number[]) => ls.forEach((l) => note(`Level up! You reached level ${l}`, '#ffc93c'));

    if (name === 'arenas') {
      on('[data-mode]', (el) => {
        this.mode = el.dataset.mode as ModeId;
        this.render();
      });
      on('[data-quick]', () => this.actions.playOnline('mix', 'rotate'));
      on('[data-online]', (el) => this.actions.playOnline(this.mode, el.dataset.online!));
      on('[data-offline]', (el) => this.actions.playOffline(this.mode, el.dataset.offline!));
    }
    if (name === 'campaign')
      on('[data-level]', (el) =>
        this.actions.startLevel(LEVELS.find((l) => l.id === Number(el.dataset.level))!),
      );
    if (name === 'loadout') {
      on('[data-equip]', (el) => {
        const [kind, id, slot] = el.dataset.equip!.split(':');
        const key: ShopKind = kind as ShopKind;
        pr.equip(key, key === 'char' || key === 'skill' ? id : Number(id), Number(slot ?? 0));
        this.render();
      });
    }
    if (name === 'shop') {
      on('[data-shoptab]', (el) => {
        this.shopTab = el.dataset.shoptab as ShopKind;
        this.render();
      });
      on('[data-buy]', (el) => {
        const [kind, id] = el.dataset.buy!.split(':');
        const k = kind as ShopKind;
        const res = pr.buy(k, k === 'char' || k === 'skill' ? id : Number(id));
        if (res.ok) {
          sfx.reward();
          note('Purchased!', '#7dff6b');
          pr.equip(k, k === 'char' || k === 'skill' ? id : Number(id), k === 'skill' ? 1 : 0);
        } else note(res.reason ?? 'Cannot buy', '#ff8a9a');
        this.render();
      });
    }
    if (name === 'daily') {
      on('[data-claimdaily]', () => {
        const r = pr.claimDaily();
        if (r) {
          sfx.reward();
          note(`Day ${r.day} reward: ${r.coins} coins!`, '#ffc93c');
          levelUps(r.levels);
        }
        this.render();
      });
    }
    if (name === 'quests') {
      on('[data-claimq]', (el) => {
        const q = [...pr.data.quests.list, ...pr.data.quests.weekList].find(
          (x) => x.id === el.dataset.claimq,
        );
        const r = q && pr.claimQuest(q);
        if (r) {
          sfx.reward();
          note(`Quest done: +${r.coins} coins`, '#ffc93c');
          levelUps(r.levels);
        }
        this.render();
      });
    }
    if (name === 'spin') this.bindSpin(body, note);
  }

  private drawWheel(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')!;
    const n = WHEEL.length;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = canvas.width / 2 - 2;
    WHEEL.forEach((w, i) => {
      const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const a1 = a0 + (2 * Math.PI) / n;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = w.color;
      ctx.fill();
      ctx.strokeStyle = '#0b0e1a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((a0 + a1) / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px Trebuchet MS, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(w.label, r - 16, 0);
      ctx.restore();
    });
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#0b0e1a';
    ctx.fill();
  }

  private bindSpin(body: HTMLElement, note: (t: string, c?: string) => void): void {
    const canvas = body.querySelector<HTMLCanvasElement>('#wheel')!;
    this.drawWheel(canvas);
    let rotation = 0;
    const result = body.querySelector<HTMLElement>('#spinresult')!;
    const run = () => {
      if (this.wheelBusy) return;
      this.wheelBusy = true;
      const idx = this.pr.rollSpin();
      const prize = this.pr.grantPrize(idx);
      const seg = 360 / WHEEL.length;
      const target = 360 - (idx * seg + seg / 2);
      rotation += 360 * 5 + ((target - (rotation % 360) + 360) % 360);
      canvas.style.transform = `rotate(${rotation}deg)`;
      this.spinMsg = 'Spinning...';
      result.textContent = this.spinMsg;
      window.setTimeout(() => {
        sfx.reward();
        this.spinMsg = `You won: ${prize}!`;
        result.textContent = this.spinMsg;
        note(`Lucky Draw: ${prize}`, '#ffc93c');
        this.wheelBusy = false;
        this.render();
      }, 4400);
    };
    body.querySelector('[data-spin]')?.addEventListener('click', () => {
      if (this.wheelBusy) return;
      if (!this.pr.payForSpin()) {
        note('Not enough coins for an extra spin', '#ff8a9a');
        return;
      }
      run();
    });
    body.querySelector('[data-spinad]')?.addEventListener('click', async () => {
      if (this.wheelBusy) return;
      if (await this.actions.watchAd()) run();
      else note('No ad available right now', '#ff8a9a');
    });
  }
}

export const QUEST_COUNT = DAILY_POOL.length + WEEKLY_POOL.length;
