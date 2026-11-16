import { DAILY_POOL, WEEKLY_POOL, type Progress } from '../meta/economy';
import { journeyModel } from '../meta/journey';
import { esc, type Ui } from './ui';

/** ROADMAP retention pass: makes existing daily/weekly, campaign and mastery goals discoverable. */
export function mountJourney(ui: Ui, pr: Progress): void {
  const root = document.createElement('details');
  root.id = 'journey';
  let pinned = '';
  try {
    pinned = localStorage.getItem('orb.goal1') ?? '';
    root.open = localStorage.getItem('orb.journeyOpen') === '1';
  } catch { /* Optional device preferences do not gate progress. */ }
  document.querySelector('#menu .hub-content')!.appendChild(root);
  const render = () => {
    const model = journeyModel(pr.data,[...DAILY_POOL,...WEEKLY_POOL],pinned);
    root.innerHTML = `<summary><b>YOUR JOURNEY</b><span>${model.ready ? `${model.ready} quest reward${model.ready > 1 ? 's' : ''} ready` : 'A little closer, every round'}</span></summary>
      <div class="journey-cards">${model.goals.map(g => `<section class="journey-card">
      <div class="eyebrow">${g.label}</div><h3>${esc(g.title)}</h3><p>${esc(g.detail)}</p>
      <div class="journey-progress" role="progressbar" aria-label="${g.label}" aria-valuemin="0" aria-valuemax="${g.total}" aria-valuenow="${g.done}"><span style="width:${Math.min(100,g.done/g.total*100)}%"></span></div>
      <div class="journey-action"><small>${g.done} / ${g.total}</small><button class="ghost" data-journey-go="${g.page}">${g.action} &#8599;</button></div></section>`).join('')}</div>
      <label class="journey-pin">PIN A QUEST TO YOUR JOURNEY
      <select aria-label="Pinned quest"><option value="">Auto · closest to completion</option>${model.quests.map(q => `<option value="${q.id}" ${q.id === pinned ? 'selected' : ''}>${esc(q.def.text)}${q.progress >= q.def.target ? ' · Ready' : ''}</option>`).join('')}</select></label>
      <p class="journey-note">Your existing rewards and progression. Pinning is a device preference, not a new quest or bonus.</p>`;
    root.querySelectorAll<HTMLButtonElement>('[data-journey-go]').forEach(b => b.onclick = () => ui.onPage(b.dataset.journeyGo!));
    root.querySelector('select')!.onchange = e => {
      pinned = (e.target as HTMLSelectElement).value;
      try { localStorage.setItem('orb.goal1',pinned); } catch { /* storage optional */ }
      render();
    };
  };
  root.addEventListener('toggle', () => {
    try { localStorage.setItem('orb.journeyOpen',root.open ? '1' : '0'); } catch { /* storage optional */ }
  });
  pr.onChange(render);
  render();
}
