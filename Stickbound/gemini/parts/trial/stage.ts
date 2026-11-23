/**
 * Training stadium for the Hero Trial: night sky, stands with a crowd, floodlights, an LED board in the element
 * colour and a lit grid floor. Drawn once into a canvas (render only, original code art).
 */
import type { Kit } from './kits';
export const STAGE_W = 2200;
export const STAGE_H = 900;
export const GROUND = 760;
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function bakeStage(k: Kit): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = STAGE_W;
  c.height = STAGE_H;
  const g = c.getContext('2d')!;
  const r = rng(7);
  // sky
  const sky = g.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, '#04051a');
  sky.addColorStop(0.6, '#0d1038');
  sky.addColorStop(1, '#1a1f55');
  g.fillStyle = sky;
  g.fillRect(0, 0, STAGE_W, GROUND);
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`;
    g.fillRect(r() * STAGE_W, r() * 260, 1.5, 1.5);
  }
  // stands: three tiers of crowd in the element colours and neutral tones
  const team = [k.line, k.light, '#8a92c8', '#5a62a0', k.accent];
  for (let tier = 0; tier < 3; tier++) {
    const y0 = 290 + tier * 105;
    g.fillStyle = tier % 2 ? '#141a48' : '#10153c';
    g.beginPath();
    g.moveTo(0, y0 + 30);
    g.quadraticCurveTo(STAGE_W / 2, y0 - 20, STAGE_W, y0 + 30);
    g.lineTo(STAGE_W, y0 + 105);
    g.lineTo(0, y0 + 105);
    g.closePath();
    g.fill();
    for (let x = 0; x < STAGE_W; x += 13) {
      const yy = y0 + 30 - Math.sin((x / STAGE_W) * Math.PI) * 48 + r() * 18;
      g.globalAlpha = 0.55 + r() * 0.3;
      g.fillStyle = team[Math.floor(r() * team.length)];
      g.beginPath();
      g.arc(x + r() * 6, yy, 4.5, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x + r() * 6 - 4, yy + 4, 8, 10);
      if (r() < 0.08) g.fillRect(x + 3, yy - 14, 2, 10);
    }
    g.globalAlpha = 1;
  }
  // floodlight beams
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const [x, dir] of [[0, 1], [STAGE_W, -1]] as const) {
    const gr = g.createLinearGradient(x, 150, x + dir * 900, GROUND);
    gr.addColorStop(0, 'rgba(200,210,255,0.22)');
    gr.addColorStop(1, 'rgba(200,210,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(x, 150);
    g.lineTo(x + dir * 1100, GROUND);
    g.lineTo(x + dir * 300, GROUND);
    g.closePath();
    g.fill();
  }
  g.restore();
  // LED board
  const led = g.createLinearGradient(0, 668, 0, 706);
  led.addColorStop(0, '#1a1f45');
  led.addColorStop(0.5, k.line);
  led.addColorStop(1, '#1a1f45');
  g.fillStyle = '#0a0d26';
  g.fillRect(0, 664, STAGE_W, 46);
  g.globalAlpha = 0.5;
  g.fillStyle = led;
  g.fillRect(0, 668, STAGE_W, 38);
  g.globalAlpha = 1;
  g.fillStyle = '#0b0e24';
  g.font = 'bold 22px Orbitron, Arial, sans-serif';
  for (let x = 40; x < STAGE_W; x += 560) g.fillText(`ELEMENTICK  ARENA  ${k.icon}  ${k.name.toUpperCase()} TRIAL`, x, 695);
  // floor
  const fl = g.createLinearGradient(0, GROUND, 0, STAGE_H);
  fl.addColorStop(0, '#2a2f78');
  fl.addColorStop(1, '#0b0d2a');
  g.fillStyle = fl;
  g.fillRect(0, GROUND, STAGE_W, STAGE_H - GROUND);
  g.strokeStyle = 'rgba(150,170,255,0.18)';
  g.lineWidth = 2;
  for (let i = -20; i <= 20; i++) {
    g.beginPath();
    g.moveTo(STAGE_W / 2 + i * 60, GROUND);
    g.lineTo(STAGE_W / 2 + i * 160, STAGE_H);
    g.stroke();
  }
  for (const y of [800, 850]) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(STAGE_W, y);
    g.stroke();
  }
  g.strokeStyle = k.line;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, GROUND);
  g.lineTo(STAGE_W, GROUND);
  g.stroke();
  // centre ring
  g.strokeStyle = k.line;
  g.globalAlpha = 0.5;
  g.lineWidth = 4;
  g.beginPath();
  g.ellipse(STAGE_W / 2, 830, 230, 42, 0, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 1;
  return c;
}
