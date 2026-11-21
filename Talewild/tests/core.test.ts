import { describe, expect, it } from 'vitest';
import { FixedStep } from '../src/core/fixedStep';
import { InputState, stickToDir } from '../src/core/input';
import { Rng, hash32 } from '../src/core/rng';
import { EventBus } from '../src/core/events';
import { t } from '../src/core/i18n';

describe('Rng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    expect(Array.from({ length: 5 }, () => a.float())).toEqual(Array.from({ length: 5 }, () => b.float()));
  });
  it('keeps int() inside the range', () => {
    const r = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
  it('hash32 is stable', () => {
    expect(hash32('talewild')).toBe(hash32('talewild'));
    expect(hash32('a')).not.toBe(hash32('b'));
  });
});

describe('FixedStep', () => {
  it('runs the same number of steps regardless of frame size', () => {
    const fast = new FixedStep(10);
    const slow = new FixedStep(10);
    let a = 0;
    let b = 0;
    for (let i = 0; i < 100; i++) fast.advance(5, () => a++);
    for (let i = 0; i < 25; i++) slow.advance(20, () => b++);
    expect(a).toBe(50);
    expect(b).toBe(50);
  });
  it('caps steps after a long stall', () => {
    const fs = new FixedStep(10, 5);
    let n = 0;
    fs.advance(10_000, () => n++);
    expect(n).toBe(5);
  });
});

describe('InputState', () => {
  it('uses the most recently pressed held direction', () => {
    const s = new InputState();
    s.press('right');
    s.press('up');
    expect(s.direction()).toBe('up');
    s.release('up');
    expect(s.direction()).toBe('right');
  });
  it('keeps an action held while another source still holds it', () => {
    const s = new InputState();
    s.press('interact', 'key');
    s.press('interact', 'pad');
    s.release('interact', 'key');
    expect(s.isHeld('interact')).toBe(true);
  });
  it('consumes a press once', () => {
    const s = new InputState();
    s.press('interact');
    expect(s.consume('interact')).toBe(true);
    expect(s.consume('interact')).toBe(false);
  });
  it('releaseAll clears stuck keys', () => {
    const s = new InputState();
    s.press('left');
    s.releaseAll();
    expect(s.direction()).toBeNull();
  });
  it('maps a stick to the larger axis with a dead zone', () => {
    expect(stickToDir(0.2, 0.1)).toBeNull();
    expect(stickToDir(0.9, 0.3)).toBe('right');
    expect(stickToDir(-0.2, -0.8)).toBe('up');
  });
});

describe('EventBus', () => {
  it('delivers and unsubscribes', () => {
    const bus = new EventBus<{ ping: number }>();
    const got: number[] = [];
    const off = bus.on('ping', (n) => got.push(n));
    bus.emit('ping', 1);
    off();
    bus.emit('ping', 2);
    expect(got).toEqual([1]);
  });
});

describe('i18n', () => {
  it('fills placeholders', () => {
    expect(t('toast.saved', { n: 2 })).toBe('Saved to story 2');
  });
  it('returns the key for missing text', () => {
    expect(t('does.not.exist')).toBe('does.not.exist');
  });
});
