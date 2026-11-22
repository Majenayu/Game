// All sound is synthesized with WebAudio: no audio files. Punchy hits, guard clinks, whooshes, a sound palette per
// element, UI clicks, and 6 short music loops with an adaptive tension layer. Voice-limited and mutable.

import type { ElementId } from '../content/elementPrefs';

export type Track = 'lobby' | 'fight' | 'ranked' | 'zombie' | 'boss' | 'victory';

class Synth {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noise!: AudioBuffer;
  private voices = 0;
  private track: Track | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private muteReasons = new Set<string>();
  tension = 0;
  musicVol = 0.5;
  sfxVol = 0.7;

  /** Must be called from a user gesture (browsers block audio before one). */
  unlock(): void {
    if (this.ctx) {
      // 'suspended', or 'interrupted' on iOS after a call or app switch
      if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let s = 12345;
    for (let i = 0; i < len; i++) {
      s = (Math.imul(s, 1103515245) + 12345) | 0;
      d[i] = ((s >>> 16) & 0xffff) / 32768 - 1;
    }
    this.applyVolumes();
    if (this.track) this.startScheduler();
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    const muted = this.muteReasons.size > 0;
    this.master.gain.value = muted ? 0 : 1;
    this.sfxBus.gain.value = this.sfxVol * 0.6;
    this.musicBus.gain.value = this.musicVol * 0.35;
  }

  setMuted(reason: string, on: boolean): void {
    if (on) this.muteReasons.add(reason);
    else this.muteReasons.delete(reason);
    this.applyVolumes();
  }

  get muted(): boolean {
    return this.muteReasons.size > 0;
  }

  // ---- building blocks ----------------------------------------------------------------------------------------

  private env(g: GainNode, t: number, a: number, peak: number, d: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, bus: GainNode, t = 0, attack = 0.004): void {
    const c = this.ctx!;
    const at = (t || c.currentTime) + 0.001;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
    this.env(g, at, attack, vol, dur);
    o.connect(g).connect(bus);
    o.start(at);
    o.stop(at + attack + dur + 0.05);
  }

  private hiss(dur: number, vol: number, bus: GainNode, filter: BiquadFilterType, f0: number, f1: number, t = 0, q = 1): void {
    const c = this.ctx!;
    const at = (t || c.currentTime) + 0.001;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 1;
    const bq = c.createBiquadFilter();
    bq.type = filter;
    bq.Q.value = q;
    bq.frequency.setValueAtTime(f0, at);
    bq.frequency.exponentialRampToValueAtTime(Math.max(30, f1), at + dur);
    const g = c.createGain();
    this.env(g, at, 0.003, vol, dur);
    src.connect(bq).connect(g).connect(bus);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur + 0.05);
  }

  private voice(): boolean {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return false;
    if (this.voices > 26) return false;
    this.voices++;
    setTimeout(() => this.voices--, 250);
    return true;
  }

  // ---- sound effects ------------------------------------------------------------------------------------------

  sfx(name: string, power = 1): void {
    if (!this.voice()) return;
    const b = this.sfxBus;
    const p = 0.92 + Math.random() * 0.16;
    switch (name) {
      case 'hitL':
        this.tone('square', 220 * p, 90, 0.07, 0.35, b);
        this.hiss(0.06, 0.4, b, 'bandpass', 2400, 900, 0, 1.4);
        break;
      case 'hitM':
        this.tone('square', 180 * p, 60, 0.1, 0.45, b);
        this.hiss(0.09, 0.5, b, 'bandpass', 1800, 500, 0, 1.2);
        break;
      case 'hitH':
        this.tone('sawtooth', 140 * p, 40, 0.2, 0.55, b);
        this.tone('sine', 90, 35, 0.25, 0.7, b);
        this.hiss(0.16, 0.6, b, 'lowpass', 3000, 300);
        break;
      case 'guard':
        this.tone('triangle', 1250 * p, 900, 0.08, 0.3, b);
        this.tone('square', 640 * p, 600, 0.05, 0.12, b);
        break;
      case 'perfect':
        this.tone('triangle', 1600, 1600, 0.12, 0.3, b);
        this.tone('sine', 2400, 2400, 0.25, 0.25, b, this.ctx!.currentTime + 0.05);
        break;
      case 'gbreak':
        this.tone('sawtooth', 400, 90, 0.3, 0.4, b);
        this.hiss(0.3, 0.4, b, 'highpass', 2000, 800);
        break;
      case 'whoosh':
        this.hiss(0.14 * power, 0.28, b, 'bandpass', 600 * p, 2600, 0, 2.5);
        break;
      case 'jump':
        this.tone('sine', 260 * p, 520, 0.1, 0.18, b);
        break;
      case 'land':
        this.tone('sine', 120, 60, 0.06, 0.25, b);
        break;
      case 'dash':
        this.hiss(0.16, 0.3, b, 'bandpass', 1500, 400, 0, 3);
        break;
      case 'swap':
        this.tone('triangle', 400, 900, 0.12, 0.25, b);
        this.tone('triangle', 900, 400, 0.12, 0.2, b, this.ctx!.currentTime + 0.12);
        break;
      case 'ko':
        this.tone('sawtooth', 300, 40, 0.7, 0.5, b);
        this.tone('sine', 80, 30, 0.8, 0.7, b);
        this.hiss(0.5, 0.4, b, 'lowpass', 2000, 100);
        break;
      case 'bell':
        for (const [i, f] of [523, 659, 784].entries()) this.tone('triangle', f, f, 0.5, 0.25, b, this.ctx!.currentTime + i * 0.08);
        break;
      case 'ui':
        this.tone('triangle', 880 * p, 1100, 0.05, 0.18, b);
        break;
      case 'uiBack':
        this.tone('triangle', 660, 440, 0.06, 0.16, b);
        break;
      case 'coin':
        this.tone('square', 988, 988, 0.06, 0.12, b);
        this.tone('square', 1319, 1319, 0.12, 0.12, b, this.ctx!.currentTime + 0.06);
        break;
      case 'level':
        for (const [i, f] of [392, 523, 659, 784, 1047].entries()) this.tone('square', f, f, 0.14, 0.14, b, this.ctx!.currentTime + i * 0.07);
        break;
      case 'zombie':
        this.tone('sawtooth', 110 * p, 80, 0.35, 0.18, b, 0, 0.05);
        break;
      case 'status':
        this.tone('sine', 700, 350, 0.12, 0.15, b);
        break;
      default:
        if (name.startsWith('power:')) this.power(name.slice(6) as ElementId);
    }
  }

  private power(el: ElementId): void {
    const b = this.sfxBus;
    const c = this.ctx!;
    const t = c.currentTime;
    switch (el) {
      case 'fire':
        this.hiss(0.35, 0.5, b, 'lowpass', 1800, 300);
        this.tone('sawtooth', 160, 70, 0.3, 0.2, b);
        break;
      case 'water':
        for (let i = 0; i < 4; i++) this.tone('sine', 500 + i * 140, 900 + i * 120, 0.06, 0.18, b, t + i * 0.04);
        this.hiss(0.25, 0.25, b, 'bandpass', 900, 500, 0, 0.8);
        break;
      case 'ice':
        this.tone('triangle', 1800, 2400, 0.25, 0.2, b);
        this.tone('triangle', 2700, 2700, 0.3, 0.12, b, t + 0.05);
        this.hiss(0.25, 0.2, b, 'highpass', 5000, 7000);
        break;
      case 'lightning':
        this.tone('square', 1200, 200, 0.18, 0.25, b);
        this.hiss(0.2, 0.45, b, 'highpass', 3000, 1200);
        break;
      case 'wind':
        this.hiss(0.4, 0.35, b, 'bandpass', 400, 1800, 0, 4);
        break;
      case 'earth':
        this.tone('sine', 90, 40, 0.35, 0.7, b);
        this.hiss(0.3, 0.4, b, 'lowpass', 600, 120);
        break;
      case 'leaf':
        for (const [i, f] of [587, 740, 880].entries()) this.tone('triangle', f, f * 0.99, 0.12, 0.2, b, t + i * 0.05);
        break;
      case 'light':
        for (const [i, f] of [784, 988, 1175, 1568].entries()) this.tone('sine', f, f, 0.3, 0.12, b, t + i * 0.03);
        break;
      case 'gravity':
        this.tone('sine', 220, 45, 0.45, 0.45, b);
        this.tone('sawtooth', 110, 30, 0.4, 0.12, b);
        break;
      case 'time':
        for (let i = 0; i < 4; i++) this.tone('square', 2000, 2000, 0.015, 0.12, b, t + i * 0.07);
        this.tone('sine', 300, 900, 0.3, 0.2, b, t + 0.1, 0.2);
        break;
    }
  }

  // ---- music ------------------------------------------------------------------------------------------------

  play(track: Track | null): void {
    if (this.track === track) return;
    this.track = track;
    this.step = 0;
    if (!track) {
      if (this.timer !== null) clearInterval(this.timer);
      this.timer = null;
      return;
    }
    if (this.ctx) this.startScheduler();
  }

  private startScheduler(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.nextTime = this.ctx!.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), 50);
  }

  private schedule(): void {
    const c = this.ctx;
    if (!c || !this.track) return;
    const song = SONGS[this.track];
    const stepDur = 60 / song.bpm / 4;
    while (this.nextTime < c.currentTime + 0.2) {
      if (!this.muted && c.state === 'running') this.playStep(song, this.step, this.nextTime, stepDur);
      this.step = (this.step + 1) % (song.bars * 16);
      this.nextTime += stepDur;
    }
  }

  private playStep(s: Song, i: number, t: number, d: number): void {
    const b = this.musicBus;
    const pos = i % 16;
    const bar = Math.floor(i / 16) % s.bars;
    const root = s.root * Math.pow(2, s.prog[bar % s.prog.length]! / 12);
    if (s.kick[pos] === 'x') this.tone('sine', 140, 42, 0.14, 0.9, b, t);
    if (s.snare[pos] === 'x') this.hiss(0.1, 0.35, b, 'bandpass', 1800, 1200, t, 0.8);
    if (s.hat[pos] === 'x' || (this.tension > 0.5 && pos % 2 === 1)) this.hiss(0.03, 0.16 + this.tension * 0.1, b, 'highpass', 7000, 7000, t);
    const bn = s.bass[pos];
    if (bn !== undefined && bn !== '.') this.tone('sawtooth', root * Math.pow(2, (SCALE[s.mode][Number(bn)]! - 12) / 12), root * Math.pow(2, (SCALE[s.mode][Number(bn)]! - 12) / 12), d * 1.6, 0.22, b, t);
    const ln = s.lead[(i + bar * 3) % s.lead.length];
    if (ln !== undefined && ln !== '.' && (this.tension > 0.25 || s.leadAlways)) {
      const f = root * 2 * Math.pow(2, SCALE[s.mode][Number(ln)]! / 12);
      this.tone(s.leadWave, f, f, d * 1.8, 0.09 + this.tension * 0.05, b, t, 0.01);
    }
    if (pos === 0) for (const n of [0, 2, 4]) this.tone('sine', root * Math.pow(2, SCALE[s.mode][n]! / 12), root * Math.pow(2, SCALE[s.mode][n]! / 12), d * 15, 0.05, b, t, 0.3);
  }
}

const SCALE = {
  major: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21],
  minor: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22],
};

interface Song {
  bpm: number;
  root: number;
  mode: keyof typeof SCALE;
  bars: number;
  prog: number[];
  kick: string;
  snare: string;
  hat: string;
  bass: string;
  lead: string;
  leadWave: OscillatorType;
  leadAlways: boolean;
}

const SONGS: Record<Track, Song> = {
  lobby: { bpm: 96, root: 196, mode: 'major', bars: 4, prog: [0, 5, 7, 3], kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.', bass: '0...0...4...3...', lead: '4.2.0...5.4.2...7.5.4.2.', leadWave: 'triangle', leadAlways: true },
  fight: { bpm: 140, root: 165, mode: 'minor', bars: 4, prog: [0, 0, 3, 5], kick: 'x...x...x...x...', snare: '....x.......x..x', hat: 'x.x.x.x.x.x.x.x.', bass: '0.0.0.3.0.0.4.3.', lead: '5.4.3.2.4.3.2.0.', leadWave: 'square', leadAlways: false },
  ranked: { bpm: 150, root: 147, mode: 'minor', bars: 4, prog: [0, 3, 5, 3], kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', bass: '0.00.3.40.03.2.1', lead: '7.5.4.5.7.8.7.5.', leadWave: 'sawtooth', leadAlways: false },
  zombie: { bpm: 120, root: 131, mode: 'minor', bars: 4, prog: [0, 1, 0, 6], kick: 'x.....x.x.......', snare: '....x.......x...', hat: '..x...x...x...xx', bass: '0..0..1.0..0..6.', lead: '0.1.0...3.2.1...', leadWave: 'square', leadAlways: false },
  boss: { bpm: 160, root: 123, mode: 'minor', bars: 4, prog: [0, 1, 3, 1], kick: 'x.x.x.x.x.x.x.x.', snare: '....x.......x.x.', hat: 'x.xxx.xxx.xxx.xx', bass: '0000333300004444', lead: '7.6.5.4.3.2.1.0.', leadWave: 'sawtooth', leadAlways: true },
  victory: { bpm: 120, root: 262, mode: 'major', bars: 2, prog: [0, 5], kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: '0...4...0...4...', lead: '0.2.4.5.7.5.4.2.', leadWave: 'triangle', leadAlways: true },
};

export const audio = new Synth();
