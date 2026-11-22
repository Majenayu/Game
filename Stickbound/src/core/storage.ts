// Key-value storage interface. On CrazyGames it is the SDK data module (same API as localStorage);
// elsewhere it is localStorage; tests use MemoryKV.

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryKV implements KV {
  readonly map = new Map<string, string>();
  /** When set, the next setItem with this key throws (simulates a failed write). */
  failNextWrite: string | null = null;

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    if (this.failNextWrite === key) {
      this.failNextWrite = null;
      throw new Error(`simulated write failure for ${key}`);
    }
    this.map.set(key, String(value));
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

/** localStorage, or an in-memory fallback when it is blocked (private mode, sandboxed iframes). */
export function browserKV(): KV {
  try {
    const k = '__tw_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    console.warn('localStorage is not available; progress will not persist after closing the page.');
    return new MemoryKV();
  }
}
