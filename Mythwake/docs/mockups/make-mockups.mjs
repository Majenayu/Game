// Phase 0 mockups for Mythwake (working title). Original SVG drawn in code, system fonts only.
// Run: node docs/mockups/make-mockups.mjs   (writes .svg files next to this script)
//
// Outputs:
//   style-A.svg  storybook pixel-painterly (recommended)
//   style-B.svg  ink and watercolour
//   style-C.svg  bold papercraft
//   motif-chart.svg, islands.svg, names.svg
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = (n) => fileURLToPath(new URL(`./${n}`, import.meta.url));
const FONT = 'Trebuchet MS, Verdana, sans-serif';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// ---------------------------------------------------------------------------------------------------------------
// Shared overworld layout: the edge of Quill Harbor on Inkreach Meadows (island 1).
// ---------------------------------------------------------------------------------------------------------------
const T = 32;
const COLS = 40;
const ROWS = 23;

function buildMap() {
  const m = [];
  for (let y = 0; y < ROWS; y++) {
    const row = [];
    for (let x = 0; x < COLS; x++) {
      // shoreline runs diagonally across the bottom right
      const shore = 0.55 * x + 6;
      let t = 'g';
      if (y > 30 - shore * 0.55 + 6) t = 'w';
      else if (y > 30 - shore * 0.55 + 4) t = 's';
      if (x >= 3 && x <= 11 && y >= 9 && y <= 15) t = 'm'; // Murmur Field
      if ((x === 19 || x === 20) && y < 14 && t === 'g') t = 'p'; // path north
      if (y === 13 && x > 11 && x < 20) t = 'p'; // path west
      row.push(t);
    }
    m.push(row);
  }
  // fix the shoreline: compute from a smooth curve instead
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const curve = 24 - x * 0.42 + Math.sin(x * 0.5) * 0.8;
      if (m[y][x] === 'm' || m[y][x] === 'p') continue;
      m[y][x] = y > curve + 2 ? 'w' : y > curve ? 's' : 'g';
    }
  return m;
}
const MAP = buildMap();

const TREES = [
  [2, 2], [4, 1], [6, 3], [1, 5], [8, 1], [10, 3], [3, 6], [13, 1], [27, 1], [30, 2], [33, 1], [36, 3], [38, 1], [34, 5],
];
const HOUSE = { x: 23, y: 5, w: 6, h: 5 };
const SCRIBE = { x: 19.5, y: 11.6 };
const NIB = { x: 17.6, y: 12.4 };
const NPC = { x: 22.6, y: 10.6 };
const CRAB = { x: 26.4, y: 13 };
const SHIMMER = [
  [5, 11], [8, 10], [6, 14], [10, 12],
];

const PAL = {
  grass: ['#5f9e4a', '#6fb055', '#4f8a3e', '#86c46a'],
  murmur: ['#3f7d52', '#4c9161', '#356b46', '#7fd6a8'],
  path: ['#d9c08a', '#e6d09e', '#c7aa72'],
  sand: ['#ecd7a2', '#f5e4b6', '#dcc189'],
  water: ['#3d8fb5', '#4aa3c8', '#2f7aa0', '#bfe9f5'],
  outline: '#2b1d2e',
  roof: '#b4533f',
  roofDark: '#8a3a2d',
  wall: '#f0e3c4',
  wallDark: '#cdbb92',
  wood: '#7a4e32',
  leaf: ['#3d7a3a', '#4f9447', '#2f5f2e', '#6db35f'],
  skin: '#f3c9a5',
  hair: '#5a3726',
  cloak: '#3b5ba8',
  cloakDark: '#2c437d',
  quill: '#fff8e6',
  boot: '#4a3022',
  ink: '#283a7a',
  inkLight: '#5d79d6',
  nibGold: '#f2c14e',
  crab: '#e0644a',
  crabDark: '#a84432',
  npcHair: '#cfcfd8',
  npcCloak: '#4f8a5a',
  npcCloakDark: '#3a6a44',
};

// ---------------------------------------------------------------------------------------------------------------
// Pixel sprites (style A): one character per pixel.
// ---------------------------------------------------------------------------------------------------------------
const SCRIBE_PX = [
  '...kkkkkk...',
  '..khhhhhhk..',
  '.khhhhhhhhk.',
  '.khhsssshhk.',
  '.kssessessk.',
  '.kssssssssk.',
  '..kssppssk..',
  '..kcccccck..',
  '.kcccqcccck.',
  'kcccqqcccCck',
  'kccqcccccCck',
  'kccccccccCck',
  '.kCccccccCk.',
  '..kccCCcck..',
  '..kbbk.kbbk.',
  '..kkkk.kkkk.',
];
const NIB_PX = [
  '....nn....',
  '...knnk...',
  '..kiiiik..',
  '.kiIiiiik.',
  'kiiwkiwkik',
  'kiiiiiiiik',
  'kiiippiiik',
  '.kiiiiiik.',
  '..kiiiik..',
  '...kkkk...',
];
const CRAB_PX = [
  'krrk.k..k.krrk',
  'kr.k.w..w.k.rk',
  '.krrkkkkkkrrk.',
  '..krrrrrrrrk..',
  '.krrRrrrrRrrk.',
  'kkrrrrrrrrrrkk',
  'k.kRRRRRRRRk.k',
  '.k.k.k..k.k.k.',
];

function pixelSprite(map, colors, x, y, px) {
  let s = '';
  map.forEach((row, j) => {
    [...row].forEach((ch, i) => {
      if (ch === '.') return;
      s += `<rect x="${x + i * px}" y="${y + j * px}" width="${px}" height="${px}" fill="${colors[ch]}"/>`;
    });
  });
  return s;
}

const scribeColors = {
  k: PAL.outline, h: PAL.hair, s: PAL.skin, e: PAL.outline, p: '#e88c8c', c: PAL.cloak, C: PAL.cloakDark,
  q: PAL.quill, b: PAL.boot,
};
const npcColors = { ...scribeColors, h: PAL.npcHair, c: PAL.npcCloak, C: PAL.npcCloakDark, q: PAL.npcCloak };
const nibColors = { k: PAL.outline, n: PAL.nibGold, i: PAL.ink, I: PAL.inkLight, w: '#ffffff', p: '#f08aa0' };
const crabColors = { k: PAL.outline, r: PAL.crab, R: PAL.crabDark, w: '#ffffff' };

// ---------------------------------------------------------------------------------------------------------------
// Style A: storybook pixel-painterly
// ---------------------------------------------------------------------------------------------------------------
function styleA() {
  const r = rng(42);
  let s = '';
  const ramp = { g: PAL.grass, m: PAL.murmur, p: PAL.path, s: PAL.sand, w: PAL.water };
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const t = MAP[y][x];
      const c = ramp[t];
      s += `<rect x="${x * T}" y="${y * T}" width="${T}" height="${T}" fill="${c[0]}"/>`;
      // painterly flecks on an 8 px grid
      for (let k = 0; k < 5; k++) {
        const fx = x * T + Math.floor(r() * 4) * 8;
        const fy = y * T + Math.floor(r() * 4) * 8;
        const col = c[1 + Math.floor(r() * (c.length - 1))];
        s += `<rect x="${fx}" y="${fy}" width="8" height="8" fill="${col}" opacity="${t === 'w' && col === c[3] ? 0.7 : 1}"/>`;
      }
      if (t === 'm' && r() < 0.6) {
        // tall whispering grass blades
        const bx = x * T + 6 + Math.floor(r() * 3) * 8;
        s += `<rect x="${bx}" y="${y * T + 4}" width="4" height="20" fill="${PAL.murmur[2]}"/><rect x="${bx + 8}" y="${y * T + 8}" width="4" height="16" fill="${PAL.murmur[1]}"/>`;
      }
    }
  // shore foam
  for (let x = 0; x < COLS; x++)
    for (let y = 1; y < ROWS; y++)
      if (MAP[y][x] === 'w' && MAP[y - 1][x] === 's')
        s += `<rect x="${x * T}" y="${y * T}" width="${T}" height="4" fill="#ffffff" opacity="0.8"/><rect x="${x * T + 8}" y="${y * T + 6}" width="12" height="4" fill="#ffffff" opacity="0.5"/>`;
  // shimmer of Echoes hiding in the Murmur Field
  for (const [x, y] of SHIMMER)
    s += `<g opacity="0.9"><rect x="${x * T + 12}" y="${y * T + 4}" width="8" height="8" fill="${PAL.murmur[3]}"/><rect x="${x * T + 4}" y="${y * T + 12}" width="4" height="4" fill="#ffffff"/><rect x="${x * T + 24}" y="${y * T + 16}" width="4" height="4" fill="#ffffff"/></g>`;
  // house
  const h = HOUSE;
  s += `<rect x="${h.x * T - 4}" y="${(h.y + 2) * T - 4}" width="${h.w * T + 8}" height="${(h.h - 2) * T + 8}" fill="${PAL.outline}"/>`;
  s += `<rect x="${h.x * T}" y="${(h.y + 2) * T}" width="${h.w * T}" height="${(h.h - 2) * T}" fill="${PAL.wall}"/>`;
  s += `<rect x="${h.x * T}" y="${(h.y + 4) * T}" width="${h.w * T}" height="16" fill="${PAL.wallDark}"/>`;
  for (let i = 0; i < 7; i++) {
    const inset = i * 8;
    s += `<rect x="${h.x * T - 12 + inset}" y="${h.y * T + 8 + i * 8}" width="${h.w * T + 24 - inset * 2}" height="10" fill="${i === 0 ? PAL.outline : i % 2 ? PAL.roof : PAL.roofDark}"/>`;
  }
  s += `<rect x="${(h.x + 2.5) * T - 4}" y="${(h.y + 3) * T - 4}" width="${T + 8}" height="${2 * T + 4}" fill="${PAL.outline}"/><rect x="${(h.x + 2.5) * T}" y="${(h.y + 3) * T}" width="${T}" height="${2 * T}" fill="${PAL.wood}"/>`;
  s += `<rect x="${(h.x + 0.6) * T}" y="${(h.y + 2.6) * T}" width="${T}" height="24" fill="${PAL.outline}"/><rect x="${(h.x + 0.6) * T + 4}" y="${(h.y + 2.6) * T + 4}" width="${T - 8}" height="16" fill="#ffd77a"/>`;
  s += `<rect x="${(h.x + 4.4) * T}" y="${(h.y + 2.6) * T}" width="${T}" height="24" fill="${PAL.outline}"/><rect x="${(h.x + 4.4) * T + 4}" y="${(h.y + 2.6) * T + 4}" width="${T - 8}" height="16" fill="#ffd77a"/>`;
  // sign with a quill
  s += `<rect x="${21 * T + 8}" y="${12 * T}" width="4" height="28" fill="${PAL.outline}"/><rect x="${21 * T - 8}" y="${11.3 * T}" width="36" height="22" fill="${PAL.outline}"/><rect x="${21 * T - 4}" y="${11.3 * T + 4}" width="28" height="14" fill="${PAL.wood}"/>`;
  // trees (pixel blob crowns with outlines)
  for (const [tx, ty] of TREES) {
    const cx = tx * T + 16;
    const cy = ty * T + 12;
    s += `<rect x="${cx - 6}" y="${cy + 18}" width="12" height="22" fill="${PAL.outline}"/><rect x="${cx - 2}" y="${cy + 18}" width="4" height="20" fill="${PAL.wood}"/>`;
    for (let j = -4; j <= 3; j++)
      for (let i = -4; i <= 3; i++) {
        const d = Math.hypot(i + 0.5, j + 0.5);
        if (d > 4.2) continue;
        const col = d > 3.4 ? PAL.outline : j < -1 && i < 0 ? PAL.leaf[3] : (i + j) % 3 === 0 ? PAL.leaf[2] : PAL.leaf[1];
        s += `<rect x="${cx + i * 8}" y="${cy + j * 8}" width="8" height="8" fill="${col}"/>`;
      }
  }
  // characters (4 px per pixel) with soft shadows
  const shadow = (x, y, w) => `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="6" fill="#000" opacity="0.25"/>`;
  s += shadow(SCRIBE.x * T + 24, SCRIBE.y * T + 64, 20) + pixelSprite(SCRIBE_PX, scribeColors, SCRIBE.x * T, SCRIBE.y * T, 4);
  s += shadow(NIB.x * T + 20, NIB.y * T + 40, 16) + pixelSprite(NIB_PX, nibColors, NIB.x * T, NIB.y * T, 4);
  s += shadow(NPC.x * T + 24, NPC.y * T + 64, 20) + pixelSprite(SCRIBE_PX, npcColors, NPC.x * T, NPC.y * T, 4);
  s += shadow(CRAB.x * T + 28, CRAB.y * T + 32, 24) + pixelSprite(CRAB_PX, crabColors, CRAB.x * T, CRAB.y * T, 4);
  // warm evening light wash
  s += `<rect width="1280" height="720" fill="url(#warm)"/>`;
  return frame('A. Storybook pixel-painterly (recommended)', '32 px tiles, painted pixel flecks, dark outlines, warm coloured light.', s, uiA());
}

function uiA() {
  const box = (x, y, w, h) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PAL.outline}"/><rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" fill="#f6e7c1"/><rect x="${x + 8}" y="${y + 8}" width="${w - 16}" height="${h - 16}" fill="none" stroke="#c49a5a" stroke-width="4"/>`;
  let s = box(24, 520, 1232, 176);
  s += box(44, 540, 136, 136);
  s += pixelSprite(SCRIBE_PX, npcColors, 76, 552, 6);
  s += `<text x="204" y="580" font-size="26" font-weight="900" fill="#5a2f1c">Mara Tidewright</text>`;
  s += `<text x="204" y="618" font-size="24" fill="#3a2418">Welcome to Quill Harbor, little Scribe! Mind the</text>`;
  s += `<text x="204" y="652" font-size="24" fill="#3a2418">Murmur Field. It is whispering again today.</text>`;
  s += `<rect x="1200" y="650" width="16" height="16" fill="#5a2f1c"/><rect x="1204" y="666" width="8" height="8" fill="#5a2f1c"/>`;
  s += box(24, 20, 220, 64) + `<rect x="44" y="40" width="20" height="24" fill="${PAL.ink}"/><text x="78" y="62" font-size="24" font-weight="900" fill="#3a2418">Ink 120</text>`;
  s += box(1036, 20, 220, 64) + `<circle cx="1068" cy="52" r="12" fill="#f2a93b"/><text x="1092" y="62" font-size="24" font-weight="900" fill="#3a2418">Dusk 18:40</text>`;
  return s;
}

// ---------------------------------------------------------------------------------------------------------------
// Vector characters for styles B and C
// ---------------------------------------------------------------------------------------------------------------
function vScribe(x, y, o, hair = PAL.hair, cloak = PAL.cloak, quill = true) {
  const { sw, stroke, shade } = o;
  return `<g transform="translate(${x} ${y})" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round">
    ${shade ? `<ellipse cx="0" cy="62" rx="22" ry="6" fill="#000" opacity="0.25" stroke="none"/>` : ''}
    <path d="M-20 18 Q-24 50 -16 58 L16 58 Q24 50 20 18 Q0 8 -20 18 Z" fill="${cloak}"/>
    <rect x="-12" y="56" width="9" height="8" rx="2" fill="${PAL.boot}"/><rect x="3" y="56" width="9" height="8" rx="2" fill="${PAL.boot}"/>
    <circle cx="0" cy="0" r="18" fill="${PAL.skin}"/>
    <path d="M-19 -2 Q-18 -22 0 -22 Q18 -22 19 -2 Q10 -12 -4 -10 Q-12 -8 -19 -2 Z" fill="${hair}"/>
    <circle cx="-6" cy="2" r="2.2" fill="${stroke}" stroke="none"/><circle cx="6" cy="2" r="2.2" fill="${stroke}" stroke="none"/>
    <path d="M-4 9 Q0 12 4 9" fill="none"/>
    ${quill ? `<path d="M14 22 Q30 0 34 -14 Q24 4 16 30 Z" fill="${PAL.quill}"/>` : ''}
  </g>`;
}
function vNib(x, y, o) {
  const { sw, stroke, shade } = o;
  return `<g transform="translate(${x} ${y})" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round">
    ${shade ? `<ellipse cx="0" cy="24" rx="16" ry="5" fill="#000" opacity="0.25" stroke="none"/>` : ''}
    <path d="M0 -30 L7 -14 L-7 -14 Z" fill="${PAL.nibGold}"/>
    <path d="M0 -18 C 18 -16 22 2 18 12 C 14 22 -14 22 -18 12 C -22 2 -18 -16 0 -18 Z" fill="${PAL.ink}"/>
    <ellipse cx="-7" cy="-4" rx="4" ry="5" fill="${PAL.inkLight}" stroke="none" opacity="0.8"/>
    <circle cx="-6" cy="2" r="3.4" fill="#fff" stroke="none"/><circle cx="6" cy="2" r="3.4" fill="#fff" stroke="none"/>
    <circle cx="-5.4" cy="2.6" r="1.8" fill="${stroke}" stroke="none"/><circle cx="6.6" cy="2.6" r="1.8" fill="${stroke}" stroke="none"/>
    <path d="M-3 10 Q0 13 3 10" fill="none" stroke="#f08aa0"/>
  </g>`;
}
function vCrab(x, y, o) {
  const { sw, stroke, shade } = o;
  return `<g transform="translate(${x} ${y})" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round">
    ${shade ? `<ellipse cx="0" cy="18" rx="30" ry="6" fill="#000" opacity="0.25" stroke="none"/>` : ''}
    <path d="M-20 10 l-10 8 M-12 12 l-6 10 M12 12 l6 10 M20 10 l10 8" fill="none"/>
    <path d="M-34 -14 q-8 -12 2 -18 l6 10 l6 -8 q6 10 -2 18 Z" fill="${PAL.crab}"/>
    <path d="M34 -14 q8 -12 -2 -18 l-6 10 l-6 -8 q-6 10 2 18 Z" fill="${PAL.crab}"/>
    <path d="M-26 -6 Q0 -26 26 -6 Q28 14 0 16 Q-28 14 -26 -6 Z" fill="${PAL.crab}"/>
    <path d="M-16 4 Q0 10 16 4" fill="none" stroke="${PAL.crabDark}"/>
    <path d="M-6 -16 l-2 -10 M6 -16 l2 -10" fill="none"/><circle cx="-8" cy="-28" r="4" fill="#fff"/><circle cx="8" cy="-28" r="4" fill="#fff"/>
  </g>`;
}
function vTree(x, y, o, leaf) {
  const { sw, stroke } = o;
  return `<g transform="translate(${x} ${y})" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round">
    <rect x="-5" y="10" width="10" height="26" rx="3" fill="${PAL.wood}"/>
    <circle cx="0" cy="-4" r="26" fill="${leaf[1]}"/><circle cx="-14" cy="6" r="16" fill="${leaf[1]}"/><circle cx="14" cy="6" r="16" fill="${leaf[2]}"/>
    <circle cx="-8" cy="-12" r="9" fill="${leaf[3]}" stroke="none" opacity="0.8"/>
  </g>`;
}
function vHouse(o) {
  const { sw, stroke } = o;
  const h = HOUSE;
  const x = h.x * T;
  const y = h.y * T;
  const w = h.w * T;
  return `<g stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round">
    <rect x="${x}" y="${y + 2 * T}" width="${w}" height="${3 * T}" fill="${PAL.wall}"/>
    <path d="M${x - 16} ${y + 2 * T + 6} L${x + w / 2} ${y + 6} L${x + w + 16} ${y + 2 * T + 6} Z" fill="${PAL.roof}"/>
    <rect x="${x + 2.5 * T}" y="${y + 3 * T}" width="${T}" height="${2 * T}" rx="4" fill="${PAL.wood}"/>
    <rect x="${x + 0.6 * T}" y="${y + 2.6 * T}" width="${T}" height="24" rx="3" fill="#ffd77a"/>
    <rect x="${x + 4.4 * T}" y="${y + 2.6 * T}" width="${T}" height="24" rx="3" fill="#ffd77a"/>
  </g>`;
}

// Region shapes from the tile map, merged per tile type
function regionRects(type, inflate = 0) {
  let s = '';
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (MAP[y][x] === type) s += `<rect x="${x * T - inflate}" y="${y * T - inflate}" width="${T + inflate * 2}" height="${T + inflate * 2}"/>`;
  return s;
}

// ---------------------------------------------------------------------------------------------------------------
// Style B: ink and watercolour
// ---------------------------------------------------------------------------------------------------------------
function styleB() {
  const o = { sw: 2.2, stroke: '#3b2a22', shade: true };
  let s = `<rect width="1280" height="720" fill="#f3ead6"/>`;
  s += `<g filter="url(#wash)">
    <g fill="#9cc58a" opacity="0.85">${regionRects('g', 2)}${regionRects('p', 2)}</g>
    <g fill="#e9d6a6" opacity="0.9">${regionRects('p', 0)}</g>
    <g fill="#f1dfae">${regionRects('s', 2)}</g>
    <g fill="#7fb7cf" opacity="0.9">${regionRects('w', 2)}</g>
    <g fill="#6aa07a" opacity="0.85">${regionRects('m', 2)}</g>
  </g>`;
  // ink hatching for the Murmur Field and water ripples
  const r = rng(9);
  for (let i = 0; i < 70; i++) {
    const x = 3 * T + r() * 9 * T;
    const y = 9 * T + r() * 7 * T;
    s += `<path d="M${x} ${y + 14} q2 -10 4 -16" stroke="#2f4f39" stroke-width="1.6" fill="none" opacity="0.7"/>`;
  }
  for (let i = 0; i < 40; i++) {
    const x = r() * 1280;
    const y = 470 + r() * 250;
    const yy = 24 - x / T * 0.42;
    if (y / T < yy + 3) continue;
    s += `<path d="M${x} ${y} q8 -4 16 0" stroke="#2c5d75" stroke-width="1.5" fill="none" opacity="0.6"/>`;
  }
  for (const [x, y] of SHIMMER) s += `<g transform="translate(${x * T + 16} ${y * T + 12})"><path d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z" fill="#fffbe8" stroke="#3b2a22" stroke-width="1.2"/></g>`;
  s += vHouse(o);
  for (const [tx, ty] of TREES) s += vTree(tx * T + 16, ty * T + 16, o, ['', '#5d9a52', '#4a8045', '#9fd08a']);
  s += vScribe(SCRIBE.x * T + 24, SCRIBE.y * T + 16, o);
  s += vNib(NIB.x * T + 20, NIB.y * T + 22, o);
  s += vScribe(NPC.x * T + 24, NPC.y * T + 16, o, PAL.npcHair, PAL.npcCloak, false);
  s += vCrab(CRAB.x * T + 28, CRAB.y * T + 20, o);
  s += `<rect width="1280" height="720" fill="url(#grain)" opacity="0.35"/>`;
  return frame('B. Ink and watercolour', 'Soft washes on paper, loose ink lines. Calm and bookish, but busier to read on phones.', s, uiB());
}
function uiB() {
  let s = `<g filter="url(#torn)"><rect x="24" y="520" width="1232" height="176" fill="#fbf3dd" stroke="#3b2a22" stroke-width="3"/></g>`;
  s += `<circle cx="112" cy="608" r="62" fill="#efe2bf" stroke="#3b2a22" stroke-width="3"/>`;
  s += vScribe(112, 600, { sw: 2.2, stroke: '#3b2a22', shade: false }, PAL.npcHair, PAL.npcCloak, false);
  s += `<text x="204" y="580" font-size="26" font-style="italic" font-weight="700" fill="#4a2c1c" font-family="Georgia, serif">Mara Tidewright</text>`;
  s += `<text x="204" y="618" font-size="24" fill="#3a2418" font-family="Georgia, serif">Welcome to Quill Harbor, little Scribe! Mind the</text>`;
  s += `<text x="204" y="652" font-size="24" fill="#3a2418" font-family="Georgia, serif">Murmur Field. It is whispering again today.</text>`;
  s += `<g filter="url(#torn)"><rect x="24" y="20" width="200" height="56" fill="#fbf3dd" stroke="#3b2a22" stroke-width="2"/></g><text x="48" y="57" font-size="24" fill="#3a2418" font-family="Georgia, serif">Ink 120</text>`;
  s += `<g filter="url(#torn)"><rect x="1056" y="20" width="200" height="56" fill="#fbf3dd" stroke="#3b2a22" stroke-width="2"/></g><text x="1080" y="57" font-size="24" fill="#3a2418" font-family="Georgia, serif">Dusk 18:40</text>`;
  return s;
}

// ---------------------------------------------------------------------------------------------------------------
// Style C: bold papercraft
// ---------------------------------------------------------------------------------------------------------------
function styleC() {
  const o = { sw: 4, stroke: '#1e1a2e', shade: false };
  const layer = (type, fill, dy = 6) =>
    `<g fill="#000" opacity="0.18" transform="translate(0 ${dy})">${regionRects(type)}</g><g fill="${fill}">${regionRects(type)}</g>`;
  let s = `<rect width="1280" height="720" fill="#2fa3c4"/>`;
  s += layer('s', '#ffd98e') + layer('g', '#7ccf5b') + layer('p', '#f5cf82', 0) + layer('m', '#2f9e6a');
  for (const [x, y] of SHIMMER) s += `<circle cx="${x * T + 16}" cy="${y * T + 14}" r="7" fill="#d8fff0" stroke="#1e1a2e" stroke-width="3"/>`;
  s += `<g transform="translate(6 8)" opacity="0.25">${vHouse({ ...o, stroke: '#000' })}</g>` + vHouse(o);
  for (const [tx, ty] of TREES)
    s += `<g transform="translate(6 8)" opacity="0.25">${vTree(tx * T + 16, ty * T + 16, { ...o, stroke: '#000' }, ['', '#000', '#000', '#000'])}</g>` + vTree(tx * T + 16, ty * T + 16, o, ['', '#3fae4f', '#2f8a40', '#9be27a']);
  s += vScribe(SCRIBE.x * T + 24, SCRIBE.y * T + 16, o);
  s += vNib(NIB.x * T + 20, NIB.y * T + 22, o);
  s += vScribe(NPC.x * T + 24, NPC.y * T + 16, o, PAL.npcHair, PAL.npcCloak, false);
  s += vCrab(CRAB.x * T + 28, CRAB.y * T + 20, o);
  return frame('C. Bold papercraft', 'Flat cut-paper layers, thick outlines, bright colours. Very readable, but closer to many mobile games.', s, uiC());
}
function uiC() {
  let s = `<rect x="30" y="528" width="1232" height="176" rx="28" fill="#000" opacity="0.3"/><rect x="24" y="520" width="1232" height="176" rx="28" fill="#fff7e8" stroke="#1e1a2e" stroke-width="5"/>`;
  s += `<rect x="44" y="540" width="136" height="136" rx="24" fill="#ffd98e" stroke="#1e1a2e" stroke-width="4"/>`;
  s += vScribe(112, 600, { sw: 4, stroke: '#1e1a2e', shade: false }, PAL.npcHair, PAL.npcCloak, false);
  s += `<rect x="200" y="548" width="250" height="40" rx="20" fill="#f25f5c" stroke="#1e1a2e" stroke-width="4"/><text x="325" y="577" font-size="24" font-weight="900" fill="#fff" text-anchor="middle">Mara Tidewright</text>`;
  s += `<text x="204" y="630" font-size="25" font-weight="700" fill="#1e1a2e">Welcome to Quill Harbor, little Scribe! Mind the</text>`;
  s += `<text x="204" y="664" font-size="25" font-weight="700" fill="#1e1a2e">Murmur Field. It is whispering again today.</text>`;
  s += `<rect x="24" y="20" width="200" height="56" rx="28" fill="#fff7e8" stroke="#1e1a2e" stroke-width="4"/><text x="124" y="57" font-size="24" font-weight="900" fill="#1e1a2e" text-anchor="middle">Ink 120</text>`;
  s += `<rect x="1056" y="20" width="200" height="56" rx="28" fill="#fff7e8" stroke="#1e1a2e" stroke-width="4"/><text x="1156" y="57" font-size="24" font-weight="900" fill="#1e1a2e" text-anchor="middle">Dusk 18:40</text>`;
  return s;
}

function frame(title, note, world, ui) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="820" viewBox="0 0 1280 820" font-family="${FONT}">
  <defs>
    <radialGradient id="warm" cx="0.5" cy="0.35" r="0.8"><stop offset="0" stop-color="#ffd38a" stop-opacity="0"/><stop offset="1" stop-color="#5b2a6e" stop-opacity="0.28"/></radialGradient>
    <filter id="wash" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="22" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation="1.6"/>
    </filter>
    <filter id="torn"><feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="6"/></filter>
    <filter id="grainF"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="2"/><feColorMatrix type="saturate" values="0"/></filter>
    <pattern id="grain" width="256" height="256" patternUnits="userSpaceOnUse"><rect width="256" height="256" filter="url(#grainF)" opacity="0.5"/></pattern>
  </defs>
  <svg x="0" y="0" width="1280" height="720" overflow="hidden">${world}${ui}</svg>
  <rect x="0" y="720" width="1280" height="100" fill="#0e0c18"/>
  <text x="28" y="760" font-size="26" font-weight="900" fill="#fff">${title}</text>
  <text x="28" y="794" font-size="17" fill="#cfcfe6">${note}</text>
</svg>`;
}

// ---------------------------------------------------------------------------------------------------------------
// Motif chart
// ---------------------------------------------------------------------------------------------------------------
export const MOTIF_ICON = {
  Ember: { color: '#e8603c', shape: 'M0 -16 C 6 -8 3 -3 7 -1 C 9 -7 13 -5 12 3 C 12 11 6 15 0 15 C -6 15 -12 11 -12 3 C -12 -4 -8 -6 -6 -11 C -4 -5 -3 -7 0 -16 Z' },
  Tide: { color: '#3d8fd1', shape: 'M0 -16 C 8 -4 12 2 12 7 A 12 12 0 0 1 -12 7 C -12 2 -8 -4 0 -16 Z' },
  Bloom: { color: '#4fae4f', shape: 'M-12 12 C -14 -6 0 -16 14 -14 C 14 2 4 14 -12 12 Z' },
  Gale: { color: '#8fd3c9', shape: 'M-14 -7 H4 A5 5 0 1 0 -1 -12 M-14 1 H9 A5 5 0 1 1 4 6 M-14 9 H-2' },
  Stone: { color: '#9a8a74', shape: 'M0 -14 L12 -7 L12 7 L0 14 L-12 7 L-12 -7 Z' },
  Spark: { color: '#f2c94c', shape: 'M3 -16 L-9 2 L-1 2 L-4 16 L9 -3 L1 -3 Z' },
  Dusk: { color: '#6b5bb5', shape: 'M6 -14 A 14 14 0 1 0 6 14 A 10 10 0 1 1 6 -14 Z' },
  Dawn: { color: '#f29e4c', shape: 'M0 -7 A 7 7 0 1 1 0 7 A 7 7 0 1 1 0 -7 Z M0 -16 V -11 M0 11 V 16 M-16 0 H -11 M11 0 H 16 M-11 -11 L -8 -8 M8 8 L 11 11 M-11 11 L -8 8 M8 -8 L 11 -11' },
  Plain: { color: '#d8d2c4', shape: 'M0 -12 A 12 12 0 1 1 0 12 A 12 12 0 1 1 0 -12 Z' },
};

function icon(name, x, y, scale = 1.6) {
  const m = MOTIF_ICON[name];
  const line = name === 'Gale' || name === 'Dawn';
  return `<g transform="translate(${x} ${y})">
    <circle r="${26 * scale / 1.6}" fill="#1b1630" stroke="${m.color}" stroke-width="3"/>
    <g transform="scale(${scale / 1.6 * 1.3})"><path d="${m.shape}" fill="${line ? 'none' : m.color}" stroke="${m.color}" stroke-width="${line ? 3 : 1.5}" stroke-linecap="round"/></g>
  </g>`;
}
function arrow(x1, y1, x2, y2, color = '#ffd27a') {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const pad = 44;
  const sx = x1 + Math.cos(a) * pad;
  const sy = y1 + Math.sin(a) * pad;
  const ex = x2 - Math.cos(a) * pad;
  const ey = y2 - Math.sin(a) * pad;
  return `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${color}" stroke-width="4" marker-end="url(#head)"/>`;
}
function motifChart() {
  const label = (n, x, y) => `<text x="${x}" y="${y}" font-size="20" font-weight="800" fill="#fff" text-anchor="middle">${n}</text>`;
  const tri = (names, cx, cy, r, title) => {
    const pts = names.map((_, i) => [cx + r * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 3), cy + r * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 3)]);
    let s = `<text x="${cx}" y="${cy - r - 64}" font-size="22" font-weight="900" fill="#ffd27a" text-anchor="middle">${title}</text>`;
    for (let i = 0; i < 3; i++) s += arrow(pts[i][0], pts[i][1], pts[(i + 1) % 3][0], pts[(i + 1) % 3][1]);
    names.forEach((n, i) => (s += icon(n, pts[i][0], pts[i][1]) + label(n, pts[i][0], pts[i][1] + (i === 0 ? -36 : 54))));
    return s;
  };
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="900" viewBox="0 0 1280 900" font-family="${FONT}">
  <defs><marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#ffd27a"/></marker></defs>
  <rect width="1280" height="900" fill="#14112a"/>
  <text x="640" y="56" font-size="34" font-weight="900" fill="#fff" text-anchor="middle">Motif wheel</text>
  <text x="640" y="88" font-size="18" fill="#cfcfe6" text-anchor="middle">Arrow = strong against (x1.5). The reverse direction is weak (x0.67). Every icon has its own shape, so colour is never needed.</text>`;
  s += tri(['Ember', 'Bloom', 'Tide'], 270, 360, 140, 'Life loop');
  s += tri(['Stone', 'Spark', 'Gale'], 1010, 360, 140, 'Sky loop');
  // Dusk and Dawn: mutual
  s += `<text x="640" y="190" font-size="22" font-weight="900" fill="#ffd27a" text-anchor="middle">Day and night</text>`;
  s += icon('Dawn', 560, 300) + label('Dawn', 560, 354) + icon('Dusk', 720, 300) + label('Dusk', 720, 354);
  s += `<line x1="604" y1="290" x2="676" y2="290" stroke="#ffd27a" stroke-width="4" marker-end="url(#head)"/><line x1="676" y1="312" x2="604" y2="312" stroke="#ffd27a" stroke-width="4" marker-end="url(#head)"/>`;
  s += `<text x="640" y="400" font-size="16" fill="#cfcfe6" text-anchor="middle">Strong against each other.</text><text x="640" y="422" font-size="16" fill="#cfcfe6" text-anchor="middle">Dawn +10% by day, Dusk +10% by night.</text>`;
  s += icon('Plain', 640, 520) + label('Plain', 640, 574);
  s += `<text x="640" y="604" font-size="16" fill="#cfcfe6" text-anchor="middle">Neutral to all. Plain Verses deal +25% while your Chorus is half full or more.</text>`;
  s += `<text x="640" y="660" font-size="20" font-weight="800" fill="#fff" text-anchor="middle">Bridges between loops (x1.5)</text>`;
  const bridges = [
    ['Tide', 'Stone', 'erodes'], ['Bloom', 'Spark', 'grounds'], ['Ember', 'Gale', 'eats the air'],
    ['Stone', 'Ember', 'smothers'], ['Spark', 'Tide', 'charges'], ['Gale', 'Bloom', 'strips'],
  ];
  bridges.forEach(([a, b, verb], i) => {
    const x = 240 + (i % 3) * 400;
    const y = 700 + Math.floor(i / 3) * 86;
    s += icon(a, x - 80, y, 1.1) + `<text x="${x}" y="${y + 6}" font-size="17" fill="#ffd27a" text-anchor="middle">${verb}</text>` + icon(b, x + 80, y, 1.1);
    s += `<text x="${x - 80}" y="${y + 40}" font-size="14" fill="#fff" text-anchor="middle">${a}</text><text x="${x + 80}" y="${y + 40}" font-size="14" fill="#fff" text-anchor="middle">${b}</text>`;
  });
  s += `<text x="640" y="878" font-size="16" fill="#cfcfe6" text-anchor="middle">Each loop Motif is strong against 2 and weak against 2. Same Motif against itself: x0.8. Full table in docs/MOTIFS.md.</text>`;
  return s + '</svg>';
}

// ---------------------------------------------------------------------------------------------------------------
// Island sketches
// ---------------------------------------------------------------------------------------------------------------
const ISLANDS = [
  { n: 1, name: 'Quill Harbor and Inkreach Meadows', land: '#9fcf7a', sea: '#7fc4de', pois: [['T', 'Quill Harbor', 0.62, 0.62], ['M', 'Murmur Field', 0.32, 0.45], ['K', 'Tidewright Trial', 0.78, 0.3], ['S', 'Smugglers\u2019 cove', 0.18, 0.75], ['L', 'Lighthouse lore', 0.5, 0.22]] },
  { n: 2, name: 'Gloamwood', land: '#4f7d6a', sea: '#3d5f8a', pois: [['T', 'Lanternmoss village', 0.3, 0.6], ['M', 'Glowcap glade', 0.55, 0.42], ['K', 'Hollowfen Trial', 0.75, 0.25], ['S', 'Root hollow', 0.2, 0.28], ['L', 'Moon pool', 0.62, 0.72]] },
  { n: 3, name: 'Cinderpeak', land: '#b07a5a', sea: '#5f6f9a', pois: [['T', 'Bellows town', 0.3, 0.7], ['K', 'Brass Trial (crater)', 0.55, 0.3], ['M', 'Ash slopes', 0.7, 0.55], ['S', 'Lava tube', 0.25, 0.35], ['L', 'Forge ruins', 0.75, 0.75]] },
  { n: 4, name: 'Skyreach Steppe', land: '#d8c77a', sea: '#8fc9e6', pois: [['T', 'Kite camp', 0.25, 0.55], ['M', 'Long grass sea', 0.5, 0.5], ['K', 'Windrun Trial', 0.78, 0.35], ['S', 'Cloud nest', 0.62, 0.18], ['L', 'Standing stones', 0.4, 0.78]] },
  { n: 5, name: 'The Salt Library', land: '#c9d6d8', sea: '#3f7f9a', pois: [['T', 'Upper stacks (town)', 0.35, 0.3], ['K', 'Page Trial (flooded hall)', 0.6, 0.62], ['M', 'Reading reefs', 0.25, 0.65], ['S', 'Lost wing', 0.8, 0.28], ['L', 'Archive bell', 0.75, 0.78]] },
  { n: 6, name: 'Thunder Spine', land: '#8a8fa8', sea: '#3f4a72', pois: [['T', 'Railhook', 0.25, 0.7], ['K', 'Stormcall Trial (peak)', 0.6, 0.2], ['M', 'Static meadow', 0.45, 0.55], ['S', 'Eye of the storm', 0.82, 0.45], ['L', 'Old pylon', 0.3, 0.3]] },
  { n: 7, name: 'Moonlit Orchard', land: '#b9a6d8', sea: '#4b3f7a', pois: [['T', 'Dreamer\u2019s rest', 0.3, 0.4], ['K', 'Gardener\u2019s Trial', 0.7, 0.6], ['M', 'Echo rows', 0.5, 0.3], ['S', 'Yesterday\u2019s gate', 0.18, 0.72], ['L', 'Oldest tree', 0.78, 0.22]] },
  { n: 8, name: 'The Blank Isle', land: '#ecebe6', sea: '#9a9aa8', pois: [['T', 'Redactor camp', 0.3, 0.65], ['K', 'Maren Vale\u2019s keep', 0.6, 0.25], ['M', 'Unwritten plain', 0.5, 0.55], ['S', 'Last ink well', 0.8, 0.72], ['L', 'Elowen\u2019s desk', 0.22, 0.3]] },
];
const POI = { T: ['#ffd27a', 'Town'], K: ['#f25f5c', 'Keeper Trial'], M: ['#7fd6a8', 'Murmur Field'], S: ['#c792ea', 'Secret'], L: ['#9ad1ff', 'Lore'] };

function islandShape(seed, cx, cy, rx, ry) {
  const r = rng(seed);
  const n = 18;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.75 + r() * 0.35;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p1 = pts[(i + 1) % n];
    const p2 = pts[(i + 2) % n];
    const mx = (p1[0] + p2[0]) / 2;
    const my = (p1[1] + p2[1]) / 2;
    d += ` Q${p1[0].toFixed(1)} ${p1[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  return d + ' Z';
}

function islands() {
  const W = 400;
  const H = 320;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 4}" height="${H * 2 + 140}" viewBox="0 0 ${W * 4} ${H * 2 + 140}" font-family="${FONT}">
  <rect width="${W * 4}" height="${H * 2 + 140}" fill="#f3ead6"/>
  <text x="24" y="44" font-size="30" font-weight="900" fill="#3a2418">The eight islands (sketches, not final maps)</text>
  <text x="24" y="74" font-size="16" fill="#5a4030">Dotted line = main route. Each island is one chapter. Letters: T town, K Keeper Trial, M Murmur Field, S secret, L lore.</text>`;
  ISLANDS.forEach((isl, i) => {
    const ox = (i % 4) * W;
    const oy = 100 + Math.floor(i / 4) * H;
    s += `<g transform="translate(${ox} ${oy})">
      <rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="14" fill="${isl.sea}" stroke="#3a2418" stroke-width="2"/>
      <path d="${islandShape(isl.n * 17, W / 2, H / 2 + 8, 160, 108)}" fill="${isl.land}" stroke="#3a2418" stroke-width="3"/>
      <rect x="10" y="10" width="${W - 20}" height="34" rx="14" fill="#3a2418" opacity="0.8"/>
      <text x="24" y="34" font-size="17" font-weight="800" fill="#fff">${isl.n}. ${isl.name}</text>`;
    const pts = isl.pois.map(([k, n, px, py]) => [k, n, 40 + px * (W - 80), 50 + py * (H - 90)]);
    const route = [...pts].sort((a, b) => (a[0] === 'T' ? -1 : b[0] === 'T' ? 1 : a[0] === 'K' ? 1 : b[0] === 'K' ? -1 : 0));
    s += `<path d="M${route.map((p) => `${p[2].toFixed(0)} ${p[3].toFixed(0)}`).join(' L')}" fill="none" stroke="#3a2418" stroke-width="2.5" stroke-dasharray="6 6"/>`;
    for (const [k, n, x, y] of pts)
      s += `<circle cx="${x}" cy="${y}" r="13" fill="${POI[k][0]}" stroke="#3a2418" stroke-width="2"/><text x="${x}" y="${y + 5}" font-size="13" font-weight="900" fill="#3a2418" text-anchor="middle">${k}</text><text x="${x}" y="${y + 30}" font-size="12.5" font-weight="700" fill="#2a1a10" text-anchor="middle">${n}</text>`;
    s += '</g>';
  });
  return s + '</svg>';
}

// ---------------------------------------------------------------------------------------------------------------
// Title sheet
// ---------------------------------------------------------------------------------------------------------------
const TITLES = [
  ['Talewild', 'Bind the legends. Rewrite the ending.', 'No game with this name found.'],
  ['Pagewild', 'Every creature is a story.', 'No game with this name found.'],
  ['Echoquill', 'Write your own legend.', 'No game found; a GitHub user has the name.'],
];
function names() {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="760" viewBox="0 0 1280 760" font-family="${FONT}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#e3a24a"/></linearGradient></defs>
  <rect width="1280" height="760" fill="#2a1d3a"/>
  <text x="40" y="58" font-size="28" font-weight="900" fill="#fff">Title options ("Mythwake" is already used by other games)</text>`;
  TITLES.forEach(([n, tag, note], i) => {
    const y = 110 + i * 214;
    s += `<rect x="40" y="${y}" width="1200" height="186" rx="22" fill="#f3ead6" stroke="#e3a24a" stroke-width="3"/>`;
    s += `<text x="80" y="${y + 40}" font-size="20" font-weight="900" fill="#8a5a2a">${i + 1}</text>`;
    s += `<text x="640" y="${y + 106}" font-size="88" font-weight="900" letter-spacing="3" fill="url(#g)" stroke="#3a2418" stroke-width="4" paint-order="stroke" text-anchor="middle" font-family="Georgia, serif">${n}</text>`;
    s += `<text x="640" y="${y + 146}" font-size="22" fill="#3a2418" text-anchor="middle">${tag}</text>`;
    s += `<text x="640" y="${y + 172}" font-size="14" fill="#6a5040" text-anchor="middle">${note}</text>`;
  });
  return s + '</svg>';
}

writeFileSync(out('style-A.svg'), styleA());
writeFileSync(out('style-B.svg'), styleB());
writeFileSync(out('style-C.svg'), styleC());
writeFileSync(out('motif-chart.svg'), motifChart());
writeFileSync(out('islands.svg'), islands());
writeFileSync(out('names.svg'), names());
console.log('wrote style-A/B/C, motif-chart, islands, names');
