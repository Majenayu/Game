import { CHARACTERS, WEAPONS, classById } from '@orb/shared';
import { heroArt } from '../art/hero';
import type { Progress } from '../meta/economy';
import { esc, type Ui } from './ui';

/**
 * The home screen's hero stage and profile avatar: your hero exactly as equipped (character, gear, weapon).
 * Redrawn only when the look changes. Clicking the hero opens the Hero page.
 */
export function mountLobbyHero(ui: Ui, progress: Progress): void {
  const stage = document.getElementById('lbhero');
  const avatar = document.getElementById('lbavatar');
  const name = document.getElementById('lbheroname');
  if (!stage || !avatar || !name) return;
  let lastSvg = '';
  let lastName = '';
  const render = () => {
    const svg = heroArt(progress);
    if (svg !== lastSvg) {
      lastSvg = svg;
      // A fixed size (hero art is 5:6) so the image keeps its shape in every layout.
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg width="500" height="600" '));
      stage.innerHTML = `<img alt="" src="${url}" draggable="false" />`;
      avatar.innerHTML = `<img alt="" src="${url}" draggable="false" />`;
    }
    const l = progress.data.loadout;
    const ch = CHARACTERS[l.char]?.name ?? l.char;
    const cls = classById(progress.data.profile.cls)?.name ?? '';
    const weapon = WEAPONS[l.weapon]?.name ?? '';
    const html = `<b>${esc(ch)}</b><span>${esc([cls, weapon].filter(Boolean).join(' · '))}</span>`;
    if (html !== lastName) {
      lastName = html;
      name.innerHTML = html;
    }
  };
  stage.addEventListener('click', () => ui.onPage('loadout'));
  progress.onChange(render);
  render();
}
