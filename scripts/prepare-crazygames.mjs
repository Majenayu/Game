// Builds the client for production and fills the craygames/ upload folder:
//   craygames/files   the game build (index.html at the top, no zip)
//   craygames/photos  the three cover images
//   craygames/videos  the two preview videos
// Usage (PowerShell):
//   $env:VITE_SERVER_URLS = "wss://YOUR-SERVICE.onrender.com"; npm run crazygames
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

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
const out = join(root, 'craygames');
const dist = join(root, 'client', 'dist');
const run = spawnSync('npm', ['run', 'build', '-w', 'client'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, VITE_SERVER_URLS: urls.join(',') },
});
if (run.status !== 0) throw new Error('Client build failed');

const index = readFileSync(join(dist, 'index.html'), 'utf8');
if (/(?:src|href)="\/[^/]/.test(index)) throw new Error('index.html contains absolute asset paths');
const bundle = readdirSync(join(dist, 'assets'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => readFileSync(join(dist, 'assets', f), 'utf8'))
  .join('\n');
if (!bundle.includes(urls[0])) throw new Error('Server URL was not baked into the bundle');

for (const d of ['files', 'photos', 'videos']) {
  rmSync(join(out, d), { recursive: true, force: true });
  mkdirSync(join(out, d), { recursive: true });
}
cpSync(dist, join(out, 'files'), { recursive: true });
const copyAll = (from, to, ext) => {
  if (!existsSync(from)) throw new Error(`Missing ${from}. Run npm run covers / npm run videos first.`);
  for (const f of readdirSync(from)) if (f.endsWith(ext)) cpSync(join(from, f), join(to, f));
};
copyAll(join(root, 'e2e', 'covers'), join(out, 'photos'), '.png');
copyAll(join(root, 'e2e', 'videos'), join(out, 'videos'), '.mp4');

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
  return `${c} files, ${(n / 1048576).toFixed(2)} MB`;
};
console.log(`\ncraygames/files   ${size(join(out, 'files'))}`);
console.log(`craygames/photos  ${size(join(out, 'photos'))}`);
console.log(`craygames/videos  ${size(join(out, 'videos'))}`);
console.log(`Server: ${urls.join(', ')}`);
