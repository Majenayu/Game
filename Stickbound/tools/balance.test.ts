// Required balance check (npm run balance): 10,000 headless bot matches (level 20, Veteran bots, random squads).
// Every element must win 45 to 55% of its non-mirror matches; rounds must average 25 to 45 seconds.
import { expect, it } from 'vitest';
import { ELEMENT_IDS } from '../src/content/elements';
import { formatReport, runBalance } from './balanceLib';

it('10,000 bot matches: every element 45-55%, rounds 25-45 s', () => {
  const r = runBalance(10_000, 424_242);
  console.log(formatReport(r));
  for (const e of ELEMENT_IDS) {
    expect(r.winRate[e], e).toBeGreaterThanOrEqual(0.45);
    expect(r.winRate[e], e).toBeLessThanOrEqual(0.55);
  }
  expect(r.avgRoundSec).toBeGreaterThanOrEqual(25);
  expect(r.avgRoundSec).toBeLessThanOrEqual(45);
}, 3_600_000);
