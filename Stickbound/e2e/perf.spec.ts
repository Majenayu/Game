// Performance: fps during a busy bot-vs-bot fight (normal and 4x CPU throttle), and a 100-match memory soak.
// Run: npx playwright test --project=perf   Results go to docs/perf.json. Numbers are from headless Chromium on the
// build machine (software rendering may apply), so they are a floor, not a promise.
import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fresh, hooks, waitScreen } from './helpers';

type Ek = { botFight: (i: number) => void; inFight: () => boolean; app: { profile: { tutorialDone: boolean } } };
const results: Record<string, unknown> = {};

async function toLobby(page: Page): Promise<void> {
  await fresh(page);
  await waitScreen(page, 'starter');
  await page.evaluate(() => {
    const ek = (window as unknown as { __ek: Ek & { show: (s: string) => void } }).__ek;
    ek.app.profile.tutorialDone = true;
  });
  await page.locator('.el-card[data-el="leaf"]').click();
  await expect.poll(() => hooks(page, (h) => h.inFight())).toBe(true);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Quit fight' }).click();
  await waitScreen(page, 'lobby');
}

async function measureFps(page: Page, seconds: number): Promise<{ fps: number; p5: number; worstMs: number }> {
  return page.evaluate(
    (sec) =>
      new Promise<{ fps: number; p5: number; worstMs: number }>((resolve) => {
        const times: number[] = [];
        const t0 = performance.now();
        const tick = (t: number) => {
          times.push(t);
          if (t - t0 < sec * 1000) requestAnimationFrame(tick);
          else {
            const d = times.slice(1).map((x, i) => x - times[i]!).sort((a, b) => a - b);
            const fps = (times.length - 1) / ((times[times.length - 1]! - times[0]!) / 1000);
            const p95 = d[Math.floor(d.length * 0.95)] ?? 0;
            resolve({ fps: Math.round(fps * 10) / 10, p5: Math.round((1000 / p95) * 10) / 10, worstMs: Math.round(d[d.length - 1] ?? 0) });
          }
        };
        requestAnimationFrame(tick);
      }),
    seconds,
  );
}

test('fps during a fight, normal and 4x CPU throttle', async ({ page }) => {
  test.setTimeout(180_000);
  await toLobby(page);
  await page.evaluate(() => (window as unknown as { __ek: Ek }).__ek.botFight(3));
  // the busiest case: MP kept full, so the bots cast powers (supers included) as often as they can
  await page.evaluate(() =>
    setInterval(() => {
      const m = (window as unknown as { __ek: { match: () => { fighters: { mp: number }[] } | null } }).__ek.match();
      if (m) for (const f of m.fighters) f.mp = 1000;
    }, 50),
  );
  await page.waitForTimeout(5000);
  const normal = await measureFps(page, 10);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.waitForTimeout(1000);
  const throttled = await measureFps(page, 10);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  results.fps = { normal, throttled4x: throttled };
  console.log('fps', JSON.stringify(results.fps));
  expect(normal.fps).toBeGreaterThan(20);
});

test('memory soak: 100 bot matches, heap and DOM stay flat', async ({ page }) => {
  test.setTimeout(3_000_000);
  await toLobby(page);
  await page.evaluate(() => ((window as unknown as { __ekTurbo: number }).__ekTurbo = 30));
  const sample = async () => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('HeapProfiler.collectGarbage');
    const { usedSize } = (await cdp.send('Runtime.getHeapUsage')) as { usedSize: number };
    await cdp.detach();
    const dom = await page.evaluate(() => document.getElementsByTagName('*').length);
    return { heapMB: Math.round((usedSize / 1e6) * 10) / 10, dom };
  };
  const samples: { match: number; heapMB: number; dom: number }[] = [];
  for (let i = 0; i < 100; i++) {
    await page.evaluate((k) => (window as unknown as { __ek: Ek }).__ek.botFight(k), i);
    await expect.poll(() => hooks(page, (h) => h.inFight()), { timeout: 120_000, intervals: [250] }).toBe(false);
    await waitScreen(page, 'lobby');
    if (i === 4 || i % 25 === 24) samples.push({ match: i + 1, ...(await sample()) });
  }
  results.soak = samples;
  console.log('soak', JSON.stringify(samples));
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  expect(last.heapMB - first.heapMB).toBeLessThan(15);
  expect(Math.abs(last.dom - first.dom)).toBeLessThan(50);
});

test.afterAll(({}, testInfo) => {
  if (!Object.keys(results).length) return;
  // merge, so running only the fps test or only the soak keeps the other result
  const file = `docs/perf-${testInfo.project.name}.json`;
  const old = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>) : {};
  writeFileSync(file, JSON.stringify({ ...old, date: new Date().toISOString(), ...results }, null, 2));
});
