// Writes the full skill list to docs/skills/ (one file per rank, U first) plus an index docs/SKILLS.md.
// Run: npx tsx scripts/skill-docs.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  ELEMENTS,
  RANK_INFO,
  UNIQUES,
  firstIdOfRank,
  getSkill,
  skillCount,
  slotFromInstance,
  neutralInstance,
  uniqueIdOf,
  worldBonusOf,
  type Rank,
} from '../shared/src/index';

const ORDER: Rank[] = ['U', 'S', 'A', 'B', 'C', 'D', 'E', 'F'];
mkdirSync('docs/skills', { recursive: true });
const esc = (s: string) => s.replace(/\|/g, '/');

function row(id: number): string {
  const s = getSkill(id);
  const el = ELEMENTS[s.element]?.name ?? '-';
  if (s.kind === 'world') {
    const b = worldBonusOf(id, 1);
    return `| ${id} | ${esc(s.name)} | out of battle | - | ${esc(b.text)} | ${esc(s.desc)} |`;
  }
  const st = slotFromInstance(neutralInstance(id)).stats;
  return `| ${id} | ${esc(s.name)} | ${s.kind} | ${el} | power ${Math.round(st.power)}, cooldown ${st.cooldown.toFixed(1)}s, mana ${Math.round(st.mp)}, cast ${st.cast.toFixed(2)}s, range ${Math.round(st.range)} | ${esc(s.desc)} |`;
}

const index: string[] = [
  '# All skills',
  '',
  'Every skill in Orb Arena, from the strongest rank to the weakest. Generated from the game code by `npx tsx scripts/skill-docs.ts`, so it always matches the game.',
  '',
  '| Rank | Name | Skills | File |',
  '| --- | --- | --- | --- |',
];
for (const r of ORDER) {
  const info = RANK_INFO[r];
  const ids: number[] =
    r === 'U'
      ? UNIQUES.map((u) => uniqueIdOf(u.n))
      : Array.from({ length: skillCount(r) }, (_, k) => firstIdOfRank(r) + k);
  const lines = [
    `# Rank ${r}: ${info.name} (${ids.length} skills)`,
    '',
    'Stats are level 1 values with neutral rolls. Skills marked "out of battle" are passive bonuses that work automatically outside matches.',
    '',
    '| Id | Name | Kind | Element | Stats | Description |',
    '| --- | --- | --- | --- | --- | --- |',
    ...ids.map(row),
    '',
  ];
  writeFileSync(`docs/skills/${r}.md`, lines.join('\n'));
  index.push(`| ${r} | ${info.name} | ${ids.length} | [skills/${r}.md](skills/${r}.md) |`);
}
writeFileSync('docs/SKILLS.md', index.join('\n') + '\n');
console.log('wrote docs/SKILLS.md and docs/skills/*.md');
