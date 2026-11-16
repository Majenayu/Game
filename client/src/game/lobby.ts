import {
  CHARACTERS,
  COUNTDOWN_SECONDS,
  ELEMENTS,
  MODES,
  RANK_INFO,
  WEAPONS,
  getMap,
  getSkill,
  usableInBattle,
  bonusText,
  type PlayerView,
} from '@orb/shared';
import { getGuildBonus } from '../meta/inventory';
import { sfx } from '../audio';
import type { Progress } from '../meta/economy';
import type { Ui } from '../ui/ui';
import { esc, hex } from '../ui/ui';
import type { GameSource, Snapshot } from './types';

/**
 * Pre-match lobby: shows every orb in the match with its character, weapon and five skills (with descriptions),
 * lets you change your own skills and weapon, and waits for Confirm. The match starts when everyone confirmed
 * or after 25 seconds.
 */
export class LobbyPanel {
  private src: GameSource | null = null;
  private confirmed = false;
  private key = '';
  private lastRender = 0;
  private editing = false;
  private picks: number[] = [];

  constructor(
    private ui: Ui,
    private pr: Progress,
  ) {}

  /** Called when a new match starts (new source). */
  attach(src: GameSource | null): void {
    this.src = src;
    this.confirmed = false;
    this.editing = false;
    this.key = '';
    this.ui.hideLobby();
  }

  frame(snap: Snapshot, me: PlayerView | undefined, players: PlayerView[], src: GameSource | null): void {
    if (src !== this.src) this.attach(src);
    if (!src || !me) return;
    const waiting = snap.phase === 'play' && me.hold > COUNTDOWN_SECONDS + 0.05;
    if (!waiting || this.confirmed) {
      if (this.ui.lobbyVisible) this.ui.hideLobby();
      return;
    }
    const now = performance.now();
    if (now - this.lastRender < 250) return;
    this.lastRender = now;
    const left = Math.ceil(snap.lobby > 0 ? snap.lobby : me.hold - COUNTDOWN_SECONDS);
    const key = JSON.stringify([
      players.map((p) => [p.id, p.name, p.team, p.char, p.weapon, p.skills]),
      this.editing,
      this.picks,
      this.pr.data.loadout.weapon,
    ]);
    if (key !== this.key || !this.ui.lobbyVisible) {
      this.key = key;
      const body = this.ui.showLobby(this.html(snap, me, players));
      this.bind(body, me);
    }
    const t = document.getElementById('lobbytime');
    if (t) t.textContent = String(Math.max(0, left));
  }

  private skillLines(csv: string): string {
    if (!csv) return '<div class="lsk"><i>Default skills</i></div>';
    return csv
      .split(',')
      .map(Number)
      .filter((id) => Number.isFinite(id))
      .map((id) => {
        const s = getSkill(id);
        if (!s) return '';
        const col = hex(ELEMENTS[s.element]?.color ?? RANK_INFO[s.rank].color);
        return `<div class="lsk"><b style="color:${hex(RANK_INFO[s.rank].color)}">[${s.rank}]</b> <b style="color:${col}">${esc(s.name)}</b> <i>${esc(s.kind)}</i><br /><i>${esc(s.desc)}</i></div>`;
      })
      .join('');
  }

  private card(p: PlayerView, me: PlayerView): string {
    const ch = CHARACTERS[p.char];
    const w = WEAPONS[p.weapon] ?? WEAPONS[0];
    const tag = p.id === me.id ? ' <span class="tag">You</span>' : p.bot ? ' <span class="tag">Bot</span>' : ' <span class="tag">Player</span>';
    return `<div class="lp" style="border-color:${hex(p.color)}"><b style="color:${hex(p.color)}">${esc(p.name)}</b>${tag}${p.boss ? ' <span class="tag" style="color:#ff1744">BOSS</span>' : ''}
      <div>${esc(ch?.name ?? p.char)} &middot; ${p.maxHp} HP &middot; ${esc(w.name)}: ${esc(w.desc)}</div>
      <div class="sub" style="margin:0">Lv ${p.lv} &middot; Attack ${p.atk} &middot; Defence ${p.def}%</div>${this.skillLines(p.skills)}</div>`;
  }

  private html(snap: Snapshot, me: PlayerView, players: PlayerView[]): string {
    const team = MODES[snap.mode].team;
    const others = players.filter((p) => p.id !== me.id);
    const allies = team ? others.filter((p) => p.team === me.team) : [];
    const enemies = team ? others.filter((p) => p.team !== me.team) : others;
    const group = (title: string, list: PlayerView[]) =>
      list.length ? `<h3>${title}</h3><div class="lteam">${list.map((p) => this.card(p, me)).join('')}</div>` : '';
    return `<h2>Get ready</h2>
      <div class="sub">${esc(MODES[snap.mode].name)} on ${esc(getMap(snap.mapId).name)} &middot; starts in <b id="lobbytime">25</b>s or when everyone confirms</div>
      <div class="lbar"><button data-lconfirm="1">Confirm</button><span class="sub" style="margin:0">Study the enemy skills below, then confirm. The match starts with 3, 2, 1, GO.</span></div>
      <h3>You</h3><div class="lteam">${this.card(me, me)}</div>
      ${(() => {
        const g = getGuildBonus();
        const t = g ? bonusText(g) : '';
        return t ? `<div class="sub" style="color:#7dff6b">Guild class buff active: ${esc(t)}</div>` : '';
      })()}
      ${this.editing ? this.editor() : '<button class="ghost" data-ledit="1">Change skills / weapon</button>'}
      ${group(team ? 'Your team' : '', allies)}
      ${group(team ? 'Enemy team' : 'Opponents', enemies)}`;
  }

  private editor(): string {
    const owned = this.pr.data.skills.filter((s) => usableInBattle(s.skillId));
    const skills = owned
      .map((s) => {
        const d = getSkill(s.skillId);
        const on = this.picks.includes(s.skillId);
        return `<button class="ghost ${on ? 'on' : ''}" data-lpick="${s.skillId}" title="${esc(d.desc)}"><b style="color:${hex(RANK_INFO[d.rank].color)}">${d.rank}</b> ${esc(d.name)} Lv${s.level}</button>`;
      })
      .join('');
    const weapons = WEAPONS.filter((w) => this.pr.data.owned.weapons.includes(w.id))
      .map(
        (w) =>
          `<button class="ghost ${this.pr.data.loadout.weapon === w.id ? 'on' : ''}" data-lweapon="${w.id}" title="${esc(w.desc)}">${esc(w.name)}</button>`,
      )
      .join('');
    return `<div class="sub">Pick up to 5 skills (${this.picks.length}/5):</div><div class="pick">${skills || '<i>No skills yet</i>'}</div>
      <div class="sub">Weapon:</div><div class="pick">${weapons}</div>
      <button data-lapply="1">Use this loadout</button> <button class="ghost" data-lcancel="1">Cancel</button>`;
  }

  private bind(body: HTMLElement, me: PlayerView): void {
    const on = (sel: string, fn: (el: HTMLElement) => void) =>
      body.querySelectorAll<HTMLElement>(sel).forEach((el) =>
        el.addEventListener('click', () => {
          sfx.click();
          fn(el);
        }),
      );
    on('[data-lconfirm]', () => {
      this.confirmed = true;
      this.src?.confirm();
      this.ui.hideLobby();
    });
    on('[data-ledit]', () => {
      this.editing = true;
      this.picks = me.skills ? me.skills.split(',').map(Number).filter((id) => this.pr.skillBySkillId(id)) : [];
    });
    on('[data-lcancel]', () => (this.editing = false));
    on('[data-lpick]', (el) => {
      const id = Number(el.dataset.lpick);
      if (this.picks.includes(id)) this.picks = this.picks.filter((x) => x !== id);
      else if (this.picks.length < 5) this.picks = [...this.picks, id];
      else this.ui.notify('Five skills at most. Remove one first.', '#ff8a9a');
    });
    on('[data-lweapon]', (el) => this.pr.equip('weapon', Number(el.dataset.lweapon)));
    on('[data-lapply]', () => {
      const r = this.pr.equipSkills(this.picks);
      if (!r.ok) {
        this.ui.notify(r.reason ?? 'Cannot use that loadout', '#ff8a9a');
        return;
      }
      this.editing = false;
      this.src?.changeLoadout(this.pr.data.loadout, this.pr.loadoutInstances());
      this.ui.notify('Loadout updated', '#7dff6b');
    });
    // re-render on the next frame after any click
    body.addEventListener('click', () => (this.key = ''), { capture: true });
  }
}
