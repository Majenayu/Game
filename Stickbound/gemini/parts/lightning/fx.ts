/**
 * Lightning visual engine for the lab. Pure drawing: every function reads its inputs and a seed and never changes
 * game state, so the same frame always looks the same. Flicker comes from re-seeding every couple of frames.
 */
type G = CanvasRenderingContext2D;
export type Theme = 'cyan' | 'gold' | 'white';
type P = { x: number; y: number };

const THEMES: Record<Theme, { glow: string; mid: string; core: string }> = {
  cyan: { glow: '70,180,255', mid: '150,240,255', core: '255,255,255' },
  gold: { glow: '255,170,40', mid: '255,228,120', core: '255,252,225' },
  white: { glow: '170,220,255', mid: '235,250,255', core: '255,255,255' },
};

export function rngOf(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A jagged path from A to B by midpoint displacement (looks like real lightning, not a zigzag). */
export function boltPath(a: P, b: P, r: () => number, rough = 0.28): P[] {
  let pts: P[] = [a, b];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  let disp = len * rough;
  const levels = Math.max(2, Math.min(6, Math.ceil(Math.log2(len / 14))));
  for (let l = 0; l < levels; l++) {
    const next: P[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1];
      const q = pts[i];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const off = (r() - 0.5) * disp;
      next.push({ x: (p.x + q.x) / 2 + (-dy / d) * off, y: (p.y + q.y) / 2 + (dx / d) * off }, q);
    }
    pts = next;
    disp *= 0.55;
  }
  return pts;
}
function stroke(g: G, pts: P[], w: number, col: string): void {
  g.strokeStyle = col;
  g.lineWidth = w;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.stroke();
}

/**
 * One lightning bolt with a soft glow, a coloured body and a white-hot core, plus forks.
 * width 1 is a normal bolt; alpha fades it out.
 */
export function drawBolt(g: G, a: P, b: P, seed: number, width: number, alpha: number, theme: Theme = 'cyan', forks = 3): void {
  if (alpha <= 0.01) return;
  const r = rngOf(seed);
  const pts = boltPath(a, b, r);
  const th = THEMES[theme];
  const fl = alpha * (0.75 + 0.25 * r());
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  stroke(g, pts, 18 * width, `rgba(${th.glow},${0.12 * fl})`);
  stroke(g, pts, 7 * width, `rgba(${th.glow},${0.45 * fl})`);
  stroke(g, pts, 3.4 * width, `rgba(${th.mid},${0.9 * fl})`);
  stroke(g, pts, 1.4 * width, `rgba(${th.core},${fl})`);
  // forks: short side bolts off the main path
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  for (let i = 0; i < forks && pts.length > 4; i++) {
    const k = 2 + Math.floor(r() * (pts.length - 4));
    const p = pts[k];
    const q = pts[k + 1];
    const ang = Math.atan2(q.y - p.y, q.x - p.x) + (r() < 0.5 ? -1 : 1) * (0.4 + r() * 0.6);
    const fl2 = len * (0.15 + r() * 0.25);
    const end = { x: p.x + Math.cos(ang) * fl2, y: p.y + Math.sin(ang) * fl2 };
    const fp = boltPath(p, end, r, 0.35);
    stroke(g, fp, 6 * width, `rgba(${th.glow},${0.3 * fl})`);
    stroke(g, fp, 2 * width, `rgba(${th.mid},${0.85 * fl})`);
    stroke(g, fp, 0.8 * width, `rgba(${th.core},${fl})`);
  }
  g.restore();
}

/** A bright star flare: glow, a ring and long thin rays. Used on hits, on fists and at beam ends. */
export function drawFlare(g: G, x: number, y: number, size: number, alpha: number, seed: number, theme: Theme = 'cyan'): void {
  if (alpha <= 0.01) return;
  const th = THEMES[theme];
  const r = rngOf(seed);
  g.save();
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(x, y, 0, x, y, size);
  gr.addColorStop(0, `rgba(${th.core},${alpha})`);
  gr.addColorStop(0.25, `rgba(${th.mid},${0.7 * alpha})`);
  gr.addColorStop(1, `rgba(${th.glow},0)`);
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, size, 0, Math.PI * 2);
  g.fill();
  const rays = 8;
  const rot = r() * Math.PI;
  for (let i = 0; i < rays; i++) {
    const a = rot + (i / rays) * Math.PI * 2;
    const long = i % 2 === 0 ? 1.6 : 0.9;
    const L = size * long * (0.8 + r() * 0.4);
    const w = size * 0.07;
    g.fillStyle = `rgba(${i % 2 ? th.mid : th.core},${alpha * 0.9})`;
    g.beginPath();
    g.moveTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
    g.lineTo(x + Math.cos(a + Math.PI / 2) * w, y + Math.sin(a + Math.PI / 2) * w);
    g.lineTo(x + Math.cos(a + Math.PI) * w * 2, y + Math.sin(a + Math.PI) * w * 2);
    g.lineTo(x + Math.cos(a - Math.PI / 2) * w, y + Math.sin(a - Math.PI / 2) * w);
    g.closePath();
    g.fill();
  }
  g.restore();
}

/**
 * Power-up aura like the reference: tall jagged lightning flames rising from the floor around the body, cyan and
 * gold, with a glowing ground ring. side: -1 draws the flames behind the body, 1 the ones in front.
 */
export function drawAura(g: G, cx: number, ground: number, height: number, strength: number, frame: number, side: -1 | 1): void {
  if (strength <= 0.02) return;
  const n = 16;
  const r = rngOf(Math.floor(frame / 2) * 977 + (side > 0 ? 7 : 3));
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (side < 0) {
    const gr = g.createRadialGradient(cx, ground, 4, cx, ground, height * 0.6);
    gr.addColorStop(0, `rgba(170,240,255,${0.55 * strength})`);
    gr.addColorStop(0.5, `rgba(80,170,255,${0.25 * strength})`);
    gr.addColorStop(1, 'rgba(60,140,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(cx, ground, height * 0.6, height * 0.16, 0, 0, Math.PI * 2);
    g.fill();
    const body = g.createRadialGradient(cx, ground - height * 0.45, 10, cx, ground - height * 0.45, height * 0.65);
    body.addColorStop(0, `rgba(140,230,255,${0.22 * strength})`);
    body.addColorStop(1, 'rgba(140,230,255,0)');
    g.fillStyle = body;
    g.fillRect(cx - height, ground - height * 1.2, height * 2, height * 1.2);
  }
  for (let i = 0; i < n; i++) {
    const front = i % 2 === 0;
    if ((side > 0) !== front) continue;
    const u = i / (n - 1) - 0.5;
    const bx = cx + u * height * 0.55 + (r() - 0.5) * 14;
    const h = height * (0.45 + 0.6 * r()) * strength * (1 - Math.abs(u) * 0.9);
    const pts: P[] = [{ x: bx, y: ground }];
    const seg = 7;
    for (let k = 1; k <= seg; k++) {
      const t = k / seg;
      pts.push({ x: bx + (r() - 0.5) * 34 * (1 - t * 0.4) + u * 30 * t, y: ground - h * t });
    }
    const gold = i % 3 === 0;
    const glow = gold ? '255,180,50' : '70,180,255';
    const mid = gold ? '255,230,120' : '150,240,255';
    stroke(g, pts, 14, `rgba(${glow},${0.18 * strength})`);
    stroke(g, pts, 5, `rgba(${mid},${0.8 * strength})`);
    stroke(g, pts, 1.8, `rgba(255,255,255,${0.95 * strength})`);
  }
  g.restore();
}

/** Electric arcs crawling along the body between joints (charged state, reference top-left). */
export function drawBodyArcs(g: G, joints: P[][], strength: number, frame: number): void {
  if (strength <= 0.05) return;
  const r = rngOf(Math.floor(frame / 2) * 313 + 5);
  for (const chain of joints) {
    for (let i = 0; i + 1 < chain.length; i++) {
      if (r() > 0.45 + strength * 0.4) continue;
      const a = chain[i];
      const b = chain[i + 1];
      const off = (v: number) => (r() - 0.5) * v;
      drawBolt(g, { x: a.x + off(18), y: a.y + off(18) }, { x: b.x + off(18), y: b.y + off(18) }, Math.floor(r() * 1e6), 0.45, 0.8 * strength, r() < 0.3 ? 'gold' : 'cyan', 1);
    }
  }
}

/**
 * Lightning shield for guarding: a crackling dome in front of the body with a hex pattern, a living bolt along its
 * edge and arcs from the body. pop 0..1 grows it in; hit 0..1 flashes it white when it blocks.
 */
export function drawShield(g: G, cx: number, cy: number, facing: number, radius: number, pop: number, hit: number, frame: number, perfect: boolean): void {
  if (pop <= 0.01) return;
  const R = radius * (0.6 + 0.4 * easeBack(pop)) * (1 + hit * 0.08);
  const a0 = facing > 0 ? -1.25 : Math.PI - 1.25;
  const a1 = a0 + 2.5;
  const r = rngOf(Math.floor(frame / 2) * 131 + 9);
  g.save();
  g.globalCompositeOperation = 'lighter';
  // energy fill
  const gr = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
  const col = perfect ? '255,230,120' : '110,210,255';
  gr.addColorStop(0, `rgba(${col},0)`);
  gr.addColorStop(0.75, `rgba(${col},${0.1 + hit * 0.2})`);
  gr.addColorStop(1, `rgba(${col},${0.35 + hit * 0.4})`);
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(cx, cy);
  g.arc(cx, cy, R, a0, a1);
  g.closePath();
  g.fill();
  // hex pattern inside the dome
  g.save();
  g.beginPath();
  g.moveTo(cx, cy);
  g.arc(cx, cy, R, a0, a1);
  g.closePath();
  g.clip();
  g.strokeStyle = `rgba(${col},${0.18 + hit * 0.3 + 0.05 * Math.sin(frame / 5)})`;
  g.lineWidth = 1.5;
  const hs = R * 0.16;
  for (let yy = -R; yy < R; yy += hs * 1.5) {
    for (let xx = -R; xx < R; xx += hs * 1.732) {
      const ox = cx + xx + ((Math.round(yy / (hs * 1.5)) & 1) ? hs * 0.866 : 0);
      const oy = cy + yy;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
        const px = ox + Math.cos(a) * hs * 0.55;
        const py = oy + Math.sin(a) * hs * 0.55;
        if (k) g.lineTo(px, py);
        else g.moveTo(px, py);
      }
      g.closePath();
      g.stroke();
    }
  }
  g.restore();
  // living bolt along the edge
  const steps = 18;
  const edge: P[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    const rr = R + (r() - 0.5) * 10;
    edge.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
  }
  g.lineCap = 'round';
  g.lineJoin = 'round';
  stroke(g, edge, 16, `rgba(${col},${0.2 + hit * 0.3})`);
  stroke(g, edge, 5 + hit * 4, `rgba(${perfect ? '255,240,170' : '160,240,255'},0.9)`);
  stroke(g, edge, 2, 'rgba(255,255,255,1)');
  g.restore();
  // arcs from the body to the edge
  for (let i = 0; i < 2 + Math.round(hit * 4); i++) {
    const a = a0 + (a1 - a0) * r();
    drawBolt(g, { x: cx, y: cy }, { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }, Math.floor(r() * 1e6), 0.5, 0.6 + hit * 0.4, perfect ? 'gold' : 'cyan', 1);
  }
}
const easeBack = (t: number) => {
  const c = 1.7;
  const u = Math.min(1, t) - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};

/** A storm cloud gathering above a point (Skyfall Strike, Thunder God). */
export function drawStormCloud(g: G, x: number, y: number, size: number, alpha: number, frame: number): void {
  if (alpha <= 0.01) return;
  g.save();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + frame * 0.02;
    const px = x + Math.cos(a) * size * 0.45;
    const py = y + Math.sin(a) * size * 0.12;
    const gr = g.createRadialGradient(px, py, 4, px, py, size * 0.45);
    gr.addColorStop(0, `rgba(30,34,70,${0.85 * alpha})`);
    gr.addColorStop(1, 'rgba(30,34,70,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(px, py, size * 0.45, 0, Math.PI * 2);
    g.fill();
  }
  // flashes inside the cloud
  const r = rngOf(Math.floor(frame / 3) * 71);
  if (r() < 0.6) {
    g.globalCompositeOperation = 'lighter';
    const fx = x + (r() - 0.5) * size * 0.8;
    const gr = g.createRadialGradient(fx, y, 2, fx, y, size * 0.35);
    gr.addColorStop(0, `rgba(160,230,255,${0.5 * alpha})`);
    gr.addColorStop(1, 'rgba(160,230,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(fx, y, size * 0.35, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** A huge pillar of lightning from the sky to the floor. k goes 0..1 over its life. */
export function drawPillar(g: G, x: number, top: number, ground: number, width: number, k: number, frame: number): void {
  const a = 1 - k;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const w = width * (1 + k * 0.6);
  const gr = g.createLinearGradient(x - w, 0, x + w, 0);
  gr.addColorStop(0, 'rgba(70,170,255,0)');
  gr.addColorStop(0.35, `rgba(120,220,255,${0.5 * a})`);
  gr.addColorStop(0.5, `rgba(255,255,255,${0.95 * a})`);
  gr.addColorStop(0.65, `rgba(120,220,255,${0.5 * a})`);
  gr.addColorStop(1, 'rgba(70,170,255,0)');
  g.fillStyle = gr;
  g.fillRect(x - w, top, w * 2, ground - top);
  g.restore();
  for (let i = 0; i < 3; i++)
    drawBolt(g, { x: x + (i - 1) * width * 0.4, y: top }, { x: x + (i - 1) * 10, y: ground }, Math.floor(frame / 2) * 17 + i * 101, 2.2 - i * 0.5, a, i === 1 ? 'white' : i === 0 ? 'cyan' : 'gold', 4);
  drawFlare(g, x, ground - 10, width * 2.2 * (0.6 + a * 0.6), a, frame, 'white');
}
