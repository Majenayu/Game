// Small typed event bus for loose coupling between scenes, UI and platform code.

export type Handler<T> = (payload: T) => void;

export class EventBus<E extends Record<string, unknown>> {
  private handlers = new Map<keyof E, Set<Handler<never>>>();

  on<K extends keyof E>(name: K, fn: Handler<E[K]>): () => void {
    let set = this.handlers.get(name);
    if (!set) this.handlers.set(name, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => set!.delete(fn as Handler<never>);
  }

  emit<K extends keyof E>(name: K, payload: E[K]): void {
    const set = this.handlers.get(name);
    if (!set) return;
    for (const fn of [...set]) (fn as Handler<E[K]>)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export interface GameEvents extends Record<string, unknown> {
  'map:enter': { map: string };
  'save:written': { slot: number; auto: boolean };
  'ui:busy': boolean;
  'flags:changed': { name: string };
  'toast': string;
}

export const bus = new EventBus<GameEvents>();
