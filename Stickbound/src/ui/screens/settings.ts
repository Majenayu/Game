// Settings: sound, motion and readability options, controls (remappable keys), save code export/import.
import { audio } from '../../audio/synth';
import { ACTION_LABEL, ACTIONS, SOLO_KEYS, type Action } from '../../core/input';
import { app, saveProfile, syncLooks } from '../../app/state';
import { newProfile } from '../../meta/profile';
import { saveSettings, settings, type Settings } from '../../meta/settings';
import { btn, h, toast } from '../dom';
import { askText, confirmBox, infoBox } from '../dialog';
import { frame, show } from '../router';
import { showLobby } from './lobby';
import { showStarter } from './firstRun';

type BoolKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

const TOGGLES: [BoolKey, string, string][] = [
  ['shake', 'Screen shake', 'Camera shake on big hits.'],
  ['reducedMotion', 'Reduced motion', 'No slow motion, zoom pulses or menu bobbing.'],
  ['reducedFlash', 'Reduced flashing', 'Softer hit flashes and fewer sparks.'],
  ['damageNumbers', 'Damage numbers', 'Show the damage of each hit.'],
  ['oneHand', 'One-handed touch', 'All touch buttons in one column on the right.'],
  ['largeText', 'Large text', 'Bigger menu and HUD text.'],
  ['highContrast', 'High contrast', 'Stronger outlines and colours in menus and HUD.'],
  ['lowGraphics', 'Low graphics', 'Fewer particles and lights, no lobby animations. For slower devices.'],
];

export function keyName(code: string): string {
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Arrow/, '').replace('ShiftLeft', 'L-Shift').replace('ShiftRight', 'R-Shift').replace(/^Numpad/, 'Num ');
}

export function showSettings(back: () => void = showLobby): void {
  const { el, body } = frame('settings', 'Settings', back);
  // sound
  const snd = h('div', 'panel');
  snd.appendChild(h('h3', '', 'Sound'));
  const slider = (label: string, get: () => number, set: (v: number) => void) => {
    const row = h('label', 'set-row');
    row.appendChild(h('span', '', label));
    const r = h('input');
    r.type = 'range';
    r.min = '0';
    r.max = '100';
    r.value = String(Math.round(get() * 100));
    r.addEventListener('input', () => {
      set(Number(r.value) / 100);
      audio.musicVol = settings.musicVol;
      audio.sfxVol = settings.sfxVol;
      audio.applyVolumes();
    });
    r.addEventListener('change', () => {
      saveSettings();
      audio.sfx('ui');
    });
    row.appendChild(r);
    snd.appendChild(row);
  };
  slider('Music', () => settings.musicVol, (v) => (settings.musicVol = v));
  slider('Effects', () => settings.sfxVol, (v) => (settings.sfxVol = v));
  body.appendChild(snd);

  // options
  const opt = h('div', 'panel');
  opt.appendChild(h('h3', '', 'Display and accessibility'));
  for (const [k, label, hint] of TOGGLES) {
    const b = btn(`<b>${label}</b><small>${hint}</small><span class="tog">${settings[k] ? 'On' : 'Off'}</span>`, () => {
      settings[k] = !settings[k];
      saveSettings();
      showSettings(back);
    }, `btn toggle ${settings[k] ? 'on' : ''}`);
    b.setAttribute('aria-pressed', String(settings[k]));
    opt.appendChild(b);
  }
  const timer = h('div', 'set-row');
  timer.appendChild(h('span', '', 'Round timer'));
  for (const s of [45, 60, 90]) {
    timer.appendChild(btn(`${s}s`, () => {
      settings.timerSec = s;
      saveSettings();
      showSettings(back);
    }, `btn chip ${settings.timerSec === s ? 'on' : ''}`));
  }
  opt.appendChild(timer);
  body.appendChild(opt);

  // controls
  const ctl = h('div', 'panel');
  ctl.appendChild(h('h3', '', 'Keyboard (solo)'));
  ctl.appendChild(h('p', 'hint', 'Click a key to change it, then press the new key. Gamepads work too: A attack, X heavy, B dash, Y tag, LT guard, LB / RB / RT powers.'));
  const grid = h('div', 'key-grid');
  for (const a of ACTIONS) {
    const row = h('div', 'key-row');
    row.appendChild(h('span', '', ACTION_LABEL[a]));
    row.appendChild(btn(settings.keys[a].map(keyName).join(' / '), () => remap(a, back), 'btn key'));
    grid.appendChild(row);
  }
  ctl.appendChild(grid);
  ctl.appendChild(btn('Reset keys', () => {
    settings.keys = structuredClone(SOLO_KEYS);
    saveSettings();
    showSettings(back);
  }, 'btn small'));
  body.appendChild(ctl);

  // save
  const sv = h('div', 'panel');
  sv.appendChild(h('h3', '', 'Save'));
  sv.appendChild(h('p', 'hint', 'Your progress saves on this device automatically. A save code moves it to another browser.'));
  const row = h('div', 'set-actions');
  row.append(
    btn('Copy save code', async () => {
      const code = app.save.exportCode(app.profile);
      try {
        await navigator.clipboard.writeText(code);
        toast('Save code copied.');
      } catch {
        await infoBox('Your save code', [code]);
      }
    }, 'btn small'),
    btn('Load save code', async () => {
      const code = await askText('Paste a save code', '', 200000);
      if (!code) return;
      try {
        app.profile = app.save.importCode(code);
        saveProfile();
        syncLooks();
        toast('Save loaded.');
        showLobby();
      } catch (e) {
        toast((e as Error).message || 'That code did not work.');
      }
    }, 'btn small'),
    btn('Delete save', async () => {
      if (!(await confirmBox('Delete save?', 'All avatars, coins and progress on this device will be gone. This cannot be undone.', 'Delete', 'Keep'))) return;
      app.save.remove(1);
      app.profile = newProfile('Player');
      saveProfile();
      showStarter();
    }, 'btn small danger'),
  );
  sv.appendChild(row);
  body.appendChild(sv);
  const about = h('div', 'panel');
  about.appendChild(h('h3', '', 'About'));
  about.appendChild(h('p', 'hint', 'Elementick by majen. All art is drawn in code and all sound is synthesized live. Built with Phaser (MIT licence).'));
  body.appendChild(about);
  show({ id: 'settings', el, back });
}

function remap(a: Action, back: () => void): void {
  const layer = h('div', 'dialog-layer');
  const panel = h('div', 'panel dialog');
  panel.appendChild(h('h2', '', `Press a key for: ${ACTION_LABEL[a]}`));
  panel.appendChild(h('p', 'hint', 'Escape cancels.'));
  layer.appendChild(panel);
  document.getElementById('ui')!.appendChild(layer);
  const onKey = (e: KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.removeEventListener('keydown', onKey, true);
    layer.remove();
    if (e.code === 'Escape') return showSettings(back);
    // a key can only do one thing: remove it from other actions
    for (const other of ACTIONS) settings.keys[other] = settings.keys[other].filter((k) => k !== e.code);
    settings.keys[a] = [e.code];
    saveSettings();
    showSettings(back);
  };
  window.addEventListener('keydown', onKey, true);
}
