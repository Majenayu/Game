// Element wheel search. A valid wheel: every element beats exactly 2 others, loses to exactly 2, is neutral to the
// rest, and no two elements beat each other. Among all valid wheels, pick the one that satisfies the most preferred
// pairs (weight 100 each), then the most secondary "feels right" pairs (weight 1 each). Branch and bound over edges.

export type Pair = readonly [string, string];

export interface WheelResult {
  beats: Record<string, string[]>;
  primaryHit: number;
  secondaryHit: number;
  explored: number;
}

export function isRegular(names: readonly string[], beats: Record<string, readonly string[]>): string[] {
  const problems: string[] = [];
  const losses = new Map(names.map((n) => [n, 0]));
  for (const a of names) {
    const out = beats[a] ?? [];
    if (out.length !== 2) problems.push(`${a} beats ${out.length} elements, expected 2`);
    if (new Set(out).size !== out.length) problems.push(`${a} lists a duplicate`);
    for (const b of out) {
      if (b === a) problems.push(`${a} beats itself`);
      if (!names.includes(b)) problems.push(`${a} beats unknown ${b}`);
      losses.set(b, (losses.get(b) ?? 0) + 1);
      if ((beats[b] ?? []).includes(a)) problems.push(`${a} and ${b} beat each other`);
    }
  }
  for (const [n, l] of losses) if (l !== 2) problems.push(`${n} loses to ${l} elements, expected 2`);
  return problems;
}

export function searchWheel(names: readonly string[], primary: readonly Pair[], secondary: readonly Pair[]): WheelResult {
  const n = names.length;
  const idx = new Map(names.map((x, i) => [x, i]));
  const weight = new Map<number, number>();
  const key = (a: number, b: number) => a * n + b;
  for (const [a, b] of primary) weight.set(key(idx.get(a)!, idx.get(b)!), 100);
  for (const [a, b] of secondary) weight.set(key(idx.get(a)!, idx.get(b)!), (weight.get(key(idx.get(a)!, idx.get(b)!)) ?? 0) + 1);

  // Unordered pairs, most valuable first, so good solutions are found early and the bound prunes hard.
  const pairs: [number, number][] = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) pairs.push([a, b]);
  const pairValue = ([a, b]: [number, number]) => Math.max(weight.get(key(a, b)) ?? 0, weight.get(key(b, a)) ?? 0);
  pairs.sort((p, q) => pairValue(q) - pairValue(p));
  const suffixBound = new Array(pairs.length + 1).fill(0);
  for (let i = pairs.length - 1; i >= 0; i--) suffixBound[i] = suffixBound[i + 1] + pairValue(pairs[i]!);

  const out = new Array(n).fill(0);
  const inn = new Array(n).fill(0);
  const edges: [number, number][] = [];
  let best = -1;
  let bestEdges: [number, number][] = [];
  let explored = 0;

  const go = (i: number, score: number): void => {
    explored++;
    if (score + suffixBound[i] <= best) return;
    // Every vertex needs out = in = 2. Remaining pairs touching each vertex must be enough.
    if (i === pairs.length) {
      if (out.every((v) => v === 2) && inn.every((v) => v === 2)) {
        best = score;
        bestEdges = edges.slice();
      }
      return;
    }
    const [a, b] = pairs[i]!;
    // option 1: a beats b, option 2: b beats a, option 3: neutral. Try the higher-weight direction first.
    const wab = weight.get(key(a, b)) ?? 0;
    const wba = weight.get(key(b, a)) ?? 0;
    const options: [number, number, number][] = wab >= wba ? [[a, b, wab], [b, a, wba]] : [[b, a, wba], [a, b, wab]];
    for (const [x, y, w] of options) {
      if (out[x] < 2 && inn[y] < 2) {
        out[x]++;
        inn[y]++;
        edges.push([x, y]);
        go(i + 1, score + w);
        edges.pop();
        out[x]--;
        inn[y]--;
      }
    }
    // neutral is only possible if both can still reach degree 2 with the pairs left
    if (feasibleAfterSkip(i, a) && feasibleAfterSkip(i, b)) go(i + 1, score);
  };

  // How many later pairs touch vertex v (to know if it can still reach out=2 and in=2).
  const later: number[][] = Array.from({ length: pairs.length + 1 }, () => new Array(n).fill(0));
  for (let i = pairs.length - 1; i >= 0; i--) {
    later[i] = later[i + 1]!.slice();
    const [a, b] = pairs[i]!;
    later[i]![a]++;
    later[i]![b]++;
  }
  function feasibleAfterSkip(i: number, v: number): boolean {
    const need = 2 - out[v] + (2 - inn[v]);
    return later[i + 1]![v]! >= need;
  }

  go(0, 0);
  const beats: Record<string, string[]> = Object.fromEntries(names.map((x) => [x, [] as string[]]));
  for (const [x, y] of bestEdges) beats[names[x]!]!.push(names[y]!);
  const has = (p: Pair) => beats[p[0]]!.includes(p[1]);
  return { beats, primaryHit: primary.filter(has).length, secondaryHit: secondary.filter(has).length, explored };
}
