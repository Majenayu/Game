// Runs event scripts against a host (the world scene and the UI). Pure logic: tests use a fake host.

import type { Dir } from '../core/input';
import { CMD_KEYS, type Cmd, type Script } from './types';
import type { GameState } from './state';

export interface ScriptHost {
  say(who: string | undefined, textKey: string): Promise<void>;
  choose(optionKeys: string[]): Promise<number>;
  camera(target: { x: number; y: number; ms: number } | 'player'): Promise<void>;
  wait(ms: number): Promise<void>;
  face(actor: string, dir: Dir): void;
  emote(actor: string, icon: string): Promise<void>;
  battle(id: string): Promise<void>;
  /** Called when items are given, for a toast. */
  gave(item: string, n: number): void;
}

/** Guard against scripts that loop forever by mistake. */
export const MAX_COMMANDS = 2000;

export class ScriptError extends Error {}

export async function runScript(script: Script, host: ScriptHost, state: GameState): Promise<void> {
  let count = 0;
  const STOP = Symbol('stop');

  const run = async (steps: Cmd[]): Promise<void> => {
    for (const cmd of steps) {
      if (++count > MAX_COMMANDS) throw new ScriptError(`script ${script.id} ran more than ${MAX_COMMANDS} commands`);
      if ('say' in cmd) await host.say(cmd.who, cmd.say);
      else if ('choice' in cmd) {
        const i = await host.choose(cmd.choice);
        const branch = cmd.branches[i];
        if (!branch) throw new ScriptError(`script ${script.id}: no branch for choice ${i}`);
        await run(branch);
      } else if ('set' in cmd) state.set(cmd.set, cmd.value ?? true);
      else if ('if' in cmd) await run(state.has(cmd.if) ? cmd.then : (cmd.else ?? []));
      else if ('ifVar' in cmd) await run((state.vars[cmd.ifVar] ?? 0) >= cmd.gte ? cmd.then : (cmd.else ?? []));
      else if ('add' in cmd) state.add(cmd.add, cmd.n);
      else if ('give' in cmd) {
        const n = cmd.n ?? 1;
        state.give(cmd.give, n);
        host.gave(cmd.give, n);
      } else if ('camera' in cmd) await host.camera(cmd.camera === 'player' ? 'player' : { ...cmd.camera, ms: cmd.camera.ms ?? 600 });
      else if ('wait' in cmd) await host.wait(cmd.wait);
      else if ('face' in cmd) host.face(cmd.face, cmd.dir);
      else if ('emote' in cmd) await host.emote(cmd.emote, cmd.icon);
      else if ('battle' in cmd) await host.battle(cmd.battle);
      else if ('end' in cmd) throw STOP;
    }
  };

  try {
    await run(script.steps);
  } catch (e) {
    if (e !== STOP) throw e;
  }
}

/** Static check used by tests and the debug panel: unknown commands, missing text keys, missing branches. */
export function checkScript(script: Script, hasText: (key: string) => boolean, knownActors: Set<string>): string[] {
  const problems: string[] = [];
  const walk = (steps: Cmd[], where: string) => {
    steps.forEach((cmd, i) => {
      const at = `${script.id}${where}[${i}]`;
      const keys = Object.keys(cmd);
      const kind = CMD_KEYS.find((k) => keys.includes(k));
      if (!kind) {
        problems.push(`${at}: unknown command ${JSON.stringify(cmd)}`);
        return;
      }
      if ('say' in cmd) {
        if (!hasText(cmd.say)) problems.push(`${at}: missing text "${cmd.say}"`);
        if (cmd.who && !hasText(`name.${cmd.who}`)) problems.push(`${at}: missing speaker name "name.${cmd.who}"`);
      }
      if ('choice' in cmd) {
        if (cmd.choice.length !== cmd.branches.length) problems.push(`${at}: ${cmd.choice.length} choices but ${cmd.branches.length} branches`);
        cmd.choice.forEach((k) => !hasText(k) && problems.push(`${at}: missing text "${k}"`));
        cmd.branches.forEach((b, j) => walk(b, `${where}[${i}].branch${j}`));
      }
      if ('if' in cmd || 'ifVar' in cmd) {
        walk(cmd.then, `${where}[${i}].then`);
        if (cmd.else) walk(cmd.else, `${where}[${i}].else`);
      }
      if ('give' in cmd && !hasText(`item.${cmd.give}`)) problems.push(`${at}: missing item name "item.${cmd.give}"`);
      if (('face' in cmd && !knownActors.has(cmd.face)) || ('emote' in cmd && !knownActors.has(cmd.emote)))
        problems.push(`${at}: unknown actor`);
    });
  };
  walk(script.steps, '');
  return problems;
}
