// Fits POWER_TUNE per element:style so every element and style lands near 50%:
//   EK_IT=4 EK_N=4000 npx vitest run tools/balance-tune.test.ts
// Prints the table to paste into src/content/powers.ts. Not part of the required suite.
import { it } from 'vitest';
import { ELEMENT_IDS } from '../src/content/elements';
import { ARCHETYPE_IDS } from '../src/content/archetypes';
import { POWER_TUNE } from '../src/content/powers';
import { formatReport, runBalance } from './balanceLib';

it('tune', async () => {
  const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
  const iters = Number(env.EK_IT ?? 4);
  const n = Number(env.EK_N ?? 4000);
  for (let it = 0; it < iters; it++) {
    const r = await runBalance(n, 1 + it * 100_000);
    console.log(`iteration ${it}\n${formatReport(r)}`);
    for (const e of ELEMENT_IDS)
      for (const a of ARCHETYPE_IDS) {
        const k = `${e}:${a}`;
        // a gentle step: about 1 point of damage per point of win rate, kept in a sane band (never a tiny value)
        const step = Math.round((0.5 - r.styleRate[k]!) * 70);
        POWER_TUNE[k] = Math.max(72, Math.min(150, (POWER_TUNE[k] ?? 100) + step));
      }
    console.log('POWER_TUNE =', JSON.stringify(POWER_TUNE));
  }
}, 7_200_000);
