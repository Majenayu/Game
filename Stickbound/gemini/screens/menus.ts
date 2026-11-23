/**
 * Menu screens part 1: title (logo-wordmark), gallery, lobby, Champion Road map, hero roster and customisation.
 * Matched to the owner's mock-ups in gemini/extra/, drawn in code.
 */
import { EL, check, chest, coin, elementCoin, elementIcon, embers, glyph, itemIcon, lock, nodeToken, podium, swirlIcon, crystalIcon, tornadoIcon, xpStar, comet, flame, spotlight } from './art';
import { backdrop, cap, dim, fmt, heroStand, logo, tile, topBar } from './common';
import { CLASSES, NAMES, drawHero, kitOf, stillPose } from './heroes';
import { nav, pages, type PageName } from './nav';
import { ELS, profile, save, type El } from './save';
import { C, H, W, bar, chamfer, cyanButton, glowDot, goldButton, hover, input, neon, panel, pill, region, rng, text, type G } from './ui';
import { drawZombie } from './zombies';

// ---------------------------------------------------------------- tiny stick figures for tile art
function mini(g: G, x: number, feet: number, h: number, col: string, kind: 'fight' | 'punch' | 'run' | 'stand', face = 1): void {
  const u = h / 10;
  g.save();
  g.translate(x, feet);
  g.scale(face, 1);
  g.strokeStyle = col;
  g.lineWidth = u * 0.9;
  g.lineCap = 'round';
  g.shadowColor = col;
  g.shadowBlur = 8;
  const hip = { x: 0, y: -u * 4.6 };
  const neck = { x: u * 0.4, y: -u * 8 };
  g.beginPath();
  g.moveTo(hip.x, hip.y);
  g.lineTo(neck.x, neck.y);
  if (kind === 'run') {
    g.moveTo(hip.x, hip.y);
    g.lineTo(u * 2, -u * 2.5);
    g.lineTo(u * 1.4, 0);
    g.moveTo(hip.x, hip.y);
    g.lineTo(-u * 1.8, -u * 2);
    g.lineTo(-u * 3, -u * 1.2);
  } else {
    g.moveTo(hip.x, hip.y);
    g.lineTo(u * 1.4, -u * 2.2);
    g.lineTo(u * 1.8, 0);
    g.moveTo(hip.x, hip.y);
    g.lineTo(-u * 1.2, -u * 2.2);
    g.lineTo(-u * 1.8, 0);
  }
  g.moveTo(neck.x, neck.y + u * 0.5);
  if (kind === 'punch') g.lineTo(u * 4, neck.y + u * 0.6);
  else {
    g.lineTo(u * 2, neck.y + u * 1.6);
    g.lineTo(u * 2.6, neck.y + u * 0.2);
  }
  g.moveTo(neck.x, neck.y + u * 0.5);
  g.lineTo(-u * 1.6, neck.y + u * 2);
  g.lineTo(-u * 0.6, neck.y + u * 1);
  g.stroke();
  g.fillStyle = '#060a18';
  g.beginPath();
  g.arc(neck.x + u * 0.3, neck.y - u * 1.1, u * 1.1, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.restore();
}
function tileBg(g: G, x: number, y: number, w: number, h: number, top: string, bottom: string): void {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, top);
  gr.addColorStop(1, bottom);
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);
  const r = rng(Math.round(x + y));
  for (let i = 0; i < 9; i++) {
    const bw = 14 + r() * 26;
    const bh = 30 + r() * h * 0.6;
    g.fillStyle = 'rgba(10,14,40,0.7)';
    g.fillRect(x + r() * w, y + h * 0.75 - bh, bw, bh);
  }
}

// ---------------------------------------------------------------- title
pages.title = {
  title: 'Title',
  heroes: () => ['fire'],
  draw(g, t) {
    g.fillStyle = '#060818';
    g.fillRect(0, 0, W, H);
    glowDot(g, W * 0.38, H * 0.45, 520, 'rgb(90,40,160)', 0.35);
    logo(g, 470, 380, 1.0, t);
    // the kicking figure above the letters
    const { pose } = stillPose('fire', 'kick', t);
    drawHero(g, 'fire', { pose, face: 'attack', x: 470, feet: 330, scale: 0.42, facing: 1, t, aura: 0.3 });
    // app icon
    const ix = 1000;
    const iy = 230;
    g.save();
    g.beginPath();
    g.roundRect(ix, iy, 300, 300, 46);
    const gr = g.createLinearGradient(ix, iy, ix + 300, iy + 300);
    gr.addColorStop(0, '#1a1e3a');
    gr.addColorStop(1, '#0a0c1e');
    g.fillStyle = gr;
    g.fill();
    const rim = g.createLinearGradient(ix, iy, ix + 300, iy + 300);
    rim.addColorStop(0, '#ff7a2a');
    rim.addColorStop(1, '#3fe6ff');
    g.strokeStyle = rim;
    g.lineWidth = 6;
    g.shadowColor = '#3fe6ff';
    g.shadowBlur = 24;
    g.stroke();
    g.clip();
    text(g, 'E', ix + 170, iy + 160, { size: 260, col: 'rgba(63,214,255,0.25)', align: 'center', weight: 900, italic: true });
    g.restore();
    swirlIcon(g, ix + 150, iy + 170, 110, '#ff9a2a', t);
    const k = stillPose('fire', 'kick', t + 20);
    drawHero(g, 'fire', { pose: k.pose, face: 'attack', x: ix + 140, feet: iy + 270, scale: 0.55, facing: 1, t, aura: 0.3 });
    text(g, 'Click anywhere to start', W / 2, 700, { size: 24, col: `rgba(220,240,255,${0.5 + 0.5 * Math.sin(t / 20)})`, align: 'center' });
    region(0, 0, W, H, () => nav.go('lobby'));
  },
};

// ---------------------------------------------------------------- gallery (every page)
const GALLERY: Array<[PageName, string, string]> = [
  ['title', 'Logo and title', 'logo-wordmark.png'],
  ['lobby', 'Lobby', 'lobby.png'],
  ['road', 'Champion Road map', 'champion-road-map.png'],
  ['roster', 'Hero roster', 'hero-roster.png'],
  ['customise', 'Customise hero', 'customise-screen.png'],
  ['shop', 'Cosmetic shop', 'shop-screen.png'],
  ['ranked', 'Rank ladder', 'rank-ladder.png'],
  ['versus', 'Versus intro', 'versus-screen.png'],
  ['fight', 'Fight (playable, HUD)', 'fight-hud.png'],
  ['pause', 'Pause menu', 'pause-menu.png'],
  ['victory', 'Victory', 'victory-screen.png'],
  ['levelup', 'Level up', 'level-up-popup.png'],
  ['zombie', 'Zombie Survival (playable)', 'zombie-survival-hud.png'],
  ['bestiary', 'Zombies and bosses', 'zombie-enemies-sheet.png'],
  ['icons', 'Icons sheet', 'element-icons.png'],
  ['keyart', 'Key art (landscape)', 'key-art-landscape.png'],
  ['poster', 'Key art (portrait)', 'key-art-portrait.png'],
];
pages.gallery = {
  title: 'All screens',
  draw(g, t) {
    backdrop(g, 'dark');
    dim(g, 0.55);
    text(g, 'ELEMENTICK · SCREENS', 60, 60, { size: 44, col: '#e8f6ff', weight: 800, glow: C.cyan });
    text(g, 'Every mock-up in gemini/extra as a working screen. Click one. Esc goes back here from most screens.', 60, 104, { size: 20, col: '#9fc8ff', weight: 500 });
    GALLERY.forEach(([name, label, src], i) => {
      const cx = 60 + (i % 4) * 318;
      const cy = 140 + Math.floor(i / 4) * 112;
      cyanButton(g, cx, cy, 296, 92, '', { act: () => nav.go(name) });
      text(g, label, cx + 18, cy + 34, { size: 24, col: '#ffffff' });
      text(g, src, cx + 18, cy + 66, { size: 15, col: '#7fb0d8', weight: 500 });
    });
    const lx = 60 + (GALLERY.length % 4) * 318;
    const ly = 140 + Math.floor(GALLERY.length / 4) * 112;
    goldButton(g, lx, ly, 296, 92, 'TRIAL ROOM', { size: 34, t, act: () => (location.href = '../trial/') });
  },
};

// ---------------------------------------------------------------- lobby
pages.lobby = {
  title: 'Lobby',
  heroes: () => [profile.hero, profile.squad[1] ?? 'lightning'],
  draw(g, t) {
    backdrop(g);
    spotlight(g, 330, -40, 160, 520, 600, 'rgb(120,220,255)', 0.3);
    const mate = profile.squad.find((e) => e !== profile.hero) ?? 'lightning';
    podium(g, 340, 585, 250, EL[profile.hero].line, t);
    const a = stillPose(profile.hero, 'fight', t);
    const b = stillPose(mate, 'fight', t + 30);
    drawHero(g, mate, { pose: b.pose, face: 'normal', x: 470, feet: 565, scale: 0.98, facing: -1, t, aura: 0.3 });
    drawHero(g, profile.hero, { pose: a.pose, face: 'normal', x: 225, feet: 575, scale: 1.02, facing: 1, t, aura: 0.4 });
    embers(g, t, 120, 160, 260, 420, EL[profile.hero].line, 22, 3, 3);
    embers(g, t, 340, 160, 240, 420, EL[mate].line, 16, 8, 3);
    // name plates
    const plate = (x: number, el: El, name: string, lv: number) => {
      pill(g, x, 610, 210, 44, EL[el].line, 'rgba(30,14,8,0.85)');
      elementCoin(g, el, x + 26, 632, 18);
      text(g, `${name} - Lv ${lv}`, x + 52, 633, { size: 22 });
      region(x, 610, 210, 44, () => nav.go('roster'));
    };
    plate(95, profile.hero, profile.name, profile.heroLv[profile.hero]);
    plate(370, mate, NAMES[mate], profile.heroLv[mate]);
    region(150, 180, 380, 400, () => nav.go('roster'));
    topBar(g);
    // PLAY
    goldButton(g, 715, 275, 330, 125, 'PLAY', { sub: 'Champion Road', size: 74, t, act: () => nav.go('road') });
    // tiles
    tile(g, 662, 448, 186, 110, 'Champion Road', '#ff9a3a', (gg) => {
      tileBg(gg, 662, 448, 186, 110, '#3a1a2a', '#140a14');
      glowDot(gg, 755, 495, 60, 'rgb(255,140,40)', 0.6);
      mini(gg, 755, 540, 70, '#ffb04a', 'fight');
      mini(gg, 690, 545, 40, '#7a5aaa', 'stand');
      mini(gg, 815, 545, 40, '#7a5aaa', 'stand', -1);
    }, () => nav.go('road'));
    tile(g, 866, 448, 246, 110, 'Ranked Ladder', C.cyan, (gg) => {
      tileBg(gg, 866, 448, 246, 110, '#14304a', '#0a1426');
      drawZombie(gg, { type: 'walker', x: 940, feet: 560, facing: 1, phase: t / 20, state: 'walk', k: 0, t, flash: 0, seed: 3 } as never);
      gg.save();
      gg.translate(1050, 560);
      gg.scale(0.45, 0.45);
      gg.translate(-1050, -560);
      drawZombie(gg, { type: 'spitter', x: 1050, feet: 560, facing: -1, phase: t / 20, state: 'walk', k: 0, t, flash: 0, seed: 5 } as never);
      gg.restore();
    }, () => nav.go('ranked'));
    tile(g, 662, 582, 186, 110, 'Training', C.pink, (gg) => {
      tileBg(gg, 662, 582, 186, 110, '#2a1440', '#100a20');
      mini(gg, 720, 670, 62, '#ffffff', 'punch');
      mini(gg, 800, 670, 62, '#8aa0c8', 'fight', -1);
    }, () => (location.href = '../trial/'));
    tile(g, 866, 582, 246, 110, 'Local 2P', C.cyan, (gg) => {
      tileBg(gg, 866, 582, 246, 110, '#1a3a5a', '#0a1426');
      mini(gg, 950, 672, 66, '#ffb04a', 'fight');
      mini(gg, 1030, 672, 66, '#9ff0ff', 'fight', -1);
    }, () => {
      nav.match = { p1: profile.hero, p2: mate, p2Name: NAMES[mate], p2Lv: profile.heroLv[mate], mode: 'local' };
      nav.go('versus');
    });
    // right column
    panel(g, 1135, 115, 206, 145, { col: C.cyan, cut: 10 });
    text(g, 'Daily Streak', 1238, 140, { size: 24, align: 'center' });
    text(g, '7 day reward', 1238, 166, { size: 16, col: '#ffe08a', align: 'center' });
    for (let i = 0; i < 4; i++) {
      const cx = 1160 + i * 52 + (i >= 2 ? 52 : 0);
      if (i < 4 && !(i === 2 && false)) {
        g.save();
        g.globalAlpha = 0.6;
        chest(g, i < 2 ? 1158 + i * 30 : 1290 + (i - 2) * 30, 222, 11);
        g.restore();
      }
      void cx;
    }
    chest(g, 1238, 222, 26, 0.5 + 0.3 * Math.sin(t / 20));
    panel(g, 1135, 278, 206, 150, { col: C.cyan, cut: 10 });
    text(g, 'Daily Quests', 1238, 302, { size: 24, align: 'center' });
    const qcols = [['#2a9fd0', '#3fe6ff'], ['#a03ad0', '#ff4fd8'], ['#a03ad0', '#ff4fd8']];
    profile.quests.forEach((q, i) => {
      const yy = 332 + i * 32;
      g.save();
      g.beginPath();
      g.arc(1160, yy + 6, 11, 0, Math.PI * 2);
      neon(g, C.cyan, 1.5, 6);
      g.restore();
      glyph(g, (['wind', 'fire', 'time'] as El[])[i], 1160, yy + 6, 6);
      bar(g, 1180, yy, 145, 12, q, qcols[i], {});
    });
    tile(g, 1135, 448, 206, 110, 'Zombie Survival', C.cyan, (gg) => {
      tileBg(gg, 1135, 448, 206, 110, '#0e2a3a', '#06121e');
      text(gg, 'NEWS', 1238, 492, { size: 52, col: '#dff8ff', align: 'center', weight: 800, glow: C.cyan });
    }, () => nav.go('bestiary'));
    tile(g, 1135, 582, 206, 110, 'Avatars', C.cyan, (gg) => {
      tileBg(gg, 1135, 582, 206, 110, '#14284a', '#0a1426');
      const heads: Array<[number, string]> = [[1185, '#ff5a4a'], [1238, '#3fe6ff'], [1290, '#4affc8']];
      for (const [hx, col] of heads) {
        gg.save();
        gg.strokeStyle = col;
        gg.lineWidth = 4;
        gg.shadowColor = col;
        gg.shadowBlur = 10;
        gg.beginPath();
        gg.arc(hx, hx === 1238 ? 610 : 618, hx === 1238 ? 20 : 16, 0, Math.PI * 2);
        gg.moveTo(hx - 26, 660);
        gg.quadraticCurveTo(hx, 625, hx + 26, 660);
        gg.stroke();
        gg.restore();
      }
    }, () => nav.go('roster'));
    // small links
    text(g, 'All screens', 30, 748, { size: 15, col: '#7fb0d8', weight: 500 });
    region(20, 735, 100, 26, () => nav.go('gallery'));
    text(g, 'Shop', 140, 748, { size: 15, col: '#7fb0d8', weight: 500 });
    region(130, 735, 60, 26, () => nav.go('shop'));
    text(g, 'Customise', 210, 748, { size: 15, col: '#7fb0d8', weight: 500 });
    region(200, 735, 90, 26, () => nav.go('customise'));
  },
};

// ---------------------------------------------------------------- Champion Road
interface District {
  name: string;
  el: El;
  x: number;
  y: number;
  size: number;
}
export const DISTRICTS: District[] = [
  { name: 'Molten Foundry', el: 'fire', x: 230, y: 380, size: 150 },
  { name: 'Hydro Dock', el: 'water', x: 470, y: 305, size: 115 },
  { name: 'Cryo Lab', el: 'ice', x: 500, y: 590, size: 140 },
  { name: 'Neon Grid', el: 'lightning', x: 712, y: 610, size: 40 },
  { name: 'Verdant Grid', el: 'leaf', x: 900, y: 600, size: 150 },
  { name: 'Lightning Spire', el: 'lightning', x: 960, y: 330, size: 125 },
  { name: 'Gale Heights', el: 'wind', x: 1180, y: 210, size: 0 },
  { name: 'The Summit', el: 'gravity', x: 680, y: 250, size: 120 },
];
const CHAMPS = ['Blaze', 'Cinder', 'Ash', 'Pyra', 'Kiln', 'Tide', 'Ripple', 'Brook', 'Surge', 'Marin', 'Frost', 'Hail', 'Glint', 'Shard', 'Sleet', 'Volt', 'Spark', 'Arc', 'Jolt', 'Ohm', 'Moss', 'Fern', 'Thorn', 'Briar', 'Bloom', 'Static', 'Flash', 'Ion', 'Pulse', 'Zap', 'Gust', 'Squall', 'Breeze', 'Cyclone', 'Draft', 'Nova', 'Umbra', 'Vortex', 'Rift', 'Eclipse', 'Apex'];
const DIST_EL: El[] = ['fire', 'water', 'ice', 'lightning', 'leaf', 'light', 'wind', 'gravity'];
export function nextChampion(): { name: string; el: El; lv: number; district: number } {
  const i = Math.min(40, profile.road);
  const d = Math.min(7, Math.floor(i / 5));
  return { name: CHAMPS[i], el: DIST_EL[d], lv: 12 + i, district: d };
}
function island(g: G, x: number, y: number, s: number, el: El, t: number, kind: string): void {
  const col = EL[el].line;
  g.save();
  // underside rock
  g.beginPath();
  g.moveTo(x - s, y);
  g.lineTo(x, y + s * 0.5);
  g.lineTo(x + s, y);
  g.lineTo(x + s * 0.5, y + s * 0.9);
  g.lineTo(x, y + s * 1.3);
  g.lineTo(x - s * 0.55, y + s * 0.85);
  g.closePath();
  const rk = g.createLinearGradient(0, y, 0, y + s * 1.3);
  rk.addColorStop(0, '#1c2448');
  rk.addColorStop(1, '#070a1c');
  g.fillStyle = rk;
  g.fill();
  // waterfalls / glow drips
  g.fillStyle = col + '66';
  g.fillRect(x - s * 0.3, y + s * 0.35, 4, s * 0.6);
  g.fillRect(x + s * 0.4, y + s * 0.2, 3, s * 0.5);
  // top diamond
  g.beginPath();
  g.moveTo(x - s, y);
  g.lineTo(x, y - s * 0.5);
  g.lineTo(x + s, y);
  g.lineTo(x, y + s * 0.5);
  g.closePath();
  const tp = g.createLinearGradient(x - s, y, x + s, y);
  tp.addColorStop(0, '#242c58');
  tp.addColorStop(1, '#141a3a');
  g.fillStyle = tp;
  g.fill();
  neon(g, col, 2, 16);
  g.restore();
  // buildings (iso boxes)
  const r = rng(Math.round(x * 3 + y));
  const box = (bx: number, by: number, bw: number, bh: number) => {
    g.save();
    g.fillStyle = '#1a2250';
    g.beginPath();
    g.moveTo(bx - bw, by);
    g.lineTo(bx, by + bw * 0.5);
    g.lineTo(bx, by + bw * 0.5 - bh);
    g.lineTo(bx - bw, by - bh);
    g.closePath();
    g.fill();
    g.fillStyle = '#10163a';
    g.beginPath();
    g.moveTo(bx + bw, by);
    g.lineTo(bx, by + bw * 0.5);
    g.lineTo(bx, by + bw * 0.5 - bh);
    g.lineTo(bx + bw, by - bh);
    g.closePath();
    g.fill();
    g.fillStyle = '#2a3470';
    g.beginPath();
    g.moveTo(bx - bw, by - bh);
    g.lineTo(bx, by - bh - bw * 0.5);
    g.lineTo(bx + bw, by - bh);
    g.lineTo(bx, by - bh + bw * 0.5);
    g.closePath();
    g.fill();
    // windows
    g.fillStyle = col;
    g.shadowColor = col;
    g.shadowBlur = 6;
    for (let wy = by - bh + 8; wy < by - 6; wy += 9) {
      if (r() < 0.6) g.fillRect(bx - bw * 0.7, wy + bw * 0.2, 4, 3);
      if (r() < 0.6) g.fillRect(bx + bw * 0.4, wy + bw * 0.2, 4, 3);
    }
    g.restore();
  };
  if (s >= 100) {
    for (let i = 0; i < 7; i++) {
      const bx = x + (r() - 0.5) * s * 1.1;
      const by = y + (r() - 0.5) * s * 0.4;
      box(bx, by, 10 + r() * 14, 20 + r() * s * 0.5);
    }
  }
  // signature piece
  if (kind === 'fire') {
    box(x - 10, y - 10, 30, 80);
    flame(g, x - 10, y - 125, 28);
    flame(g, x + 50, y - 50, 14);
  } else if (kind === 'water') {
    g.save();
    g.fillStyle = '#9ff0ff';
    g.shadowColor = '#3fb8ff';
    g.shadowBlur = 14;
    g.beginPath();
    g.moveTo(x - 6, y - 10);
    g.lineTo(x - 12, y - 90);
    g.lineTo(x, y - 110);
    g.lineTo(x + 12, y - 90);
    g.lineTo(x + 6, y - 10);
    g.fill();
    g.restore();
  } else if (kind === 'ice') {
    box(x - 20, y - 10, 26, 110);
    box(x + 30, y, 18, 70);
  } else if (kind === 'leaf') {
    crystalIcon(g, x, y - 70, 70, '#7dff4a');
  } else if (kind === 'spire') {
    g.save();
    g.strokeStyle = '#ff4fd8';
    g.shadowColor = '#ff4fd8';
    g.shadowBlur = 16;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(x, y - 10);
    g.lineTo(x, y - 160);
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(x, y - 120, 30, 10, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  } else if (kind === 'summit') {
    // purple smoke and the tower
    const sr = rng(5);
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const a = sr() * Math.PI * 2;
      const rr = 40 + sr() * 120;
      const px = x + Math.cos(a + t / 200) * rr;
      const py = y - 160 + Math.sin(a + t / 200) * rr * 0.7;
      const gr = g.createRadialGradient(px, py, 0, px, py, 50);
      gr.addColorStop(0, 'rgba(160,60,255,0.25)');
      gr.addColorStop(1, 'rgba(160,60,255,0)');
      g.fillStyle = gr;
      g.fillRect(px - 50, py - 50, 100, 100);
    }
    g.restore();
    g.fillStyle = '#1a1440';
    g.fillRect(x - 26, y - 230, 52, 220);
    g.save();
    g.fillStyle = '#ffd24a';
    g.shadowColor = '#ffb43a';
    g.shadowBlur = 20;
    g.fillRect(x - 3, y - 230, 6, 220);
    g.restore();
    neon(g, '#b45cff', 2, 10);
  }
}
function path(g: G, pts: Array<[number, number]>, col: string, t: number, lit: boolean): void {
  g.save();
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [qx, qy] = pts[i];
    g.quadraticCurveTo((px + qx) / 2, Math.min(py, qy) - 30, qx, qy);
  }
  g.strokeStyle = lit ? col : 'rgba(150,170,220,0.35)';
  g.shadowColor = col;
  g.shadowBlur = lit ? 18 : 0;
  g.lineWidth = lit ? 6 : 3;
  g.stroke();
  if (lit) {
    g.setLineDash([10, 22]);
    g.lineDashOffset = -t;
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    g.stroke();
  }
  g.restore();
}
pages.road = {
  title: 'Champion Road',
  heroes: () => [profile.hero],
  draw(g, t) {
    backdrop(g);
    dim(g, 0.25);
    const done = profile.road;
    const nc = nextChampion();
    // paths
    path(g, [[260, 380], [470, 305]], '#ffb43a', t, done >= 5);
    path(g, [[470, 305], [580, 270], [680, 300]], '#ffb43a', t, done >= 10);
    path(g, [[680, 300], [820, 330], [960, 330]], '#b45cff', t, done >= 30);
    path(g, [[260, 400], [500, 470], [500, 590]], '#ffb43a', t, done >= 10);
    path(g, [[500, 590], [610, 520], [712, 600]], '#ffb43a', t, true);
    path(g, [[712, 600], [810, 600], [900, 600]], '#ffb43a', t, done >= 20);
    // islands
    island(g, 680, 330, 120, 'gravity', t, 'summit');
    island(g, 470, 310, 110, 'water', t, 'water');
    island(g, 960, 340, 120, 'lightning', t, 'spire');
    island(g, 230, 390, 150, 'fire', t, 'fire');
    island(g, 500, 600, 140, 'ice', t, 'ice');
    island(g, 905, 610, 150, 'leaf', t, 'leaf');
    // labels
    const label = (s: string, x: number, y: number, col: string) => {
      const w = s.length * 12 + 40;
      chamfer(g, x - w / 2, y - 17, w, 34, 8);
      g.fillStyle = 'rgba(8,16,36,0.9)';
      g.fill();
      neon(g, col, 1.5, 8);
      text(g, s, x, y + 1, { size: 20, align: 'center' });
    };
    label('Molten Foundry', 225, 505, '#ffb43a');
    label('Hydro Dock', 470, 385, C.cyan);
    label('THE SUMMIT', 690, 320, '#b45cff');
    label('Lightning Spire', 960, 425, '#ff4fd8');
    label('Cryo Lab', 500, 665, C.cyan);
    label('Verdant Grid', 905, 680, '#7dff4a');
    // nodes
    const nodes: Array<[number, number, number]> = [[330, 440, 3], [370, 345, 6], [520, 330, 8], [640, 292, 12], [760, 310, 26], [820, 330, 28], [880, 340, 29], [510, 540, 9], [620, 470, 13], [620, 545, 14], [790, 600, 21]];
    for (const [nx, ny, idx] of nodes) nodeToken(g, nx, ny, 17, idx < done ? '#5dff7a' : '#8aa0d8', idx < done ? 'done' : 'locked');
    // the next fight pad
    const px = 712;
    const py = 612;
    podium(g, px, py, 40, '#ffb43a', t);
    const sp = stillPose(profile.hero, 'fight', t);
    drawHero(g, profile.hero, { pose: sp.pose, face: 'normal', x: px, feet: py, scale: 0.22, t });
    label('NEXT', px, py - 105, '#ffb43a');
    text(g, EL[nc.el].name, px, py + 40, { size: 18, align: 'center' });
    region(px - 50, py - 110, 100, 160, () => startRoad());
    // header
    topBar(g, { back: 'lobby', xpBar: false, rank: true });
    chamfer(g, 104, 12, 330, 60, 12);
    const hg = g.createLinearGradient(0, 12, 0, 72);
    hg.addColorStop(0, '#ffd56a');
    hg.addColorStop(1, '#c87a12');
    g.fillStyle = hg;
    g.fill();
    neon(g, '#ffe08a', 2, 14);
    text(g, 'CHAMPION ROAD', 269, 44, { size: 38, col: '#5a2a00', align: 'center', weight: 800, stroke: '#ffe9b0', sw: 2 });
    panel(g, 24, 92, 410, 66, { col: C.cyan, cut: 10 });
    xpStar(g, 58, 125, 22);
    text(g, `${done} / 41 CHAMPIONS`, 250, 108, { size: 20, align: 'center' });
    bar(g, 92, 126, 320, 16, done / 41, ['#c87a12', '#ffd24a'], { seg: 10, skew: 6 });
    // districts panel
    panel(g, 18, 562, 300, 190, { col: C.cyan, cut: 10 });
    text(g, 'DISTRICTS', 36, 588, { size: 22 });
    const dDone = Math.floor(done / 5);
    text(g, `${dDone}/8 Complete`, 300, 588, { size: 18, align: 'right', col: '#cfe4ff' });
    DIST_EL.forEach((el, i) => {
      const bx = 34 + (i % 4) * 68;
      const by = 608 + Math.floor(i / 4) * 68;
      chamfer(g, bx, by, 60, 58, 6);
      const gr = g.createLinearGradient(0, by, 0, by + 58);
      gr.addColorStop(0, EL[el].deep);
      gr.addColorStop(1, '#0a0e20');
      g.fillStyle = gr;
      g.fill();
      neon(g, i === dDone ? '#ffb43a' : '#3a6aa0', 1.5, 6);
      glyph(g, el, bx + 30, by + 29, 14);
      if (i < dDone) check(g, bx + 30, by + 30, 16);
      if (i > dDone) lock(g, bx + 46, by + 44, 9);
    });
    // district card
    panel(g, 1115, 470, 236, 150, { col: C.cyan, cut: 10 });
    text(g, `DISTRICT ${nc.district + 1} - ${DISTRICTS.find((d) => d.el === nc.el)?.name.toUpperCase() ?? 'NEON GRID'}`, 1233, 494, { size: 17, align: 'center', max: 220 });
    text(g, `Next: ${nc.name} - Lv ${nc.lv}`, 1233, 520, { size: 17, col: '#ffd24a', align: 'center' });
    text(g, 'Reward:', 1233, 544, { size: 15, align: 'center', col: '#cfe4ff' });
    for (let i = 0; i < 3; i++) {
      const bx = 1135 + i * 68;
      chamfer(g, bx, 556, 58, 54, 6);
      g.fillStyle = 'rgba(10,30,60,0.9)';
      g.fill();
      neon(g, '#3a8ad0', 1.5, 6);
    }
    chest(g, 1164, 586, 16);
    text(g, 'XP', 1232, 580, { size: 26, align: 'center', weight: 800 });
    text(g, '+250', 1232, 600, { size: 13, align: 'center' });
    coin(g, 1300, 578, 13);
    text(g, '+150', 1300, 600, { size: 13, align: 'center' });
    goldButton(g, 1112, 650, 244, 92, 'BATTLE', { size: 54, t, act: () => startRoad() });
  },
};
function startRoad(): void {
  const nc = nextChampion();
  nav.match = { p1: profile.hero, p2: nc.el, p2Name: nc.name, p2Lv: nc.lv, mode: 'road' };
  nav.go('versus');
}

// ---------------------------------------------------------------- roster
let rosterPick: El = profile.hero;
let rosterClass = 0;
export function stats(el: El): number[] {
  const r = rng(el.length * 31 + el.charCodeAt(0));
  return [0, 1, 2, 3, 4, 5].map(() => Math.round(60 + r() * 35));
}
const STAT_NAMES = ['VITALITY', 'MIGHT', 'SPIRIT', 'GUARD', 'RESOLVE', 'SPEED'];
const STAT_COLS = ['#ff5a6a', '#ff9a3a', '#3fb8ff', '#b45cff', '#5dff7a', '#3fe6ff'];
pages.roster = {
  title: 'Avatar Roster',
  heroes: () => ELS,
  enter() {
    rosterPick = profile.hero;
  },
  draw(g, t) {
    backdrop(g, 'dark');
    dim(g, 0.35);
    topBar(g, { back: 'lobby', title: 'AVATAR ROSTER', xpBar: false });
    // cards
    ELS.forEach((el, i) => {
      const cx = 50 + (i % 4) * 133;
      const cy = 100 + Math.floor(i / 4) * 190;
      const sel = el === rosterPick;
      const col = EL[el].line;
      chamfer(g, cx, cy, 122, 172, 10);
      const gr = g.createLinearGradient(0, cy, 0, cy + 172);
      gr.addColorStop(0, EL[el].deep);
      gr.addColorStop(1, '#070a18');
      g.fillStyle = gr;
      g.fill();
      neon(g, sel ? '#ffd24a' : col, sel ? 3.5 : 2, sel ? 22 : 10);
      g.save();
      chamfer(g, cx, cy, 122, 172, 10);
      g.clip();
      const sp = stillPose(el, 'fight', t + i * 13);
      drawHero(g, el, { pose: sp.pose, face: 'normal', x: cx + 64, feet: cy + 260, scale: 0.62, t });
      g.restore();
      glyph(g, el, cx + 20, cy + 22, 11);
      text(g, `Lv ${profile.heroLv[el]}`, cx + 112, cy + 152, { size: 22, align: 'right', stroke: '#000', sw: 4 });
      region(cx, cy, 122, 172, () => (rosterPick = el));
    });
    // centre hero
    heroStand(g, rosterPick, 735, 585, 0.95, 'fight', t, { podiumW: 160, aura: 0.45 });
    const k = kitOf(rosterPick);
    k.powers.forEach((p, i) => {
      const px = 635 + i * 100;
      g.save();
      g.beginPath();
      g.arc(px, 640, 30, 0, Math.PI * 2);
      g.fillStyle = EL[rosterPick].deep;
      g.fill();
      neon(g, EL[rosterPick].line, 2, 12);
      g.restore();
      if (i === 0) comet(g, px, 640, 18, [EL[rosterPick].line, EL[rosterPick].light, '#ffffff']);
      else glyph(g, rosterPick, px, 640, 16);
      text(g, p.name, px, 685, { size: 14, align: 'center', max: 96 });
    });
    goldButton(g, 640, 705, 190, 56, 'SELECT', { size: 32, t, act: () => {
      profile.hero = rosterPick;
      if (!profile.squad.includes(rosterPick)) profile.squad[0] = rosterPick;
      save();
      nav.go('lobby');
    } });
    // stats panel
    panel(g, 990, 100, 360, 345, { col: C.cyan, cut: 12 });
    text(g, NAMES[rosterPick].toUpperCase(), 1012, 132, { size: 40, weight: 800 });
    text(g, `CLASS: ${CLASSES[rosterPick].toUpperCase()}`, 1012, 166, { size: 18, col: '#ffb43a' });
    ['Vanguard', 'Striker', 'Warden'].forEach((c, i) => {
      cyanButton(g, 1012 + i * 108, 182, 100, 32, c, { size: 17, on: (CLASSES[rosterPick] === c && rosterClass === 0) || rosterClass === i + 1, col: i === 0 ? '#ffb43a' : C.cyan, act: () => (rosterClass = i + 1) });
    });
    const st = stats(rosterPick);
    st.forEach((v, i) => {
      const yy = 236 + i * 34;
      g.save();
      g.fillStyle = STAT_COLS[i];
      g.shadowColor = STAT_COLS[i];
      g.shadowBlur = 8;
      g.beginPath();
      g.arc(1022, yy + 6, 8, 0, Math.PI * 2);
      g.fill();
      g.restore();
      text(g, STAT_NAMES[i], 1040, yy, { size: 17 });
      bar(g, 1040, yy + 12, 240, 9, v / 100, ['#c87a12', '#ffb43a'], {});
      text(g, String(v), 1320, yy + 6, { size: 22, align: 'right' });
    });
    // squad
    panel(g, 990, 460, 360, 150, { col: C.cyan, cut: 10 });
    text(g, 'SQUAD', 1008, 480, { size: 20 });
    profile.squad.slice(0, 2).forEach((el, i) => {
      const bx = 1008 + i * 116;
      chamfer(g, bx, 494, 104, 90, 8);
      g.fillStyle = EL[el].deep;
      g.fill();
      neon(g, EL[el].line, 2, 10);
      g.save();
      chamfer(g, bx, 494, 104, 90, 8);
      g.clip();
      const sp = stillPose(el, 'fight', t);
      drawHero(g, el, { pose: sp.pose, face: 'normal', x: bx + 52, feet: 640, scale: 0.4, t });
      g.restore();
      text(g, i === 0 ? `Lv ${profile.heroLv[el]}` : NAMES[el], bx + 98, 572, { size: 16, align: 'right', stroke: '#000', sw: 3 });
      text(g, i === 0 ? 'LEADER' : 'MEMBER', bx + 52, 597, { size: 13, align: 'center', col: '#ffb43a' });
    });
    chamfer(g, 1240, 494, 96, 90, 8);
    g.fillStyle = 'rgba(30,40,70,0.6)';
    g.fill();
    neon(g, '#5a6a90', 1.5, 4);
    text(g, 'ADD', 1288, 540, { size: 22, align: 'center', col: '#9aa8c8' });
    region(1240, 494, 96, 90, () => {
      if (!profile.squad.includes(rosterPick)) {
        profile.squad[1] = rosterPick;
        save();
      }
    });
    text(g, 'ADD puts the picked hero in your squad', 1170, 628, { size: 14, align: 'center', col: '#7fb0d8', weight: 500 });
  },
};

// ---------------------------------------------------------------- customise
const HEAD_ITEMS = ['helmet', 'halo', 'band', 'goggles', 'headband', 'bandana', 'bandana', 'scarf', 'pads', 'helmet', 'scarf', 'pads'];
const HEAD_COLS = ['#ff4fd8', '#ffe27a', C.cyan, C.cyan, '#ffb43a', '#ff7a2a', '#b45cff', '#ff4a3a', '#ffb43a', C.cyan, C.cyan, '#c8d0e0'];
const AURAS: Array<[string, (g: G, x: number, y: number, t: number) => void]> = [
  ['fire', (g, x, y) => flame(g, x, y, 30)],
  ['lightning', (g, x, y) => glyph(g, 'lightning', x, y, 28)],
  ['water', (g, x, y, t) => swirlIcon(g, x, y, 32, '#3fb8ff', t)],
  ['tide', (g, x, y, t) => swirlIcon(g, x, y, 28, '#9ff0ff', -t)],
  ['ice', (g, x, y) => crystalIcon(g, x, y, 30, '#7ad8ff')],
  ['frost', (g, x, y) => crystalIcon(g, x, y, 30, '#5affd8')],
  ['amethyst', (g, x, y) => crystalIcon(g, x, y, 30, '#d07aff')],
  ['gale', (g, x, y) => tornadoIcon(g, x, y, 30, '#9ff0ff')],
  ['storm', (g, x, y) => tornadoIcon(g, x, y, 30, '#c8d8f0')],
];
const PALETTE: Array<[string, string]> = [['Fiery Red', '#ff3b2a'], ['Electric Blue', '#2a7aff'], ['Toxic', '#5dff3a'], ['Spectrum', '#ff4fd8'], ['Radiant Gold', '#ffd24a'], ['Shadow Violet', '#a64dff'], ['Neon', '#8a7aff'], ['Mint', '#5dffa0'], ['Coral', '#ff7a6a'], ['Silver', '#d8e0ea']];
let cTab = 0;
let cRight = 0;
let cName = '';
pages.customise = {
  title: 'Character Customization',
  heroes: () => ELS,
  enter() {
    cName = profile.name;
  },
  key(e) {
    if (e.key === 'Backspace') cName = cName.slice(0, -1);
    else if (e.key.length === 1 && cName.length < 12 && /[\w \-]/.test(e.key)) cName += e.key;
  },
  draw(g, t) {
    backdrop(g);
    topBar(g, { back: 'lobby', title: '', embers: true, rank: false });
    // title banner
    chamfer(g, 470, 0, 436, 62, [0, 0, 20, 20]);
    g.fillStyle = 'rgba(8,20,44,0.9)';
    g.fill();
    neon(g, C.cyan, 2, 12);
    text(g, 'CHARACTER CUSTOMIZATION', 688, 34, { size: 30, align: 'center', weight: 800 });
    // left panel
    panel(g, 34, 108, 390, 625, { col: C.cyan, cut: 12 });
    const tabs: Array<[string, string]> = [['HEAD', 'fireHair'], ['FACE', 'smile'], ['BODY', 'body'], ['CAPE', 'cape']];
    tabs.forEach(([name, ic], i) => {
      const bx = 52 + i * 92;
      text(g, name, bx + 40, 140, { size: 24, align: 'center', col: cTab === i ? '#ffd24a' : '#dff8ff' });
      chamfer(g, bx + 4, 160, 72, 52, 6);
      g.fillStyle = cTab === i ? 'rgba(120,80,10,0.5)' : 'rgba(10,30,60,0.8)';
      g.fill();
      neon(g, cTab === i ? '#ffd24a' : C.cyan, 1.5, 8);
      if (ic === 'cape') itemIcon(g, 'scarf', bx + 40, 186, 18, C.cyan);
      else itemIcon(g, ic, bx + 40, 186, 18, '#ffffff');
      region(bx, 125, 84, 90, () => (cTab = i));
    });
    const slot = ['head', 'face', 'body', 'cape'][cTab];
    for (let i = 0; i < 12; i++) {
      const bx = 60 + (i % 3) * 116;
      const by = 232 + Math.floor(i / 3) * 122;
      const id = `${slot}:${i}`;
      const sel = profile.equipped[slot] === id || (!profile.equipped[slot] && i === 4);
      const locked = i % 4 === 2 || i >= 9;
      chamfer(g, bx, by, 100, 104, 8);
      g.fillStyle = 'rgba(10,26,54,0.9)';
      g.fill();
      neon(g, sel ? '#ffd24a' : i % 3 === 0 ? C.pink : C.cyan, sel ? 3 : 1.5, sel ? 18 : 8);
      const kind = cTab === 1 ? 'smile' : cTab === 2 ? 'body' : cTab === 3 ? 'scarf' : HEAD_ITEMS[i];
      itemIcon(g, kind, bx + 50, by + 52, 34, HEAD_COLS[i]);
      if (locked) lock(g, bx + 84, by + 88, 9);
      if (i === 2 || i === 7 || i === 9) {
        g.save();
        g.beginPath();
        g.arc(bx + 88, by + 10, 15, 0, Math.PI * 2);
        g.fillStyle = '#d8202a';
        g.fill();
        g.restore();
        text(g, 'NEW', bx + 88, by + 11, { size: 11, align: 'center', weight: 800 });
      }
      region(bx, by, 100, 104, () => {
        if (locked) return;
        profile.equipped[slot] = id;
        save();
      });
    }
    // centre
    const auraCol = profile.equipped.color ?? EL[profile.hero].line;
    heroStand(g, profile.hero, 688, 560, 1.0, 'fight', t, { podiumW: 170, aura: 0.5, col: auraCol });
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = auraCol;
    g.lineWidth = 5;
    g.shadowColor = auraCol;
    g.shadowBlur = 20;
    g.globalAlpha = 0.7;
    g.beginPath();
    g.ellipse(688, 360, 180, 70, -0.25, t / 30, t / 30 + Math.PI * 1.3);
    g.stroke();
    g.restore();
    ELS.forEach((el, i) => {
      const bx = 498 + i * 39;
      chamfer(g, bx, 610, 34, 34, 5);
      g.fillStyle = profile.hero === el ? EL[el].deep : 'rgba(10,20,40,0.9)';
      g.fill();
      neon(g, profile.hero === el ? '#ffd24a' : EL[el].line, 1.5, 6);
      glyph(g, el, bx + 17, 627, 10);
      text(g, EL[el].name, bx + 17, 656, { size: 12, align: 'center', max: 40 });
      region(bx, 610, 34, 56, () => {
        profile.hero = el;
        profile.equipped.color = EL[el].line;
        save();
      });
    });
    chamfer(g, 520, 672, 336, 42, 6);
    g.fillStyle = 'rgba(8,20,44,0.95)';
    g.fill();
    neon(g, C.cyan, 1.5, 8);
    const caret = Math.floor(t / 30) % 2 ? '|' : '';
    text(g, cName ? cName + caret : `ENTER NAME${caret}`, 688, 694, { size: 24, align: 'center', col: cName ? '#ffffff' : '#9fc8ff' });
    goldButton(g, 590, 722, 196, 42, 'CREATE', { size: 26, t, act: () => {
      profile.name = cName.trim() || 'Nytor';
      save();
      nav.go('roster');
    } });
    // right top
    panel(g, 978, 108, 360, 290, { col: C.cyan, cut: 12 });
    ['AURA', 'EFFECTS', 'COLORS'].forEach((n, i) => {
      const bx = 990 + i * 116;
      cyanButton(g, bx, 116, 108, 40, n, { size: 22, on: cRight === i, act: () => (cRight = i) });
    });
    AURAS.forEach(([id, draw], i) => {
      const bx = 996 + (i % 3) * 112;
      const by = 168 + Math.floor(i / 3) * 74;
      const key = `aura:${id}`;
      const sel = profile.equipped.aura === key;
      chamfer(g, bx, by, 100, 66, 8);
      g.fillStyle = 'rgba(10,26,54,0.9)';
      g.fill();
      neon(g, sel ? '#ffd24a' : C.cyan, sel ? 3 : 1.5, sel ? 18 : 6);
      draw(g, bx + 50, by + 33, t);
      region(bx, by, 100, 66, () => {
        profile.equipped.aura = key;
        save();
      });
    });
    // palette
    panel(g, 978, 410, 360, 300, { col: C.cyan, cut: 12 });
    text(g, 'COLOR PALETTE', 1158, 436, { size: 24, align: 'center' });
    PALETTE.forEach(([name, col], i) => {
      const bx = 1020 + (i % 5) * 64;
      const by = 486 + Math.floor(i / 5) * 106;
      const sel = profile.equipped.color === col;
      g.save();
      g.beginPath();
      g.arc(bx, by, 22, 0, Math.PI * 2);
      g.fillStyle = '#0a0e20';
      g.fill();
      g.lineWidth = 6;
      g.strokeStyle = col;
      g.shadowColor = col;
      g.shadowBlur = sel ? 22 : 10;
      g.stroke();
      if (sel) {
        g.lineWidth = 2;
        g.strokeStyle = '#ffffff';
        g.beginPath();
        g.arc(bx, by, 29, 0, Math.PI * 2);
        g.stroke();
      }
      g.restore();
      text(g, name, bx, by + 40, { size: 13, align: 'center', max: 62 });
      region(bx - 28, by - 28, 56, 80, () => {
        profile.equipped.color = col;
        save();
      });
    });
    void H;
    void input;
    void hover;
    void fmt;
    void cap;
    void coin;
    void elementIcon;
  },
};
