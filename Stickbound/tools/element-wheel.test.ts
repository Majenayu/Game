// Runs the element wheel search and prints the result (run: npx vitest run tools/element-wheel.test.ts).
import { test } from 'vitest';
import { ELEMENT_IDS, PRIMARY_PAIRS, SECONDARY_PAIRS } from '../src/content/elementPrefs';
import { searchWheel } from '../src/content/wheelSearch';

test('search', () => {
  const t0 = Date.now();
  const r = searchWheel(ELEMENT_IDS, PRIMARY_PAIRS, SECONDARY_PAIRS);
  console.log(JSON.stringify({ ...r, ms: Date.now() - t0 }, null, 1));
});
