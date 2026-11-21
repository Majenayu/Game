// Writes every champion/boss SVG to docs/art and renders a contact sheet PNG.
// Run: npx tsx e2e/render-art.ts
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ALL_FIGURES } from '../client/src/art/bestiary';

mkdirSync('docs/art', { recursive: true });
for (const f of ALL_FIGURES) writeFileSync(`docs/art/${f.id}.svg`, f.svg);

const cards = ALL_FIGURES.map(
  (f) =>
    `<div class="c"><div class="a" style="--c:${f.color}">${f.svg}</div><h3>${f.name}</h3><p>${f.title}</p></div>`,
).join('');
const html = `<!doctype html><body style="margin:0;background:#0b0a22;font-family:Segoe UI,sans-serif;color:#eee">
<style>.g{display:grid;grid-template-columns:repeat(3,360px);gap:24px;padding:28px}.c{background:#15133a;border:2px solid #5a4aa8;border-radius:16px;padding:14px;text-align:center}
.a{background:radial-gradient(circle,color-mix(in srgb,var(--c) 30%,#15133a),#0e0c2a);border-radius:12px}.a svg{width:300px;height:300px}h3{margin:8px 0 0;color:#ffc93c}p{margin:2px 0;color:#9aa}</style>
<div class="g">${cards}</div></body>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1500 } });
await p.setContent(html);
await p.screenshot({ path: 'docs/art/contact-sheet.png', fullPage: true });
await b.close();
console.log('rendered', ALL_FIGURES.length);
