// Cosmetics sheet (hidden page: ?powers=1&rigs=1): every headgear, back piece, suit pattern, hand effect, aura and win
// pose on the fight rig, on a dark neon floor. Used by the visual review (docs/visual-overhaul/).
import { ELEMENT_IDS, ELEMENTS } from '../content/elements';
import { AURA_NAMES, AURAS, BACKS, DEFAULT_LOOK, HANDS, HATS, SUITS, WIN_POSES, type Look } from '../content/looks';
import { CanvasPen } from '../render/pen';
import { loadParts } from '../render/hero/parts';
import { drawStick, POSES, solve, type Pose } from '../render/rig';
import { makeCanvas } from './powerPreview';
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
/** Hero lineup (?powers=1&rigs=heroes): every element in its three styles, in idle, punch and power poses, large, on
 *  the dark grey of the reference sheets. One column per element (cropped into docs/reference-art/compare/). */
export function showHeroSheet(): void {
  document.body.dataset.screen = 'lab';
  document.getElementById('game')!.style.display = 'none';
  const CW = 420;
  const CH = 300;
  const styles = ['classic', 'striker', 'warden'] as const;
  const poses = ['idle', 'jab1', 'power'];
  const W = CW * ELEMENT_IDS.length;
  const H = CH * styles.length;
  const { c, ctx, dpr } = makeCanvas(W, H);
  c.id = 'heroes';
  document.getElementById('screens')!.replaceChildren(c);
  const pen = new CanvasPen(ctx);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#25262e';
  ctx.fillRect(0, 0, W, H);
  ELEMENT_IDS.forEach((el, col) => {
    const e = ELEMENTS[el];
    styles.forEach((st, row) => {
      poses.forEach((pose, k) => {
        const x = col * CW + 80 + k * 130;
        const y = row * CH + CH - 34;
        ctx.globalCompositeOperation = 'source-over';
        pen.line(x - 34, y + 3, x + 34, y + 3, 8, 0x000000, 0.35);
        const j = solve(POSES[pose] ?? POSES.idle!, x, y, 1, 1.4);
        const o = { look: { ...DEFAULT_LOOK, back: 0, thick: 1 }, element: e.color[0], elementLight: e.color[1], expression: (k === 2 ? 'angry' : 'determined') as 'angry' | 'determined', aura: k === 2 ? 1 : 0.4, time: 1.2 + k, cloth: [] as { x: number; y: number }[], mp: 0.8, el, style: st };
        // let the scarves and capes settle before the visible pass
        for (let i = 0; i < 40; i++) drawStick(pen, j, 1, 1.4, { ...o, alpha: 0 });
        drawStick(pen, j, 1, 1.4, o);
      });
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#c9d2f0';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${e.name} ${['Vanguard', 'Striker', 'Warden'][row]}`, col * CW + 10, row * CH + 22);
    });
  });
}
/** Reference-size compare page (?powers=1&rigs=compare&el=fire|lightning&style=classic): draws the game hero at the
 *  same height and the same panel positions as the Gemini sheet (1376x768), so tools/herocompare3.ps1 can overlay them. */
export async function showCompareSheet(elId: string, style: 'classic' | 'striker' | 'warden'): Promise<void> {
  if (!/legacyart|noparts/.test(location.search)) await loadParts(elId);
  document.body.dataset.screen = 'lab';
  document.getElementById('game')!.style.display = 'none';
  const W = 1376;
  const H = 768;
  const c = document.createElement('canvas');
  c.id = 'cmp';
  c.width = W;
  c.height = H;
  c.style.width = `${W}px`;
  c.style.height = `${H}px`;
  document.getElementById('screens')!.replaceChildren(c);
  const ctx = c.getContext('2d')!;
  const pen = new CanvasPen(ctx);
  const el = ELEMENT_IDS.find((e) => e === elId) ?? 'fire';
  const e = ELEMENTS[el];
  const S = 270 / 142;
  type Cell = [number, number, Pose, 'angry' | 'determined' | 'happy', number];
  const idle = POSES.idle!;
  const stand: Pose = { ...idle, lean: 0, hipY: 62, aSh: 8, aEl: -6, bSh: -8, bEl: -6, aHip: 12, aKn: 3, bHip: -10, bKn: 3 };
  const cells: Record<string, Cell[]> = {
    fire: [
      [160, 365, stand, 'determined', 0.4],
      [395, 365, POSES.stride!, 'angry', 0.4],
      [610, 365, POSES.punchWide!, 'angry', 0.6],
      [910, 365, POSES.guard!, 'determined', 0.4],
      [160, 705, idle, 'determined', 0.4],
      [440, 705, POSES.punchWide!, 'angry', 0.8],
      [910, 705, POSES.horse!, 'angry', 1],
      [1215, 705, POSES.cheer!, 'happy', 0.5],
    ],
    lightning: [
      [160, 345, POSES.stride!, 'determined', 0.4],
      [400, 345, POSES.stride!, 'angry', 0.5],
      [620, 345, POSES.punchWide!, 'angry', 0.7],
      [1215, 415, POSES.win0!, 'happy', 0.5],
      [170, 695, idle, 'determined', 0.4],
      [430, 695, idle, 'determined', 0.5],
      [910, 695, POSES.horse!, 'angry', 1],
    ],
  };
  ctx.fillStyle = '#1b1c25';
  ctx.fillRect(0, 0, W, H);
  for (const [x, y, pose, expr, aura] of cells[el] ?? cells.fire!) {
    ctx.globalCompositeOperation = 'source-over';
    pen.poly(Array.from({ length: 20 }, (_, i) => [x + Math.cos((i / 20) * Math.PI * 2) * 0.225 * 270, y + 4 + Math.sin((i / 20) * Math.PI * 2) * 9]).flat(), 0x000000, 0.35);
    const j = solve(pose, x, y, 1, S);
    const o = { look: { ...DEFAULT_LOOK, back: 0, thick: 1 }, element: e.color[0], elementLight: e.color[1], expression: expr, aura, time: 1.7, cloth: [] as { x: number; y: number }[], mp: 0.8, el, style };
    for (let i = 0; i < 60; i++) drawStick(pen, j, 1, S, { ...o, alpha: 0, time: 1.7 - (60 - i) / 60 });
    drawStick(pen, j, 1, S, o);
  }
}
