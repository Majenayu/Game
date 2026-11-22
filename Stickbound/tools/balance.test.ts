// Required balance check (npm run balance): 10,000 headless bot matches (level 20, Veteran bots, random elements and
// fighting styles). Every element must win 45 to 55% of its non-mirror matches, every element:style 42 to 58%, and
// rounds must average 25 to 45 seconds.
import { expect, it } from 'vitest';
import { ELEMENT_IDS } from '../src/content/elements';
import { ARCHETYPE_IDS } from '../src/content/archetypes';
import { formatReport, runBalance } from './balanceLib';

it('10,000 bot matches: elements 45-55%, styles 42-58%, rounds 25-45 s', async () => {
  const r = await runBalance(10_000, 424_242);
  console.log(formatReport(r));
  for (const e of ELEMENT_IDS) {
    expect(r.winRate[e], e).toBeGreaterThanOrEqual(0.45);
    expect(r.winRate[e], e).toBeLessThanOrEqual(0.55);
    for (const a of ARCHETYPE_IDS) {
      const k = `${e}:${a}`;
      expect(r.styleRate[k], k).toBeGreaterThanOrEqual(0.42);
      expect(r.styleRate[k], k).toBeLessThanOrEqual(0.58);
    }
  }
  expect(r.avgRoundSec).toBeGreaterThanOrEqual(25);
  expect(r.avgRoundSec).toBeLessThanOrEqual(45);
}, 3_600_000);
