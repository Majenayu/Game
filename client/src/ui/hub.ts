import { CHARACTERS } from '@orb/shared';
import { heroArt, heroSvg } from '../art/hero';
import type { Progress } from '../meta/economy';
import { esc, type Ui } from './ui';

const PATHS: Record<string, string> = {
  arenas: 'M5 4l15 15m-4 1l5-5M19 4L4 19m0-4l5 5M3 3l5 2-3 3zM21 3l-5 2 3 3z',
  campaign: 'M4 20V5l6 2 5-3 5 2v14l-5-2-5 3-6-1zm6-13v14m5-17v14',
  loadout: 'M8 4l4-2 4 2 3 5-2 8-5 5-5-5-2-8zM8 10h8M9 14h1m4 0h1',
  shop: 'M3 8h18l-2-5H5L3 8zm1 0v13h16V8M9 21v-7h6v7',
  daily: 'M3 9h18v12H3zM2 5h20v4H2zm10 0v16M12 5C4 5 5-2 9 1l3 4zm0 0c8 0 7-7 3-4l-3 4z',
  quests: 'M7 3h14v18H3V7m4-4v4H3m5 5l2 2 4-4m-6 8h8',
  spin: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 3v6m0 6v6m-9-9h6m6 0h6M6 6l4 4m4 4l4 4M6 18l4-4m4-4l4-4',
  collection: 'M12 2l9 6v8l-9 6-9-6V8l9-6zm0 5l4 5-4 5-4-5 4-5z',
  summons: 'M5 12l-2-7 6 3 3-4 3 4 6-3-2 7 1 6-8 4-8-4 1-6zm3 2h1m6 0h1m-6 4h4',
  dex: 'M12 5C8 2 4 3 2 4v16c4-2 7-2 10 0m0-15c4-3 8-2 10-1v16c-4-2-7-2-10 0V5',
  bestiary: 'M3 18l1-9 5-6 2 6 4-6 2 6 4 1-3 5 2 5-8-2-5 3-4-3zm10-6h1',
  ranked: 'M7 3h10v8a5 5 0 01-10 0V3zm0 2H3v4c0 3 2 4 5 4m9-8h4v4c0 3-2 4-5 4m-4 3v5m-5 0h10',
  chests: 'M3 9l3-5h12l3 5v12H3V9zm0 3h18M9 4v8m6-8v8m-5 0v5h4v-5',
  guild: 'M12 2l9 4v7c0 5-9 9-9 9s-9-4-9-9V6l9-4zm-5 9l4 4 6-7',
  training: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-4 0a5 5 0 11-10 0 5 5 0 0110 0zm-5 0h.01M12 0v5m0 14v5M0 12h5m14 0h5',
  sound: 'M3 9h4l5-5v16l-5-5H3V9zm13-2c4 3 4 7 0 10m3-13c6 5 6 11 0 16',
  muted: 'M3 9h4l5-5v16l-5-5H3V9zm13 0l6 6m0-6l-6 6',
};
export function navIcon(name: string): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[name] ?? PATHS.collection}"/></svg>`;
}

const SUBTITLES: Record<string, string> = {
  arenas: '25 battlegrounds', campaign: 'Eight worlds await', loadout: 'Build your signature',
  shop: 'Find your next upgrade', daily: 'Keep the streak alive', quests: 'Make every round count',
  spin: '10 shared free spins daily', collection: 'Collect. Equip. Evolve.', summons: 'Bring a companion',
  dex: 'Know your advantage', bestiary: 'Meet your next rival', ranked: 'Climb the ladder',
  chests: 'Unbox your rewards', guild: 'Stronger together', training: 'Perfect your aim',
};

/** Reuses every existing destination and event handler; nothing here grants rewards. */
export function mountHub(ui: Ui, pr: Progress): void {
  const menu = document.getElementById('menu')!;
  document.getElementById('champion-slot')!.appendChild(document.getElementById('champ')!);
  menu.querySelectorAll<HTMLButtonElement>('[data-page]').forEach(button => {
    const key = button.dataset.page!;
    button.querySelector('.ic')!.innerHTML = navIcon(key);
    const detail = document.createElement('small');
    detail.textContent = SUBTITLES[key];
    button.appendChild(detail);
    button.setAttribute('aria-label', `${button.textContent?.trim()}`);
  });
  document.getElementById('howto')!.onclick = () => {
    const box = ui.modal(`<div class="eyebrow">FIELD GUIDE</div><h2>Your first elimination starts here.</h2>
      <p>Move, aim, and keep moving. Pick up glowing powerups for temporary advantages.</p>
      <div class="guide-grid"><section><h3>Keyboard &amp; mouse</h3>${UiKeys()}</section>
      <section><h3>Touch controls</h3><p>Drag the left side to move. Drag the right side to aim and fire. Tap a skill to cast it.</p></section></div>
      <p class="sub">Blue marks you and your allies. Red marks opponents. Left skill column: allies. Right: opponents. Training is always available from the hub.</p>`);
    box.classList.add('field-guide');
  };
  const refresh = () => {
    const l = pr.data.loadout;
    document.getElementById('hub-hero')!.innerHTML = heroArt(pr);
    document.getElementById('hub-wing')!.innerHTML = heroSvg({ char: l.char === 'ghost' ? 'bolt' : 'ghost', gear: [] });
    document.getElementById('hub-hero-name')!.textContent = CHARACTERS[l.char]?.name ?? 'Your hero';
    document.getElementById('hub-daily')!.textContent = pr.dailyStatus().canClaim ? 'Daily reward ready' : 'Daily reward claimed';
    document.getElementById('hub-spins')!.textContent = `${pr.spinStatus().left} free spins left`;
    document.getElementById('hub-kit')!.textContent = `${l.skillIds.length} skills equipped`;
    document.getElementById('hub-greeting')!.textContent = pr.data.nick ? `Welcome back, ${pr.data.nick}.` : 'Your arena. Your legend.';
    menu.setAttribute('aria-label', 'Orb Arena home');
  };
  pr.onChange(refresh);
  refresh();
}

function UiKeys(): string {
  return '<p><kbd>W A S D</kbd> or arrow keys to move<br>Mouse to aim · Click to shoot<br><kbd>1</kbd>–<kbd>5</kbd> to cast skills<br><kbd>X</kbd> auto skills · <kbd>P</kbd> pause</p>';
}

const PAGE_GUIDES: Record<string, [string, string]> = {
  arenas: ['CHOOSE YOUR BATTLEGROUND', 'Four ways to win. Pick a mode and arena, then take your place.'],
  campaign: ['A LEGEND IN THE MAKING', 'Explore eight worlds, earn stars, and challenge each world’s champion.'],
  loadout: ['YOUR HERO, YOUR SIGNATURE', 'Choose your orb, gear, and five skills. Preview the kit you will bring into battle.'],
  gear: ['BUILT FOR YOUR PLAYSTYLE', 'Compare your equipment and refine your build without losing your collection.'],
  profile: ['YOUR ARENA STORY', 'Your progression, achievements, and place among the challengers.'],
  collection: ['POWER TAKES PRACTICE', 'Inspect your skills, choose your loadout, and turn duplicates into progress.'],
  fusion: ['FORGE SOMETHING GREATER', 'Review ingredients and the result before committing to a fusion.'],
  encyclopedia: ['KNOW YOUR SKILLS', 'Explore skill kinds, elements, and ranks to plan your next build.'],
  shop: ['THE ARMORY', 'Heroes, equipment, and looks. All purchases use earned in-game coins.'],
  market: ['TRADE WITH INTENT', 'Browse available offers and check prices before spending your coins.'],
  auction: ['THE EXCHANGE', 'Inspect listings and manage your own offers. Online features need a reachable game server.'],
  daily: ['A LITTLE MOMENTUM, EVERY DAY', 'Your login calendar and milestone rewards, all in one place.'],
  quests: ['MAKE EVERY ROUND COUNT', 'Follow daily and weekly objectives. Claim rewards when your progress is complete.'],
  spin: ['LET FORTUNE FIND YOU', 'Six categories. One shared daily allowance. Free in-game rewards, never real-money purchases.'],
  summons: ['NEVER FIGHT ALONE', 'Discover companions, inspect their abilities, and choose who joins your hero.'],
  dex: ['AN EDGE IN THE ARENA', 'Learn pickup symbols, rarity tiers, and the temporary powers they grant.'],
  bestiary: ['KNOW YOUR RIVALS', 'Study the champions, their signatures, and the challenges ahead.'],
  ranked: ['EARN YOUR PLACE', 'Review tiers and your standing. Online competitive play requires the game server.'],
  chests: ['YOUR NEXT DISCOVERY', 'Open earned chests and inspect the rewards added to your collection.'],
  guild: ['STRONGER TOGETHER', 'Find your people, take on shared challenges, and track your guild’s progress.'],
  training: ['FIND YOUR RHYTHM', 'A safe place to test your kit, practice aiming, and learn your skills.'],
  tower: ['ONE FLOOR AT A TIME', 'Prepare your build and see how far your hero can climb.'],
};
export function pageIntro(name: string): string {
  const [title, description] = PAGE_GUIDES[name] ?? ['ORB ARENA', 'Build your next arena moment.'];
  return `<div class="page-intro"><div class="page-symbol">${navIcon(name)}</div><div><div class="eyebrow">${esc(title)}</div><p>${esc(description)}</p></div></div>`;
}
