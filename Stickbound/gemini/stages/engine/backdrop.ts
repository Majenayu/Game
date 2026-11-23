/**
 * An arena picture as a lab backdrop: loaded once (floor found, one-time edits baked), then drawn each frame
 * behind the fighters with the arena's moving effects. The picture is scaled so its floor line sits on the stage
 * floor, and it pans a little slower than the fighters so the floor still feels like the stage.
 * Shared by the Lightning lab (lab.ts) and the Trial Ground (gemini/trial/).
 */
import type { ArenaDef } from './arena';
export interface Backdrop {
  def: ArenaDef;
  img: HTMLCanvasElement;
  /** floor height as a fraction of the picture height */
  rail: number;
  fx: unknown;
}
export async function loadBackdrop(def: ArenaDef): Promise<Backdrop | null> {
  const img = new Image();
  img.src = def.image;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(img, 0, 0);
  const rail = typeof def.floor === 'number' ? def.floor : def.floor(x.getImageData(0, 0, c.width, c.height));
  return { def, img: c, rail, fx: def.bake ? def.bake(c, rail) : null };
}
export interface BackdropView {
  /** stage floor (y) and stage width in stage units */
  ground: number;
  stageW: number;
  /** camera centre x and half the visible width, in stage units */
  camX: number;
  halfW: number;
  frame: number;
  /** 0..1 screen flash and 0..1 ultimate darkness, passed on to the arena effects */
  flash: number;
  storm: number;
}
export function drawBackdrop(g: CanvasRenderingContext2D, b: Backdrop, v: BackdropView): void {
  const def = b.def;
  const PAN = def.pan ?? 0.2;
  // big enough to reach the top of the view and both sides at any camera position
  const s = Math.max(v.ground / (b.rail * b.img.height), (2 * v.halfW + 2 * PAN * (v.stageW / 2) + 40) / b.img.width);
  const w = b.img.width * s;
  const h = b.img.height * s;
  const x = v.camX - w / 2 - (v.camX - v.stageW / 2) * PAN;
  const y = v.ground - b.rail * h;
  g.drawImage(b.img, x, y, w, h);
  // the arena's moving effects, placed in the picture's own pixels (1376 wide)
  if (def.draw) {
    g.save();
    g.translate(x, y);
    g.scale(s * (b.img.width / 1376), s * (b.img.width / 1376));
    def.draw(g, b.fx, v.frame, v.flash, v.storm);
    g.restore();
  }
  const bottom = y + h;
  // past the picture's bottom edge (tall screens), continue the floor colour
  g.fillStyle = def.ground;
  g.fillRect(x - 2000, bottom - 1, w + 4000, 3000);
  // past the top edge (tall screens), continue the sky
  g.fillStyle = def.sky;
  g.fillRect(x - 2000, y - 3000, w + 4000, 3001);
}
