// Banned-word scan over everything players can see: content tables and every string literal in the UI, scenes,
// HUD, meta rules and index.html. Word boundaries, so "remember" or "Pink" are not false hits.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_CHAMPIONS, DISTRICTS, ENDINGS, PREMISE } from '../src/content/champions';
import { ELEMENTS } from '../src/content/elements';
import * as looks from '../src/content/looks';
import { POWER_TEXT, POWERS } from '../src/content/powers';
import { DAILY_POOL, rivals, TIERS, WEEKLY_POOL, RANK_TIERS, randomName } from '../src/meta/profile';
import { PERKS } from '../src/sim/stats';
import { ARENAS } from '../src/render/arenas';
import { ACTION_LABEL } from '../src/core/input';

export const BANNED = ['ink', 'eraser', 'echo', 'ember', 'tide', 'quill', 'tale', 'hush', 'quiet', 'nova', 'wick', 'orb', 'lantern', 'still', 'stillness', 'blaze', 'keepsake', 'nib', 'pale', 'inkmere', 'forgepeak'];
/** Also names from other works and earlier majen projects that must never appear. */
const OTHER_WORKS = ['boboiboy', 'pokemon', 'pokémon', 'pikachu', 'crazy combos', 'orb arena', 'lanternfall', 'sunfetch', 'talewild', 'mythwake', 'tindle', 'clinker', 'stickbound'];

const re = new RegExp(`\\b(${BANNED.join('|')})(s|es|ed|ing)?\\b`, 'i');

export function hits(text: string): string[] {
  const out: string[] = [];
  const low = text.toLowerCase();
  const m = text.match(new RegExp(re.source, 'gi'));
  if (m) out.push(...m);
  for (const w of OTHER_WORKS) if (low.includes(w)) out.push(w);
  return out;
}

function walk(d: string): string[] {
  return readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** String literals (quotes and template text) from a TS source file, comments removed. */
function literals(src: string): string[] {
  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
  const out: string[] = [];
  const rx = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(noComments))) out.push((m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, ' '));
  return out;
}

describe('banned words', () => {
  it('the scanner uses word boundaries', () => {
    expect(hits('Ember Shot')).toEqual(['Ember']);
    expect(hits('remember the pink absorbing tidewater')).toEqual([]);
    expect(hits('Still standing')).toEqual(['Still']);
    expect(hits('Orbs everywhere')).toEqual(['Orbs']);
  });

  it('no banned word in content tables', () => {
    const texts: string[] = [
      ...PREMISE,
      ...ENDINGS.crown,
      ...ENDINGS.rival,
      ...DISTRICTS.flatMap((d) => [d.name, d.blurb]),
      ...ALL_CHAMPIONS.flatMap((c) => [c.name, ...c.intro, c.outro]),
      ...Object.values(ELEMENTS).flatMap((e) => [e.name, e.passive]),
      ...POWERS.map((p) => p.name),
      ...Object.values(POWER_TEXT),
      ...PERKS.flatMap((p) => [p.name, p.text]),
      ...[...DAILY_POOL, ...WEEKLY_POOL].map((q) => q.text),
      ...rivals(0).map((r) => r.name),
      ...TIERS,
      ...RANK_TIERS.map((t) => t.name),
      ...ARENAS.map((a) => a.name),
      ...Object.values(ACTION_LABEL),
      ...[looks.HEADS, looks.EYES, looks.MOUTHS, looks.BODY_NAMES, looks.THICK_NAMES, looks.HATS, looks.BACKS, looks.EXTRAS, looks.AURA_NAMES, looks.WIN_POSES].flat(),
      ...Array.from({ length: 2000 }, (_, i) => randomName(i * 7919 + 13)),
    ];
    const bad = texts.flatMap((t) => hits(t).map((w) => `${w} in "${t}"`));
    expect(bad).toEqual([]);
  });

  it('no banned word in any string in the source or index.html', () => {
    const files = walk('src').filter((f) => /\.(ts|css)$/.test(f));
    const bad: string[] = [];
    for (const f of files) {
      for (const lit of literals(readFileSync(f, 'utf8'))) {
        // ids and keys like 'elementick:pause' or css class names are not player-facing, but they are scanned too
        for (const w of hits(lit)) bad.push(`${f}: ${w} in "${lit.slice(0, 80)}"`);
      }
    }
    const html = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    for (const w of hits(html.replace(/<[^>]+>/g, ' '))) bad.push(`index.html: ${w}`);
    expect(bad).toEqual([]);
  });
});
