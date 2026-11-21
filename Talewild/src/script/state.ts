// Flags, number variables and the bag: the game state that scripts read and change.

import { bus } from '../core/events';

export class GameState {
  flags: Record<string, boolean> = {};
  vars: Record<string, number> = {};
  bag: Record<string, number> = {};

  has(flag: string): boolean {
    return flag.startsWith('!') ? !this.flags[flag.slice(1)] : !!this.flags[flag];
  }

  set(flag: string, value = true): void {
    if (value) this.flags[flag] = true;
    else delete this.flags[flag];
    bus.emit('flags:changed', { name: flag });
  }

  add(name: string, n: number): void {
    this.vars[name] = (this.vars[name] ?? 0) + n;
  }

  give(item: string, n = 1): void {
    this.bag[item] = (this.bag[item] ?? 0) + n;
    if (this.bag[item]! <= 0) delete this.bag[item];
  }

  load(src: { flags: Record<string, boolean>; vars: Record<string, number>; bag: Record<string, number> }): void {
    this.flags = { ...src.flags };
    this.vars = { ...src.vars };
    this.bag = { ...src.bag };
  }
}
