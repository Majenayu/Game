import { ACCESSORIES, CHARACTERS, CLASSES, COLORS, classById } from '@orb/shared';
import { accIcon } from '../art/icons';
import { sfx } from '../audio';
import { esc, hex } from '../ui/ui';
import { FREE_ACCS, type Progress } from './economy';

/** First run: name, class (decides the five starter skills), character, colour and a free accessory. */
export function showOnboarding(pr: Progress, defaultNick: string): Promise<void> {
  const root = document.getElementById('onboard')!;
  const pick = { nick: pr.data.nick || defaultNick, cls: 'warrior', char: 'titan', color: 0, acc: 0 };
  return new Promise((resolve) => {
    const orb = () => {
      const c = hex(COLORS[pick.color]?.hex ?? 0x4dd2ff);
      return `<svg viewBox="0 0 120 120" width="120" height="120"><circle cx="60" cy="66" r="40" fill="${c}"/><circle cx="46" cy="52" r="12" fill="#fff" opacity=".4"/><circle cx="50" cy="64" r="5" fill="#1b0a3a"/><circle cx="70" cy="64" r="5" fill="#1b0a3a"/><path d="M50 80 Q60 88 70 80" stroke="#1b0a3a" stroke-width="3" fill="none"/></svg>`;
    };
    const render = () => {
      const cls = classById(pick.cls)!;
      const classes = CLASSES.map(
        (c) =>
          `<div class="card ${c.id === pick.cls ? 'sel' : ''}" data-ocls="${c.id}"><b>${esc(c.name)}</b><div class="d">${esc(c.desc)}</div><div class="d">Skills: ${c.kinds.map((k) => k[0]).join(', ')}</div></div>`,
      ).join('');
      const chars = Array.from(new Set([cls.char, 'nova']))
        .map((id) => CHARACTERS[id])
        .map(
          (c) =>
            `<button class="ghost ${c.id === pick.char ? 'on' : ''}" data-ochar="${c.id}">${esc(c.name)} (${c.hp} hearts)</button>`,
        )
        .join('');
      const colors = COLORS.slice(0, 8)
        .map(
          (c) =>
            `<button class="ghost ${c.id === pick.color ? 'on' : ''}" data-ocol="${c.id}" style="background:${hex(c.hex ?? 0)};width:34px;height:34px;padding:0" title="${esc(c.name)}"></button>`,
        )
        .join('');
      const accs = FREE_ACCS.map((id) => ACCESSORIES[id])
        .map(
          (a) =>
            `<button class="ghost ${a.id === pick.acc ? 'on' : ''}" data-oacc="${a.id}" title="${esc(a.name)}" style="padding:2px">${accIcon(a.id)}<div style="font-size:11px">${esc(a.name)}</div></button>`,
        )
        .join('');
      root.innerHTML = `<h2>Create your fighter</h2>
        <p class="sub">Pick what kind of fighter you want to be. Your five starter skills follow your class. You can change everything later.</p>
        <div class="obrow"><div>${orb()}</div><div class="grow"><label class="sub">Name</label><input id="onick" maxlength="16" value="${esc(pick.nick)}" /></div></div>
        <h3>Class</h3><div class="cards">${classes}</div>
        <h3>Character</h3><div class="pick">${chars}</div>
        <h3>Colour</h3><div class="pick">${colors}</div>
        <h3>Accessory (free)</h3><div class="pick">${accs}</div>
        <div style="text-align:center;margin-top:12px"><button data-ostart="1">Start as ${esc(cls.name)}</button></div>`;
      const input = root.querySelector<HTMLInputElement>('#onick')!;
      input.addEventListener('input', () => (pick.nick = input.value));
      input.addEventListener('keydown', (e) => e.stopPropagation());
      const on = (sel: string, fn: (el: HTMLElement) => void) =>
        root.querySelectorAll<HTMLElement>(sel).forEach((el) =>
          el.addEventListener('click', () => {
            sfx.click();
            fn(el);
            render();
          }),
        );
      on('[data-ocls]', (el) => {
        pick.cls = el.dataset.ocls!;
        pick.char = classById(pick.cls)!.char;
      });
      on('[data-ochar]', (el) => (pick.char = el.dataset.ochar!));
      on('[data-ocol]', (el) => (pick.color = Number(el.dataset.ocol)));
      on('[data-oacc]', (el) => (pick.acc = Number(el.dataset.oacc)));
      root.querySelector('[data-ostart]')!.addEventListener('click', () => {
        sfx.unlock();
        pr.createProfile(pick.cls, { nick: pick.nick.trim() || defaultNick, char: pick.char, color: pick.color, acc: pick.acc });
        root.hidden = true;
        root.innerHTML = '';
        resolve();
      });
    };
    root.hidden = false;
    render();
  });
}
