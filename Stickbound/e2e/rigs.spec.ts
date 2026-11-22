// Cosmetics sheet for the visual review. Run: npx playwright test --project=arenas e2e/rigs.spec.ts  (EK_OUT=dir)
import { test } from '@playwright/test';
const OUT = process.env.EK_OUT ?? 'docs/visual-overhaul/after';
test('cosmetics sheet', async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 1100 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./?powers=1&rigs=1');
  await page.waitForSelector('#rigs');
  await page.locator('#rigs').screenshot({ path: `${OUT}/cosmetics-sheet.png` });
  if (errors.length) throw new Error(errors.join('\n'));
});
