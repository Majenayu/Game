// Builds the client for a store and fills its upload folder with files/, photos/ and videos/.
//   node scripts/prepare-upload.mjs crazygames   -> craygames/
//   node scripts/prepare-upload.mjs poki         -> poki/
// Needs VITE_SERVER_URLS (wss://, not localhost), e.g. in PowerShell:
//   $env:VITE_SERVER_URLS = "wss://YOUR-SERVICE.onrender.com"; npm run poki
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const TARGETS = {
  crazygames: {
    folder: 'craygames',
    env: {},
    photos: [['e2e/covers', '.png']],
    videos: [['e2e/videos', '.mp4']],
    maxMb: 50,
  },
  poki: {
    folder: 'poki',
    env: { VITE_PLATFORM: 'poki' },
    // Poki: 3 gameplay screenshots plus a square thumbnail; square 1:1 animated thumbnail video.
    photos: [
      ['e2e/poki', '.png'],
      ['e2e/covers', 'square-800x800.png'],
    ],
    videos: [['e2e/poki', '.mp4']],
    // Poki's guide: initial download at most 5 MB, 8 MB in total.
    maxMb: 8,
  },
};

const target = TARGETS[process.argv[2]];
if (!target) throw new Error(`Usage: node scripts/prepare-upload.mjs ${Object.keys(TARGETS).join('|')}`);

const urls = (process.env.VITE_SERVER_URLS ?? '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);
if (!urls.length)
  throw new Error('Set VITE_SERVER_URLS to your deployed server, e.g. wss://orb-arena-server.onrender.com');
for (const u of urls) {
  if (!/^wss:\/\/[^/]+/.test(u) || /localhost|127\.0\.0\.1/.test(u)) {
    throw new Error(`VITE_SERVER_URLS must be wss:// and not localhost. Got: ${u}`);
  }
}

const root = resolve('.');
const out = join(root, target.folder);
const dist = join(root, 'client', 'dist');
const run = spawnSync('npm', ['run', 'build', '-w', 'client'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ...target.env, VITE_SERVER_URLS: urls.join(',') },
});
if (run.status !== 0) throw new Error('Client build failed');

const index = readFileSync(join(dist, 'index.html'), 'utf8');
if (/(?:src|href)="\/[^/]/.test(index)) throw new Error('index.html contains absolute asset paths');
const bundle = readdirSync(join(dist, 'assets'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => readFileSync(join(dist, 'assets', f), 'utf8'))
  .join('\n');
if (!bundle.includes(urls[0])) throw new Error('Server URL was not baked into the bundle');
if (target.env.VITE_PLATFORM === 'poki' && !bundle.includes('game-cdn.poki.com'))
  throw new Error('Poki SDK is missing from the Poki build');

for (const d of ['files', 'photos', 'videos']) {
  rmSync(join(out, d), { recursive: true, force: true });
  mkdirSync(join(out, d), { recursive: true });
}
cpSync(dist, join(out, 'files'), { recursive: true });
const copy = (list, to) => {
  for (const [from, match] of list) {
    const dir = join(root, from);
    if (!existsSync(dir))
      throw new Error(`Missing ${from}. See ${target.folder}/README.md for how to make it.`);
    for (const f of readdirSync(dir)) if (f.endsWith(match)) cpSync(join(dir, f), join(out, to, f));
  }
};
copy(target.photos, 'photos');
copy(target.videos, 'videos');

const size = (d) => {
  let n = 0;
  let c = 0;
  (function walk(p) {
    for (const f of readdirSync(p)) {
      const q = join(p, f);
      if (statSync(q).isDirectory()) walk(q);
      else {
        n += statSync(q).size;
        c++;
      }
    }
  })(d);
  return { c, mb: n / 1048576 };
};
const files = size(join(out, 'files'));
if (files.mb > target.maxMb)
  throw new Error(`Build is ${files.mb.toFixed(2)} MB, over the ${target.maxMb} MB limit`);
for (const d of ['files', 'photos', 'videos']) {
  const s = size(join(out, d));
  console.log(`${target.folder}/${d.padEnd(7)} ${s.c} files, ${s.mb.toFixed(2)} MB`);
}
console.log(`Server: ${urls.join(', ')}`);
