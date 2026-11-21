// Zips client/dist into dist/orb-arena.zip (index.html at the root) and prints size and file count.
import archiver from 'archiver';
import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const src = resolve('client/dist');
const outDir = resolve('dist');
const out = join(outDir, 'orb-arena.zip');
if (!existsSync(join(src, 'index.html')))
  throw new Error('client/dist/index.html missing. Run the client build first.');
mkdirSync(outDir, { recursive: true });

let files = 0;
(function count(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    statSync(p).isDirectory() ? count(p) : files++;
  }
})(src);

const index = (await import('node:fs')).readFileSync(join(src, 'index.html'), 'utf8');
if (/(?:src|href)="\/[^/]/.test(index)) throw new Error('index.html contains absolute asset paths');

await new Promise((res, rej) => {
  const stream = createWriteStream(out);
  const zip = archiver('zip', { zlib: { level: 9 } });
  stream.on('close', res);
  zip.on('error', rej);
  zip.pipe(stream);
  zip.directory(src, false);
  zip.finalize();
});

const bytes = statSync(out).size;
const mb = bytes / 1024 / 1024;
console.log(`${out}\n  size:  ${mb.toFixed(2)} MB (${bytes} bytes)\n  files: ${files}`);
if (mb > 5) {
  console.error('ZIP is larger than the 5 MB target');
  process.exit(1);
}
