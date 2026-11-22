// Cosmetics sheet and hero lineup for the visual review. Run: npx playwright test --project=arenas e2e/rigs.spec.ts  (EK_OUT=dir)
import { test } from '@playwright/test';
const OUT = process.env.EK_OUT ?? 'docs/visual-overhaul/after';
for (const [name, q, sel] of [
  ['cosmetics-sheet', 'rigs=1', '#rigs'],
  ['hero-sheet', 'rigs=heroes', '#heroes'],
] as const) {
  test(name, async ({ page }) => {
    await page.setViewportSize({ width: 4300, height: 1100 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`./?powers=1&${q}`);
    await page.waitForSelector(sel);
    await page.waitForTimeout(300);
    await page.locator(sel).screenshot({ path: `${OUT}/${name}.png` });
    if (errors.length) throw new Error(errors.join('\n'));
  });
}