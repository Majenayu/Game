// Input abstraction. Keyboard, touch and gamepad all press and release the same actions, and the game only reads
// actions, never raw keys. Remapping changes the key table, nothing else.

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Action = Dir | 'interact' | 'back' | 'run' | 'menu' | 'debug';

export const DIRS: readonly Dir[] = ['up', 'down', 'left', 'right'];
export const isDir = (a: Action): a is Dir => (DIRS as readonly string[]).includes(a);

export type Source = 'key' | 'touch' | 'pad';

export class InputState {
  /** Held actions, each with the set of sources holding it (so releasing a key does not cancel a held pad button). */
  private held = new Map<Action, Set<Source>>();
  /** Directions in the order they were pressed; the newest held one wins (no diagonal, no "stuck" feeling). */
  private dirOrder: Dir[] = [];
  /** Actions pressed since the last endFrame(), waiting to be consumed once. */
  private edges = new Set<Action>();
  lastSource: Source = 'key';

  press(a: Action, src: Source = 'key'): void {
    let s = this.held.get(a);
    if (!s) this.held.set(a, (s = new Set()));
    const wasHeld = s.size > 0;
    s.add(src);
    this.lastSource = src;
    if (!wasHeld) {
      this.edges.add(a);
      if (isDir(a)) {
        this.dirOrder = this.dirOrder.filter((d) => d !== a);
        this.dirOrder.push(a);
      }
    }
  }

  release(a: Action, src: Source = 'key'): void {
    const s = this.held.get(a);
    if (!s) return;
    s.delete(src);
    if (s.size === 0) {
      this.held.delete(a);
      if (isDir(a)) this.dirOrder = this.dirOrder.filter((d) => d !== a);
    }
  }

  /** Releases everything, for example when the window loses focus. */
  releaseAll(): void {
    this.held.clear();
    this.dirOrder = [];
    this.edges.clear();
  }

  isHeld(a: Action): boolean {
    return (this.held.get(a)?.size ?? 0) > 0;
  }

  /** The direction to move in, or null. */
  direction(): Dir | null {
    return this.dirOrder.length ? this.dirOrder[this.dirOrder.length - 1]! : null;
  }

  /** True once per press. */
  consume(a: Action): boolean {
    if (!this.edges.has(a)) return false;
    this.edges.delete(a);
    return true;
  }

  /** Peek without consuming. */
  wasPressed(a: Action): boolean {
    return this.edges.has(a);
  }

  endFrame(): void {
    this.edges.clear();
  }
}

export type KeyBindings = Record<string, Action>;

export const DEFAULT_KEYS: KeyBindings = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  Space: 'interact',
  Enter: 'interact',
  KeyE: 'interact',
  KeyZ: 'interact',
  Escape: 'menu',
  KeyM: 'menu',
  Backspace: 'back',
  KeyX: 'back',
  KeyQ: 'back',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  F9: 'debug',
};

/** Gamepad layout (standard mapping): A interact, B back, X run, Start menu, d-pad and left stick move. */
export const PAD_BUTTONS: Record<number, Action> = { 0: 'interact', 1: 'back', 2: 'run', 9: 'menu', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
export const STICK_DEADZONE = 0.5;

/** Converts a stick position into a direction (the larger axis wins). */
export function stickToDir(x: number, y: number, dead = STICK_DEADZONE): Dir | null {
  if (Math.max(Math.abs(x), Math.abs(y)) < dead) return null;
  return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';
}

/** Attaches keyboard events to an InputState. Returns a function that detaches them. */
export function attachKeyboard(state: InputState, bindings: () => KeyBindings, target: Window = window): () => void {
  const typing = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
  };
  const down = (e: KeyboardEvent) => {
    if (typing(e)) return;
    const a = bindings()[e.code];
    if (!a) return;
    e.preventDefault();
    if (!e.repeat) state.press(a, 'key');
  };
  const up = (e: KeyboardEvent) => {
    const a = bindings()[e.code];
    if (a) state.release(a, 'key');
  };
  const blur = () => state.releaseAll();
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  target.addEventListener('blur', blur);
  return () => {
    target.removeEventListener('keydown', down);
    target.removeEventListener('keyup', up);
    target.removeEventListener('blur', blur);
  };
}

/** Polls connected gamepads once per frame and mirrors them into the InputState. */
export class GamepadPoller {
  private prev = new Set<Action>();

  constructor(private state: InputState) {}

  poll(): void {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const now = new Set<Action>();
    for (const pad of pads) {
      if (!pad) continue;
      pad.buttons.forEach((b, i) => {
        const a = PAD_BUTTONS[i];
        if (a && b.pressed) now.add(a);
      });
      const d = stickToDir(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
      if (d) now.add(d);
    }
    for (const a of now) if (!this.prev.has(a)) this.state.press(a, 'pad');
    for (const a of this.prev) if (!now.has(a)) this.state.release(a, 'pad');
    this.prev = now;
  }
}
