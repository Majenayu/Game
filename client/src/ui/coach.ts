/**
 * First-match coach: one short hint at a time, shown above the skill bar so it never covers the arena centre.
 * Each step moves on as soon as the player does the thing (or after a few seconds), so new players learn by
 * playing instead of reading a wall of keys. Touch devices get touch wording.
 */
import type { Ui } from './ui';
import { isTouchDevice } from './touch';

interface Step {
  html: string;
  /** Moves on when this returns true for an input event, or after `ms`. */
  done: (e: Event) => boolean;
  ms: number;
}

const kc = (t: string) => `<span class="kc">${t}</span>`;
const isKey = (e: Event, codes: string[]) => e instanceof KeyboardEvent && codes.includes(e.code);

function steps(touch: boolean): Step[] {
  const az = (navigator.language || '').toLowerCase().startsWith('fr');
  const move = az ? ['KeyZ', 'KeyQ', 'KeyS', 'KeyD'] : ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
  const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const skillKeys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Space', 'KeyE'];
  const onSkillButton = (e: Event) => e.type === 'pointerdown' && !!(e.target as HTMLElement)?.closest?.('.skill:not(.auto)');
  const touchSide = (e: Event, right: boolean) =>
    e.type === 'touchstart' && (e as TouchEvent).touches[0] && ((e as TouchEvent).touches[0].clientX > innerWidth / 2) === right;
  if (touch)
    return [
      { html: '<b>Left thumb</b>: move', done: (e) => touchSide(e, false), ms: 7000 },
      { html: '<b>Right thumb</b>: aim and shoot', done: (e) => touchSide(e, true), ms: 7000 },
      { html: 'Tap a <b>skill button</b> on the right', done: onSkillButton, ms: 9000 },
      { html: 'Nice! Tap <b>Leave</b> when you are ready for a real match', done: () => false, ms: 6000 },
    ];
  const [up, left, down, right] = az ? ['Z', 'Q', 'S', 'D'] : ['W', 'A', 'S', 'D'];
  return [
    { html: `${kc(up)}${kc(left)}${kc(down)}${kc(right)} move`, done: (e) => isKey(e, [...move, ...arrows]), ms: 7000 },
    {
      html: 'Aim with the <b>mouse</b>, <b>click</b> to shoot',
      done: (e) => e.type === 'pointerdown' && (e as PointerEvent).pointerType === 'mouse' && (e.target as HTMLElement)?.tagName === 'CANVAS',
      ms: 7000,
    },
    { html: `${kc('1')}${kc('2')}${kc('3')}${kc('4')}${kc('5')} use your skills`, done: (e) => isKey(e, skillKeys) || onSkillButton(e), ms: 9000 },
    { html: `Nice! ${kc('X')} turns on auto skills. Press <b>Leave</b> when you are ready`, done: () => false, ms: 6000 },
  ];
}

/** Runs the coach once. Returns a function that stops it early (when the match ends). */
export function runCoach(ui: Ui): () => void {
  const list = steps(isTouchDevice());
  let i = -1;
  let timer = 0;
  let stopped = false;
  /** Set once the current step is done, so several key presses do not skip ahead. */
  let pending = false;
  const events = ['keydown', 'pointerdown', 'touchstart'] as const;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearTimeout(timer);
    for (const t of events) window.removeEventListener(t, onInput, true);
    document.removeEventListener('click', onSkip, true);
    ui.hideHint();
  };
  const next = () => {
    if (stopped) return;
    i++;
    pending = false;
    if (i >= list.length) return stop();
    window.clearTimeout(timer);
    // A short pause between steps so each hint reads as new.
    ui.hideHint();
    window.setTimeout(() => {
      if (stopped) return;
      ui.showHint(list[i].html, list[i].ms + 2000, 'coach');
      timer = window.setTimeout(next, list[i].ms);
    }, 250);
  };
  const onInput = (e: Event) => {
    if (pending || i < 0 || i >= list.length || !list[i].done(e)) return;
    pending = true;
    window.clearTimeout(timer);
    timer = window.setTimeout(next, 600);
  };
  const onSkip = (e: Event) => {
    if ((e.target as HTMLElement)?.closest?.('.hint-dismiss')) stop();
  };
  for (const t of events) window.addEventListener(t, onInput, { capture: true, passive: true });
  document.addEventListener('click', onSkip, true);
  next();
  return stop;
}
