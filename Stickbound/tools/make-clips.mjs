// Converts the raw recordings in docs/videos/raw into mp4 clips in docs/videos (H.264, no sound, the slow page load
// at the start cut off). Needs ffmpeg on PATH. Usage: node tools/make-clips.mjs
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';

const RAW = 'docs/videos/raw';
// seconds to skip at the start (page load) and length to keep
const CUT = { lobby: [1.2, 14], cutin: [5.5, 6] };
for (const f of readdirSync(RAW).filter((n) => n.endsWith('.webm'))) {
  const name = f.replace('.webm', '');
  const [ss, t] = CUT[name] ?? [1.0, 5.0];
  const out = `docs/videos/${name}.mp4`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(ss), '-t', String(t), '-i', `${RAW}/${f}`, '-an', '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-movflags', '+faststart', out], { stdio: 'inherit' });
  console.log(`${out}: ${(statSync(out).size / 1e6).toFixed(2)} MB`);
}
