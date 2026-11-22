// Store cover art, drawn by the game's own renderer (no screenshots, no third-party art). Opened only by the
// covers test through window.__ek.cover(kind); players never see it.
import { ELEMENTS } from '../content/elements';
import { DEFAULT_LOOK } from '../content/looks';
import { stickPreview } from './preview';
import { h } from './dom';

export function showCover(kind: 'landscape' | 'portrait' | 'square'): void {
  document.getElementById('game')!.style.visibility = 'hidden';
  const el = h('div', `cover cover-${kind}`);
  const W = window.innerWidth;
  const H = window.innerHeight;
  const fire = ELEMENTS.fire.css[0];
  const water = ELEMENTS.water.css[0];
  el.style.background = `radial-gradient(circle at 28% 62%, ${fire}cc, transparent 42%), radial-gradient(circle at 74% 58%, ${water}cc, transparent 42%), linear-gradient(160deg, #1b2a6b, #0d1430 70%)`;
  // burst rays where the two hits meet
  const burst = h('div', 'cover-burst');
  el.appendChild(burst);
  const size = kind === 'landscape' ? H * 0.78 : kind === 'portrait' ? W * 0.62 : W * 0.5;
  const figs = h('div', 'cover-figs');
  const a = stickPreview({ look: { ...DEFAULT_LOOK, hat: 1, back: 1, eyes: 5, mouth: 2, thick: 2 }, element: 'fire', pose: 'power', expression: 'determined', face: 1 }, size * 0.8, size);
  const b = stickPreview({ look: { ...DEFAULT_LOOK, hat: 2, back: 2, eyes: 1, mouth: 4, thick: 2, body: 1 }, element: 'water', pose: 'kick', expression: 'angry', face: -1 }, size * 0.8, size);
  figs.append(a, b);
  el.appendChild(figs);
  const logo = h('div', 'logo cover-logo');
  logo.innerHTML = '<span class="logo-a">ELEMEN</span><span class="logo-b">TICK</span>';
  el.appendChild(logo);
  document.getElementById('screens')!.replaceChildren(el);
}
