import { ACCESSORIES, CHARACTERS, CLASSES, COLORS, classById, validName } from '@orb/shared';
import { avatar } from '../art/icons2';
import { checkName, registerName } from '../account';
import { accIcon } from '../art/icons';
import { sfx } from '../audio';
import { esc, hex } from '../ui/ui';
import { FREE_ACCS, type Progress } from './economy';
import { heroSvg } from '../art/hero';

/** Reserves a unique name on the server. Returns an error text, or '' when done (or when offline). */
export async function claimName(pr: Progress, name: string): Promise<string> {
  const v = validName(name);
  if (!v.ok) return v.reason ?? 'Invalid name';
  const r = await registerName(v.name);
  if (r.ok) {
    pr.data.nick = r.player.name;
    pr.data.profile.registered = true;
    pr.commit();
    return '';
  }
  if (r.offline) {
    // Offline: play now, reserve the name the next time the server is reachable.
    pr.data.nick = v.name;
    pr.data.profile.registered = false;
    pr.commit();
    return '';
  }
  return r.reason ?? 'That name is taken';
}

/**
 * First run: a unique name, a class (decides the five starter skills), character, colour and a free accessory.
 * Everything is optional: "Quick start" skips it with a random class.
 */
export function showOnboarding(pr: Progress, defaultNick: string): Promise<void> {
  const root = document.getElementById('onboard')!;
  const clean = defaultNick.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16);
  const pick = { nick: clean.length >= 3 ? clean : 'Player' + Math.floor(Math.random() * 9999), cls: 'warrior', char: 'titan', color: 0, acc: 0 };
  let nameMsg = '';
  let nameOk = true;
  let checkTimer = 0;
  let checkGeneration = 0;
  let busy = false;
  return new Promise((resolve) => {
    const orb = () => {
      return heroSvg({ char: pick.char, gear: [], accent: COLORS[pick.color]?.hex }).replace('<svg ', '<svg width="110" height="120" ');
    };
    const finish = async (quick: boolean) => {
      if (busy) return;
      busy = true;
      checkGeneration++;
      window.clearTimeout(checkTimer);
      sfx.unlock();
      if (quick) pick.cls = CLASSES[Math.floor(Math.random() * CLASSES.length)].id;
      const err = await claimName(pr, pick.nick);
      busy = false;
      if (err) {
        nameMsg = err;
        nameOk = false;
        render();
        return;
      }
      pr.createProfile(pick.cls, { nick: pr.data.nick || pick.nick, char: quick ? classById(pick.cls)!.char : pick.char, color: pick.color, acc: pick.acc });
      pr.data.profile.onboarded = true;
      pr.commit();
      root.hidden = true;
      root.innerHTML = '';
      resolve();
    };
    const check = () => {
      const generation = ++checkGeneration;
      window.clearTimeout(checkTimer);
      const v = validName(pick.nick);
      if (!v.ok) {
        nameMsg = v.reason ?? '';
        nameOk = false;
        paintName();
        return;
      }
      nameMsg = 'Checking...';
      paintName();
      checkTimer = window.setTimeout(async () => {
        const r = await checkName(v.name);
        // A slow response for the previous input must never replace local
        // validation or the availability result for the current name.
        if (generation !== checkGeneration || root.hidden || busy) return;
        if (r.offline) {
          nameMsg = 'Offline: the name is reserved when you are back online';
          nameOk = true;
        } else {
          nameOk = r.available;
          nameMsg = r.available ? 'Name is free' : (r.reason ?? 'That name is taken');
        }
        paintName();
      }, 350);
    };
    const paintName = () => {
      const el = root.querySelector<HTMLElement>('#onamemsg');
      if (el) {
        el.textContent = nameMsg;
        el.style.color = nameOk ? '#7dff6b' : '#ff8a9a';
      }
    };
    const render = () => {
      const cls = classById(pick.cls)!;
      const classes = CLASSES.map(
        (c) =>
          `<button type="button" class="card class-option ${c.id === pick.cls ? 'sel' : ''}" data-ocls="${c.id}" aria-label="${esc(c.name)}" aria-pressed="${c.id === pick.cls}">${avatar(c.char)}<b>${esc(c.name)}</b><span class="d">${esc(c.desc)}</span></button>`,
      ).join('');
      const chars = Array.from(new Set([cls.char, 'nova']))
        .map((id) => CHARACTERS[id])
        .map((c) => `<button class="ghost ${c.id === pick.char ? 'on' : ''}" data-ochar="${c.id}">${avatar(c.id)}${esc(c.name)}</button>`)
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
            `<button class="ghost ${a.id === pick.acc ? 'on' : ''}" data-oacc="${a.id}" title="${esc(a.name)}" style="padding:2px">${accIcon(a.id)}</button>`,
        )
        .join('');
      root.innerHTML = `<div class="obrow"><h2 style="margin:0" class="grow">Create your fighter</h2><button class="ghost" data-oquick="1">Quick start &#9654;</button></div>
        <div class="obrow"><div>${orb()}</div><div class="grow"><label class="sub">Unique name (3-16 letters, digits, _ or -)</label><input id="onick" maxlength="16" value="${esc(pick.nick)}" />
          <div id="onamemsg" class="sub" style="margin:2px 0 0"></div></div></div>
        <h3>Class (your 5 starter skills)</h3><div class="cards">${classes}</div>
        <div class="obrow"><div><h3>Character</h3><div class="pick">${chars}</div></div><div><h3>Colour</h3><div class="pick">${colors}</div></div></div>
        <h3>Accessory</h3><div class="pick">${accs}</div>
        <div style="text-align:center;margin-top:12px"><button data-ostart="1">Start as ${esc(cls.name)}</button></div>
        <p class="sub" style="font-size:11px;text-align:center">Privacy: your chosen name and ranked results are stored on the Orb Arena game server to run the world ranking and guilds. Nothing else is collected.</p>`;
      paintName();
      const input = root.querySelector<HTMLInputElement>('#onick')!;
      input.addEventListener('input', () => {
        pick.nick = input.value;
        check();
      });
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
      root.querySelector('[data-ostart]')!.addEventListener('click', () => void finish(false));
      root.querySelector('[data-oquick]')!.addEventListener('click', () => void finish(true));
    };
    root.hidden = false;
    render();
    check();
  });
}
