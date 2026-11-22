// Quick balance probe (not part of the required suite): npx vitest run tools/balance-probe.test.ts
import { it } from 'vitest';
import { formatReport, runBalance } from './balanceLib';

it('probe', () => {
  const n = Number((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.EK_N ?? 400);
  console.log(formatReport(runBalance(n, 1)));
}, 3_600_000);
