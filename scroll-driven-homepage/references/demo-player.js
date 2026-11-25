// Timed product demos that play one after another ("how it works" steps).
//
// A step is { durationMs, reset(), final(), play(run) }. `play` is async and must only await the
// run's helpers (wait, type, count, progress): when the run is cancelled (another step chosen,
// scrolled away, paused) every helper rejects with DemoCancelled and all timers are cleared.

import { easeOut } from './engine.js';

export const browserClock = {
  now: () => performance.now(),
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (id) => window.clearTimeout(id),
  requestAnimationFrame: (fn) => window.requestAnimationFrame(fn),
  cancelAnimationFrame: (id) => window.cancelAnimationFrame(id),
};

export class DemoCancelled extends Error {
  constructor() {
    super('Demo cancelled');
  }
}

/** One playback of one step. */
export class DemoRun {
  constructor(clock = browserClock) {
    this.clock = clock;
    this.cancelled = false;
    this.timers = new Set();
    this.frames = new Set();
    this.rejects = new Set();
  }

  cancel() {
    if (this.cancelled) return;
    this.cancelled = true;
    for (const id of this.timers) this.clock.clearTimeout(id);
    for (const id of this.frames) this.clock.cancelAnimationFrame(id);
    for (const reject of this.rejects) reject(new DemoCancelled());
    this.timers.clear();
    this.frames.clear();
    this.rejects.clear();
  }

  wait(ms) {
    return this.#task((done) => this.#timeout(done, ms));
  }

  /** Types `text` one character at a time over `ms`. */
  type(text, ms, onText) {
    const step = text.length ? ms / text.length : 0;
    return this.#task((done) => {
      let i = 0;
      const tick = () => {
        onText(text.slice(0, ++i));
        if (i < text.length) this.#timeout(tick, step);
        else done();
      };
      text.length ? tick() : done();
    });
  }

  /** Counts from `from` to `to` over `ms`, easing out. */
  count(from, to, ms, onValue) {
    return this.progress(ms, (k) => onValue(from + (to - from) * easeOut(k)));
  }

  /** Calls fn(k) every frame, k from 0 to 1 over `ms`. */
  progress(ms, fn) {
    return this.#task((done) => {
      const t0 = this.clock.now();
      const tick = (now) => {
        // A frame timestamp can be slightly before t0: never go below 0.
        const k = ms > 0 ? Math.min(1, Math.max(0, (now - t0) / ms)) : 1;
        fn(k);
        k < 1 ? this.#frame(tick) : done();
      };
      tick(t0);
    });
  }

  #task(start) {
    if (this.cancelled) return Promise.reject(new DemoCancelled());
    return new Promise((resolve, reject) => {
      this.rejects.add(reject);
      start(() => {
        this.rejects.delete(reject);
        if (!this.cancelled) resolve();
      });
    });
  }

  #timeout(fn, ms) {
    const id = this.clock.setTimeout(() => {
      this.timers.delete(id);
      if (!this.cancelled) fn();
    }, ms);
    this.timers.add(id);
  }

  #frame(fn) {
    const id = this.clock.requestAnimationFrame((now) => {
      this.frames.delete(id);
      if (!this.cancelled) fn(now);
    });
    this.frames.add(id);
  }
}

/**
 * Plays steps in a loop while visible and not paused; otherwise shows the current step finished.
 * options: { onShow(i), onProgress(i, k), reduced?, onError? }
 */
export class DemoPlayer {
  constructor(steps, options, clock = browserClock) {
    this.steps = steps;
    this.options = options;
    this.clock = clock;
    this.current = 0;
    this.visible = false;
    this.paused = false;
    this.run = null;
    this.destroyed = false;
  }

  get playing() {
    return this.visible && !this.paused && !this.options.reduced;
  }

  /** Shows step i and plays it if playing. Choosing a step restarts the cycle from it. */
  go(i) {
    if (this.destroyed) return;
    this.#stopRun();
    const n = this.steps.length;
    this.current = ((i % n) + n) % n;
    const step = this.steps[this.current];
    this.options.onShow(this.current);
    this.options.onProgress(this.current, 0);
    if (!this.playing) {
      step.final();
      return;
    }
    step.reset();
    const run = (this.run = new DemoRun(this.clock));
    // Inside a promise so a play() that throws synchronously is caught too.
    Promise.resolve()
      .then(() => step.play(run))
      .catch((e) => this.#report(e));
    run
      .progress(step.durationMs, (k) => this.options.onProgress(this.current, k))
      .then(() => this.go(this.current + 1))
      .catch((e) => this.#report(e));
  }

  setVisible(visible) {
    this.#setState(visible, this.paused);
  }

  setPaused(paused) {
    this.#setState(this.visible, paused);
  }

  destroy() {
    this.destroyed = true;
    this.#stopRun();
  }

  #report(e) {
    if (!(e instanceof DemoCancelled)) (this.options.onError ?? console.error)(e);
  }

  #setState(visible, paused) {
    if (this.destroyed) return;
    const was = this.playing;
    this.visible = visible;
    this.paused = paused;
    if (this.playing !== was) this.go(this.current);
  }

  #stopRun() {
    this.run?.cancel();
    this.run = null;
  }
}

/**
 * Wires a player to a section: plays when ≥45 % visible and the tab is visible.
 * Returns a cleanup function.
 */
export function watchVisibility(section, player) {
  let onScreen = false;
  const update = () => player.setVisible(onScreen && document.visibilityState === 'visible');
  const io = new IntersectionObserver(
    (entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      update();
    },
    { threshold: 0.45 },
  );
  io.observe(section);
  document.addEventListener('visibilitychange', update);
  return () => {
    io.disconnect();
    document.removeEventListener('visibilitychange', update);
    player.destroy();
  };
}
