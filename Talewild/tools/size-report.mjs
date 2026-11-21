// Size report for a Talewild build. Reads Vite's manifest to split the first download (entry chunk and everything it
// imports statically) from lazily loaded chapter bundles (dynamic imports).
// Usage: node tools/size-report.mjs dist
// Fails (exit 1) when a limit is exceeded. Limits (1 MB = 1,000,000 bytes, the stricter reading):
//   initial download <= 20 MB  CrazyGames mobile homepage limit (docs.crazygames.com/requirements/technical, 2026-11-21)
//   initial download <= 50 MB  CrazyGames hard limit (same page)
//   each chapter bundle <= 8 MB (Talewild rule, GDD section 12)
//   total <= 250 MB            CrazyGames total file limit (docs.crazygames.com/requirements/intro)
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MB = 1_000_000;
const dir = process.argv[2] ?? 'dist';
const manifestPath = [join(dir, '.vite', 'manifest.json'), join(dir, 'manifest.json')].find(existsSync);
if (!manifestPath) {
  console.error(`No Vite manifest in ${dir}. Build with build.manifest = true.`);
  process.exit(2);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const size = (file) => statSync(join(dir, file)).size;

function walk(d) {
  return readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const allFiles = walk(dir).filter((p) => !p.includes(`${join(dir, '.vite')}`));
const total = allFiles.reduce((s, p) => s + statSync(p).size, 0);

// Static closure from the entry.
const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry);
const initial = new Set(['index.html']);
const visit = (key) => {
  const m = manifest[key];
  if (!m || initial.has(m.file)) return;
  initial.add(m.file);
  (m.css ?? []).forEach((c) => initial.add(c));
  (m.assets ?? []).forEach((a) => initial.add(a));
  (m.imports ?? []).forEach(visit);
};
visit(entryKey);
const initialBytes = [...initial].reduce((s, f) => s + size(f), 0);

// Each dynamic import of the entry (or of anything it loads) is a lazy bundle with its own static closure.
const lazyBundles = [];
for (const key of Object.keys(manifest)) {
  const m = manifest[key];
  if (!m.isDynamicEntry) continue;
  const files = new Set();
  const v = (k) => {
    const e = manifest[k];
    if (!e || files.has(e.file) || initial.has(e.file)) return;
    files.add(e.file);
    (e.imports ?? []).forEach(v);
  };
  v(key);
  lazyBundles.push({ name: m.name ?? key, bytes: [...files].reduce((s, f) => s + size(f), 0) });
}

const checks = [
  ['Initial download, CrazyGames mobile homepage (20 MB)', initialBytes, 20 * MB],
  ['Initial download, CrazyGames hard limit (50 MB)', initialBytes, 50 * MB],
  ...lazyBundles.map((b) => [`Lazy bundle "${b.name}" (8 MB)`, b.bytes, 8 * MB]),
  ['Total files, CrazyGames (250 MB)', total, 250 * MB],
];
const fmt = (b) => (b >= MB ? `${(b / MB).toFixed(2)} MB` : `${(b / 1000).toFixed(1)} KB`);
console.log(`Size report for ${dir}: ${allFiles.length} files, initial ${fmt(initialBytes)}, total ${fmt(total)}`);
let ok = true;
for (const [label, bytes, max] of checks) {
  const pass = bytes <= max;
  ok &&= pass;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}: ${fmt(bytes)}`);
}
if (!ok) process.exit(1);
