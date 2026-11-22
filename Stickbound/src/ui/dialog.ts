// In-game dialogs (browser prompt/confirm are blocked or ugly inside portal iframes).
import { btn, h } from './dom';

function layer(): { wrap: HTMLElement; panel: HTMLElement; close: () => void } {
  const wrap = h('div', 'dialog-layer');
  const panel = h('div', 'panel dialog');
  panel.setAttribute('role', 'dialog');
  wrap.appendChild(panel);
  document.getElementById('ui')!.appendChild(wrap);
  return { wrap, panel, close: () => wrap.remove() };
}

export function askText(title: string, initial: string, maxLen = 12): Promise<string | null> {
  return new Promise((resolve) => {
    const { panel, close } = layer();
    panel.appendChild(h('h2', '', title));
    const input = h('input', 'text-in');
    input.value = initial;
    input.maxLength = maxLen;
    input.setAttribute('aria-label', title);
    panel.appendChild(input);
    const row = h('div', 'dialog-row');
    const done = (v: string | null) => {
      close();
      resolve(v);
    };
    row.append(btn('Cancel', () => done(null)), btn('OK', () => done(input.value), 'btn primary'));
    panel.appendChild(row);
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') done(input.value);
      if (e.key === 'Escape') done(null);
    });
    setTimeout(() => {
      input.focus();
      input.select();
    }, 30);
  });
}

export function confirmBox(title: string, text: string, yes = 'Yes', no = 'Cancel'): Promise<boolean> {
  return new Promise((resolve) => {
    const { panel, close } = layer();
    panel.appendChild(h('h2', '', title));
    panel.appendChild(h('p', '', text));
    const row = h('div', 'dialog-row');
    const done = (v: boolean) => {
      close();
      resolve(v);
    };
    const n = btn(no, () => done(false));
    row.append(n, btn(yes, () => done(true), 'btn primary'));
    panel.appendChild(row);
    setTimeout(() => n.focus(), 30);
  });
}

export function infoBox(title: string, lines: string[], ok = 'OK'): Promise<void> {
  return new Promise((resolve) => {
    const { panel, close } = layer();
    panel.appendChild(h('h2', '', title));
    for (const l of lines) panel.appendChild(h('p', '', l));
    const b = btn(ok, () => {
      close();
      resolve();
    }, 'btn primary');
    panel.appendChild(b);
    setTimeout(() => b.focus(), 30);
  });
}
