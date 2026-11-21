import { describe, expect, it } from 'vitest';
import { checkScript, runScript, ScriptError, type ScriptHost } from '../src/script/runner';
import { GameState } from '../src/script/state';
import type { Script } from '../src/script/types';
import { chapter } from '../src/content/chapter0';
import { hasKey } from '../src/core/i18n';

function fakeHost(choices: number[] = []) {
  const log: string[] = [];
  const host: ScriptHost = {
    say: async (who, key) => void log.push(`say:${who ?? '-'}:${key}`),
    choose: async (opts) => {
      log.push(`choose:${opts.join('|')}`);
      return choices.shift() ?? 0;
    },
    camera: async (tgt) => void log.push(`camera:${tgt === 'player' ? 'player' : `${tgt.x},${tgt.y}`}`),
    wait: async (ms) => void log.push(`wait:${ms}`),
    face: (a, d) => void log.push(`face:${a}:${d}`),
    emote: async (a, i) => void log.push(`emote:${a}:${i}`),
    battle: async (id) => void log.push(`battle:${id}`),
    gave: (item, n) => void log.push(`gave:${item}:${n}`),
  };
  return { host, log };
}

describe('script runner', () => {
  it('runs commands in order and follows the chosen branch', async () => {
    const { host, log } = fakeHost([1]);
    const st = new GameState();
    const script: Script = {
      id: 't',
      steps: [
        { say: 'a', who: 'mara' },
        { choice: ['x', 'y'], branches: [[{ say: 'left' }], [{ say: 'right' }, { set: 'picked_right' }]] },
        { give: 'salve', n: 2 },
      ],
    };
    await runScript(script, host, st);
    expect(log).toEqual(['say:mara:a', 'choose:x|y', 'say:-:right', 'gave:salve:2']);
    expect(st.has('picked_right')).toBe(true);
    expect(st.bag.salve).toBe(2);
  });

  it('branches on flags (including "!flag") and variables', async () => {
    const { host, log } = fakeHost();
    const st = new GameState();
    const script: Script = {
      id: 't',
      steps: [
        { if: '!seen', then: [{ say: 'first' }, { set: 'seen' }], else: [{ say: 'again' }] },
        { add: 'n', n: 2 },
        { ifVar: 'n', gte: 2, then: [{ say: 'two' }] },
      ],
    };
    await runScript(script, host, st);
    await runScript(script, host, st);
    expect(log).toEqual(['say:-:first', 'say:-:two', 'say:-:again', 'say:-:two']);
  });

  it('stops at end', async () => {
    const { host, log } = fakeHost();
    await runScript({ id: 't', steps: [{ say: 'a' }, { end: true }, { say: 'b' }] }, host, new GameState());
    expect(log).toEqual(['say:-:a']);
  });

  it('guards against runaway scripts', async () => {
    const { host } = fakeHost();
    const many: Script = { id: 'loop', steps: Array.from({ length: 2500 }, () => ({ wait: 0 })) };
    await expect(runScript(many, host, new GameState())).rejects.toThrow(ScriptError);
  });

  it('chapter 0 scripts use only known commands, text keys and actors', () => {
    const actors = new Set(['player', 'nib', 'mara', 'kid', 'sailor', 'fisher']);
    const problems = Object.values(chapter.scripts).flatMap((s) => checkScript(s, hasKey, actors));
    expect(problems).toEqual([]);
  });

  it('the full Mara scene runs to the end and sets met_mara', async () => {
    const { host, log } = fakeHost([0]);
    const st = new GameState();
    st.set('got_letter');
    await runScript(chapter.scripts.mara!, host, st);
    expect(st.has('met_mara')).toBe(true);
    expect(log).toContain('camera:player');
  });
});
