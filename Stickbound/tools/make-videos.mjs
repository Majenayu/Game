// Turns the raw gameplay clips into CrazyGames preview videos: the static cover as the opening frame (0.6 s), then
// 17 s of fight (skipping the menu and the round intro), no sound, H.264 MP4, under 20 s and 50 MB.
// Needs ffmpeg on PATH. Usage: node tools/make-videos.mjs
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

const jobs = [
  { clip: 'store/raw/clip-landscape.webm', cover: 'store/cover-landscape-1920x1080.png', out: 'store/preview-landscape-1920x1080.mp4', w: 1920, h: 1080 },
  { clip: 'store/raw/clip-portrait.webm', cover: 'store/cover-portrait-800x1200.png', out: 'store/preview-portrait-1080x1620.mp4', w: 1080, h: 1620 },
];
for (const j of jobs) {
  const scale = `scale=${j.w}:${j.h}:force_original_aspect_ratio=increase,crop=${j.w}:${j.h},setsar=1,fps=30,format=yuv420p`;
  execFileSync(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-loop', '1', '-t', '0.6', '-i', j.cover,
      '-ss', '7', '-t', '17', '-i', j.clip,
      '-filter_complex', `[0:v]${scale}[a];[1:v]${scale}[b];[a][b]concat=n=2:v=1:a=0[v]`,
      '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-movflags', '+faststart', j.out,
    ],
    { stdio: 'inherit' },
  );
  console.log(`${j.out}: ${(statSync(j.out).size / 1e6).toFixed(1)} MB`);
}
