import { describe, expect, it } from 'vitest';
import { lifecyclePhase, VISUAL_KINDS } from './lifecycle';
describe('skill presentation lifecycle', () => {
  it('covers all twenty data-driven kinds without changing their timing', () => {
    expect(new Set(VISUAL_KINDS).size).toBe(20);
    expect(lifecyclePhase(0)).toBe('cast');
    expect(lifecyclePhase(0.5)).toBe('active');
    expect(lifecyclePhase(0.9)).toBe('end');
  });
});
