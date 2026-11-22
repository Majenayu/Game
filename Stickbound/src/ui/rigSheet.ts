// Cosmetics sheet (hidden page: ?powers=1&rigs=1): every headgear, back piece, suit pattern, hand effect, aura and win
// pose on the fight rig, on a dark neon floor. Used by the visual review (docs/visual-overhaul/).
import { ELEMENT_IDS, ELEMENTS } from '../content/elements';
import { AURA_NAMES, AURAS, BACKS, DEFAULT_LOOK, HANDS, HATS, SUITS, WIN_POSES, type Look } from '../content/looks';
import { CanvasPen } from '../render/pen';
import { drawStick, POSES, solve } from '../render/rig';
import { makeCanvas } from './powerPreview';
import { mixC, RimPen } from '../render/rimPen';
export function showRigSheet(): void {
  document.body.dataset.screen = 'lab';
  document.getElementById('game')!.style.display = 'none';
  const rows: [string, keyof Look, string[]][] = [
    ['Headgear', 'hat', HATS],
    ['Back', 'back', BACKS],
    ['Suit', 'suit', SUITS],
    ['Hands', 'hand', HANDS],
    ['Aura', 'aura', AURA_NAMES],
    ['Win pose', 'pose', WIN_POSES],
  ];
  const CW = 120;
  const CH = 190;
  const cols = 13;
  const W = CW * cols + 110;
  const H = CH * (rows.length + 1) + 20;
  const { c, ctx, dpr } = makeCanvas(W, H);
  c.id = 'rigs';
  document.getElementById('screens')!.replaceChildren(c);
  const pen = new CanvasPen(ctx);
  const rim = new RimPen(pen);
  const draw = (time: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(0, 0, W, H);
    const cell = (row: number, col: number, look: Look, el: number, pose: string, label: string, zombie = false, boss = false) => {
      const x = 110 + col * CW + CW / 2;
      const y = 10 + row * CH + CH - 26;
      ctx.globalCompositeOperation = 'source-over';
      pen.line(x - 50, y + 2, x + 50, y + 2, 2, 0x5a7cff, 0.5);
      const e = ELEMENTS[ELEMENT_IDS[el % ELEMENT_IDS.length]!];
      const s = boss ? 1.25 : 1;
      const j = solve(POSES[pose] ?? POSES.idle!, x, y, 1, s);
      const aura = AURAS[look.aura] || e.color[0];
      const o = { look, element: aura, elementLight: e.color[1], expression: 'determined' as const, aura: 0.5, time, cloth: [], mp: 0.8, zombie, boss };
      rim.color = mixC(e.color[1], 0xffffff);
      drawStick(rim, j, 1, s, o);
      drawStick(pen, j, 1, s, o);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#b9c4ea';
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y + 18);
    };
    rows.forEach(([name, key, names], row) => {
      ctx.fillStyle = '#ffd84a';
      ctx.font = '800 14px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(name, 8, 10 + row * CH + CH / 2);
      names.forEach((label, i) => {
        if (i >= cols) return;
        const look: Look = { ...DEFAULT_LOOK, back: key === 'back' ? i : 0, [key]: i } as Look;
        cell(row, i, look, i, key === 'pose' ? `win${i}` : 'idle', label);
      });
    });
    const row = rows.length;
    ctx.fillStyle = '#ffd84a';
    ctx.fillText('Enemies', 8, 10 + row * CH + CH / 2);
    cell(row, 0, { ...DEFAULT_LOOK, back: 0 }, 0, 'zombie', 'Cyber zombie', true);
    cell(row, 1, { ...DEFAULT_LOOK, back: 0, hat: 5 }, 3, 'zombie', 'Zombie boss', true, true);
    cell(row, 2, { ...DEFAULT_LOOK, back: 5, hat: 10, suit: 5, hand: 6 }, 8, 'guard', 'Champion boss', false, true);
  };
  draw(1.3);
}