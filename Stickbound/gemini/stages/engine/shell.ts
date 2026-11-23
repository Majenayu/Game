/** The lab page body (panel, touch buttons), filled in for one arena. Styles are in lab.css. */
import type { ArenaDef } from './arena';

export function shellHtml(a: ArenaDef, list: Array<[string, string]>): string {
  return `
<div id="wrap">
  <canvas id="c"></canvas>
  <div id="panel">
    <h1>${a.icon} ${a.name} Lab</h1>
    <label>Arena <select id="arena" class="sel">${list.map(([id, n]) => `<option value="${id}"${id === a.id ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
    <div id="state">Idle</div>
    <div id="info">Free control</div>
    <h2>Controls</h2>
    <div class="row"><kbd>A</kbd><kbd>D</kbd> move · hold <kbd>Shift</kbd> run</div>
    <div class="row"><kbd>W</kbd> / <kbd>Space</kbd> jump · <kbd>S</kbd> lightning shield (raise it just before a hit for a perfect guard)</div>
    <div class="row"><kbd>J</kbd> x4 combo: jab, cross, kick, Rising Volt · air: kick</div>
    <div class="row">After a hit lands, a power key cancels into that power</div>
    <div class="row"><kbd>K</kbd> Volt Hammer · <kbd>L</kbd> Bolt Dash</div>
    <div class="row"><kbd>U</kbd> Spark Step · <kbd>I</kbd> Chain Bolt</div>
    <div class="row"><kbd>O</kbd> Skyfall Strike · <kbd>P</kbd> Thunder God (ultimate)</div>
    <div class="row"><kbd>T</kbd> taunt · <kbd>V</kbd> victory · <kbd>H</kbd> hurt · <kbd>X</kbd> KO</div>
    <div class="row"><kbd>B</kbd> bones · <kbd>G</kbd> hitboxes</div>
    <h2>Preview an animation (loops)</h2>
    <div id="clips"></div>
    <h2>Options</h2>
    <label>Body <select id="build" class="sel"><option value="slim">Slim</option><option value="medium">Medium</option><option value="bold">Bold</option></select></label>
    <label>Speed <span id="speedv">1.00x</span><br /><input id="speed" type="range" min="0.05" max="2" step="0.05" value="1" style="width: 100%" /></label>
    <label><input id="bones" type="checkbox" /> Show bones</label>
    <label><input id="boxes" type="checkbox" /> Show hitboxes and hurtboxes</label>
    <label><input id="dummy" type="checkbox" checked /> Sparring dummy</label>
    <label><input id="fight" type="checkbox" checked /> Dummy fights back</label>
    <h2>Sound</h2>
    <div class="row">Starts on your first click or key press · <kbd>M</kbd> music on/off</div>
    <label><input id="music" type="checkbox" checked /> Arena music</label>
    <label><input id="sfx" type="checkbox" checked /> ${a.sfxLabel}</label>
    <label>Volume <span id="volv">70%</span><br /><input id="vol" type="range" min="0" max="1" step="0.05" value="0.7" style="width: 100%" /></label>
  </div>
</div>
<div id="touch">
  <div class="tl">
    <button data-key="KeyA">◀</button><button data-key="KeyD">▶</button><button data-key="KeyS">🛡</button><button data-key="ShiftLeft">RUN</button>
  </div>
  <div class="tr">
    <button data-key="KeyU">U</button><button data-key="KeyI">I</button><button data-key="KeyO">O</button><button data-key="KeyP">P</button>
    <button data-key="KeyK">K</button><button data-key="KeyL">L</button><button data-key="KeyW">▲</button>
    <button data-key="KeyJ" class="big">J</button>
  </div>
</div>
<button id="menu" aria-label="Lab menu">☰</button>
`;
}
