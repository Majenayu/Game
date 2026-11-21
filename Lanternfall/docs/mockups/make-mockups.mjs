// Phase 0 mockups: one SVG scene per palette option, plus a sheet of title options.
// Run: node docs/mockups/make-mockups.mjs   (writes SVG files next to this script)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = (name) => fileURLToPath(new URL(`./${name}`, import.meta.url));

export const PALETTES = {
  A: {
    title: 'A. Paper Lantern',
    note: 'Warm amber light against deep indigo and teal. Closest to the brief. Cozy and readable.',
    sky0: '#0b0b2a', sky1: '#1b2457', far: '#20306a', mid: '#152451', ground: '#0e1b3a', grass: '#1d3b5c',
    light: '#ffd27a', lightEdge: '#ff9f43', core: '#fff6d8', safe: '#7ee7d6', shadow: '#0a0716',
    eyes: '#ff5d5d', danger: '#ff7a3d', glint: '#ffe28a', ui: '#1a1640', uiEdge: '#ffcf6e', text: '#fff3d6',
  },
  B: {
    title: 'B. Moonlit Ink',
    note: 'Cool silver-cyan light against plum and ink black. Calmer, more mysterious, less warm.',
    sky0: '#07060f', sky1: '#231a3d', far: '#2e2450', mid: '#1f1838', ground: '#120e22', grass: '#2b2148',
    light: '#bff4ff', lightEdge: '#5fd3f3', core: '#ffffff', safe: '#b7ff9e', shadow: '#05040b',
    eyes: '#ff6fa8', danger: '#ff8a3d', glint: '#d9f7ff', ui: '#151026', uiEdge: '#8fe6ff', text: '#eefbff',
  },
  C: {
    title: 'C. Festival Dusk',
    note: 'Rose-gold light against deep teal and magenta dusk. Most colourful, stands out on a portal grid.',
    sky0: '#08161c', sky1: '#3a1f4f', far: '#5a2a5e', mid: '#173a44', ground: '#0c2830', grass: '#185058',
    light: '#ffc3a0', lightEdge: '#ff6f91', core: '#fff1e8', safe: '#8cf2c8', shadow: '#061015',
    eyes: '#ffd84a', danger: '#ff6a3d', glint: '#ffe0b0', ui: '#12262c', uiEdge: '#ff9fb4', text: '#fff1ea',
  },
};

const W = 1280;
const H = 720;

// Deterministic pseudo-random so the files do not change between runs.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function hills(y, amp, step, seed, color) {
  const r = rng(seed);
  let d = `M0 ${H} L0 ${y}`;
  for (let x = 0; x <= W + step; x += step) {
    const cy = y - r() * amp;
    d += ` Q${x - step / 2} ${cy - amp * 0.4} ${x} ${cy}`;
  }
  return `<path d="${d} L${W} ${H} Z" fill="${color}"/>`;
}

function trees(baseY, count, seed, color) {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < count; i++) {
    const x = 40 + r() * (W - 80);
    const h = 70 + r() * 90;
    const w = 26 + r() * 22;
    // rounded paper-cut tree: a trunk and a stacked blob crown
    s += `<rect x="${x - 3}" y="${baseY - h * 0.45}" width="6" height="${h * 0.45}" fill="${color}"/>`;
    s += `<ellipse cx="${x}" cy="${baseY - h * 0.6}" rx="${w}" ry="${h * 0.34}" fill="${color}"/>`;
    s += `<ellipse cx="${x - w * 0.4}" cy="${baseY - h * 0.45}" rx="${w * 0.7}" ry="${h * 0.22}" fill="${color}"/>`;
  }
  return s;
}

function grass(p) {
  const r = rng(7);
  let s = '';
  for (let i = 0; i < 160; i++) {
    const x = r() * W;
    const y = 470 + r() * 240;
    const h = 6 + r() * 10;
    s += `<path d="M${x} ${y} q2 ${-h} 5 ${-h * 1.1} q-1 ${h * 0.6} 1 ${h * 1.1}" fill="${p.grass}" opacity="0.8"/>`;
  }
  return s;
}

function fireflies(p, n, seed) {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = r() * W;
    const y = 60 + r() * 520;
    const rad = 1 + r() * 2.2;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="${p.glint}" opacity="${(0.35 + r() * 0.6).toFixed(2)}" filter="url(#soft)"/>`;
  }
  return s;
}

// Friendly round spirit: a teardrop flame with a face and a bright core ring (the hitbox, never changes).
function spirit(p, x, y) {
  return `
  <g transform="translate(${x} ${y})">
    <ellipse cx="0" cy="44" rx="34" ry="9" fill="#000" opacity="0.35"/>
    <path d="M0 -62 C 22 -30 40 -8 36 14 C 32 38 14 48 0 48 C -14 48 -32 38 -36 14 C -40 -8 -22 -30 0 -62 Z"
      fill="url(#flame)" filter="url(#glow)"/>
    <path d="M0 -30 C 12 -12 20 0 18 14 C 16 28 8 34 0 34 C -8 34 -16 28 -18 14 C -20 0 -12 -12 0 -30 Z"
      fill="${p.core}" opacity="0.85"/>
    <ellipse cx="-8" cy="12" rx="4" ry="5.5" fill="#2a1830"/>
    <ellipse cx="8" cy="12" rx="4" ry="5.5" fill="#2a1830"/>
    <circle cx="-6.6" cy="10" r="1.4" fill="#fff"/><circle cx="9.4" cy="10" r="1.4" fill="#fff"/>
    <path d="M-6 22 q6 5 12 0" stroke="#2a1830" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="-15" cy="19" rx="4" ry="2.4" fill="${p.lightEdge}" opacity="0.6"/>
    <ellipse cx="15" cy="19" rx="4" ry="2.4" fill="${p.lightEdge}" opacity="0.6"/>
    <circle cx="0" cy="14" r="46" fill="none" stroke="${p.core}" stroke-width="2" opacity="0.55" stroke-dasharray="4 6"/>
  </g>`;
}

// Jagged shadow creature (danger shape language: spiky, asymmetric).
function shade(p, x, y, s = 1, flip = false) {
  const sx = flip ? -s : s;
  return `
  <g transform="translate(${x} ${y}) scale(${sx} ${s})">
    <path d="M-34 20 L-40 -6 L-26 -2 L-30 -30 L-12 -14 L-6 -42 L6 -16 L22 -36 L22 -8 L40 -14 L32 12 L40 26 Z"
      fill="${p.shadow}" stroke="${p.danger}" stroke-width="1.5" stroke-opacity="0.35"/>
    <path d="M-14 -2 l9 4 l-9 3 z" fill="${p.eyes}"/><path d="M14 -2 l-9 4 l9 3 z" fill="${p.eyes}"/>
  </g>`;
}

// Out-of-light shadows show only their eyes.
function eyes(p, x, y) {
  return `<g transform="translate(${x} ${y})" filter="url(#soft)">
    <path d="M-12 0 l9 4 l-9 3 z" fill="${p.eyes}"/><path d="M12 0 l-9 4 l9 3 z" fill="${p.eyes}"/></g>`;
}

// A Wraith Hound telegraph: red-orange hatched wedge, readable without colour.
function telegraph(p, x, y) {
  return `<g transform="translate(${x} ${y}) rotate(200)">
    <path d="M0 0 L190 -38 L190 38 Z" fill="url(#hatch)" stroke="${p.danger}" stroke-width="2" opacity="0.85"/>
  </g>`;
}

function well(p, x, y) {
  return `
  <g transform="translate(${x} ${y})">
    <ellipse cx="0" cy="-90" rx="46" ry="140" fill="url(#pillar)"/>
    <ellipse cx="0" cy="8" rx="52" ry="16" fill="#000" opacity="0.35"/>
    <path d="M-44 -4 Q-44 18 0 18 Q44 18 44 -4 L44 -18 Q44 -32 0 -32 Q-44 -32 -44 -18 Z" fill="#3d3a5c" stroke="${p.safe}" stroke-width="2"/>
    <ellipse cx="0" cy="-18" rx="40" ry="11" fill="${p.safe}" opacity="0.9" filter="url(#glow)"/>
    <text x="0" y="48" font-size="15" fill="${p.safe}" text-anchor="middle" font-weight="700">WELL</text>
  </g>`;
}

function glintGem(p, x, y) {
  return `<g transform="translate(${x} ${y})" filter="url(#glow)"><path d="M0 -10 L7 0 L0 10 L-7 0 Z" fill="${p.glint}"/></g>`;
}

function hud(p) {
  const meter = 0.62;
  return `
  <g transform="translate(28 26)">
    <rect width="330" height="54" rx="27" fill="${p.ui}" opacity="0.92" stroke="${p.uiEdge}" stroke-width="2"/>
    <g transform="translate(30 27)">
      <path d="M0 -16 C 8 -6 12 0 11 6 C 10 13 5 16 0 16 C -5 16 -10 13 -11 6 C -12 0 -8 -6 0 -16 Z" fill="url(#flame)"/>
    </g>
    <rect x="56" y="19" width="250" height="16" rx="8" fill="#000" opacity="0.45"/>
    <rect x="56" y="19" width="${250 * meter}" height="16" rx="8" fill="url(#meter)"/>
    <text x="64" y="32" font-size="13" font-weight="800" fill="#2a1500">LIGHT 62</text>
  </g>
  <g transform="translate(${W - 188} 26)">
    <rect width="160" height="54" rx="27" fill="${p.ui}" opacity="0.92" stroke="${p.uiEdge}" stroke-width="2"/>
    ${glintGem(p, 34, 27)}
    <text x="58" y="36" font-size="24" font-weight="800" fill="${p.text}">1,240</text>
  </g>
  <g transform="translate(${W / 2} 52)">
    <rect x="-120" y="-24" width="240" height="40" rx="20" fill="${p.ui}" opacity="0.85"/>
    <text x="0" y="3" font-size="17" font-weight="800" fill="${p.text}" text-anchor="middle">Room 3 · Rescue the Soul</text>
  </g>
  <g transform="translate(${W - 96} ${H - 150})">
    <circle r="54" fill="${p.ui}" opacity="0.92" stroke="${p.uiEdge}" stroke-width="3"/>
    <circle r="40" fill="none" stroke="${p.light}" stroke-width="6" stroke-dasharray="180 251" transform="rotate(-90)"/>
    <text y="8" font-size="22" font-weight="900" fill="${p.text}" text-anchor="middle">PULSE</text>
    <text y="80" font-size="14" fill="${p.text}" text-anchor="middle" opacity="0.8">Space / tap</text>
  </g>`;
}

function swatches(p) {
  const keys = ['sky0', 'sky1', 'mid', 'light', 'lightEdge', 'safe', 'eyes', 'danger'];
  let s = `<rect x="0" y="${H}" width="${W}" height="120" fill="#06060c"/>`;
  s += `<text x="28" y="${H + 38}" font-size="26" font-weight="900" fill="#fff">${p.title}</text>`;
  s += `<text x="28" y="${H + 70}" font-size="16" fill="#cfcfe6">${p.note}</text>`;
  keys.forEach((k, i) => {
    const x = 28 + i * 152;
    s += `<rect x="${x}" y="${H + 84}" width="26" height="26" rx="6" fill="${p[k]}" stroke="#ffffff33"/>`;
    s += `<text x="${x + 34}" y="${H + 102}" font-size="13" fill="#cfcfe6">${k} ${p[k]}</text>`;
  });
  return s;
}

function scene(p) {
  const px = 600;
  const py = 470;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 120}" viewBox="0 0 ${W} ${H + 120}"
  font-family="Trebuchet MS, Verdana, sans-serif">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky0}"/><stop offset="1" stop-color="${p.sky1}"/></linearGradient>
    <radialGradient id="flame" cx="0.5" cy="0.65" r="0.65"><stop offset="0" stop-color="${p.core}"/><stop offset="0.45" stop-color="${p.light}"/><stop offset="1" stop-color="${p.lightEdge}"/></radialGradient>
    <radialGradient id="aura" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${p.light}" stop-opacity="0.5"/><stop offset="0.7" stop-color="${p.lightEdge}" stop-opacity="0.12"/><stop offset="1" stop-color="${p.lightEdge}" stop-opacity="0"/></radialGradient>
    <radialGradient id="pillar" cx="0.5" cy="0.6" r="0.5"><stop offset="0" stop-color="${p.safe}" stop-opacity="0.45"/><stop offset="1" stop-color="${p.safe}" stop-opacity="0"/></radialGradient>
    <linearGradient id="meter" x1="0" x2="1"><stop offset="0" stop-color="${p.lightEdge}"/><stop offset="1" stop-color="${p.light}"/></linearGradient>
    <radialGradient id="reveal" cx="${px}" cy="${py}" r="270" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000"/><stop offset="0.55" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient>
    <radialGradient id="reveal2" cx="200" cy="560" r="170" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000"/><stop offset="0.4" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient>
    <mask id="dark"><rect width="${W}" height="${H}" fill="#fff"/>
      <circle cx="${px}" cy="${py}" r="270" fill="url(#reveal)"/>
      <circle cx="200" cy="560" r="170" fill="url(#reveal2)" style="mix-blend-mode:multiply"/></mask>
    <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="10" height="10" fill="${p.danger}" opacity="0.25"/><rect width="4" height="10" fill="${p.danger}" opacity="0.7"/></pattern>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="soft"><feGaussianBlur stdDeviation="1.2"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${fireflies(p, 70, 3)}
  <circle cx="1040" cy="130" r="54" fill="${p.sky1}" stroke="${p.lightEdge}" stroke-opacity="0.25" stroke-width="3"/>
  <text x="1040" y="210" font-size="13" fill="${p.text}" opacity="0.7" text-anchor="middle">the faded sun</text>
  ${hills(360, 60, 160, 11, p.far)}
  ${trees(430, 9, 21, p.mid)}
  ${hills(470, 30, 120, 31, p.mid)}
  <rect x="0" y="470" width="${W}" height="${H - 470}" fill="${p.ground}"/>
  ${grass(p)}
  ${well(p, 200, 590)}
  <circle cx="${px}" cy="${py}" r="270" fill="url(#aura)"/>
  ${glintGem(p, 700, 560)}${glintGem(p, 742, 540)}${glintGem(p, 470, 600)}
  ${shade(p, 790, 470, 1)}
  ${shade(p, 430, 400, 0.8, true)}
  ${telegraph(p, 980, 560)}
  <g opacity="0.88"><rect width="${W}" height="${H}" fill="${p.shadow}" mask="url(#dark)"/></g>
  ${eyes(p, 1000, 560)}${eyes(p, 1120, 420)}${eyes(p, 90, 300)}${eyes(p, 1210, 250)}${eyes(p, 960, 330)}
  <g transform="translate(980 560)"><path d="M-18 -26 L18 -26 L0 -48 Z" fill="${p.danger}"/><text y="-30" font-size="14" font-weight="900" fill="#1a0a00" text-anchor="middle">!</text></g>
  ${spirit(p, px, py)}
  <g transform="translate(905 595)">
    <circle r="20" fill="${p.core}" opacity="0.35" filter="url(#glow)"/>
    <path d="M0 -14 C 6 -6 9 0 8 5 C 7 10 3 12 0 12 C -3 12 -7 10 -8 5 C -9 0 -6 -6 0 -14 Z" fill="${p.core}" opacity="0.9"/>
    <text y="36" font-size="13" fill="${p.text}" text-anchor="middle" font-weight="700">Lost Soul</text>
  </g>
  ${hud(p)}
  ${swatches(p)}
</svg>`;
}

const NAMES = [
  ['Sunfetch', 'Your light is your life. Bring the sun home.', 'No game with this name found in a web search.'],
  ['Glowmote', 'A tiny light against a very big dark.', 'No game with this name found in a web search.'],
  ['Brightling', 'Burn bright, grow strong, bring the sun home.', 'No game found; also a villain surname in Rainbow Six.'],
];

function nameSheet(p) {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="760" viewBox="0 0 ${W} 760" font-family="Trebuchet MS, Verdana, sans-serif">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky0}"/><stop offset="1" stop-color="${p.sky1}"/></linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.core}"/><stop offset="0.5" stop-color="${p.light}"/><stop offset="1" stop-color="${p.lightEdge}"/></linearGradient>
    <filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="8" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="${W}" height="760" fill="url(#bg)"/>
  <text x="40" y="58" font-size="28" font-weight="900" fill="#fff">Title options (Lanternfall is already used by other games)</text>`;
  NAMES.forEach(([n, tag, note], i) => {
    const y = 120 + i * 210;
    s += `<rect x="40" y="${y}" width="${W - 80}" height="180" rx="22" fill="#000" opacity="0.3" stroke="${p.uiEdge}" stroke-opacity="0.5"/>`;
    s += `<text x="80" y="${y + 40}" font-size="20" font-weight="800" fill="${p.uiEdge}">${i + 1}</text>`;
    s += `<text x="${W / 2}" y="${y + 100}" font-size="86" font-weight="900" letter-spacing="4" fill="url(#gold)" stroke="#2a1030" stroke-width="3" paint-order="stroke" text-anchor="middle" filter="url(#glow)">${n.toUpperCase()}</text>`;
    s += `<text x="${W / 2}" y="${y + 140}" font-size="22" fill="${p.text}" text-anchor="middle">${tag}</text>`;
    s += `<text x="${W / 2}" y="${y + 166}" font-size="14" fill="${p.text}" opacity="0.6" text-anchor="middle">${note}</text>`;
  });
  return s + '</svg>';
}

for (const [k, p] of Object.entries(PALETTES)) writeFileSync(out(`palette-${k}.svg`), scene(p));
writeFileSync(out('names.svg'), nameSheet(PALETTES.A));
console.log('wrote palette-A.svg, palette-B.svg, palette-C.svg, names.svg');
