import { describe, expect, it } from 'vitest';
import { MemoryKV } from '../src/core/storage';
import { SaveManager, SAVE_VERSION, exportCode, importCode, migrate, type SaveData, SaveError } from '../src/core/save';

const sample = (over: Partial<SaveData['player']> = {}, savedAt = 1000): SaveData => ({
  version: SAVE_VERSION,
  savedAt,
  playMs: 5000,
  player: { name: 'Wren', look: { skin: 1, hair: 0, hairStyle: 0, outfit: 3 }, map: 'harbor', x: 5, y: 6, facing: 'up', ...over },
  flags: { got_letter: true },
  vars: { sailor_talks: 2 },
  bag: { salve: 2 },
});

describe('SaveManager', () => {
  it('writes and reads a slot', () => {
    const sm = new SaveManager(new MemoryKV());
    sm.write(1, sample());
    expect(sm.read(1)?.data).toEqual(sample());
    expect(sm.read(2)).toBeNull();
  });

  it('keeps the previous save as a backup and uses it when the main copy is damaged', () => {
    const kv = new MemoryKV();
    const sm = new SaveManager(kv);
    sm.write(1, sample({ x: 1 }));
    sm.write(1, sample({ x: 2 }));
    kv.setItem('tw.slot1', '{"sum":1,"body":"garbage"}');
    const r = sm.read(1);
    expect(r?.fromBackup).toBe(true);
    expect(r?.data.player.x).toBe(1);
  });

  it('a failed write leaves the last good save readable', () => {
    const kv = new MemoryKV();
    const sm = new SaveManager(kv);
    sm.write(1, sample({ x: 1 }));
    kv.failNextWrite = 'tw.slot1';
    expect(() => sm.write(1, sample({ x: 9 }))).toThrow();
    expect(sm.read(1)?.data.player.x).toBe(1);
  });

  it('rejects data that does not match the schema', () => {
    const sm = new SaveManager(new MemoryKV());
    const bad = sample();
    (bad.player as { x: unknown }).x = 'nope';
    expect(() => sm.write(1, bad)).toThrow(SaveError);
  });

  it('lists slots and finds the latest', () => {
    const sm = new SaveManager(new MemoryKV());
    sm.write(1, sample({}, 100));
    sm.write(3, sample({ name: 'Ada' }, 300));
    const list = sm.list();
    expect(list[0]?.name).toBe('Wren');
    expect(list[1]).toBeNull();
    expect(sm.latest()?.slot).toBe(3);
  });

  it('remove() deletes a slot and its backup', () => {
    const kv = new MemoryKV();
    const sm = new SaveManager(kv);
    sm.write(2, sample());
    sm.write(2, sample());
    sm.remove(2);
    expect(sm.read(2)).toBeNull();
    expect([...kv.map.keys()].filter((k) => k.startsWith('tw.slot2'))).toEqual([]);
  });
});

describe('migrations', () => {
  it('upgrades a version 0 prototype save', () => {
    const d = migrate({ name: 'Old', map: 'harbor', pos: [3, 4], flags: { a: true } });
    expect(d.version).toBe(SAVE_VERSION);
    expect(d.player).toMatchObject({ name: 'Old', map: 'harbor', x: 3, y: 4, facing: 'down' });
    expect(d.flags).toEqual({ a: true });
  });
  it('refuses saves from a newer version', () => {
    expect(() => migrate({ ...sample(), version: SAVE_VERSION + 1 })).toThrow(SaveError);
  });
});

describe('backup codes', () => {
  it('round-trips, including non-English names', () => {
    const d = sample({ name: 'Zoë 花' });
    expect(importCode(exportCode(d))).toEqual(d);
  });
  it('detects a damaged code', () => {
    const code = exportCode(sample());
    const broken = code.slice(0, 10) + (code[10] === 'A' ? 'B' : 'A') + code.slice(11);
    expect(() => importCode(broken)).toThrow(SaveError);
    expect(() => importCode('hello')).toThrow(SaveError);
  });
});
