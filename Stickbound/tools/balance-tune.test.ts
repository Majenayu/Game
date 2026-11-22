// Fits POWER_TUNE so every element lands near 50%: npx vitest run tools/balance-tune.test.ts
// Prints the table to paste into src/content/powers.ts. Not part of the required suite.
import { it } from 'vitest';
import { ELEMENT_IDS } from '../src/content/elements';
import { POWER_TUNE } from '../src/content/powers';
import { formatReport, runBalance } from './balanceLib';

it('tune', async () => {
  const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
  const iters = Number(env.EK_IT ?? 4);
  const n = Number(env.EK_N ?? 3000);
  for (let it = 0; it < iters; it++) {
    const r = await runBalance(n, 1 + it * 100_000);
    console.log(`iteration ${it}\n${formatReport(r)}`);
    for (const e of ELEMENT_IDS) {
      // win rate is not linear in damage; a gentle step (about 1.2 points of damage per point of win rate)
      const step = Math.round((0.5 - r.winRate[e]) * 120);
      POWER_TUNE[e] = Math.max(60, Math.min(150, POWER_TUNE[e] + step));
    }
    console.log('POWER_TUNE =', JSON.stringify(POWER_TUNE));
  }
}, 3_600_000);
