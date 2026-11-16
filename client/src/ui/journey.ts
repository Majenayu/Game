import { DAILY_POOL, WEEKLY_POOL, type Progress } from '../meta/economy';
import { journeyModel } from '../meta/journey';
import { esc, type Ui } from './ui';

export function mountJourney(ui: Ui, progress: Progress): void {
  const root = document.createElement('details');
  root.id = 'journey';
  let pinned = '';
  try {
    pinned = localStorage.getItem('orb.goal1') ?? '';
    root.open = localStorage.getItem('orb.journeyOpen') === '1';
  } catch {
    // Device-only preferences are optional.
  }
  document.getElementById('menu')!.appendChild(root);
  const render = () => {
    const model = journeyModel(progress.data, [...DAILY_POOL, ...WEEKLY_POOL], pinned);
    root.innerHTML = `<summary><b>Your Journey</b><span>${model.ready ? `${model.ready} reward ready` : 'Existing goals at a glance'}</span></summary>
      <div class="journey-cards">${model.goals.map(goal => `<section class="journey-card">
        <small>${goal.label}</small><b>${esc(goal.title)}</b><p>${esc(goal.detail)}</p>
        <div class="journey-progress" role="progressbar" aria-label="${goal.label}" aria-valuemin="0" aria-valuemax="${goal.total}" aria-valuenow="${goal.done}"><span style="width:${Math.min(100, goal.done / goal.total * 100)}%"></span></div>
        <div><em>${goal.done} / ${goal.total}</em><button class="ghost" data-journey-go="${goal.page}">${goal.action}</button></div>
      </section>`).join('')}</div>
      <label class="journey-pin">Pinned quest <select aria-label="Pinned quest"><option value="">Closest to completion</option>${model.quests.map(q => `<option value="${q.id}" ${q.id === pinned ? 'selected' : ''}>${esc(q.def.text)}</option>`).join('')}</select></label>
      <p class="journey-note">This view only presents existing progress and rewards.</p>`;
    root.querySelectorAll<HTMLButtonElement>('[data-journey-go]').forEach(button => {
      button.onclick = () => ui.onPage(button.dataset.journeyGo!);
    });
    root.querySelector<HTMLSelectElement>('select')!.onchange = event => {
      pinned = (event.target as HTMLSelectElement).value;
      try { localStorage.setItem('orb.goal1', pinned); } catch { /* optional */ }
      render();
    };
  };
  root.addEventListener('toggle', () => {
    try { localStorage.setItem('orb.journeyOpen', root.open ? '1' : '0'); } catch { /* optional */ }
  });
  progress.onChange(render);
  render();
}
