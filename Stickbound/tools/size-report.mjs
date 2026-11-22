// Size report for an Elementick build. Reads Vite's manifest to measure the first download (entry chunk and its
// static imports) against the project target, and the total against portal limits.
// Usage: node tools/size-report.mjs dist      Fails (exit 1) when a limit is exceeded. 1 MB = 1,000,000 bytes.
//   initial download <= 5 MB    Elementick Definition of Done
//   initial download <= 20 MB   CrazyGames mobile homepage limit (docs.crazygames.com/requirements/technical)
//   total <= 250 MB             CrazyGames total file limit
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const MB = 1_000_000;
const dir = process.argv[2] ?? 'dist';
const manifestPath = [join(dir, '.vite', 'manifest.json'), join(dir, 'manifest.json')].find(existsSync);
if (!manifestPath) {
  console.error(`No Vite manifest in ${dir}. Build with build.manifest = true.`);
  process.exit(2);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const size = (file) => statSync(join(dir, file)).size;
const gz = (file) => gzipSync(readFileSync(join(dir, file))).length;
function walk(d) {
  return readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const allFiles = walk(dir).filter((p) => !p.includes(join(dir, '.vite')));
const total = allFiles.reduce((s, p) => s + statSync(p).size, 0);
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
const initialGz = [...initial].reduce((s, f) => s + gz(f), 0);
const checks = [
  ['Initial download, Elementick target (5 MB)', initialBytes, 5 * MB],
  ['Initial download, CrazyGames mobile homepage (20 MB)', initialBytes, 20 * MB],
  ['Total files, CrazyGames (250 MB)', total, 250 * MB],
];
const fmt = (b) => (b >= MB ? `${(b / MB).toFixed(2)} MB` : `${(b / 1000).toFixed(1)} KB`);
console.log(`Size report for ${dir}: ${allFiles.length} files, initial ${fmt(initialBytes)} (${fmt(initialGz)} gzipped), total ${fmt(total)}`);
let ok = true;
for (const [label, bytes, max] of checks) {
  const pass = bytes <= max;
  ok &&= pass;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}: ${fmt(bytes)}`);
}
if (!ok) process.exit(1);
