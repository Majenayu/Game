// Input: keyboard (solo layout, or two players on one keyboard), gamepads and touch all become sim input bits.
// Keys are remappable per action; double-tapping a direction dashes.

import { IN } from '../sim/types';

export type Action = 'left' | 'right' | 'up' | 'down' | 'attack' | 'heavy' | 'guard' | 'p1' | 'p2' | 'p3' | 'swap' | 'dash';
export const ACTIONS: Action[] = ['left', 'right', 'up', 'down', 'attack', 'heavy', 'guard', 'p1', 'p2', 'p3', 'swap', 'dash'];
export const ACTION_BIT: Record<Action, number> = {
  left: IN.L,
  right: IN.R,
  up: IN.U,
  down: IN.D,
  attack: IN.ATK,
  heavy: IN.HVY,
  guard: IN.GRD,
  p1: IN.P1,
  p2: IN.P2,
  p3: IN.P3,
  swap: IN.SWAP,
  dash: IN.DASH,
};
export const ACTION_LABEL: Record<Action, string> = {
  left: 'Move left',
  right: 'Move right',
  up: 'Jump',
  down: 'Crouch / down',
  attack: 'Attack',
  heavy: 'Heavy attack',
  guard: 'Guard',
  p1: 'Power 1',
  p2: 'Power 2',
  p3: 'Power 3',
  swap: 'Tag swap',
  dash: 'Dash',
};

export type Bindings = Record<Action, string[]>;

/** Solo: both WASD and arrows move; J K L / Z X C attack, heavy, guard; U I O / 1 2 3 powers. */
export const SOLO_KEYS: Bindings = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp', 'Space'],
  down: ['KeyS', 'ArrowDown'],
  attack: ['KeyJ', 'KeyZ'],
  heavy: ['KeyK', 'KeyX'],
  guard: ['KeyL', 'KeyC'],
  p1: ['KeyU', 'Digit1'],
  p2: ['KeyI', 'Digit2'],
  p3: ['KeyO', 'Digit3'],
  swap: ['KeyQ', 'Tab'],
  dash: ['ShiftLeft', 'ShiftRight'],
};

/** Local 2P, player 1 (left side of the keyboard). */
export const P1_KEYS: Bindings = {
  left: ['KeyA'],
  right: ['KeyD'],
  up: ['KeyW'],
  down: ['KeyS'],
  attack: ['KeyF'],
  heavy: ['KeyG'],
  guard: ['KeyH'],
  p1: ['KeyR'],
  p2: ['KeyT'],
  p3: ['KeyY'],
  swap: ['KeyQ'],
  dash: ['ShiftLeft'],
};

/** Local 2P, player 2 (arrows plus number row or numpad). */
export const P2_KEYS: Bindings = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  attack: ['Numpad1', 'KeyM'],
  heavy: ['Numpad2', 'Comma'],
  guard: ['Numpad3', 'Period'],
  p1: ['Numpad4', 'KeyJ'],
  p2: ['Numpad5', 'KeyK'],
  p3: ['Numpad6', 'KeyL'],
  swap: ['Numpad0', 'Slash'],
  dash: ['NumpadEnter', 'ShiftRight'],
};

const held = new Set<string>();
let attached = false;

/** Global key state. Keys used by the game never scroll the page. */
export function attachKeyboard(): void {
  if (attached) return;
  attached = true;
  const gameKeys = new Set([...Object.values(SOLO_KEYS).flat(), ...Object.values(P2_KEYS).flat(), ...Object.values(P1_KEYS).flat()]);
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    held.add(e.code);
    if (gameKeys.has(e.code) && document.body.dataset.screen === 'fight') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
}

export function isKeyHeld(code: string): boolean {
  return held.has(code);
}

export interface Controller {
  read(): number;
}

/** Turns held actions into bits and adds a dash on a quick double tap. */
abstract class BitsController implements Controller {
  private lastTap = { dir: 0, frame: -99 };
  private prevDir = 0;
  private frame = 0;

  protected abstract actions(): number;

  read(): number {
    this.frame++;
    let bits = this.actions();
    const dir = bits & IN.L ? -1 : bits & IN.R ? 1 : 0;
    if (dir !== 0 && dir !== this.prevDir) {
      if (this.lastTap.dir === dir && this.frame - this.lastTap.frame < 12) bits |= IN.DASH;
      this.lastTap = { dir, frame: this.frame };
    }
    this.prevDir = dir;
    return bits;
  }
}

export class KeyboardController extends BitsController {
  constructor(public bindings: () => Bindings) {
    super();
  }

  protected actions(): number {
    let bits = 0;
    const b = this.bindings();
    for (const a of ACTIONS) if (b[a].some((k) => held.has(k))) bits |= ACTION_BIT[a];
    return bits;
  }
}

/** Standard gamepad mapping: A attack, X heavy, B dash, Y swap, LT guard, LB/RB/RT powers 1-3. */
export const PAD_MAP: Partial<Record<number, Action>> = { 0: 'attack', 2: 'heavy', 1: 'dash', 3: 'swap', 6: 'guard', 4: 'p1', 5: 'p2', 7: 'p3', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };

export class GamepadController extends BitsController {
  constructor(private index: number) {
    super();
  }

  protected actions(): number {
    const pad = navigator.getGamepads?.()[this.index];
    if (!pad) return 0;
    let bits = 0;
    pad.buttons.forEach((b, i) => {
      const a = PAD_MAP[i];
      if (a && b.pressed) bits |= ACTION_BIT[a];
    });
    const x = pad.axes[0] ?? 0;
    const y = pad.axes[1] ?? 0;
    if (x < -0.45) bits |= IN.L;
    if (x > 0.45) bits |= IN.R;
    if (y < -0.6) bits |= IN.U;
    if (y > 0.6) bits |= IN.D;
    return bits;
  }
}

export function padConnected(index: number): boolean {
  return !!navigator.getGamepads?.()[index];
}

/** Combines several sources (keyboard + pad + touch) for one player. */
export class MultiController implements Controller {
  constructor(public parts: Controller[]) {}

  read(): number {
    let b = 0;
    for (const p of this.parts) b |= p.read();
    return b;
  }
}

/** Touch buttons write their held bits here. */
export class TouchController implements Controller {
  bits = 0;
  read(): number {
    return this.bits;
  }
}
