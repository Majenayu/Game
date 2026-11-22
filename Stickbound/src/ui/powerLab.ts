// Power Lab (hidden page: ?powers=1). Plays every power on a dummy with pause and frame-step controls, and renders
// frame-exact 6-panel contact sheets (window.__lab.sheet) for docs/powers-sheet/. ?powers=1&play=<id> loops one power
// full screen (used to record the flagship videos).
import { ELEMENT_IDS, ELEMENTS, type ElementId } from '../content/elements';
import { DEFAULT_LOOK } from '../content/looks';
import { ARCHETYPE_IDS, ARCHETYPES, mechanicOf, POWER_TEXT, powerById, powersFor, type Archetype } from '../content/powers';
import { makeCanvas, PowerStage } from './powerPreview';
import { btn, h } from './dom';

interface Target {
  el: ElementId;
  arch: Archetype;
  slot: number;
}

function find(id: string): Target | null {
  for (const el of ELEMENT_IDS)
    for (const arch of ARCHETYPE_IDS) {
      const slot = powersFor(el, arch).findIndex((p) => p.id === id);
      if (slot >= 0) return { el, arch, slot };
    }
  return null;
}

const LOOK = { ...DEFAULT_LOOK, hat: 1, back: 1, eyes: 5, thick: 2 };

export function showPowerLab(): void {
  document.body.dataset.screen = 'lab';
  document.getElementById('game')!.style.display = 'none';
  const params = new URLSearchParams(location.search);
  const playOnly = params.get('play');
  const root = h('div', `lab screen ${playOnly ? 'play' : ''}`);
  document.getElementById('screens')!.replaceChildren(root);

  const W = playOnly ? window.innerWidth : Math.min(960, window.innerWidth - 300);
  const H = playOnly ? window.innerHeight : Math.round(W * 0.5625);
  const { c, ctx, dpr } = makeCanvas(W, H);
  c.className = 'lab-canvas';
  let cur: Target = (playOnly && find(playOnly)) || { el: 'fire', arch: 'classic', slot: 0 };
  let stage = new PowerStage(ctx, W, H, dpr, { element: cur.el, archetype: cur.arch, look: LOOK, span: playOnly ? 820 : 700 });
  let paused = false;
  let all = !playOnly;
  const info = h('div', 'lab-info');
  const setInfo = () => {
    const mv = stage.set[stage.slot]!;
    info.innerHTML = `<b>${mv.name}</b> · ${ELEMENTS[cur.el].name} ${ARCHETYPES[cur.arch].name} · power ${stage.slot + 1} · <em>${mechanicOf(mv)}</em><br><small>${POWER_TEXT[mv.id] ?? ''} · frame ${stage.t % 150}</small>`;
  };
  const load = (t: Target, cycleAll = false) => {
    cur = t;
    stage = new PowerStage(ctx, W, H, dpr, { element: t.el, archetype: t.arch, look: LOOK, span: playOnly ? 820 : 700 });
    stage.only = cycleAll ? null : t.slot;
    stage.slot = t.slot;
    setInfo();
  };
  load(cur, false);

  if (!playOnly) {
    const side = h('div', 'lab-side');
    side.appendChild(h('h2', '', 'Power Lab'));
    const ctl = h('div', 'lab-ctl');
    ctl.append(
      btn('Pause / play', () => (paused = !paused), 'btn small'),
      btn('+1 frame', () => {
        paused = true;
        stage.tick();
        stage.fx.update();
        setInfo();
      }, 'btn small'),
      btn('+10', () => {
        paused = true;
        for (let i = 0; i < 10; i++) {
          stage.tick();
          stage.fx.update();
        }
        setInfo();
      }, 'btn small'),
      btn('Restart', () => load(cur), 'btn small'),
      btn('Play all 90', () => (all = !all), 'btn small'),
    );
    side.appendChild(ctl);
    for (const el of ELEMENT_IDS) {
      const g = h('div', 'lab-el');
      g.appendChild(h('h3', '', ELEMENTS[el].name));
      for (const arch of ARCHETYPE_IDS) {
        const row = h('div', 'lab-row');
        row.appendChild(h('span', 'lab-arch', ARCHETYPES[arch].name));
        powersFor(el, arch).forEach((p, slot) => {
          const b = btn(p.name, () => {
            all = false;
            load({ el, arch, slot });
          }, 'btn chip');
          b.dataset.power = p.id;
          row.appendChild(b);
        });
        g.appendChild(row);
      }
      side.appendChild(g);
    }
    root.append(side);
  }
  const main = h('div', 'lab-main');
  main.append(c, info);
  root.append(main);

  // all 90 in sequence: next power when a cycle ends
  const order: Target[] = ELEMENT_IDS.flatMap((el) => ARCHETYPE_IDS.flatMap((arch) => [0, 1, 2].map((slot) => ({ el, arch, slot }))));
  let last = performance.now();
  let acc = 0;
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    acc += Math.min(100, now - last);
    last = now;
    while (!paused && acc >= 1000 / 60) {
      acc -= 1000 / 60;
      stage.tick();
      stage.fx.update();
      if (all && stage.t % 150 === 0) {
        const i = order.findIndex((o) => o.el === cur.el && o.arch === cur.arch && o.slot === cur.slot);
        load(order[(i + 1) % order.length]!);
      }
    }
    if (paused) acc = 0;
    stage.draw(now / 1000);
    if (!playOnly && stage.t % 6 === 0) setInfo();
  };
  requestAnimationFrame(loop);

  // contact sheets: 6 frames per power, frame-exact (the sim and the effects are both seeded)
  const PW = 320;
  const PH = 200;
  const sheet = makeCanvas(PW * 6, PH + 34);
  sheet.c.id = 'sheet';
  sheet.c.className = 'lab-sheet';
  root.appendChild(sheet.c);
  const panel = makeCanvas(PW, PH);
  (window as unknown as { __lab: unknown }).__lab = {
    ids: order.map((o) => powersFor(o.el, o.arch)[o.slot]!.id),
    sheet(id: string): string {
      const t = find(id)!;
      const mv = powerById(id)!;
      const make = () => {
        const s = new PowerStage(panel.ctx, PW, PH, panel.dpr, { element: t.el, archetype: t.arch, look: LOOK, span: 620 });
        s.only = t.slot;
        s.slot = t.slot;
        return s;
      };
      // pass 1: find the first frame where the power hits (or its effect is out the longest)
      let s = make();
      let hitAt = -1;
      for (let i = 0; i < 140 && hitAt < 0; i++) {
        s.tick();
        s.fx.update();
        if (s.t > 10 + mv.startup && (s.m.events.some((e) => e.t === 'hit' || e.t === 'counter') || s.m.effects.some((e) => e.kind === 'strike' && e.delay === 0))) hitAt = s.t;
      }
      const cast = 10 + mv.startup + 1;
      const impact = hitAt > cast ? hitAt : cast + 16;
      const raw = [10 + Math.max(1, Math.floor(mv.startup * 0.6)), cast, Math.min(impact - 1, cast + Math.max(3, Math.floor((impact - cast) / 2))), impact, impact + 6, impact + 22];
      // strictly increasing frame list (a power that hits on its cast frame would otherwise stall the strip)
      const frames: number[] = [];
      for (const f of raw) frames.push(Math.max(f, (frames[frames.length - 1] ?? 0) + 2));
      // pass 2: draw those frames
      s = make();
      const sc = sheet.ctx;
      sc.setTransform(sheet.dpr, 0, 0, sheet.dpr, 0, 0);
      sc.fillStyle = '#0d1430';
      sc.fillRect(0, 0, PW * 6, PH + 34);
      const labels = ['anticipation', 'cast', 'travel', 'impact', 'impact +6', 'aftermath'];
      let fi = 0;
      for (let i = 0; i < 150 && fi < 6; i++) {
        s.tick();
        s.fx.update();
        // draw every frame (cloth springs and trails update while drawing), copy the chosen ones
        s.draw(s.t / 60);
        if (s.t === frames[fi]) {
          sc.drawImage(panel.c, fi * PW, 34, PW, PH);
          sc.fillStyle = '#b9c4ea';
          sc.font = '700 13px system-ui, sans-serif';
          sc.fillText(`${labels[fi]} (f${s.t - 10})`, fi * PW + 8, 34 + 18);
          fi++;
        }
      }
      sc.fillStyle = '#ffd84a';
      sc.font = '900 18px system-ui, sans-serif';
      const name = `${mv.name} — ${ELEMENTS[t.el].name} ${ARCHETYPES[t.arch].name} ${t.slot + 1} (${mechanicOf(mv)})`;
      sc.fillText(name, 8, 22);
      return name;
    },
  };
}
