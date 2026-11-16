import { presentation, type Preferences } from '../presentation';
import { sfx } from '../audio';
import type { Ui } from './ui';

export function mountSettings(ui: Ui): void {
  const button = document.createElement('button');
  button.id = 'settings';
  button.className = 'ghost';
  button.textContent = 'Settings';
  document.getElementById('ui')!.appendChild(button);
  button.addEventListener('click', () => {
    const p = presentation.prefs;
    const toggle = (key: 'motion' | 'shake' | 'colorblind', name: string, detail: string) =>
      `<label class="setting-row"><span><b>${name}</b><small>${detail}</small></span><input type="checkbox" data-pref="${key}" ${p[key] ? 'checked' : ''}></label>`;
    const slider = (key: 'music' | 'effects' | 'voice', name: string) =>
      `<label class="setting-row"><span>${name} <output data-volume="${key}">${Math.round(p[key] * 100)}%</output></span><input aria-label="${name}" type="range" min="0" max="100" value="${p[key] * 100}" data-pref="${key}"></label>`;
    const box = ui.modal(`<h2>Game settings</h2><p class="sub">Tune presentation without changing gameplay or progress.</p>
      <label class="setting-row"><span><b>Graphics quality</b><small>Auto adapts cosmetic detail; danger cues always remain.</small></span>
      <select aria-label="Graphics quality" data-pref="quality">${['auto', 'low', 'medium', 'high'].map(q => `<option value="${q}" ${p.quality === q ? 'selected' : ''}>${q === 'auto' ? `Auto (${presentation.detected})` : q[0].toUpperCase() + q.slice(1)}</option>`).join('')}</select></label>
      ${toggle('motion', 'Animation', 'Reduces ambient movement and effect travel.')}
      ${toggle('shake', 'Camera shake', 'Restrained impact feedback; disabled when animation is off.')}
      ${toggle('colorblind', 'Team shape cues', 'Adds geometry cues alongside blue and red ownership.')}
      <h3>Audio mix</h3>${slider('music', 'Music')}${slider('effects', 'Sound effects')}${slider('voice', 'Skill voice')}
      <p class="sub">The mute button and CrazyGames platform mute always override this mix.</p>`);
    box.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-pref]').forEach(input => {
      input.addEventListener('input', () => {
        const key = input.dataset.pref as keyof Preferences;
        const value = input instanceof HTMLInputElement && input.type === 'checkbox'
          ? input.checked
          : key === 'quality' ? input.value : Number(input.value) / 100;
        presentation.update({ [key]: value });
        const output = box.querySelector(`[data-volume="${key}"]`);
        if (output) output.textContent = `${Math.round(Number(value) * 100)}%`;
        sfx.refreshMix();
      });
    });
  });
}
