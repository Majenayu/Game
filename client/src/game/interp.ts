import { normalizeAngle, type PlayerView } from '@orb/shared';

interface Sample {
  t: number;
  players: PlayerView[];
}

export const INTERP_DELAY_MS = 100;
const SNAP_DISTANCE = 200;

/** Keeps recent player snapshots and returns positions interpolated at a render time. */
export class SnapshotBuffer {
  private samples: Sample[] = [];

  push(t: number, players: PlayerView[]): void {
    this.samples.push({ t, players });
    while (this.samples.length > 30) this.samples.shift();
  }

  clear(): void {
    this.samples = [];
  }

  at(renderT: number): PlayerView[] {
    const s = this.samples;
    if (s.length === 0) return [];
    if (renderT >= s[s.length - 1].t) return s[s.length - 1].players;
    if (renderT <= s[0].t) return s[0].players;
    let i = s.length - 1;
    while (i > 0 && s[i - 1].t > renderT) i--;
    const a = s[i - 1];
    const b = s[i];
    const k = (renderT - a.t) / (b.t - a.t || 1);
    const prev = new Map(a.players.map((p) => [p.id, p]));
    return b.players.map((pb) => {
      const pa = prev.get(pb.id);
      if (!pa || Math.hypot(pb.x - pa.x, pb.y - pa.y) > SNAP_DISTANCE) return pb;
      return {
        ...pb,
        x: pa.x + (pb.x - pa.x) * k,
        y: pa.y + (pb.y - pa.y) * k,
        aim: pa.aim + normalizeAngle(pb.aim - pa.aim) * k,
      };
    });
  }
}
