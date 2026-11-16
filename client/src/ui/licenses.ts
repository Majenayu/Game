import type { Ui } from './ui';

export function showLicenses(ui: Ui): void {
  ui.modal(`<div class="eyebrow">BUILT WITH CARE</div><h2>Credits &amp; licenses</h2>
    <p>Orb Arena’s hero silhouettes, arena presentation, vector effects, synthesized music and sounds are original code-based artwork. No external image or audio service is used.</p>
    <h3>Existing artwork</h3>
    <p>Fluent Emoji Flat © Microsoft Corporation, MIT.
    <a href="https://github.com/microsoft/fluentui-emoji" target="_blank" rel="noopener noreferrer">Source</a> ·
    <a href="licenses/fluent-mit.txt" target="_blank" rel="noopener noreferrer">MIT notice</a>.</p>
    <p>Game-icons.net artwork by Lorc, Delapouite and contributors, licensed under
    <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a>.
    <a href="https://game-icons.net" target="_blank" rel="noopener noreferrer">Source and author credits</a>.
    Selected silhouettes are recolored, scaled and assembled into gear, summons and effects.</p>
    <h3>Bundled fonts and engine</h3>
    <p><a href="licenses/cinzel.txt" target="_blank" rel="noopener noreferrer">Cinzel · OFL 1.1</a> ·
    <a href="licenses/rajdhani.txt" target="_blank" rel="noopener noreferrer">Rajdhani · OFL 1.1</a> ·
    <a href="licenses/bangers.txt" target="_blank" rel="noopener noreferrer">Bangers · OFL 1.1</a> ·
    <a href="licenses/phaser.txt" target="_blank" rel="noopener noreferrer">Phaser · MIT</a></p>
    <p class="sub">All rewards use free in-game currency. No real-money purchases or paid loot boxes.</p>`);
}
