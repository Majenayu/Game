import { MAX_HP, MAX_NICK, type PlayerView } from '@orb/shared';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function hex(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

export class Ui {
  private menu = $('menu');
  private hud = $('hud');
  private board = $('board');
  private overlay = $('overlay');
  private nick = $<HTMLInputElement>('nick');
  private muteBtn = $<HTMLButtonElement>('mute');
  private lastHud = 0;
  private hintTimer = 0;

  onPlay: (name: string) => void = () => {};
  onPractice: (name: string) => void = () => {};
  onMuteToggle: () => void = () => {};
  onLeave: () => void = () => {};
  private leaveBtn = $<HTMLButtonElement>('leave');

  constructor() {
    $('play').addEventListener('click', () => this.onPlay(this.nick.value));
    $('practice').addEventListener('click', () => this.onPractice(this.nick.value));
    this.muteBtn.addEventListener('click', () => this.onMuteToggle());
    this.leaveBtn.addEventListener('click', () => this.onLeave());
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

  setMuted(m: boolean): void {
    this.muteBtn.textContent = m ? '\u{1F507}' : '\u{1F50A}';
  }

  showMenu(): void {
    this.hideHint();
    this.menu.hidden = false;
    this.leaveBtn.hidden = true;
    this.hud.hidden = true;
    this.board.hidden = true;
    this.overlay.hidden = true;
  }

  showGame(): void {
    this.menu.hidden = true;
    this.leaveBtn.hidden = false;
    this.hud.hidden = false;
    this.overlay.hidden = true;
  }

  showOverlay(
    msg: string,
    buttons: Array<{ label: string; ghost?: boolean; onClick: () => void }> = [],
  ): void {
    this.overlay.hidden = false;
    $('ovmsg').textContent = msg;
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

  hideOverlay(): void {
    this.overlay.hidden = true;
  }

  toast(msg: string): void {
    $('toast').textContent = msg;
  }

  /** Shows a short how-to-play hint, then fades it out. */
  showHint(html: string, ms = 9000): void {
    const h = $('hint');
    window.clearTimeout(this.hintTimer);
    h.innerHTML = html;
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

  banner(msg: string | null): void {
    const b = $('banner');
    b.hidden = !msg;
    if (msg) b.textContent = msg;
  }

  /** Updates the HUD about 10 times per second. */
  updateHud(now: number, me: PlayerView | undefined, players: PlayerView[], timeLeft: number): void {
    if (now - this.lastHud < 100) return;
    this.lastHud = now;
    document.body.dataset.humans = String(players.filter((p) => !p.bot).length);
    document.body.dataset.players = String(players.length);
    if (me) {
      let pips = '';
      for (let i = 0; i < MAX_HP; i++) pips += `<div class="pip${i < me.hp ? '' : ' off'}"></div>`;
      $('hpbox').innerHTML = pips;
      $('kills').textContent = `Kills ${me.kills}`;
    }
    const s = Math.ceil(timeLeft);
    $('timer').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const top = [...players].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths).slice(0, 5);
    $('lb').innerHTML = top
      .map(
        (p) =>
          `<div class="${me && p.id === me.id ? 'me' : ''}"><span>${esc(p.name)}</span><span>${p.kills}</span></div>`,
      )
      .join('');
  }

  showScoreboard(players: PlayerView[], meId: string, winner: string, secondsLeft: number): void {
    this.board.hidden = false;
    const rows = [...players]
      .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)
      .map(
        (p, i) =>
          `<tr class="${p.id === meId ? 'me' : ''}"><td>${i + 1}</td><td><span style="color:${hex(p.color)}">&#9679;</span> ${esc(p.name)}</td><td>${p.kills}</td><td>${p.deaths}</td></tr>`,
      )
      .join('');
    this.board.innerHTML = `<h2>${winner ? `${esc(winner)} wins!` : 'Round over'}</h2>
      <table><tr><th>#</th><th>Player</th><th>Kills</th><th>Deaths</th></tr>${rows}</table>
      <div class="next">Next round in ${Math.max(0, Math.ceil(secondsLeft))}</div>`;
  }

  hideScoreboard(): void {
    this.board.hidden = true;
  }
}
