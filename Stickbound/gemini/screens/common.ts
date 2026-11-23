/** Pieces shared by many screens: the top bar, the logo, menu tiles and a hero standing on a podium. */
import { EL, backArrow, city, coin, elementCoin, embers, flame, gearIcon, glyph, podium, rankBadge, spotlight } from './art';
import { drawHero, stillPose, type Still } from './heroes';
import { nav, type PageName } from './nav';
import { profile, tierOf, xpNeed, type El } from './save';
import { C, H, W, bar, chamfer, cyanButton, hover, neon, pill, region, ring, text, type G } from './ui';

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export function backdrop(g: G, kind: 'city' | 'ruin' | 'dark' = 'city'): void {
  g.drawImage(city(kind), 0, 0);
}

export interface TopOpts {
  back?: PageName | (() => void);
  title?: string;
  /** show the embers currency instead of the streak */
  embers?: boolean;
  rank?: boolean;
  xpBar?: boolean;
}
/** XP ring, XP bar, rank pill, win streak, coins and the settings gear */
export function topBar(g: G, o: TopOpts = {}): void {
  let x = 22;
  if (o.back) {
    const act = typeof o.back === 'function' ? o.back : () => nav.go(o.back as PageName);
    if (o.title === undefined) {
      // square back arrow (champion road style)
      chamfer(g, x, 14, 62, 54, 10);
      g.fillStyle = 'rgba(10,30,60,0.9)';
      g.fill();
      neon(g, C.cyan, 2, 12);
      backArrow(g, x + 31, 44, 28);
      region(x, 14, 62, 54, act);
      x += 84;
    } else {
      cyanButton(g, x, 16, 128, 50, '◀ BACK', { size: 26, act });
      x += 150;
    }
  }
  if (o.xpBar !== false) {
    const frac = profile.xp / xpNeed(profile.level);
    g.save();
    g.beginPath();
    g.arc(x + 30, 41, 27, 0, Math.PI * 2);
    g.fillStyle = '#07163a';
    g.fill();
    g.restore();
    ring(g, x + 30, 41, 26, frac, C.gold, 'rgba(63,214,255,0.4)', 5);
    text(g, 'XP', x + 30, 42, { size: 22, col: '#dff8ff', align: 'center', weight: 800 });
    bar(g, x + 62, 26, 190, 20, frac, ['#1a9fd0', '#3fe6ff'], { skew: 6, edge: '#3fa8ff' });
    text(g, 'XP', x + 74, 36, { size: 15, col: '#ffffff', weight: 800 });
    bar(g, x + 62, 52, 120, 6, 0.6, ['#3fe6ff'], { seg: 3 });
    text(g, `Lv ${profile.level}`, x + 258, 36, { size: 15, col: '#9fdcff' });
    x += 300;
  }
  if (o.title) {
    text(g, o.title, x, 42, { size: 40, col: '#e8f6ff', weight: 800, glow: C.cyan, blur: 8, spacing: 1 });
    x += 0;
  } else if (o.rank !== false) {
    const tr = tierOf(profile.rp);
    pill(g, x, 22, 150, 40, '#c07040', 'rgba(60,30,20,0.85)');
    rankBadge(g, tr.tier, x + 26, 42, 18, true);
    text(g, cap(tr.tier), x + 52, 43, { size: 21, col: '#ffe0c8' });
    region(x, 22, 150, 40, () => nav.go('ranked'));
  }
  // right side
  const cx = W - 340;
  if (o.embers) {
    pill(g, cx - 40, 22, 160, 40, '#3fa8ff');
    flame(g, cx - 10, 40, 13, ['#2a6aff', '#3fc8ff', '#c8f4ff']);
    text(g, fmt(profile.embers), cx + 12, 43, { size: 20 });
  } else {
    flame(g, cx - 4, 38, 15);
    text(g, `Win Streak ${profile.streak}`, cx + 18, 42, { size: 20 });
  }
  pill(g, W - 190, 20, 150, 44, '#b08a20', 'rgba(20,18,10,0.85)');
  coin(g, W - 166, 42, 16);
  text(g, fmt(profile.coins), W - 142, 43, { size: 21 });
  region(W - 190, 20, 150, 44, () => nav.go('shop'));
  gearIcon(g, W - 26, 42, 15, hover(W - 46, 22, 40, 40) ? '#ffffff' : '#9ad8ff');
  region(W - 46, 22, 40, 40, () => {
    nav.back = nav.name;
    nav.go('settings');
  });
}

/** the Elementick wordmark: fire-to-ice letters, a kicking stick figure and element sparks */
export function logo(g: G, x: number, y: number, s: number, t: number, sub = true): void {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  const word = 'ELEMENTICK';
  g.font = `italic 900 120px Bahnschrift, 'Arial Black', sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const w = g.measureText(word).width;
  const gr = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  gr.addColorStop(0, '#ffd23a');
  gr.addColorStop(0.3, '#ff6a2a');
  gr.addColorStop(0.55, '#c86aff');
  gr.addColorStop(0.7, '#3fd6ff');
  gr.addColorStop(1, '#c8f8ff');
  // back slab
  g.save();
  g.transform(1, 0, -0.2, 1, 0, 0);
  g.lineJoin = 'round';
  g.strokeStyle = '#0a0c20';
  g.lineWidth = 26;
  g.strokeText(word, 0, 0);
  const rim = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  rim.addColorStop(0, '#ff7a2a');
  rim.addColorStop(0.5, '#ff4fd8');
  rim.addColorStop(1, '#3fe6ff');
  g.strokeStyle = rim;
  g.lineWidth = 12;
  g.shadowColor = '#ff6a2a';
  g.shadowBlur = 30;
  g.strokeText(word, 0, 0);
  g.shadowBlur = 0;
  g.strokeStyle = '#1a1030';
  g.lineWidth = 5;
  g.strokeText(word, 0, 0);
  const face = g.createLinearGradient(0, -55, 0, 55);
  face.addColorStop(0, '#ffffff');
  face.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillText(word, 0, 0);
  g.fillStyle = face;
  g.globalAlpha = 0.55;
  g.fillText(word, 0, 0);
  g.restore();
  // sparks
  embers(g, t, -w / 2, -110, w * 0.45, 200, '#ffb43a', 18, 4, 4);
  embers(g, t, 0, -110, w * 0.5, 200, '#9ff0ff', 18, 9, 4);
  glyph(g, 'fire', -w * 0.33, -95, 18);
  glyph(g, 'ice', w * 0.15, -100, 16);
  glyph(g, 'water', -w * 0.02, 115, 15);
  if (sub) {
    text(g, 'ELEMENTAL FIGHTING', 0, 100, { size: 38, col: '#ffe9b0', align: 'center', glow: '#ff9a2a', blur: 14, weight: 800, spacing: 2 });
    elementCoin(g, 'fire', -230, 100, 22);
    elementCoin(g, 'lightning', 230, 100, 22);
  }
  g.restore();
}

/** menu tile with a small scene and a label */
export function tile(g: G, x: number, y: number, w: number, h: number, label: string, col: string, art: (g: G) => void, act: () => void, big = false): void {
  const hov = hover(x, y, w, h);
  g.save();
  chamfer(g, x, y, w, h, 12);
  g.fillStyle = '#0a1430';
  g.fill();
  g.save();
  g.clip();
  art(g);
  const fade = g.createLinearGradient(0, y + h * 0.5, 0, y + h);
  fade.addColorStop(0, 'rgba(4,8,24,0)');
  fade.addColorStop(1, 'rgba(4,8,24,0.92)');
  g.fillStyle = fade;
  g.fillRect(x, y, w, h);
  if (hov) {
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fillRect(x, y, w, h);
  }
  g.restore();
  chamfer(g, x, y, w, h, 12);
  neon(g, col, hov ? 3 : 2, hov ? 20 : 12);
  g.restore();
  if (big) text(g, label, x + w / 2, y + h * 0.42, { size: 54, col: '#dff8ff', align: 'center', glow: col, weight: 800 });
  else text(g, label, x + w / 2, y + h - 22, { size: 24, col: '#ffffff', align: 'center', glow: col, blur: 8, weight: 700, stroke: '#061024', sw: 4 });
  region(x, y, w, h, act);
}

/** a hero standing on a podium with a spotlight */
export function heroStand(g: G, el: El, x: number, floor: number, scale: number, kind: Still, t: number, o: { facing?: 1 | -1; podiumW?: number; aura?: number; light?: boolean; col?: string } = {}): void {
  const col = o.col ?? EL[el].line;
  if (o.light !== false) spotlight(g, x, -20, 120, (o.podiumW ?? 180) * 2.2, floor + 20, 'rgb(120,220,255)', 0.28);
  if (o.podiumW !== 0) podium(g, x, floor, o.podiumW ?? 180, col, t);
  const { pose, face } = stillPose(el, kind, t);
  drawHero(g, el, { pose, face, x, feet: floor, scale, facing: o.facing ?? 1, t, aura: o.aura ?? 0.35 });
  embers(g, t, x - 160, floor - 420, 320, 420, col, 20, el.length * 13, 3);
}

/** full-screen dim behind popups */
export function dim(g: G, a = 0.6): void {
  g.fillStyle = `rgba(2,4,14,${a})`;
  g.fillRect(0, 0, W, H);
}
export { EL };
