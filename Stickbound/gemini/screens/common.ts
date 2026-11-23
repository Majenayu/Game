/** Small helpers shared by the playable screens. */
import { H, W, type G } from './ui';

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
/** full-screen dim behind popups */
export function dim(g: G, a = 0.6): void {
  g.fillStyle = `rgba(2,4,14,${a})`;
  g.fillRect(0, 0, W, H);
}
