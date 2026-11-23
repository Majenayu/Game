/**
 * Arena sound, made live with the Web Audio API (no audio files, all original).
 * Each arena gives a Song (tempo, chords, groove, instrument colours, a lead for the second pass)
 * and an Air bed (wind, water, fire roar, hum...). Arena effects ask for one-shot sounds through play().
 * Browsers only allow sound after a click or key press, so start() is called on the first input.
 */
import type { ArenaSound } from './arena';

export interface Chord {
  root: number;
  tones: number[];
}
export interface Song {
  title: string;
  bpm: number;
  /** one chord per bar (root as MIDI, chord tones as semitones above the root) */
  prog: Chord[];
  /** lead melody for the last 4 bars of the second pass, MIDI per 8th note, 0 = rest ([] = no lead) */
  lead: number[][];
  /**
   * drive: four-on-the-floor dance beat · half: half-time heavy beat · tribal: toms and shaker ·
   * soft: gentle kick and rim · none: no drums
   */
  drums: 'drive' | 'half' | 'tribal' | 'soft' | 'none';
  /** 16th steps of the bar where the bass plays */
  bass: number[];
  bassWave: OscillatorType;
  /** bass filter opening in Hz */
  bassCut: number;
  /** arpeggio: chord-tone index per step (3 = root an octave up), null = no arpeggio */
  arp: number[] | null;
  arpWave: OscillatorType;
  arpCut: number;
  /** play the arpeggio every 16th (1) or every 8th (2) */
  arpRate: 1 | 2;
  padWave: OscillatorType;
  padLevel: number;
  padCut: number;
  leadWave: [OscillatorType, OscillatorType];
  /** echo length in 16th steps */
  echo: number;
  /** a clock tick-tock on every beat */
  clock?: boolean;
  /** bell on the first beat of every bar */
  bell?: boolean;
  /** play the lead on every pass, not only the second (default: second pass only) */
  leadAlways?: boolean;
  /**
   * instrument colours (default synth): lead flute (breathy, for wind and leaf), brass (a horn swell, fire and
   * earth), choir ("aah" vowels, light and space), glass (a clear bell-like tone, water and time)
   */
  leadVoice?: 'synth' | 'flute' | 'brass' | 'choir' | 'glass';
  /** arpeggio: marimba (wood), musicbox (tines), harp, koto (plucked string with a bend), drop (water drops) */
  arpVoice?: 'synth' | 'marimba' | 'musicbox' | 'harp' | 'koto' | 'drop';
  /** bass: drive (distorted, fire and shadow), pizz (plucked strings, clockwork) */
  bassVoice?: 'synth' | 'drive' | 'pizz';
  /** slow wobble of the arpeggio filter, in Hz (water) */
  wobble?: number;
  /** big taiko drums on top of the beat (fire, earth) */
  taiko?: boolean;
  /** an anvil strike on the off-bars (the forge) */
  anvil?: boolean;
  /** stutter and glitch fills at the end of every second bar (shadow) */
  glitch?: boolean;
  /** a noise sweep in the last bar of the loop: up (a gust rising) or down (falling into the black hole) */
  sweep?: 'up' | 'down';
}
export interface Air {
  /** noise bed lowpass in Hz (0 = no noise bed) */
  cut: number;
  level: number;
  /** slow swell of the bed: speed in Hz and filter depth in Hz */
  lfo: number;
  depth: number;
  /** a band-pass bed instead of low-pass (water, fire roar) */
  band?: boolean;
  /** a low drone in Hz, with its level */
  drone?: number;
  droneLevel?: number;
}

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class Sound {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private padBus!: GainNode;
  private echo!: DelayNode;
  private verb!: ConvolverNode;
  private noise!: AudioBuffer;
  private timer = 0;
  private next = 0;
  private step = 0;
  private readonly STEP: number;
  musicOn = localStorage.getItem('ek.lab.music') !== '0';
  sfxOn = localStorage.getItem('ek.lab.sfx') !== '0';
  volume = Number(localStorage.getItem('ek.lab.vol') ?? '0.7');

  constructor(
    readonly song: Song,
    readonly air: Air,
  ) {
    this.STEP = 60 / song.bpm / 4;
  }

  /** Create the audio graph on the first user input. Safe to call many times. */
  start(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    this.build(new AudioContext());
    this.next = this.ctx!.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }
  /**
   * Test hook: renders the whole song loop (both passes) offline, music and air bed only, as fast as possible.
   * Used by songcheck.mjs to check levels and write a WAV preview.
   */
  async render(rate = 22050): Promise<AudioBuffer> {
    const steps = 16 * this.song.prog.length * 2;
    const seconds = steps * this.STEP + 2;
    const off = new OfflineAudioContext(2, Math.ceil(seconds * rate), rate);
    const keep = [this.musicOn, this.sfxOn] as const;
    this.musicOn = this.sfxOn = true;
    this.build(off as unknown as AudioContext);
    [this.musicOn, this.sfxOn] = keep;
    for (let n = 0, t = 0.05; n < steps; n++, t += this.STEP) this.playStep(n, t);
    const buf = await off.startRendering();
    this.ctx = null;
    return buf;
  }
  private build(ctx: AudioContext): void {
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(comp).connect(ctx.destination);
    this.music = ctx.createGain();
    this.music.gain.value = this.musicOn ? 0.55 : 0;
    this.music.connect(this.master);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = this.sfxOn ? 0.9 : 0;
    this.sfx.connect(this.master);
    // white noise for drums, weather and effects
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // a generated hall reverb
    this.verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.6;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    this.verb.buffer = ir;
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.35;
    this.verb.connect(verbOut).connect(this.master);
    // echo for the arpeggio and lead
    this.echo = ctx.createDelay(2);
    this.echo.delayTime.value = this.STEP * this.song.echo;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const fbLp = ctx.createBiquadFilter();
    fbLp.frequency.value = 2400;
    this.echo.connect(fbLp).connect(fb).connect(this.echo);
    const echoOut = ctx.createGain();
    echoOut.gain.value = 0.4;
    this.echo.connect(echoOut).connect(this.music);
    this.padBus = ctx.createGain();
    this.padBus.connect(this.music);
    this.padBus.connect(this.verb);
    this.bed();
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    localStorage.setItem('ek.lab.music', on ? '1' : '0');
    if (this.ctx) this.music.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.1);
  }
  setSfx(on: boolean): void {
    this.sfxOn = on;
    localStorage.setItem('ek.lab.sfx', on ? '1' : '0');
    if (this.ctx) this.sfx.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.1);
  }
  setVolume(v: number): void {
    this.volume = v;
    localStorage.setItem('ek.lab.vol', String(v));
    if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }
  stop(): void {
    window.clearInterval(this.timer);
    void this.ctx?.close();
    this.ctx = null;
  }

  // ---------------------------------------------------------------- music
  private schedule(): void {
    const ctx = this.ctx!;
    while (this.next < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.next);
      this.next += this.STEP;
      this.step = (this.step + 1) % (16 * this.song.prog.length * 2);
    }
  }
  private playStep(n: number, t: number): void {
    const S = this.song;
    const s = n % 16;
    const bars = S.prog.length;
    const bar = Math.floor(n / 16) % bars;
    const loop = Math.floor(n / (16 * bars)); // 0 = first pass (no lead), 1 = second pass
    const ch = S.prog[bar];
    const fill = bar === bars - 1 && s >= 12;
    let duck = false;
    switch (S.drums) {
      case 'drive':
        if (s % 4 === 0) this.kick(t), (duck = true);
        if (s === 4 || s === 12) this.clap(t);
        if (s % 2 === 1) this.hat(t, s % 4 === 2 ? 0.05 : 0.11);
        if (s % 4 === 2) this.hat(t, 0.16, true);
        if (fill) this.clap(t, 0.5);
        break;
      case 'half':
        if (s === 0 || s === 10) this.kick(t, 1), (duck = true);
        if (s === 8) this.clap(t, 1.1);
        if (s % 2 === 0) this.hat(t, s % 4 === 0 ? 0.07 : 0.1);
        if (fill && s % 2 === 0) this.tom(t, 1 - (s - 12) * 0.12);
        break;
      case 'tribal':
        if (s === 0 || s === 7 || s === 10) this.kick(t, 0.9), (duck = true);
        if ([3, 6, 12, 14].includes(s)) this.tom(t, s === 12 ? 1 : 0.7);
        this.shaker(t, s % 4 === 2 ? 0.09 : 0.045);
        if (fill) this.tom(t, 1.2 - (s - 12) * 0.15);
        break;
      case 'soft':
        if (s === 0 || s === 8) this.kick(t, 0.55), (duck = true);
        if (s === 12) this.rim(t);
        if (s % 2 === 1) this.shaker(t, 0.035);
        break;
      case 'none':
        break;
    }
    if (S.bass.includes(s)) this.bass(hz(ch.root - 12 + (s === 11 || s === 14 ? 12 : 0)), t);
    if (s === 0) this.pad(ch, t);
    if (S.arp && s % S.arpRate === 0) {
      const i = S.arp[(s / S.arpRate) % S.arp.length];
      this.pluck(hz(ch.root + 12 + (i === 3 ? 12 : ch.tones[i % ch.tones.length])), t, s % 4 === 0 ? 0.12 : 0.08);
    }
    if (S.lead.length && (loop === 1 || S.leadAlways) && bar >= bars - S.lead.length && s % 2 === 0) {
      const m = S.lead[bar - (bars - S.lead.length)][s / 2];
      if (m) this.lead(hz(m), t);
    }
    if (S.clock && s % 4 === 0) this.tickTock(t, s % 8 === 0);
    if (S.bell && s === 0) this.bellNote(hz(ch.root + 24 + ch.tones[bar % ch.tones.length]), t, 0.06);
    if (S.taiko && (s === 0 || (s === 8 && bar % 2 === 1) || (fill && s === 14))) this.taikoHit(t, s === 0 ? 1 : 0.75);
    if (S.anvil && bar % 2 === 1 && (s === 4 || s === 12)) this.anvilHit(t, s === 12 ? 0.7 : 1);
    if (S.glitch && bar % 2 === 1 && s >= 12) this.glitchStep(t, ch);
    if (S.sweep && bar === bars - 1 && s === 0) this.sweepNoise(t, S.sweep);
    // side-chain: duck the pad on every kick
    if (duck) {
      this.padBus.gain.cancelScheduledValues(t);
      this.padBus.gain.setValueAtTime(0.35, t);
      this.padBus.gain.linearRampToValueAtTime(1, t + this.STEP * 3);
    }
  }
  private env(t: number, peak: number, attack: number, decay: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  }
  private noiseSrc(t: number, dur: number): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur);
    return src;
  }
  private kick(t: number, level = 1): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    const g = this.env(t, 0.9 * level, 0.003, 0.32);
    o.connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.4);
  }
  private tom(t: number, level = 1): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(190 * (0.8 + level * 0.25), t);
    o.frequency.exponentialRampToValueAtTime(80, t + 0.22);
    const g = this.env(t, 0.42 * level, 0.003, 0.3);
    o.connect(g);
    g.connect(this.music);
    g.connect(this.verb);
    o.start(t);
    o.stop(t + 0.4);
  }
  private clap(t: number, level = 1): void {
    const ctx = this.ctx!;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1700;
    bp.Q.value = 0.8;
    const g = this.env(t, 0.42 * level, 0.002, 0.2);
    this.noiseSrc(t, 0.3).connect(bp).connect(g);
    g.connect(this.music);
    g.connect(this.verb);
  }
  private rim(t: number): void {
    const ctx = this.ctx!;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    bp.Q.value = 3;
    const g = this.env(t, 0.22, 0.001, 0.06);
    this.noiseSrc(t, 0.1).connect(bp).connect(g);
    g.connect(this.music);
    g.connect(this.verb);
  }
  private hat(t: number, level: number, open = false): void {
    const ctx = this.ctx!;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    const g = this.env(t, level, 0.001, open ? 0.16 : 0.04);
    this.noiseSrc(t, 0.25).connect(hp).connect(g).connect(this.music);
  }
  private shaker(t: number, level: number): void {
    const ctx = this.ctx!;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 5200;
    bp.Q.value = 1.2;
    const g = this.env(t, level, 0.008, 0.06);
    this.noiseSrc(t, 0.12).connect(bp).connect(g).connect(this.music);
  }
  private bass(f: number, t: number): void {
    const v = this.song.bassVoice ?? 'synth';
    if (v === 'pizz') return this.pizz(f, t);
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    if (v === 'drive') {
      // a distorted bass: the same note through a soft clipper, then a lowpass to tame the fizz
      o.type = this.song.bassWave;
      o.frequency.value = f;
      const o2 = ctx.createOscillator();
      o2.type = 'square';
      o2.frequency.value = f / 2;
      const sh = ctx.createWaveShaper();
      sh.curve = this.driveCurve();
      const pre = ctx.createGain();
      pre.gain.value = 2.5;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 3;
      lp.frequency.setValueAtTime(this.song.bassCut * 1.4, t);
      lp.frequency.exponentialRampToValueAtTime(260, t + 0.16);
      const g = this.env(t, 0.26, 0.004, 0.18);
      o.connect(pre);
      o2.connect(pre);
      pre.connect(sh).connect(lp).connect(g).connect(this.music);
      o.start(t);
      o2.start(t);
      o.stop(t + 0.25);
      o2.stop(t + 0.25);
      return;
    }
    o.type = this.song.bassWave;
    o.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 6;
    lp.frequency.setValueAtTime(this.song.bassCut, t);
    lp.frequency.exponentialRampToValueAtTime(180, t + 0.14);
    const g = this.env(t, 0.32, 0.004, 0.17);
    o.connect(lp).connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.25);
  }
  private pad(ch: Chord, t: number): void {
    const ctx = this.ctx!;
    const dur = this.STEP * 16;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = this.song.padCut;
    const g = ctx.createGain();
    const lv = this.song.padLevel;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(lv, t + 0.35);
    g.gain.setValueAtTime(lv, t + dur - 0.2);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.25);
    lp.connect(g).connect(this.padBus);
    for (const tone of ch.tones)
      for (const det of [-9, 9]) {
        const o = ctx.createOscillator();
        o.type = this.song.padWave;
        o.frequency.value = hz(ch.root + tone);
        o.detune.value = det;
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.3);
      }
  }
  private pluck(f: number, t: number, level: number): void {
    const v = this.song.arpVoice ?? 'synth';
    if (v !== 'synth') return this.arpVoice(v, f, t, level);
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = this.song.arpWave;
    o.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    const wob = this.song.wobble ? 0.55 + 0.45 * Math.sin(t * this.song.wobble * Math.PI * 2) : 1;
    lp.frequency.setValueAtTime(this.song.arpCut * wob, t);
    lp.frequency.exponentialRampToValueAtTime(500, t + 0.12);
    const g = this.env(t, level * 0.5, 0.002, 0.14);
    o.connect(lp).connect(g);
    g.connect(this.music);
    g.connect(this.echo);
    o.start(t);
    o.stop(t + 0.2);
  }
  private lead(f: number, t: number): void {
    const v = this.song.leadVoice ?? 'synth';
    if (v !== 'synth') return this.leadVoice(v, f, t);
    const ctx = this.ctx!;
    const g = this.env(t, 0.09, 0.01, this.STEP * 2.2);
    for (const [type, det] of [
      [this.song.leadWave[0], -6],
      [this.song.leadWave[1], 6],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = det;
      const vib = ctx.createOscillator();
      vib.frequency.value = 5.5;
      const vg = ctx.createGain();
      vg.gain.value = 6;
      vib.connect(vg).connect(o.detune);
      o.connect(g);
      o.start(t);
      vib.start(t);
      o.stop(t + this.STEP * 2.6);
      vib.stop(t + this.STEP * 2.6);
    }
    const lp = ctx.createBiquadFilter();
    lp.frequency.value = 2600;
    g.connect(lp);
    lp.connect(this.music);
    lp.connect(this.echo);
    lp.connect(this.verb);
  }
  // ---------------------------------------------------------------- arena instrument colours
  private curve: Float32Array<ArrayBuffer> | null = null;
  private driveCurve(): Float32Array<ArrayBuffer> {
    if (!this.curve) {
      const c = new Float32Array(1024);
      for (let i = 0; i < c.length; i++) {
        const x = (i / (c.length - 1)) * 2 - 1;
        c[i] = Math.tanh(x * 3) / Math.tanh(3);
      }
      this.curve = c;
    }
    return this.curve;
  }
  private osc(type: OscillatorType, f: number, t: number, dur: number, out: AudioNode, detune = 0): OscillatorNode {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    o.connect(out);
    o.start(t);
    o.stop(t + dur);
    return o;
  }
  /** plucked strings for a clockwork bass */
  private pizz(f: number, t: number): void {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(this.song.bassCut * 2, t);
    lp.frequency.exponentialRampToValueAtTime(220, t + 0.12);
    const g = this.env(t, 0.3, 0.002, 0.16);
    lp.connect(g);
    g.connect(this.music);
    g.connect(this.verb);
    this.osc('sawtooth', f * 2, t, 0.22, lp);
    this.osc('triangle', f, t, 0.22, lp);
  }
  private arpVoice(v: NonNullable<Song['arpVoice']>, f: number, t: number, level: number): void {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.connect(this.music);
    if (v === 'marimba') {
      // wood: a round tone plus a short knock four times higher
      const g = this.env(t, level * 0.75, 0.002, 0.4);
      g.connect(out);
      g.connect(this.verb);
      this.osc('sine', f, t, 0.5, g);
      const k = this.env(t, level * 0.3, 0.001, 0.04);
      k.connect(out);
      this.osc('sine', f * 4, t, 0.08, k);
      return;
    }
    if (v === 'musicbox') {
      // metal tines: a clear high tone with a faint bright partial and a long ring
      const g = this.env(t, level * 0.55, 0.002, 1.1);
      g.connect(out);
      g.connect(this.verb);
      g.connect(this.echo);
      this.osc('sine', f * 2, t, 1.3, g);
      const p = this.env(t, level * 0.18, 0.001, 0.2);
      p.connect(out);
      this.osc('sine', f * 2 * 3.01, t, 0.3, p);
      return;
    }
    if (v === 'harp') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(this.song.arpCut, t);
      lp.frequency.exponentialRampToValueAtTime(900, t + 0.4);
      const g = this.env(t, level * 0.6, 0.003, 0.7);
      lp.connect(g);
      g.connect(out);
      g.connect(this.verb);
      g.connect(this.echo);
      this.osc('triangle', f, t, 0.8, lp);
      this.osc('sine', f * 2, t, 0.8, lp, 3);
      return;
    }
    if (v === 'koto') {
      // a plucked string that bends down into the note
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 2;
      lp.frequency.setValueAtTime(3200, t);
      lp.frequency.exponentialRampToValueAtTime(500, t + 0.3);
      const g = this.env(t, level * 0.6, 0.002, 0.55);
      lp.connect(g);
      g.connect(out);
      g.connect(this.verb);
      g.connect(this.echo);
      const o = this.osc('sawtooth', f, t, 0.65, lp);
      o.frequency.setValueAtTime(f * 1.04, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      return;
    }
    // drop: a water drop, a sine that springs up into the note, through a wobbling filter
    const wob = this.song.wobble ? 0.6 + 0.4 * Math.sin(t * this.song.wobble * Math.PI * 2) : 1;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = this.song.arpCut * wob;
    const g = this.env(t, level * 0.7, 0.002, 0.22);
    lp.connect(g);
    g.connect(out);
    g.connect(this.echo);
    g.connect(this.verb);
    const o = this.osc('sine', f * 2, t, 0.3, lp);
    o.frequency.setValueAtTime(f * 1.2, t);
    o.frequency.exponentialRampToValueAtTime(f * 2, t + 0.035);
  }
  private leadVoice(v: NonNullable<Song['leadVoice']>, f: number, t: number): void {
    const ctx = this.ctx!;
    const len = this.STEP * 2.4;
    const out = ctx.createGain();
    out.connect(this.music);
    out.connect(this.echo);
    out.connect(this.verb);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5;
    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(v === 'brass' ? 5 : 9, t + len * 0.6);
    vib.connect(vg);
    vib.start(t);
    vib.stop(t + len + 0.4);
    const hold = (peak: number, attack: number, release: number) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + attack);
      g.gain.setValueAtTime(peak, t + len - 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len + release);
      return g;
    };
    if (v === 'flute') {
      const g = hold(0.08, 0.06, 0.15);
      g.connect(out);
      vg.connect(this.osc('sine', f, t, len + 0.3, g).detune);
      vg.connect(this.osc('triangle', f * 2, t, len + 0.3, g, 4).detune);
      // breath
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f * 2;
      bp.Q.value = 2;
      const bg = hold(0.035, 0.03, 0.08);
      this.noiseSrc(t, len + 0.3).connect(bp).connect(bg).connect(out);
      return;
    }
    if (v === 'brass') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 1.5;
      lp.frequency.setValueAtTime(350, t);
      lp.frequency.exponentialRampToValueAtTime(2600, t + 0.09);
      lp.frequency.exponentialRampToValueAtTime(1300, t + len);
      const g = hold(0.075, 0.05, 0.12);
      lp.connect(g).connect(out);
      for (const d of [-8, 8]) vg.connect(this.osc('sawtooth', f, t, len + 0.3, lp, d).detune);
      return;
    }
    if (v === 'choir') {
      // "aah": detuned saws an octave down through vowel formants, slow to swell
      f /= 2;
      const g = hold(0.07, 0.14, 0.4);
      g.connect(out);
      const mix = ctx.createGain();
      for (const [fq, q, lv] of [
        [750, 6, 1],
        [1200, 7, 0.6],
        [2600, 8, 0.25],
      ]) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = fq;
        bp.Q.value = q;
        const bg = ctx.createGain();
        bg.gain.value = lv * 2.2;
        mix.connect(bp).connect(bg).connect(g);
      }
      for (const d of [-14, 0, 14]) vg.connect(this.osc('sawtooth', f, t, len + 0.5, mix, d).detune);
      return;
    }
    // glass: a clear sine with a soft octave and a faint shimmer, ringing on
    const g = this.env(t, 0.085, 0.004, len * 1.3);
    g.connect(out);
    this.osc('sine', f, t, len * 1.4, g);
    const o2 = ctx.createGain();
    o2.gain.value = 0.3;
    o2.connect(g);
    this.osc('sine', f * 2, t, len * 1.4, o2, 3);
    const o3 = ctx.createGain();
    o3.gain.value = 0.08;
    o3.connect(g);
    this.osc('sine', f * 3.01, t, len * 0.8, o3);
  }
  /** a deep drum with a long boom */
  private taikoHit(t: number, level: number): void {
    const ctx = this.ctx!;
    const g = this.env(t, 0.75 * level, 0.004, 0.55);
    g.connect(this.music);
    g.connect(this.verb);
    const o = this.osc('sine', 95, t, 0.7, g);
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.35);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const sk = this.env(t, 0.25 * level, 0.001, 0.08);
    this.noiseSrc(t, 0.12).connect(lp).connect(sk).connect(this.music);
  }
  /** hammer on an anvil: bright inharmonic ring */
  private anvilHit(t: number, level: number): void {
    for (const [mul, a, d] of [
      [1, 0.5, 0.5],
      [2.4, 0.35, 0.35],
      [3.9, 0.25, 0.25],
      [5.3, 0.15, 0.18],
    ]) {
      const g = this.env(t, 0.05 * level * a * 2, 0.001, d);
      g.connect(this.music);
      g.connect(this.verb);
      this.osc('sine', 1180 * mul, t, d + 0.05, g);
    }
    const hp = this.ctx!.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3000;
    const k = this.env(t, 0.12 * level, 0.001, 0.03);
    this.noiseSrc(t, 0.06).connect(hp).connect(k).connect(this.music);
  }
  /** a stutter: two 32nd-note bursts of noise and a falling square blip */
  private glitchStep(t: number, ch: Chord): void {
    const half = this.STEP / 2;
    for (let k = 0; k < 2; k++) this.hat(t + k * half, 0.12, false);
    const g = this.env(t, 0.05, 0.001, this.STEP * 0.8);
    g.connect(this.music);
    g.connect(this.echo);
    const o = this.osc('square', hz(ch.root + 36), t, this.STEP, g);
    o.frequency.exponentialRampToValueAtTime(hz(ch.root + 12), t + this.STEP * 0.8);
  }
  /** a one-bar noise sweep, rising or falling */
  private sweepNoise(t: number, dir: 'up' | 'down'): void {
    const ctx = this.ctx!;
    const dur = this.STEP * 16;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(dir === 'up' ? 300 : 4000, t);
    bp.frequency.exponentialRampToValueAtTime(dir === 'up' ? 5000 : 150, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + (dir === 'up' ? dur * 0.95 : dur * 0.15));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    this.noiseSrc(t, dur + 0.1).connect(bp).connect(g);
    g.connect(this.music);
    g.connect(this.verb);
  }
  private tickTock(t: number, tick: boolean): void {
    const ctx = this.ctx!;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = tick ? 3400 : 2300;
    bp.Q.value = 8;
    const g = this.env(t, 0.3, 0.001, 0.05);
    this.noiseSrc(t, 0.08).connect(bp).connect(g).connect(this.music);
  }
  /** bell: a few inharmonic sine partials (also the chime effect) */
  private bellNote(f: number, t: number, level: number, out: AudioNode = this.music): void {
    const ctx = this.ctx!;
    for (const [mul, a, d] of [
      [1, 1, 1.6],
      [2.76, 0.4, 0.9],
      [5.4, 0.2, 0.5],
    ]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mul;
      const g = this.env(t, level * a, 0.003, d);
      o.connect(g);
      g.connect(out);
      g.connect(this.verb);
      o.start(t);
      o.stop(t + d + 0.1);
    }
  }

  // ---------------------------------------------------------------- ambience
  private bed(): void {
    const ctx = this.ctx!;
    const A = this.air;
    if (A.cut > 0) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = A.band ? 'bandpass' : 'lowpass';
      f.frequency.value = A.cut;
      if (A.band) f.Q.value = 0.7;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = A.lfo;
      const lg = ctx.createGain();
      lg.gain.value = A.depth;
      lfo.connect(lg).connect(f.frequency);
      const g = ctx.createGain();
      g.gain.value = A.level;
      src.connect(f).connect(g).connect(this.sfx);
      src.start();
      lfo.start();
    }
    if (A.drone) {
      const g = ctx.createGain();
      g.gain.value = A.droneLevel ?? 0.04;
      for (const m of [1, 1.5, 2.01]) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = A.drone * m;
        o.connect(g);
        o.start();
      }
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lg = ctx.createGain();
      lg.gain.value = (A.droneLevel ?? 0.04) * 0.6;
      lfo.connect(lg).connect(g.gain);
      lfo.start();
      g.connect(this.sfx);
    }
  }
  private panner(x: number): StereoPannerNode {
    const pan = this.ctx!.createStereoPanner();
    pan.pan.value = Math.max(-0.9, Math.min(0.9, x * 2 - 1));
    pan.connect(this.sfx);
    return pan;
  }
  /** One-shot sound for an arena effect. */
  play(e: ArenaSound): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.03;
    switch (e.kind) {
      case 'thunder':
        return this.thunder(e.x, e.big, e.ground);
      case 'rumble':
        return this.rumble(e.x, e.big, t);
      case 'crackle':
        return this.crackle(e.x, e.big, t);
      case 'whoosh':
        return this.whoosh(e.x, e.big, t);
      case 'splash':
        return this.splash(e.x, e.big, t);
      case 'chime':
        return this.bellNote(e.big ? 1046 : 1568 + Math.random() * 400, t, e.big ? 0.12 : 0.05, this.panner(e.x));
      case 'tick':
        return this.tickOne(e.x, e.big, t);
      case 'hum':
        return this.hum(e.x, e.big, t);
      case 'creak':
        return this.creak(e.x, t);
    }
  }
  /** Thunder for a strike: x 0..1 across the arena (pan); big strikes crack first; cloud arcs only rumble softly. */
  thunder(x: number, big: boolean, ground: boolean): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const pan = this.panner(x);
    const t = ctx.currentTime + (big ? 0.05 : 0.25 + Math.random() * 0.6);
    if (big && ground) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 900;
      const g = this.env(t, 0.55, 0.002, 0.28);
      this.noiseSrc(t, 0.4).connect(hp).connect(g).connect(pan);
    }
    const dur = (ground ? 3 : 1.8) + Math.random() * 1.6;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(big ? 380 : 220, t);
    lp.frequency.exponentialRampToValueAtTime(70, t + dur);
    const g = ctx.createGain();
    const peak = (ground ? (big ? 0.9 : 0.55) : 0.28) * (0.8 + Math.random() * 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.08);
    // rolling: a few swells while it fades
    for (let k = 1; k <= 4; k++) {
      const tk = t + (dur * k) / 5;
      g.gain.exponentialRampToValueAtTime(peak * (0.25 + Math.random() * 0.5) * (1 - k / 6), tk);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const src = this.noiseSrc(t, dur + 0.1);
    src.playbackRate.value = 0.6;
    src.connect(lp).connect(g);
    g.connect(pan);
    g.connect(this.verb);
  }
  private rumble(x: number, big: boolean, t: number): void {
    const ctx = this.ctx!;
    const pan = this.panner(x);
    const dur = big ? 1.6 : 0.9;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(big ? 260 : 180, t);
    lp.frequency.exponentialRampToValueAtTime(60, t + dur);
    const g = this.env(t, big ? 0.7 : 0.35, 0.03, dur);
    const src = this.noiseSrc(t, dur + 0.1);
    src.playbackRate.value = 0.5;
    src.connect(lp).connect(g).connect(pan);
    // a few pebble clicks on big ones
    if (big)
      for (let k = 0; k < 5; k++) {
        const tk = t + 0.15 + Math.random() * 0.8;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1200 + Math.random() * 1500;
        bp.Q.value = 4;
        const gk = this.env(tk, 0.12, 0.001, 0.05);
        this.noiseSrc(tk, 0.08).connect(bp).connect(gk).connect(pan);
      }
  }
  private crackle(x: number, big: boolean, t: number): void {
    const ctx = this.ctx!;
    const pan = this.panner(x);
    const n = big ? 14 : 6;
    for (let k = 0; k < n; k++) {
      const tk = t + Math.random() * (big ? 0.9 : 0.4);
      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.value = 1800 + Math.random() * 3000;
      hp.Q.value = 2;
      const gk = this.env(tk, 0.06 + Math.random() * 0.1, 0.001, 0.02 + Math.random() * 0.03);
      this.noiseSrc(tk, 0.06).connect(hp).connect(gk).connect(pan);
    }
    if (big) {
      // the whump of a lava burst
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(500, t);
      lp.frequency.exponentialRampToValueAtTime(90, t + 0.6);
      const g = this.env(t, 0.5, 0.01, 0.7);
      this.noiseSrc(t, 0.8).connect(lp).connect(g).connect(pan);
    }
  }
  private whoosh(x: number, big: boolean, t: number): void {
    const ctx = this.ctx!;
    const pan = this.panner(x);
    const dur = big ? 1.4 : 0.8;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.5;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(big ? 2400 : 1600, t + dur * 0.5);
    bp.frequency.exponentialRampToValueAtTime(400, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(big ? 0.45 : 0.22, t + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    this.noiseSrc(t, dur + 0.1).connect(bp).connect(g).connect(pan);
    pan.pan.linearRampToValueAtTime(Math.max(-0.9, Math.min(0.9, x * 2 - 1 + 0.6)), t + dur);
  }
  private splash(x: number, big: boolean, t: number): void {
    const ctx = this.ctx!;
    const pan = this.panner(x);
    const dur = big ? 1.2 : 0.6;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(big ? 5000 : 3000, t);
    lp.frequency.exponentialRampToValueAtTime(300, t + dur);
    const g = this.env(t, big ? 0.4 : 0.18, 0.01, dur);
    this.noiseSrc(t, dur + 0.1).connect(lp).connect(g).connect(pan);
    g.connect(this.verb);
    // bubbles: short rising sine blips
    for (let k = 0; k < (big ? 6 : 3); k++) {
      const tk = t + 0.1 + Math.random() * dur * 0.7;
      const o = ctx.createOscillator();
      const f = 400 + Math.random() * 600;
      o.frequency.setValueAtTime(f, tk);
      o.frequency.exponentialRampToValueAtTime(f * 2.2, tk + 0.06);
      const gk = this.env(tk, 0.05, 0.003, 0.06);
      o.connect(gk).connect(pan);
      o.start(tk);
      o.stop(tk + 0.1);
    }
  }
  private tickOne(x: number, big: boolean, t: number): void {
    const ctx = this.ctx!;
    const pan = this.panner(x);
    if (big) {
      // a deep clock-tower bong
      this.bellNote(hz(45), t, 0.25, pan);
      return;
    }
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2800;
    bp.Q.value = 10;
    const g = this.env(t, 0.25, 0.001, 0.05);
    this.noiseSrc(t, 0.08).connect(bp).connect(g).connect(pan);
  }
  private hum(x: number, big: boolean, t: number): void {
    const ctx = this.ctx!;
    const pan = this.panner(x);
    const dur = big ? 2.2 : 1.2;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(big ? 55 : 90, t);
    o.frequency.exponentialRampToValueAtTime(big ? 38 : 130, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(big ? 0.5 : 0.18, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(pan);
    g.connect(this.verb);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  private creak(x: number, t: number): void {
    const ctx = this.ctx!;
    const pan = this.panner(x);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t);
    o.frequency.linearRampToValueAtTime(110, t + 0.5);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 700;
    bp.Q.value = 6;
    const g = this.env(t, 0.08, 0.05, 0.5);
    o.connect(bp).connect(g).connect(pan);
    o.start(t);
    o.stop(t + 0.6);
  }
}
