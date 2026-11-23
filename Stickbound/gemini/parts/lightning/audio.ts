/**
 * Arena sound, made live with the Web Audio API (no audio files, all original):
 * - "Volt City", a 124 BPM synth battle loop in A minor: four-on-the-floor kick, claps, hats,
 *   pumping bass, a side-chained pad, a plucked arpeggio with echo, and a lead in the second half
 * - a low storm-wind bed
 * - thunder for every lightning strike: a crack for big strikes, then a long rolling rumble, panned to where it hit
 * Browsers only allow sound after a click or key press, so start() is called on the first input.
 */
const BPM = 124;
const STEP = 60 / BPM / 4; // one 16th note
// A minor: Am F C G, then Dm F Am G (root notes as MIDI, chord tones as semitones above the root)
const PROG: Array<{ root: number; tones: number[] }> = [
  { root: 57, tones: [0, 3, 7] },
  { root: 53, tones: [0, 4, 7] },
  { root: 48, tones: [0, 4, 7] },
  { root: 55, tones: [0, 4, 7] },
  { root: 50, tones: [0, 3, 7] },
  { root: 53, tones: [0, 4, 7] },
  { root: 57, tones: [0, 3, 7] },
  { root: 55, tones: [0, 4, 7] },
];
// lead melody for bars 4..7 (MIDI per 8th note, 0 = rest)
const LEAD = [
  [74, 0, 72, 74, 0, 77, 76, 74],
  [72, 0, 69, 72, 0, 74, 72, 69],
  [76, 0, 74, 76, 0, 79, 77, 76],
  [74, 0, 71, 74, 79, 0, 78, 79],
];
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
  musicOn = localStorage.getItem('ek.lab.music') !== '0';
  sfxOn = localStorage.getItem('ek.lab.sfx') !== '0';
  volume = Number(localStorage.getItem('ek.lab.vol') ?? '0.7');

  /** Create the audio graph on the first user input. Safe to call many times. */
  start(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
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
    // white noise for drums, wind and thunder
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
    // 3/16 echo for the arpeggio and lead
    this.echo = ctx.createDelay(1);
    this.echo.delayTime.value = STEP * 3;
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
    this.wind();
    this.next = ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
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
      this.next += STEP;
      this.step = (this.step + 1) % (16 * PROG.length * 2);
    }
  }
  private playStep(n: number, t: number): void {
    const s = n % 16;
    const bar = Math.floor(n / 16) % PROG.length;
    const loop = Math.floor(n / (16 * PROG.length)); // 0 = first pass (no lead), 1 = second pass
    const ch = PROG[bar];
    if (s % 4 === 0) this.kick(t);
    if (s === 4 || s === 12) this.clap(t);
    if (s % 2 === 1) this.hat(t, s % 4 === 2 ? 0.05 : 0.11);
    if (s % 4 === 2) this.hat(t, 0.16, true);
    if (bar === PROG.length - 1 && s >= 12) this.clap(t, 0.5); // fill into the next loop
    if ([0, 2, 3, 6, 8, 10, 11, 14].includes(s)) this.bass(hz(ch.root - 12 + (s === 11 || s === 14 ? 12 : 0)), t);
    if (s === 0) this.pad(ch, t);
    const arp = [0, 1, 2, 1, 2, 3, 2, 1];
    const i = arp[s % 8];
    this.pluck(hz(ch.root + 12 + (i === 3 ? 12 : ch.tones[i])), t, s % 4 === 0 ? 0.12 : 0.08);
    if (loop === 1 && bar >= 4 && s % 2 === 0) {
      const m = LEAD[bar - 4][s / 2];
      if (m) this.lead(hz(m), t);
    }
    // side-chain: duck the pad on every kick
    if (s % 4 === 0) {
      this.padBus.gain.cancelScheduledValues(t);
      this.padBus.gain.setValueAtTime(0.35, t);
      this.padBus.gain.linearRampToValueAtTime(1, t + STEP * 3);
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
  private kick(t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    const g = this.env(t, 0.9, 0.003, 0.32);
    o.connect(g).connect(this.music);
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
  private hat(t: number, level: number, open = false): void {
    const ctx = this.ctx!;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    const g = this.env(t, level, 0.001, open ? 0.16 : 0.04);
    this.noiseSrc(t, 0.25).connect(hp).connect(g).connect(this.music);
  }
  private bass(f: number, t: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 6;
    lp.frequency.setValueAtTime(1100, t);
    lp.frequency.exponentialRampToValueAtTime(180, t + 0.14);
    const g = this.env(t, 0.32, 0.004, 0.17);
    o.connect(lp).connect(g).connect(this.music);
    o.start(t);
    o.stop(t + 0.25);
  }
  private pad(ch: { root: number; tones: number[] }, t: number): void {
    const ctx = this.ctx!;
    const dur = STEP * 16;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1300;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.35);
    g.gain.setValueAtTime(0.07, t + dur - 0.2);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.25);
    lp.connect(g).connect(this.padBus);
    for (const tone of ch.tones)
      for (const det of [-9, 9]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = hz(ch.root + tone);
        o.detune.value = det;
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.3);
      }
  }
  private pluck(f: number, t: number, level: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3200, t);
    lp.frequency.exponentialRampToValueAtTime(500, t + 0.12);
    const g = this.env(t, level * 0.5, 0.002, 0.14);
    o.connect(lp).connect(g);
    g.connect(this.music);
    g.connect(this.echo);
    o.start(t);
    o.stop(t + 0.2);
  }
  private lead(f: number, t: number): void {
    const ctx = this.ctx!;
    const g = this.env(t, 0.09, 0.01, STEP * 2.2);
    for (const [type, det] of [['sawtooth', -6], ['square', 6]] as const) {
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
      o.stop(t + STEP * 2.6);
      vib.stop(t + STEP * 2.6);
    }
    const lp = ctx.createBiquadFilter();
    lp.frequency.value = 2600;
    g.connect(lp);
    lp.connect(this.music);
    lp.connect(this.echo);
    lp.connect(this.verb);
  }

  // ---------------------------------------------------------------- weather
  private wind(): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lg = ctx.createGain();
    lg.gain.value = 220;
    lfo.connect(lg).connect(lp.frequency);
    const g = ctx.createGain();
    g.gain.value = 0.06;
    src.connect(lp).connect(g).connect(this.sfx);
    src.start();
    lfo.start();
  }
  /** Thunder for a strike: x 0..1 across the arena (pan); big strikes crack first; cloud arcs only rumble softly. */
  thunder(x: number, big: boolean, ground: boolean): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.max(-0.9, Math.min(0.9, x * 2 - 1));
    pan.connect(this.sfx);
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
}
