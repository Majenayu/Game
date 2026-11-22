// Same-size compare capture for the hero art loop: EK_OUT=dir EK_EL=fire EK_STYLE=classic npx playwright test --project=herocmp
import { test } from '@playwright/test';
const OUT = process.env.EK_OUT ?? 'docs/reference-art/compare-v5/raw';
const EL = process.env.EK_EL ?? 'fire';
const ST = process.env.EK_STYLE ?? 'classic';
test(`compare ${EL} ${ST}`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`./?powers=1&rigs=compare&el=${EL}&style=${ST}`);
  await page.waitForSelector('#cmp');
  await page.waitForTimeout(200);
  await page.locator('#cmp').screenshot({ path: `${OUT}/${EL}-${ST}.png` });
  if (errors.length) throw new Error(errors.join('\n'));
});
