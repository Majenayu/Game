// Cuts the trial heroes' parts out of the owner's Gemini sheets (gemini/avatar/generated refernce/).
// The sheets have a dark gradient background, not transparency. The background colour is estimated per row from
// the left edge; pixels reachable from the border through background-like colours become transparent, and the
// glow halo around each part fades out (alpha from the colour difference to the background).
// Run from Stickbound/:
//   node gemini/parts/trial/cut.mjs scan        -> lists the parts found on each sheet, writes parts/<el>/_scan.png
//   node gemini/parts/trial/cut.mjs             -> writes parts/<el>/<name>.png and parts/meta.json from PICKS
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const SHEETS = join(here, '..', '..', 'avatar', 'generated refernce');
const OUT = join(here, 'parts');
const G = 'Gemini_Generated_Image_';
export const SHEET = {
  fire: `${G}tom1c9tom1c9tom1.png`,
  water: `${G}tom1c9tom1c9tom1 (1).png`,
  ice: `${G}tom1c9tom1c9tom1 (2).png`,
  wind: `${G}tom1c9tom1c9tom1 (3).png`,
  earth: `${G}bf0oa0bf0oa0bf0o.png`,
  leaf: `${G}yjevtiyjevtiyjev.png`,
  light: `${G}nyu90nnyu90nnyu9.png`,
  gravity: `${G}nyu90nnyu90nnyu9 (1).png`,
  time: `${G}nyu90nnyu90nnyu9 (2).png`,
};
/**
 * Which scanned part (index in the scan list, numbered left to right inside rows) becomes which named piece.
 * Head names: head_normal, head_attack, head_hurt, head_ko. Filled in after looking at the scan images.
 */
import { PICKS } from './picks.mjs';

/** colour difference that counts as fully part (not background or glow) */
const SOLID = 80;
/** below this difference a pixel is plain background */
const BG = 14;
/** outline gaps up to about twice this many px are closed before the background fill */
const CLOSE = 3;

async function load(el) {
  const { data, info } = await sharp(join(SHEETS, SHEET[el])).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}
/** Per-row background colour: median of the 12 left-most pixels (no part touches the left edge). */
function background(img) {
  const { data, w, h } = img;
  const bg = new Float32Array(h * 3);
  for (let y = 0; y < h; y++) {
    for (let c = 0; c < 3; c++) {
      const v = [];
      for (let x = 0; x < 12; x++) v.push(data[(y * w + x) * 3 + c]);
      v.sort((a, b) => a - b);
      bg[y * 3 + c] = v[6];
    }
  }
  // smooth over rows
  const out = new Float32Array(h * 3);
  for (let y = 0; y < h; y++)
    for (let c = 0; c < 3; c++) {
      let s = 0, n = 0;
      for (let k = -8; k <= 8; k++) {
        const yy = y + k;
        if (yy < 0 || yy >= h) continue;
        s += bg[yy * 3 + c];
        n++;
      }
      out[y * 3 + c] = s / n;
    }
  return out;
}
/** RGBA with the background removed. */
function matte(img) {
  const { data, w, h } = img;
  const bg = background(img);
  const diff = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let d = 0;
      for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(data[i * 3 + c] - bg[y * 3 + c]));
      diff[i] = d;
    }
  // walls: solid pixels grown by CLOSE px, so thin or faint outline spots do not let the fill leak into a dark face
  const wall = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (diff[y * w + x] < SOLID) continue;
      for (let dy = -CLOSE; dy <= CLOSE; dy++)
        for (let dx = -CLOSE; dx <= CLOSE; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h) wall[yy * w + xx] = 1;
        }
    }
  // outside: reachable from the border without crossing a wall
  const outside = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (outside[i] || wall[i]) continue;
    outside[i] = 1;
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }
  // the wall ring next to the outside is glow too: grow outside into non-solid wall pixels it touches
  for (let pass = 0; pass < CLOSE; pass++) {
    const add = [];
    for (let i = 0; i < w * h; i++) {
      if (outside[i] || diff[i] >= SOLID) continue;
      const x = i % w;
      if ((x > 0 && outside[i - 1]) || (x < w - 1 && outside[i + 1]) || (i >= w && outside[i - w]) || (i < w * (h - 1) && outside[i + w])) add.push(i);
    }
    for (const i of add) outside[i] = 1;
  }
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let a = 1;
      if (outside[i]) a = diff[i] <= BG ? 0 : Math.min(1, (diff[i] - BG) / (SOLID - BG));
      for (let c = 0; c < 3; c++) {
        const b = bg[y * 3 + c];
        const v = data[i * 3 + c];
        // un-mix the background so the glow keeps its own colour on any arena
        rgba[i * 4 + c] = a > 0 ? Math.max(0, Math.min(255, Math.round(b + (v - b) / a))) : 0;
      }
      rgba[i * 4 + 3] = Math.round(a * 255);
    }
  return { rgba, w, h };
}
/** Connected groups of visible pixels (alpha > 40%), merged when closer than 10 px; sorted into rows. */
function scan(m) {
  const { rgba, w, h } = m;
  const on = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) on[i] = rgba[i * 4 + 3] > 100 ? 1 : 0;
  const lab = new Int32Array(w * h).fill(-1);
  const boxes = [];
  for (let s = 0; s < w * h; s++) {
    if (!on[s] || lab[s] >= 0) continue;
    const id = boxes.length;
    const b = { x0: w, y0: h, x1: 0, y1: 0, n: 0 };
    const st = [s];
    lab[s] = id;
    while (st.length) {
      const i = st.pop();
      const x = i % w;
      const y = (i / w) | 0;
      b.n++;
      if (x < b.x0) b.x0 = x;
      if (x > b.x1) b.x1 = x;
      if (y < b.y0) b.y0 = y;
      if (y > b.y1) b.y1 = y;
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (on[j] && lab[j] < 0) {
            lab[j] = id;
            st.push(j);
          }
        }
    }
    boxes.push(b);
  }
  let list = boxes.filter((b) => b.n > 150);
  // merge boxes that nearly touch (flame tips, drops, leaves)
  const near = (a, b) => a.x0 - 12 <= b.x1 && b.x0 - 12 <= a.x1 && a.y0 - 12 <= b.y1 && b.y0 - 12 <= a.y1;
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < list.length && !merged; i++)
      for (let j = i + 1; j < list.length && !merged; j++)
        if (near(list[i], list[j])) {
          const a = list[i], b = list[j];
          list[i] = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1), n: a.n + b.n };
          list.splice(j, 1);
          merged = true;
        }
  }
  list.sort((a, b) => a.y0 + a.y1 - (b.y0 + b.y1));
  // rows: a box joins the current row if its vertical centre is inside the row's band
  const rows = [];
  for (const b of list) {
    const cy = (b.y0 + b.y1) / 2;
    const r = rows.find((r) => cy >= r.y0 - 20 && cy <= r.y1 + 20);
    if (r) {
      r.items.push(b);
      r.y0 = Math.min(r.y0, b.y0);
      r.y1 = Math.max(r.y1, b.y1);
    } else rows.push({ y0: b.y0, y1: b.y1, items: [b] });
  }
  const out = [];
  for (const r of rows) out.push(...r.items.sort((a, b) => a.x0 - b.x0));
  return out;
}
function crop(m, b, pad = 6) {
  const x0 = Math.max(0, b.x0 - pad), y0 = Math.max(0, b.y0 - pad);
  const x1 = Math.min(m.w - 1, b.x1 + pad), y1 = Math.min(m.h - 1, b.y1 + pad);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) m.rgba.copy(px, y * w * 4, ((y0 + y) * m.w + x0) * 4, ((y0 + y) * m.w + x1 + 1) * 4);
  return { px, w, h, x0, y0 };
}
/** Head circle from the chin: lowest row, then the chord widths just above it. Returns centre and radius in crop px. */
function headCircle(c) {
  const { px, w, h } = c;
  const a = (x, y) => px[(y * w + x) * 4 + 3] > 128;
  // middle third of the crop holds the chin
  let chin = -1, cx = 0;
  for (let y = h - 1; y >= 0 && chin < 0; y--) {
    let s = 0, n = 0;
    for (let x = 0; x < w; x++) if (a(x, y)) { s += x; n++; }
    if (n >= 3) { chin = y; cx = s / n; }
  }
  // lowest opaque pixel per column, followed out from the chin while the edge stays smooth (stops at hair, tails)
  const low = (x) => {
    for (let y = h - 1; y >= 0; y--) if (a(x, y)) return y;
    return -1;
  };
  const pts = [];
  // the face side only (+x): hair, tails and scarves trail on the back side and can join the lower edge there
  for (const step of [1]) {
    let prev = chin;
    for (let x = Math.round(cx); x >= 0 && x < w; x += step) {
      const y = low(x);
      if (y < 0 || Math.abs(y - prev) > 6 || chin - y > 60) break;
      pts.push([x, y]);
      prev = y;
    }
  }
  // least-squares circle through the lower arc (Kasa fit): x^2 + y^2 + D x + E y + F = 0
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
  for (const [x, y] of pts) {
    const z = x * x + y * y;
    sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z;
  }
  const n = pts.length;
  const M = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]];
  const v = [-sxz, -syz, -sz];
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const d0 = det(M);
  const col = (k) => M.map((row, i) => row.map((e, j) => (j === k ? v[i] : e)));
  const D = det(col(0)) / d0, E = det(col(1)) / d0, F = det(col(2)) / d0;
  const ccx = -D / 2, ccy = -E / 2;
  const r = Math.sqrt(ccx * ccx + ccy * ccy - F);
  return { cx: Math.round(ccx), cy: Math.round(ccy), r: Math.round(r) };
}

const mode = process.argv[2] ?? 'cut';
const only = process.argv[3];
const meta = {};
for (const el of Object.keys(SHEET)) {
  if (only && only !== el) continue;
  const img = await load(el);
  const m = matte(img);
  const list = scan(m);
  mkdirSync(join(OUT, el), { recursive: true });
  if (mode === 'scan') {
    console.log(el, list.map((b, i) => `${i}:[${b.x0},${b.y0},${b.x1},${b.y1}]`).join(' '));
    // preview: the matte on a checker with numbered boxes
    const svg = `<svg width="${m.w}" height="${m.h}" xmlns="http://www.w3.org/2000/svg">${list
      .map((b, i) => `<rect x="${b.x0}" y="${b.y0}" width="${b.x1 - b.x0}" height="${b.y1 - b.y0}" fill="none" stroke="#ff0" stroke-width="2"/><text x="${b.x0 + 4}" y="${b.y0 + 26}" font-size="28" font-family="Arial" fill="#ff0" stroke="#000" stroke-width="1">${i}</text>`)
      .join('')}</svg>`;
    await sharp({ create: { width: m.w, height: m.h, channels: 4, background: { r: 90, g: 120, b: 90, alpha: 1 } } })
      .composite([{ input: m.rgba, raw: { width: m.w, height: m.h, channels: 4 } }, { input: Buffer.from(svg) }])
      .png()
      .toFile(join(OUT, el, '_scan.png'));
    continue;
  }
  const picks = PICKS[el];
  meta[el] = {};
  for (const [name, idx] of Object.entries(picks)) {
    // a pick is a scan index, a list of indices (merged), or { box: [x0, y0, x1, y1] } for parts the scan joined
    const boxes = idx.box ? [{ x0: idx.box[0], y0: idx.box[1], x1: idx.box[2], y1: idx.box[3] }] : (Array.isArray(idx) ? idx : [idx]).map((i) => list[i]);
    const b = { x0: Math.min(...boxes.map((b) => b.x0)), y0: Math.min(...boxes.map((b) => b.y0)), x1: Math.max(...boxes.map((b) => b.x1)), y1: Math.max(...boxes.map((b) => b.y1)) };
    const c = crop(m, b);
    await sharp(c.px, { raw: { width: c.w, height: c.h, channels: 4 } }).png().toFile(join(OUT, el, `${name}.png`));
    const info = { w: c.w, h: c.h };
    if (name.startsWith('head_')) Object.assign(info, headCircle(c));
    meta[el][name] = info;
  }
  // the four faces share one layout: use the median circle for all, so a stray fit (crystals, hair) cannot resize one face
  const heads = Object.keys(meta[el]).filter((k) => k.startsWith('head_'));
  const mid = heads.map((k) => meta[el][k]).sort((a, b) => a.r - b.r)[heads.length >> 1];
  for (const k of heads) Object.assign(meta[el][k], { cx: mid.cx, cy: mid.cy, r: mid.r });
  console.log(el, Object.keys(picks).join(' '));
}
if (mode !== 'scan') writeFileSync(join(OUT, only ? `meta-${only}.json` : 'meta.json'), JSON.stringify(meta, null, 1));
