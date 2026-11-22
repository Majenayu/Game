// Builds the portal packages into release/ (git-ignored). Usage: npm run package
//   release/elementick-crazygames-<version>.zip  CrazyGames build (SDK v3 adapter, `vite --mode crazygames`)
//   release/elementick-web-<version>.zip         plain web build for itch.io or any static host (no SDK, no ads)
// Each zip has index.html at its root and only relative paths, as CrazyGames and itch.io require.
// The Poki adapter is still a stub, so no Poki zip is made (see docs/SUBMISSION_GUIDE.md).
import { execSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import archiver from 'archiver';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

run('npm run build');
run('npm run build:crazygames');
mkdirSync('release', { recursive: true });

function count(dir) {
  return readdirSync(dir).reduce((n, f) => {
    if (f === '.vite') return n;
    const p = join(dir, f);
    return n + (statSync(p).isDirectory() ? count(p) : 1);
  }, 0);
}

function zip(dir, out) {
  return new Promise((resolve, reject) => {
    if (!existsSync(join(dir, 'index.html'))) return reject(new Error(`${dir}/index.html missing`));
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    if (/(src|href)="\//.test(html)) return reject(new Error(`${dir}/index.html uses an absolute path`));
    const stream = createWriteStream(out);
    const a = archiver('zip', { zlib: { level: 9 } });
    stream.on('close', () => resolve(a.pointer()));
    a.on('error', reject);
    a.pipe(stream);
    a.glob('**/*', { cwd: dir, ignore: ['.vite/**'] });
    a.finalize();
  });
}

for (const [dir, name] of [
  ['dist-crazygames', `elementick-crazygames-${version}.zip`],
  ['dist', `elementick-web-${version}.zip`],
]) {
  const bytes = await zip(dir, join('release', name));
  const files = count(dir);
  console.log(`release/${name}: ${(bytes / 1e6).toFixed(2)} MB, ${files} files${files > 1500 ? ' (OVER the 1500-file CrazyGames limit)' : ''}`);
}
