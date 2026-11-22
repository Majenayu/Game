// CPU profile of a fight under 4x throttle; prints the top functions by self time. Dev tool, not in the suite.
import { test } from '@playwright/test';
import { fresh, hooks, waitScreen } from './helpers';

type Node = { id: number; callFrame: { functionName: string; url: string; lineNumber: number }; hitCount?: number };

test('profile a fight', async ({ page }) => {
  test.setTimeout(180_000);
  await fresh(page);
  await waitScreen(page, 'starter');
  await page.locator('.el-card[data-el="leaf"]').click();
  await page.waitForTimeout(1000);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Quit fight' }).click();
  await waitScreen(page, 'lobby');
  await page.evaluate(() => (window as unknown as { __ek: { botFight: (i: number) => void } }).__ek.botFight(3));
  await page.evaluate(() =>
    setInterval(() => {
      const m = (window as unknown as { __ek: { match: () => { fighters: { mp: number }[] } | null } }).__ek.match();
      if (m) for (const f of m.fighters) f.mp = 1000;
    }, 50),
  );
  await page.waitForTimeout(4000);
  void hooks;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.start');
  await page.waitForTimeout(8000);
  const { profile } = (await cdp.send('Profiler.stop')) as { profile: { nodes: Node[]; samples: number[] } };
  const self = new Map<string, number>();
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  for (const s of profile.samples) {
    const n = byId.get(s)!;
    const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`;
    self.set(k, (self.get(k) ?? 0) + 1);
  }
  const total = profile.samples.length;
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
  for (const [k, v] of top) console.log(`${((v / total) * 100).toFixed(1).padStart(5)}%  ${k}`);
});
