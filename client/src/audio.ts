/** Tiny WebAudio synth. No audio files. */
class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  userMuted = localStorage.getItem('orb.muted') === '1';
  platformMuted = false;

  get muted(): boolean {
    return this.userMuted || this.platformMuted;
  }

  /** Must be called from a user gesture at least once. */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    this.apply();
    if (this.ctx.state === 'suspended' && !document.hidden) void this.ctx.resume();
  }

  setUserMuted(m: boolean): void {
    this.userMuted = m;
    localStorage.setItem('orb.muted', m ? '1' : '0');
    this.apply();
  }

  setPlatformMuted(m: boolean): void {
    this.platformMuted = m;
    this.apply();
  }

  setHidden(hidden: boolean): void {
    if (!this.ctx) return;
    if (hidden) void this.ctx.suspend();
    else if (!this.muted) void this.ctx.resume();
  }

  private apply(): void {
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.25;
  }

  private tone(freq: number, end: number, dur: number, type: OscillatorType, vol = 1, delay = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  shoot(vol = 0.5): void {
    this.tone(720, 220, 0.09, 'square', 0.25 * vol);
  }
  hit(): void {
    this.tone(220, 90, 0.12, 'sawtooth', 0.6);
  }
  kill(): void {
    this.tone(440, 60, 0.35, 'sawtooth', 0.7);
  }
  pickup(): void {
    this.tone(440, 880, 0.1, 'triangle', 0.8);
    this.tone(660, 1320, 0.12, 'triangle', 0.8, 0.09);
  }
  respawn(): void {
    this.tone(200, 600, 0.2, 'sine', 0.6);
  }
  coin(): void {
    this.tone(880, 1320, 0.07, 'square', 0.35);
  }
  skill(kind = 'dash'): void {
    const f: Record<string, [number, number]> = {
      dash: [300, 900],
      shield: [500, 700],
      pulse: [200, 60],
      mine: [180, 120],
      blink: [900, 300],
      burst: [600, 200],
      repair: [400, 800],
    };
    const [a, b] = f[kind] ?? [400, 600];
    this.tone(a, b, 0.18, kind === 'pulse' ? 'sawtooth' : 'triangle', 0.7);
  }
  boom(): void {
    this.tone(160, 40, 0.3, 'sawtooth', 0.9);
  }
  shieldBreak(): void {
    this.tone(1200, 300, 0.15, 'square', 0.4);
  }
  reward(): void {
    [523, 659, 784, 1046].forEach((fr, i) => this.tone(fr, fr, 0.25, 'triangle', 0.7, i * 0.09));
  }
  click(): void {
    this.tone(500, 400, 0.04, 'square', 0.3);
  }
  roundEnd(): void {
    [523, 659, 784].forEach((f, i) => this.tone(f, f, 0.4, 'triangle', 0.7, i * 0.12));
  }
}

export const sfx = new Sfx();
