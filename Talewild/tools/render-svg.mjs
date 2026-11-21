// Renders every .svg in a folder to a .png of the same size (used for the docs/mockups images).
// Usage: node tools/render-svg.mjs docs/mockups
import { chromium } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = resolve(process.argv[2] ?? 'docs/mockups');
const browser = await chromium.launch();
const page = await browser.newPage();
for (const f of readdirSync(dir).filter((n) => n.endsWith('.svg'))) {
  await page.goto(pathToFileURL(`${dir}/${f}`).href);
  const size = await page.evaluate(() => {
    const s = document.querySelector('svg');
    return { width: Number(s.getAttribute('width')), height: Number(s.getAttribute('height')) };
  });
  await page.setViewportSize(size);
  await page.screenshot({ path: `${dir}/${f.replace(/\.svg$/, '.png')}` });
  console.log('rendered', f);
}
await browser.close();
