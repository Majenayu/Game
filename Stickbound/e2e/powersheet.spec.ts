// Power Lab contact sheets: one 6-frame strip per power into docs/powers-sheet/, plus an index page.
// Run: npx playwright test --project=powersheet   (EK_ONLY=fire1,ice_w2 renders just those)
import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const ENV = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
// EK_OUT changes the folder; EK_ARENA=<id> or none forces one arena (default: each element in its matching arena)
const OUT = ENV.EK_OUT ?? 'docs/powers-sheet';

test('contact sheets for every power', async ({ page }) => {
  test.setTimeout(900_000);
  mkdirSync(OUT, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`./?powers=1${ENV.EK_ARENA ? `&arena=${ENV.EK_ARENA}` : ''}`);
  await page.waitForFunction(() => !!(window as unknown as { __lab?: unknown }).__lab, null, { timeout: 30_000 });
  const only = ENV.EK_ONLY;
  const ids: string[] = only ? only.split(',') : await page.evaluate(() => (window as unknown as { __lab: { ids: string[] } }).__lab.ids);
  const names: [string, string][] = [];
  for (const id of ids) {
    const name = await page.evaluate((i) => (window as unknown as { __lab: { sheet: (i: string) => string } }).__lab.sheet(i), id);
    await page.evaluate(() => document.getElementById('sheet')!.classList.add('show'));
    await page.locator('#sheet').screenshot({ path: `${OUT}/${id}.png` });
    await page.evaluate(() => document.getElementById('sheet')!.classList.remove('show'));
    names.push([id, name]);
  }
  if (!only && !ENV.EK_OUT) {
    const md = ['# Power contact sheets', '', 'Six frames per power from the Power Lab (`?powers=1`): anticipation, cast, travel, impact, impact +6 frames, aftermath. Frame-exact and reproducible (the sim and the effects are both seeded).', ''];
    for (const [id, name] of names) md.push(`## ${name}`, '', `![${id}](${id}.png)`, '');
    writeFileSync(`${OUT}/README.md`, md.join('\n'));
  }
  if (errors.length) throw new Error(errors.join('\n'));
});
