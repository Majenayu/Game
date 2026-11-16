import { presentation } from './presentation';
/** Original layered WebAudio synth. No audio files or external services. */
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
      this.startMusic();
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
    if ((this.muted || presentation.prefs.voice === 0) && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  private tone(freq: number, end: number, dur: number, type: OscillatorType, vol = 1, delay = 0): void {
    if (!this.ctx || !this.master || this.muted || presentation.prefs.effects === 0) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + dur);
    g.gain.setValueAtTime(Math.max(0.0001, vol * presentation.prefs.effects), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  shoot(vol = 0.5, weapon = 0): void {
    const freq = [720, 320, 1300, 900, 160, 650][weapon] ?? 720;
    this.tone(freq, freq * 0.3, weapon === 4 ? 0.2 : 0.07, 'triangle', 0.35 * vol);
    this.tone(freq * 0.4, 50, 0.045, 'sawtooth', 0.12 * vol);
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
      cast: [170, 650], projectile: [640, 180], beam: [1200, 220],
      volley: [800, 340], nova: [200, 45], cleave: [450, 70],
      heal: [400, 880], barrier: [330, 580], aura: [420, 760],
      buff: [500, 950], stealth: [160, 80], ambush: [900, 100],
      summon: [220, 700], pull: [110, 50], slow: [320, 100], portal: [120, 900],
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
  private lastSay = 0;
  /** Speaks a short line (skill names, boss forms) with the browser's built-in voice. */
  say(text: string, force = false): void {
    if (this.muted || presentation.prefs.voice === 0 || typeof speechSynthesis === 'undefined') return;
    const now = performance.now();
    if (!force && now - this.lastSay < 700) return;
    this.lastSay = now;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.15;
      u.pitch = 0.9;
      u.volume = presentation.prefs.voice;
      speechSynthesis.speak(u);
    } catch {
      /* speech not available */
    }
  }
  click(): void {
    this.tone(500, 400, 0.04, 'square', 0.3);
  }
  // ---- music: an original, generated ambient loop (no audio files) -----------
  private musicGain: GainNode | null = null;
  private musicTimer = 0;
  private step = 0;
  /** Calm in menus, brighter in matches. */
  intense = false;
  private startMusic(): void {
    if (!this.ctx || !this.master || this.musicGain) return;
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.22;
    this.musicGain.connect(this.master);
    // Am - F - C - G in A minor, two bars each, eighth-note arpeggio over a soft pad.
    const chords = [
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [130.81, 196, 261.63],
      [196, 246.94, 293.66],
    ];
    const beat = 0.25;
    const tick = () => {
      const ctx = this.ctx;
      const out = this.musicGain;
      if (!ctx || !out || ctx.state !== 'running') return;
      const chord = chords[Math.floor(this.step / 16) % chords.length];
      out.gain.value = presentation.prefs.music * 0.45;
      const t = ctx.currentTime + 0.05;
      if (this.step % 16 === 0) for (const f of chord) this.note(out, f / 2, t, beat * 16, 'sine', 0.18);
      const arp = [0, 1, 2, 1, 0, 2, 1, 2];
      const f = chord[arp[this.step % 8]] * (this.intense ? 2 : 1);
      this.note(out, f, t, beat * 0.9, 'triangle', this.intense ? 0.2 : 0.12);
      if (this.intense && this.step % 4 === 0) this.note(out, 55, t, 0.18, 'sine', 0.5);
      this.step++;
    };
    this.musicTimer = window.setInterval(tick, beat * 1000);
  }
  private note(out: GainNode, freq: number, t: number, dur: number, type: OscillatorType, vol: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.04, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  stopMusic(): void {
    window.clearInterval(this.musicTimer);
    this.musicGain?.disconnect();
    this.musicGain = null;
  }
  roundEnd(): void {    [523, 659, 784].forEach((f, i) => this.tone(f, f, 0.4, 'triangle', 0.7, i * 0.12));
  }
}

export const sfx = new Sfx();
