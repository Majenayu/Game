// Run: node --test scripts/check-size.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LIMITS, check, measure } from './check-size.mjs';

const MB = 1_000_000;

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'sunfetch-size-'));
  for (const [rel, bytes] of Object.entries(files)) {
    const p = join(dir, rel);
    mkdirSync(join(p, '..'), { recursive: true });
    writeFileSync(p, Buffer.alloc(bytes));
  }
  return dir;
}

test('files inside a lazy folder count toward total but not initial', () => {
  const dir = fixture({ 'index.html': 1000, 'assets/game.js': 2000, 'assets/lazy/world2.bin': 5000 });
  try {
    const s = measure(dir);
    assert.equal(s.files, 3);
    assert.equal(s.total, 8000);
    assert.equal(s.initial, 3000);
    assert.equal(s.lazy, 5000);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the limits include the 8 MB own target and the 50 MB CrazyGames initial limit', () => {
  const byId = Object.fromEntries(LIMITS.map((l) => [l.id, l]));
  assert.equal(byId['own-initial'].max, 8 * MB);
  assert.equal(byId['crazygames-initial'].max, 50 * MB);
  assert.equal(byId['crazygames-mobile-initial'].max, 20 * MB);
  assert.equal(byId['crazygames-total'].max, 250 * MB);
});

test('a build just over 8 MB fails only the own target', () => {
  const r = check({ initial: 8 * MB + 1, total: 9 * MB });
  const failed = r.filter((x) => !x.ok).map((x) => x.id);
  assert.deepEqual(failed, ['own-initial']);
});

test('a 60 MB initial download fails the CrazyGames limits too', () => {
  const r = check({ initial: 60 * MB, total: 60 * MB });
  const failed = r.filter((x) => !x.ok).map((x) => x.id);
  assert.deepEqual(failed, ['own-initial', 'crazygames-mobile-initial', 'crazygames-initial']);
});

test('exactly at a limit passes', () => {
  assert.ok(check({ initial: 8 * MB, total: 8 * MB }).every((x) => x.ok));
});
