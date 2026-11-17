import {
  STAT_KEYS,
  STAT_LABELS,
  levelSheet,
  levelUpGains,
  EFFECTS,
  EMOTES,
  ELEMENTS,
  MAX_NICK,
  MP_COST_SCALE,
  MODES,
  RANK_INFO,
  RARITIES,
  TEAM_NAMES,
  getSkill,
  rankOf,
  type EffectId,
  type PlayerView,
} from '@orb/shared';
import { MAJEN, uniqueSvg } from '../art/bestiary';
import { skillIcon } from '../art/icons';
import type { Snapshot } from '../game/types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export function hex(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}

/** Skill names are 'Variant Element Kind'; the button shows the last two words, the full name is the tooltip. */
export function buttonName(name: string): string {
  const w = name.split(' ');
  return w.length > 2 ? w.slice(-2).join(' ') : name;
}
export function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

const SCORE_LABEL: Record<string, string> = { dm: 'Kills', tdm: 'Kills', coins: 'Coins', hill: 'Hill s' };

export class Ui {
  private menu = $('menu');
  private hud = $('hud');
  private board = $('board');
  private overlay = $('overlay');
  private page = $('page');
  private champ = $('champ');
  private nick = $<HTMLInputElement>('nick');
  private muteBtn = $<HTMLButtonElement>('mute');
  private leaveBtn = $<HTMLButtonElement>('leave');
  private inviteBtn = $<HTMLButtonElement>('invite');
  private emoteBtn = $<HTMLButtonElement>('emotebtn');
  private autoBtn = $<HTMLButtonElement>('autobtn');
  private countdownEl = $('countdown');
  private lobbyEl = $('lobby');
  private emotePanel = $('emotes');
  /** False when the platform disables chat; then quick chat is hidden. */
  chatAllowed = true;
  private skillBtns = [0, 1, 2, 3, 4].map((i) => $<HTMLButtonElement>('sk' + i));
  private lastHud = 0;
  private hintTimer = 0;
  private modalFocus: HTMLElement | null = null;

  onPlay: (name: string) => void = () => {};
  onPractice: (name: string) => void = () => {};
  onMuteToggle: () => void = () => {};
  onLeave: () => void = () => {};
  onInvite: () => void = () => {};
  onSkill: (slot: number) => void = () => {};
  onEmote: (e: number) => void = () => {};
  onAuto: () => void = () => {};
  onChampion: () => void = () => {};
  onPage: (name: string) => void = () => {};
  onPageClose: () => void = () => {};

  killFeed(by: string, victim: string, ally: boolean): void {
    let feed = document.getElementById('killfeed');
    if (!feed) {
      feed = document.createElement('div');
      feed.id = 'killfeed';
      feed.setAttribute('aria-live', 'polite');
      this.hud.appendChild(feed);
    }
    const row = document.createElement('div');
    row.className = ally ? 'ally' : 'enemy';
    row.textContent = `${by}  /  ${victim}`;
    feed.appendChild(row);
    while (feed.children.length > 3) feed.firstElementChild?.remove();
    window.setTimeout(() => row.remove(), 4000);
  }

  constructor() {
    $('champart').innerHTML = uniqueSvg(MAJEN.svg, 'menu');
    $('champbtn').addEventListener('click', () => this.onPage('bestiary'));
    $('champfight').addEventListener('click', () => this.onChampion());
    $('play').addEventListener('click', () => this.onPlay(this.nick.value));
    $('practice').addEventListener('click', () => this.onPractice(this.nick.value));
    this.muteBtn.addEventListener('click', () => this.onMuteToggle());
    this.leaveBtn.addEventListener('click', () => this.onLeave());
    this.inviteBtn.addEventListener('click', () => this.onInvite());
    this.emotePanel.innerHTML = EMOTES.map((t, i) => `<button class="ghost" data-emote="${i}">${esc(t)}</button>`).join('');
    this.emoteBtn.addEventListener('click', () => this.toggleEmotes());
    this.autoBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.onAuto();
    });
    this.emotePanel.querySelectorAll<HTMLButtonElement>('[data-emote]').forEach((b) =>
      b.addEventListener('click', () => {
        this.onEmote(Number(b.dataset.emote));
        this.toggleEmotes(false);
      }),
    );
    $('pageclose').addEventListener('click', () => this.onPageClose());
    this.menu
      .querySelectorAll<HTMLButtonElement>('[data-page]')
      .forEach((b) => b.addEventListener('click', () => this.onPage(b.dataset.page!)));
    this.skillBtns.forEach((b, i) => {
      const fire = (e: Event) => {
        e.preventDefault();
        this.onSkill(i);
      };
      b.addEventListener('pointerdown', fire);
    });
    this.nick.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.onPlay(this.nick.value);
    });
    this.nick.maxLength = MAX_NICK;
    this.muteBtn.hidden = false;
  }

  setNick(n: string): void {
    this.nick.value = n;
  }

  nickValue(): string {
    return this.nick.value;
  }

  setMuted(m: boolean): void {
    this.muteBtn.textContent = m ? '\u{1F507}' : '\u{1F50A}';
  }

  setInviteVisible(v: boolean): void {
    this.inviteBtn.hidden = !v;
  }
  setEmoteVisible(v: boolean): void {
    this.emoteBtn.hidden = !v || !this.chatAllowed;
    if (this.emoteBtn.hidden) this.emotePanel.hidden = true;
  }
  setAuto(on: boolean): void {
    this.autoBtn.classList.toggle('on', on);
    this.autoBtn.textContent = on ? 'AUTO ON' : 'AUTO';
  }
  // ---- modal ----------------------------------------------------------------
  /** Opens a centred window above everything. `html` is trusted markup built by the game. */
  modal(html: string): HTMLElement {
    const m = $('modal');
    if (m.hidden) this.modalFocus = document.activeElement as HTMLElement | null;
    m.innerHTML = `<div class="box panel"><button class="ghost mclose" data-mclose="1">Close</button>${html}</div>`;
    const dialog = m.querySelector<HTMLElement>('.box')!;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Game details');
    m.hidden = false;
    m.querySelector('[data-mclose]')!.addEventListener('click', () => this.closeModal());
    m.onclick = (e) => {
      if (e.target === m) this.closeModal();
    };
    m.onkeydown = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeModal();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(m.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,a[href]'));
      const first = items[0];
      const last = items[items.length - 1];
      if ((e.shiftKey && document.activeElement === first) || (!e.shiftKey && document.activeElement === last)) {
        e.preventDefault();
        (e.shiftKey ? last : first)?.focus();
      }
    };
    const title = dialog.querySelector<HTMLElement>('h2,h3');
    if (title) {
      title.id ||= 'modal-title';
      dialog.setAttribute('aria-labelledby', title.id);
    }
    dialog.querySelector<HTMLElement>('button')?.focus();
    return dialog;
  }
  closeModal(): void {
    const m = $('modal');
    m.hidden = true;
    m.innerHTML = '';
    this.modalFocus?.focus();
  }
  // ---- skill gain / merge animation -----------------------------------------------
  private mergeQueue: Array<{ skillId: number; merged: boolean; level: number; prevLevel: number; copies: number; nextAt: number }> = [];
  private mergeBusy = false;
  /** Shows a card for a new or merged skill: copies bar fills up, "LEVEL UP" when the level rises. */
  showSkillGain(d: { skillId: number; merged: boolean; level: number; prevLevel: number; copies: number; nextAt: number }): void {
    if (this.mergeQueue.length > 6) return;
    this.mergeQueue.push(d);
    if (!this.mergeBusy) this.nextMerge();
  }
  private nextMerge(): void {
    const d = this.mergeQueue.shift();
    const box = $('mergefx');
    if (!d) {
      this.mergeBusy = false;
      box.hidden = true;
      return;
    }
    this.mergeBusy = true;
    const s = getSkill(d.skillId);
    const rank = RANK_INFO[s.rank];
    const col = '#' + rank.color.toString(16).padStart(6, '0');
    const up = d.level > d.prevLevel;
    const prevFrac = d.nextAt ? Math.max(0, Math.min(1, (d.copies - 1) / d.nextAt)) : 1;
    const frac = d.nextAt ? Math.min(1, d.copies / d.nextAt) : 1;
    box.innerHTML = `<div class="mfx ${d.merged ? 'merge' : 'new'}" style="border-color:${col}">
      <div class="mtitle">${d.merged ? (up ? 'MERGE &middot; LEVEL UP!' : 'MERGE!') : 'NEW SKILL!'}</div>
      <div class="mrow">${d.merged ? `<div class="ghostcard">${skillIcon(s.kind, rank.color)}</div><div class="plus">+</div>` : ''}<div class="maincard">${skillIcon(s.kind, rank.color)}</div></div>
      <b style="color:${col}">[${s.rank}] ${esc(s.name)}</b>
      <div class="sub" style="margin:2px 0">${d.merged ? `Copies ${d.copies}${d.nextAt ? ` / ${d.nextAt} for level ${d.level + 1}` : ' (max level)'}` : 'Added to your collection'}</div>
      ${up ? `<div class="lvup">Lv ${d.prevLevel} &rarr; Lv ${d.level}</div>` : `<div class="sub" style="margin:0">Level ${d.level}</div>`}
      <div class="bar"><div style="width:${prevFrac * 100}%"></div></div></div>`;
    box.hidden = false;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const bar = box.querySelector<HTMLElement>('.bar > div');
        if (bar) bar.style.width = `${frac * 100}%`;
      }),
    );
    window.setTimeout(() => this.nextMerge(), up ? 2300 : 1600);
  }
  /** Level-up panel: "You grew to Lv. 72!" with the stat gains, like a classic RPG. */
  showLevelUp(level: number, count = 1): void {
    const gains = STAT_KEYS.map((k) => {
      let n = 0;
      for (let l = level - count + 1; l <= level; l++) n += levelUpGains(l)[k];
      return { k, n };
    });
    const sheet = levelSheet(level);
    const box = $('levelup');
    box.innerHTML = `<div class="lvbox"><div class="lvtitle">LEVEL UP!</div><div class="lvrows">${gains
      .map((g) => `<div><span>${STAT_LABELS[g.k]}</span><b>${+sheet[g.k].toFixed(2)}</b><i>+${+g.n.toFixed(2)}</i></div>`)
      .join('')}</div><div class="lvmsg">You grew to Lv. ${level}!</div></div>`;
    box.hidden = false;
    window.clearTimeout(this.lvTimer);
    this.lvTimer = window.setTimeout(() => (box.hidden = true), 4200);
    box.onclick = () => (box.hidden = true);
  }
  private lvTimer = 0;
  private bannerTimer = 0;
  /**
   * Skill names scroll in at the sides of the screen: yours on the left in blue, opponents' on the right in red.
   */
  skillFeed(side: 'me' | 'foe', text: string): void {
    const box = document.getElementById(side === 'me' ? 'skfeed-l' : 'skfeed-r');
    if (!box) return;
    // The cast and the release of one skill both report its name; show it once.
    const last = box.lastElementChild as HTMLElement | null;
    if (last && last.textContent === text && performance.now() - Number(last.dataset.t) < 700) return;
    const el = document.createElement('div');
    el.className = 'skf ' + side;
    el.textContent = text;
    el.dataset.t = String(performance.now());
    box.appendChild(el);
    while (box.children.length > 3) box.firstElementChild?.remove();
    window.setTimeout(() => el.remove(), 1600);
  }
  /** Clears both skill name columns (when leaving a match). */
  clearSkillFeed(): void {
    for (const id of ['skfeed-l', 'skfeed-r']) document.getElementById(id)?.replaceChildren();
  }
  /** The name of the skill you just cast, at the top of the screen (does not cover the arena centre). */
  skillBanner(text: string, color: string): void {
    const b = $('skillbanner');
    b.textContent = text;
    b.style.color = color;
    b.hidden = false;
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => (b.hidden = true), 1400);
  }
  /** Boss form change: the battle pauses and the new form and stats are shown. */
  showForm(boss: string, form: string, stats: string[], ms = 2500): void {
    const b = $('formfx');
    b.innerHTML = `<div class="fbox"><div class="sub" style="font-size:20px">${esc(boss)}</div><div class="fname">${esc(form)}</div><div class="fstats">${stats.map(esc).join('<br/>')}</div></div>`;
    b.hidden = false;
    window.setTimeout(() => (b.hidden = true), ms);
  }
  /** Reserves a strip at the bottom (desktop) or the right (touch) for buttons, so they never cover the arena. */
  setInGame(on: boolean): void {
    if (document.body.classList.contains('ingame') === on) return;
    document.body.classList.toggle('ingame', on);
    window.dispatchEvent(new Event('resize'));
  }
  /** Keyboard picture for the how-to overlay (adapts the labels to AZERTY keyboards). */
  static keycaps(): string {
    const az = (navigator.language || '').toLowerCase().startsWith('fr');
    const k = (t: string, w = 1) => `<span class="kc" style="min-width:${22 * w}px">${t}</span>`;
    const up = az ? 'Z' : 'W';
    const left = az ? 'Q' : 'A';
    return `<div class="kcrow">${k(up)}<br/>${k(left)}${k('S')}${k('D')} <span>move</span></div>
      <div class="kcrow">${k('&#128433;', 1.6)} <span>aim + click to shoot</span></div>
      <div class="kcrow">${k('1')}${k('2')}${k('3')}${k('4')}${k('5')} <span>skills</span> ${k('X')} <span>auto</span> ${k('P')} <span>pause</span></div>`;
  }
  /** Updates the champion panel on the menu. */
  setChampion(name: string, isYou: boolean): void {
    const nm = document.querySelector<HTMLElement>('#champ .nm');
    if (nm) nm.textContent = name.toUpperCase();
    const btn = document.getElementById('champfight') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = isYou;
      btn.textContent = isYou ? 'You hold the crown' : `Challenge ${name}`;
    }
  }
  /** Big "3, 2, 1, GO!" text, or null to hide it. */
  countdown(text: string | null): void {
    this.countdownEl.hidden = !text;
    if (text && this.countdownEl.textContent !== text) this.countdownEl.textContent = text;
  }
  /** Shows the pre-match lobby. `html` is trusted markup built by the lobby module. */
  showLobby(html: string, compact = false): HTMLElement {
    this.lobbyEl.classList.toggle('compact', compact);
    this.lobbyEl.innerHTML = html;
    this.lobbyEl.hidden = false;
    return this.lobbyEl;
  }
  hideLobby(): void {
    this.lobbyEl.hidden = true;
    this.lobbyEl.innerHTML = '';
    this.lobbyKey = '';
  }
  /** Lets a caller skip re-rendering an unchanged lobby. */
  lobbyKey = '';
  /** Duel view: the Phaser duel scene draws its own HUD. */
  showDuel(): void {
    this.showGame();
    this.setInGame(false);
    this.hud.hidden = true;
    this.skillBtns.forEach((b) => (b.hidden = true));
    this.autoBtn.hidden = true;
    this.setEmoteVisible(false);
  }
  get lobbyVisible(): boolean {
    return !this.lobbyEl.hidden;
  }
  /** Opens or closes the quick-chat panel. */
  toggleEmotes(open = this.emotePanel.hidden): void {
    this.emotePanel.hidden = !open || this.emoteBtn.hidden;
  }

  /** Updates the coins, level and xp displays (menu and page header). */
  setStatus(level: number, into: number, need: number, coins: number): void {
    document.querySelectorAll<HTMLElement>('[data-coins]').forEach((e) => (e.textContent = String(coins)));
    document.querySelectorAll<HTMLElement>('[data-level]').forEach((e) => (e.textContent = String(level)));
    document
      .querySelectorAll<HTMLElement>('[data-xpbar]')
      .forEach((e) => (e.style.width = `${Math.min(100, (into / need) * 100)}%`));
  }

  setBadge(page: string, on: boolean): void {
    const key = page;
    this.menu.querySelector<HTMLElement>(`[data-page="${key}"] .dot`)?.classList.toggle('on', on);
  }

  showMenu(): void {
    this.hideHint();
    document.body.classList.add('in-menu');
    this.champ.hidden = false;
    this.menu.hidden = false;
    this.leaveBtn.hidden = true;
    this.inviteBtn.hidden = true;
    this.setEmoteVisible(false);
    this.autoBtn.hidden = true;
    this.setInGame(false);
    this.countdown(null);
    this.hideLobby();
    this.skillBtns.forEach((b) => (b.hidden = true));
    this.hud.hidden = true;
    this.board.hidden = true;
    this.overlay.hidden = true;
    this.page.hidden = true;
    this.clearSkillFeed();
    this.setObjective('');
  }

  showGame(): void {
    document.body.classList.remove('in-menu');
    this.champ.hidden = true;
    this.menu.hidden = true;
    this.page.hidden = true;
    this.leaveBtn.hidden = false;
    this.hud.hidden = false;
    this.overlay.hidden = true;
    this.setEmoteVisible(true);
    this.autoBtn.hidden = false;
    this.setInGame(true);
  }

  /** Opens a full page (shop, loadout...). `body` is raw trusted HTML built by the pages module. */
  showPage(title: string, body: string): HTMLElement {
    document.body.classList.add('in-menu');
    this.champ.hidden = true;
    this.menu.hidden = true;
    this.page.hidden = false;
    $('pagetitle').textContent = title;
    const el = $('pagebody');
    el.innerHTML = body;
    return el;
  }

  get pageBody(): HTMLElement {
    return $('pagebody');
  }

  hidePage(): void {
    this.page.hidden = true;
  }

  showOverlay(
    msg: string,
    buttons: Array<{ label: string; ghost?: boolean; onClick: () => void }> = [],
  ): void {
    this.overlay.hidden = false;
    $('ovmsg').innerHTML = esc(msg).replace(/\n/g, '<br />');
    const box = $('ovbtns');
    box.innerHTML = '';
    for (const b of buttons) {
      const el = document.createElement('button');
      el.textContent = b.label;
      if (b.ghost) el.className = 'ghost';
      el.addEventListener('click', b.onClick);
      box.appendChild(el);
    }
  }

  /** Same as showOverlay but with trusted HTML for the message. */
  showOverlayHtml(
    html: string,
    buttons: Array<{ label: string; ghost?: boolean; onClick: () => void }> = [],
  ): void {
    this.showOverlay('', buttons);
    $('ovmsg').innerHTML = html;
  }

  hideOverlay(): void {
    this.overlay.hidden = true;
  }

  toast(msg: string): void {
    $('toast').textContent = msg;
  }

  /** Shows a short how-to-play hint, then fades it out. */
  showHint(html: string, ms = 9000, variant: '' | 'coach' = ''): void {
    const h = $('hint');
    window.clearTimeout(this.hintTimer);
    h.className = variant;
    const label = variant === 'coach' ? 'Skip' : 'Got it';
    h.innerHTML = `<span class="hmsg">${html}</span><button class="ghost hint-dismiss" aria-label="Dismiss tutorial hint">${label}</button>`;
    h.querySelector('button')!.addEventListener('click', () => this.hideHint());
    h.style.opacity = '1';
    h.hidden = false;
    this.hintTimer = window.setTimeout(() => {
      h.style.opacity = '0';
      this.hintTimer = window.setTimeout(() => (h.hidden = true), 700);
    }, ms);
  }

  hideHint(): void {
    window.clearTimeout(this.hintTimer);
    $('hint').hidden = true;
  }

  /** Stacked notification in the top centre. */
  notify(text: string, color = '#e8ecff', ms = 2600): void {
    const box = $('notes');
    const el = document.createElement('div');
    el.className = 'note';
    el.style.color = color;
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 4) box.firstElementChild?.remove();
    window.setTimeout(() => el.classList.add('out'), ms);
    window.setTimeout(() => el.remove(), ms + 500);
  }

  setObjective(text: string): void {
    const o = $('objective');
    o.hidden = !text;
    o.textContent = text;
  }

  banner(msg: string | null): void {
    const b = $('banner');
    b.hidden = !msg;
    if (msg) b.textContent = msg;
  }

  /** Updates the HUD about 10 times per second. */
  updateHud(now: number, me: PlayerView, players: PlayerView[], snap: Snapshot): void {
    if (now - this.lastHud < 100) return;
    this.lastHud = now;
    document.body.dataset.humans = String(players.filter((p) => !p.bot).length);
    document.body.dataset.players = String(players.length);
    document.body.dataset.mode = document.body.dataset.mode ?? '';
    document.body.dataset.arena = `${snap.mode}:${snap.mapId}`;

    let pips = '';
    if (me.maxHp <= 5) {
      for (let i = 0; i < me.maxHp; i++) pips += `<div class="pip${i < me.hp ? '' : ' off'}"></div>`;
    } else {
      pips = `<div class="hpbar"><div style="width:${(me.hp / me.maxHp) * 100}%"></div></div><span class="hpnum">${me.hp}/${me.maxHp}</span>`;
    }
    $('hpbox').innerHTML = pips;
    $('hpbox').setAttribute('aria-label', `Health ${me.hp} of ${me.maxHp}`);
    const label = SCORE_LABEL[snap.mode] ?? 'Score';
    $('kills').textContent =
      `${label} ${me.score}${snap.mode === 'coins' || snap.mode === 'hill' ? `  \u00b7  Kills ${me.kills}` : ''}`;

    const s = Math.ceil(snap.timeLeft);
    $('timer').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    let info = MODES[snap.mode].name;
    if (snap.mode === 'tdm')
      info = `<span style="color:#80b4ff">${snap.teamScore[0]}</span> Blue : Red <span style="color:#ff8a9a">${snap.teamScore[1]}</span>`;
    else if (snap.mode === 'hill') {
      const h = snap.hillHolder;
      info =
        h === '*'
          ? 'Hill contested!'
          : h
            ? `Hill: ${esc(players.find((p) => p.id === h)?.name ?? '')}`
            : 'Capture the hill';
    }
    $('modeinfo').innerHTML = info;

    const top = [...players].sort((a, b) => b.score - a.score || b.kills - a.kills).slice(0, 5);
    $('lb').innerHTML = top
      .map(
        (p) =>
          `<div class="${p.id === me.id ? 'me' : ''}"><span>${esc(p.name)}</span><span>${p.score}</span></div>`,
      )
      .join('');

    // active effects
    $('fxbar').innerHTML = me.fx
      ? me.fx
          .split(',')
          .map((f) => {
            const [id, r] = f.split(':');
            const e = EFFECTS[id as EffectId];
            if (!e) return '';
            return `<span class="chip" style="border-color:${hex(RARITIES[Number(r)]?.color ?? 0xffffff)};color:${hex(e.color)}">${esc(e.name)}</span>`;
          })
          .join('')
      : '';
    if (me.shield > 0)
      $('fxbar').innerHTML +=
        `<span class="chip" style="border-color:#7dff6b;color:#7dff6b">Guard x${me.shield}</span>`;

    // skills and mana
    const ids = me.skills ? me.skills.split(',').map(Number) : [];
    const cds = me.cds ? me.cds.split(',') : [];
    const mpFrac = me.maxMp > 0 ? Math.max(0, Math.min(1, me.mp / me.maxMp)) : 0;
    $('mpfill').style.width = `${mpFrac * 100}%`;
    $('mptxt').textContent = `${Math.floor(me.mp)} / ${me.maxMp}`;
    this.skillBtns.forEach((b, i) => {
      const id = ids[i];
      const rank = id === undefined ? null : rankOf(id);
      if (!rank) {
        b.hidden = true;
        return;
      }
      const def = getSkill(id);
      const [remS, totS] = (cds[i] ?? '0:1').split(':');
      const rem = Math.max(0, Number(remS) || 0);
      const tot = Math.max(0.001, Number(totS) || 1);
      const col = hex(RANK_INFO[rank].color);
      const elCol = ELEMENTS[def.element] ? hex(ELEMENTS[def.element].color) : col;
      b.hidden = false;
      b.title = def.name;
      b.setAttribute('aria-label', `${def.name}, ${rem > 0 ? `ready in ${Math.ceil(rem)} seconds` : 'ready'}, slot ${i + 1}`);
      b.style.setProperty('--cd', `${Math.min(1, rem / tot) * 100}%`);
      b.style.borderColor = elCol;
      b.style.color = elCol;
      b.classList.toggle('ready', rem <= 0 && me.alive && me.mp >= def.base.mp * MP_COST_SCALE);
      b.classList.toggle('nomp', me.mp < def.base.mp * MP_COST_SCALE);
      const key = i === 0 ? 'Space / 1' : i === 1 ? 'E / 2' : String(i + 1);
      b.innerHTML = `<span class="rk" style="color:${col}">${rank}</span><span class="skn" style="color:var(--text)">${esc(buttonName(def.name))}</span><span class="key">${key}</span><span class="cdn">${rem > 0 ? Math.ceil(rem) : ''}</span><span class="el" style="background:${elCol}"></span>`;
    });
  }

  showScoreboard(
    players: PlayerView[],
    meId: string,
    snap: Snapshot,
    secondsLeft: number,
    rewardHtml: string,
  ): void {
    this.board.hidden = false;
    const label = SCORE_LABEL[snap.mode] ?? 'Score';
    const team = MODES[snap.mode].team;
    const rows = [...players]
      .sort((a, b) => b.score - a.score || b.kills - a.kills || a.deaths - b.deaths)
      .map((p, i) => {
        const dot = team ? (p.team === 0 ? '#2979ff' : '#ff1744') : hex(p.color);
        return `<tr class="${p.id === meId ? 'me' : ''}"><td>${i + 1}</td><td><span style="color:${dot}">&#9679;</span> ${esc(p.name)}</td><td>${p.score}</td><td>${p.kills}</td><td>${p.deaths}</td></tr>`;
      })
      .join('');
    const title = snap.winner ? `${esc(snap.winner)} wins!` : 'Round over';
    const sub = team
      ? `<div class="sub">${TEAM_NAMES[0]} ${snap.teamScore[0]} : ${snap.teamScore[1]} ${TEAM_NAMES[1]}</div>`
      : '';
    this.board.innerHTML = `<h2>${title}</h2>${sub}
      <table><tr><th>#</th><th>Player</th><th>${label}</th><th>Kills</th><th>Deaths</th></tr>${rows}</table>
      ${rewardHtml}
      <div class="next">Next round in ${Math.max(0, Math.ceil(secondsLeft))}</div>`;
  }

  hideScoreboard(): void {
    this.board.hidden = true;
  }
}
