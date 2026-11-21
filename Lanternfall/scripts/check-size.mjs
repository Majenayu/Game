// Build size check for Sunfetch.
//
// Usage: node scripts/check-size.mjs <build-dir> [--json <report-file>]
//
// "Initial download" = every file in the build except files inside a folder named `lazy` (lazy-loaded worlds,
// music and story art go there). "Total" = every file.
// Sizes use 1 MB = 1,000,000 bytes, which is the stricter reading of the portal limits.
// Exit code 1 when any limit fails, so the build stops.
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MB = 1_000_000;

export const LIMITS = [
  {
    id: 'own-initial',
    what: 'initial',
    max: 8 * MB,
    label: "Sunfetch's own target: initial download",
    source: 'Owner rule (KIRO master prompt, working rule 8)',
  },
  {
    id: 'crazygames-mobile-initial',
    what: 'initial',
    max: 20 * MB,
    label: 'CrazyGames mobile homepage: initial download',
    source: 'https://docs.crazygames.com/requirements/technical/ (checked 2026-11-21)',
  },
  {
    id: 'crazygames-initial',
    what: 'initial',
    max: 50 * MB,
    label: 'CrazyGames hard limit: initial download',
    source: 'https://docs.crazygames.com/requirements/technical/ (checked 2026-11-21)',
  },
  {
    id: 'crazygames-total',
    what: 'total',
    max: 250 * MB,
    label: 'CrazyGames hard limit: total files',
    source: 'https://docs.crazygames.com/requirements/intro/ (checked 2026-11-21)',
  },
];

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) files.push(...walk(p));
    else files.push({ path: p, bytes: st.size });
  }
  return files;
}

export function measure(dir) {
  const files = walk(dir).map((f) => ({ ...f, rel: relative(dir, f.path).split(sep).join('/') }));
  const isLazy = (rel) => rel.split('/').slice(0, -1).includes('lazy');
  const total = files.reduce((s, f) => s + f.bytes, 0);
  const initial = files.filter((f) => !isLazy(f.rel)).reduce((s, f) => s + f.bytes, 0);
  const largest = [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 5);
  return { files: files.length, total, initial, lazy: total - initial, largest };
}

export function check(sizes) {
  return LIMITS.map((l) => ({ ...l, actual: sizes[l.what], ok: sizes[l.what] <= l.max }));
}

const fmt = (b) => `${(b / MB).toFixed(2)} MB`;

function main(argv) {
  const dir = argv[0];
  if (!dir) {
    console.error('Usage: node scripts/check-size.mjs <build-dir> [--json <report-file>]');
    return 2;
  }
  const sizes = measure(dir);
  const results = check(sizes);
  console.log(`Size report for ${dir}`);
  console.log(`  files ${sizes.files}, initial ${fmt(sizes.initial)}, lazy ${fmt(sizes.lazy)}, total ${fmt(sizes.total)}`);
  for (const r of results) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.label}: ${fmt(r.actual)} of ${fmt(r.max)}`);
  console.log('  largest files:');
  for (const f of sizes.largest) console.log(`    ${fmt(f.bytes).padStart(10)}  ${f.rel}`);
  const j = argv.indexOf('--json');
  if (j >= 0 && argv[j + 1]) {
    const report = { ...sizes, largest: sizes.largest.map(({ rel, bytes }) => ({ file: rel, bytes })), results };
    writeFileSync(argv[j + 1], JSON.stringify(report, null, 2));
  }
  return results.every((r) => r.ok) ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main(process.argv.slice(2));
