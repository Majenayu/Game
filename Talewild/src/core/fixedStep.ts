// Fixed-timestep accumulator. Game rules advance in equal steps no matter the frame rate,
// so a 30 fps phone and a 144 Hz monitor move the player the same distance per second.

export class FixedStep {
  private acc = 0;

  constructor(
    readonly stepMs = 1000 / 60,
    /** Upper bound of steps per frame, so a long stall (tab switch, debugger) cannot cause a burst. */
    readonly maxSteps = 5,
  ) {}

  /** Adds frame time and runs `step` as many times as fit. Returns the number of steps run. */
  advance(frameMs: number, step: (ms: number) => void): number {
    this.acc += Math.max(0, Math.min(frameMs, this.stepMs * this.maxSteps));
    let n = 0;
    while (this.acc >= this.stepMs && n < this.maxSteps) {
      step(this.stepMs);
      this.acc -= this.stepMs;
      n++;
    }
    if (n === this.maxSteps) this.acc = Math.min(this.acc, this.stepMs);
    return n;
  }

  /** Fraction of the next step already accumulated (0 to 1), for render interpolation. */
  get alpha(): number {
    return this.acc / this.stepMs;
  }

  reset(): void {
    this.acc = 0;
  }
}
