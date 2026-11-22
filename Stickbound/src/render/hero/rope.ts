// Rope physics for ribbons, scarves and tails.

/** Rope physics for ribbons, scarves and tails (follow the leader). Returns the points used. */
export function rope(pts: { x: number; y: number }[], i0: number, n: number, ax: number, ay: number, dx: number, dy: number, seg: number, k: number, t: number, ph: number, amp: number, grav: number): { x: number; y: number }[] {
  while (pts.length < i0 + n) pts.push({ x: ax + dx * seg * (pts.length - i0 + 1), y: ay + dy * seg * (pts.length - i0 + 1) });
  let px = ax;
  let py = ay;
  for (let i = 0; i < n; i++) {
    const p = pts[i0 + i]!;
    const f = (i + 1) / n;
    const tx = px + dx * seg;
    const ty = py + dy * seg + grav * seg + Math.sin(t * 9 + i * 0.9 + ph) * amp * f;
    p.x += (tx - p.x) * k;
    p.y += (ty - p.y) * k;
    const ddx = p.x - px;
    const ddy = p.y - py;
    const d = Math.hypot(ddx, ddy);
    if (d > seg * 1.35) {
      p.x = px + (ddx / d) * seg * 1.35;
      p.y = py + (ddy / d) * seg * 1.35;
    }
    px = p.x;
    py = p.y;
  }
  return pts;
}

