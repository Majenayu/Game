import { BOSS_FIGHTS, LEVELS, STAR_MILESTONES, WORLDS, randomGear } from '@orb/shared';
import { ALL_FIGURES, uniqueSvg } from '../art/bestiary';
import { DECOR_ART, FL, GIFT_ART } from '../art/packs.gen';
import { esc } from '../ui/ui';
import type { Progress } from './economy';
import { addGear } from './inventory';

/**
 * The campaign map, candy-crush style. Every world has its own path shape, scenery (colour art), ground and
 * weather; the boss node shows the boss; gift boxes sit on the path and open once the level before is cleared.
 */
const W = 900;
const H = 360;
type P = { x: number; y: number };
/** Eleven node positions per world, each world with a different route. */
const ROUTES: Array<(i: number) => P> = [
  (i) => ({ x: 70 + i * 76, y: 180 + Math.sin(i * 0.95) * 110 }), // wave
  (i) => ({ x: 70 + i * 76, y: i % 2 ? 90 : 270 }), // zigzag
  (i) => (i < 6 ? { x: 90 + i * 140, y: 100 } : { x: 790 - (i - 6) * 150, y: 270 }), // snake (two rows)
  (i) => ({ x: 80 + i * 74, y: 310 - i * 25 }), // climbing stairs
  (i) => ({ x: 450 + Math.cos(i * 0.62 + 3.1) * (340 - i * 15), y: 180 + Math.sin(i * 0.62 + 3.1) * (150 - i * 6) }), // spiral into the volcano
  (i) => ({ x: 80 + Math.floor((i + 1) / 2) * 140, y: i % 4 < 2 ? 90 : 270 }), // maze corners
  (i) => ({ x: 70 + i * 76, y: 70 + Math.abs(i - 5) * 46 }), // valley (V)
  (i) => ({ x: 70 + i * 76, y: 300 - (5 - Math.abs(i - 5)) * 46 + (i === 10 ? -40 : 0) }), // mountain peak
];
const GROUND = ['#123a6a', '#5a3a1a', '#1f5a2a', '#3a3f55', '#4a1408', '#1a1440', '#20263a', '#cfe8ff'];
const WEATHER = ['spark', 'storm', 'leaf', 'spark', 'ember', 'star', 'snow', 'snow'];
const GIFT_AFTER = [3, 6, 9];
const giftKey = (w: number, n: number) => `${w}:${n}`;

function art(name: string, x: number, y: number, s: number, extra = ''): string {
  const a = FL[name];
  return a ? `<svg x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" viewBox="0 0 ${a[0]} ${a[1]}" ${extra}>${a[2]}</svg>` : '';
}

export function worldMapHtml(pr: Progress): string {
  return WORLDS.map((w) => {
    const levels = LEVELS.filter((l) => l.id > w.id * 11 && l.id <= w.id * 11 + 11);
    const stars = levels.reduce((s, l) => s + (pr.data.campaign[String(l.id)] ?? 0), 0);
    const open = levels.length > 0 && pr.levelUnlocked(levels[0]);
    const route = ROUTES[w.id % ROUTES.length];
    const pts = levels.map((_, i) => route(i));
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(0)} ${p.y.toFixed(0)}`).join(' ');
    const deco = DECOR_ART[levels[0]?.map ?? 'neon'] ?? [];
    // scenery: colour art placed away from the path
    const scenery = Array.from({ length: 9 }, (_, k) => {
      const x = 40 + ((k * 211 + w.id * 67) % (W - 80));
      const y = 30 + ((k * 137 + w.id * 41) % (H - 60));
      if (pts.some((p) => Math.hypot(p.x - x, p.y - y) < 60)) return '';
      const s = 46 + ((k * 13) % 30);
      return `<g class="bob" style="animation-delay:${(k % 5) * 0.5}s">${art(deco[k % Math.max(1, deco.length)] ?? 'sparkles', x, y, s, 'opacity=".9"')}</g>`;
    }).join('');
    // ground hills
    const g = GROUND[w.id % GROUND.length];
    const hills = `<path d="M0 ${H} L0 ${H - 60} Q150 ${H - 120} 300 ${H - 70} T600 ${H - 80} T900 ${H - 60} L900 ${H} Z" fill="${g}" opacity=".7"/>`;
    // weather
    const wx = WEATHER[w.id % WEATHER.length];
    const weather = Array.from({ length: 22 }, (_, k) => {
      const x = (k * 83 + w.id * 29) % W;
      const d = (k % 9) * 0.6;
      if (wx === 'snow') return `<circle class="fall" cx="${x}" cy="-10" r="${2 + (k % 3)}" fill="#fff" style="animation-delay:${d}s"/>`;
      if (wx === 'ember') return `<circle class="rise" cx="${x}" cy="${H + 10}" r="${2 + (k % 3)}" fill="#ffb347" style="animation-delay:${d}s"/>`;
      if (wx === 'leaf') return `<ellipse class="fall" cx="${x}" cy="-10" rx="5" ry="2.5" fill="#7dff6b" style="animation-delay:${d}s"/>`;
      if (wx === 'storm') return `<line class="fall fast" x1="${x}" y1="-20" x2="${x - 6}" y2="0" stroke="#9ec9ff" stroke-width="2" style="animation-delay:${d / 2}s"/>`;
      return `<circle class="spark" cx="${x}" cy="${(k * 53 + w.id * 17) % H}" r="${1 + (k % 3)}" fill="#fff" style="animation-delay:${d}s"/>`;
    }).join('');
    const flash = wx === 'storm' ? `<rect class="flash" width="${W}" height="${H}" fill="#fff"/>` : '';
    const fight = BOSS_FIGHTS[w.boss] ?? BOSS_FIGHTS[w.id];
    const fig = ALL_FIGURES.find((f) => f.id === fight?.figure);
    const nodes = levels
      .map((l, i) => {
        const p = pts[i];
        const st = pr.data.campaign[String(l.id)] ?? 0;
        const un = pr.levelUnlocked(l);
        const next = un && !st;
        const r = l.boss ? 36 : 20;
        const fill = !un ? '#2a2f4a' : l.boss ? '#ff1744' : st ? w.path : '#ffc93c';
        const starTxt = [1, 2, 3].map((k) => `<tspan fill="${k <= st ? '#ffc93c' : '#4a5070'}">&#9733;</tspan>`).join('');
        const face =
          l.boss && fig
            ? `<svg x="${p.x - r}" y="${p.y - r}" width="${r * 2}" height="${r * 2}" viewBox="0 0 240 240" ${un ? '' : 'opacity=".35"'}>${uniqueSvg(fig.svg, `wm${w.id}`).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</svg>`
            : `<text x="${p.x}" y="${p.y + 6}" text-anchor="middle" font-size="16" font-weight="800" fill="#1b0a3a">${i + 1}</text>`;
        return `<g class="mnode ${next ? 'next' : ''} ${un ? 'open' : 'lock'}" data-mlvl="${un ? l.id : ''}" style="cursor:${un ? 'pointer' : 'default'}">
          <circle cx="${p.x}" cy="${p.y}" r="${r + 7}" fill="${fill}" opacity=".3" class="halo"/>
          <circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${fill}" stroke="#fff" stroke-width="3"/>${face}
          <text x="${p.x}" y="${p.y + r + 18}" text-anchor="middle" font-size="14">${starTxt}</text>
          ${l.boss ? `<text x="${p.x}" y="${p.y - r - 8}" text-anchor="middle" font-size="13" font-weight="800" fill="#ff8a9a">${esc(fight?.name ?? 'BOSS')}</text>` : ''}
          ${un ? '' : `<text x="${p.x}" y="${p.y - r - (l.boss ? 22 : 6)}" text-anchor="middle" font-size="14">&#128274;</text>`}
        </g>`;
      })
      .join('');
    // gifts between nodes
    const gifts = GIFT_AFTER.map((n, gi) => {
      const a = pts[n - 1];
      const b = pts[n];
      if (!a || !b) return '';
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2 - 26;
      const key = giftKey(w.id, n);
      const got = pr.data.mapGifts.includes(key);
      const ready = !got && (pr.data.campaign[String(levels[n - 1].id)] ?? 0) > 0;
      const name = GIFT_ART[(w.id + gi) % Math.max(1, GIFT_ART.length)] ?? 'wrapped-gift';
      return `<g class="gift ${ready ? 'ready' : ''}" ${ready ? `data-gift="${key}"` : ''} style="cursor:${ready ? 'pointer' : 'default'}" opacity="${got ? 0.3 : ready ? 1 : 0.6}">
        ${art(got ? 'wrapped-gift' : name, x, y, 34)}${ready ? `<text x="${x}" y="${y - 22}" text-anchor="middle" font-size="11" font-weight="800" fill="#ffe58a">OPEN</text>` : ''}</g>`;
    }).join('');
    const ms = STAR_MILESTONES.map(
      (m) => `<span class="tag" style="${stars >= m.stars ? 'color:#7dff6b;border-color:#7dff6b' : ''}">${m.stars}&#9733;: ${esc(m.text)}${stars >= m.stars ? ' &#10003;' : ''}</span>`,
    ).join(' ');
    return `<div class="worldbox ${open ? '' : 'locked'}">
      <div class="row" style="border:none;padding:4px 0"><div class="grow"><b style="font-size:20px;color:${w.path}">World ${w.id + 1}: ${esc(w.name)}</b>
        <div class="sub" style="margin:0">${esc(w.desc)} &middot; Stars ${stars} / 33</div>
        <div class="bar"><div style="width:${(stars / 33) * 100}%"></div></div><div style="margin-top:4px">${ms}</div></div></div>
      <svg class="worldmap" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        <defs><linearGradient id="sky${w.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${w.sky[0]}"/><stop offset="1" stop-color="${w.sky[1]}"/></linearGradient>
        <clipPath id="clip${w.id}"><rect width="${W}" height="${H}" rx="18"/></clipPath></defs>
        <g clip-path="url(#clip${w.id})"><rect width="${W}" height="${H}" fill="url(#sky${w.id})"/>${flash}${hills}${scenery}${weather}</g>
        <path d="${path}" stroke="#000" stroke-opacity=".35" stroke-width="24" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${path}" stroke="#fff" stroke-opacity=".25" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${path}" stroke="${w.path}" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="2 18" class="trail"/>
        ${gifts}${nodes}
      </svg></div>`;
  }).join('');
}

/** Opens a map gift: coins, fusion stones and sometimes an egg or a piece of gear. Better in later worlds. */
export function openMapGift(pr: Progress, key: string): string | null {
  const [w, n] = key.split(':').map(Number);
  if (!WORLDS[w] || !GIFT_AFTER.includes(n) || pr.data.mapGifts.includes(key)) return null;
  const lvl = LEVELS.find((l) => l.id === w * 11 + n);
  if (!lvl || !(pr.data.campaign[String(lvl.id)] ?? 0)) return null;
  const coins = 150 + w * 120 + n * 20;
  const stones = 4 + w + Math.floor(n / 3);
  pr.addCoins(coins);
  pr.data.stones += stones;
  const got = [`${coins} coins`, `${stones} fusion stones`];
  if (n === 9) {
    pr.data.eggs += 1;
    got.push('a summon egg');
  }
  if (n === 6) {
    const id = randomGear((['C', 'B', 'B', 'A', 'A', 'A', 'S', 'S'] as const)[w] ?? 'B', Math.random);
    addGear(pr, id);
    got.push('a gear piece');
  }
  pr.data.mapGifts.push(key);
  pr.commit();
  return got.join(', ');
}
