// SPDX-License-Identifier: MIT — © 2026 Ecclesiaste Panda
// Scroll engine for pinned scenes. Plain ES module, no dependency.
//
// A scene is a tall section with a sticky stage inside. While the section is near the viewport,
// its position becomes a progress p from 0 (its top reaches the top of the viewport) to 1 (its
// bottom reaches the bottom). A render function maps slices of p to style writes:
//
//   const t = ease(seg(p, 0.2, 0.5));            // 0 → 1 between p = 0.2 and p = 0.5
//   el.style.transform = `scale(${lerp(1, 3, t)})`;
//
// Renders must write styles directly, never framework state, so scrolling re-renders nothing.

/** Clamps to [0, 1]. @param {number} v */
export function clamp(v) {
  return v <= 0 ? 0 : v > 1 ? 1 : v;
}

/** Local progress of p inside [a, b]: 0 before a, 1 after b. */
export function seg(p, a, b) {
  return clamp((p - a) / (b - a));
}

/** Cubic ease in-out. */
export function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Cubic ease out (counters, arrivals). */
export function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Progress of a pinned section.
 * @param {number} top  section.getBoundingClientRect().top
 * @param {number} height  section.offsetHeight
 * @param {number} viewportHeight  window.innerHeight
 */
export function sceneProgress(top, height, viewportHeight) {
  const travel = height - viewportHeight;
  if (travel <= 0) return top <= 0 ? 1 : 0;
  return clamp(-top / travel);
}

/**
 * Reveal (0..1) of word i of n while p goes from a to b. Words start one after another and each
 * lasts 1.6 slots; slots are sized so the LAST word is complete exactly at b (test p = b).
 */
export function wordReveal(p, a, b, i, n) {
  const slot = (b - a) / (n + 0.6);
  return ease(seg(p, a + slot * i, a + slot * (i + 1.6)));
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Wraps each word of an element in a span, keeps the sentence readable by screen readers
 * (aria-label on the element, spans aria-hidden) and returns the spans.
 * @param {HTMLElement} el
 * @returns {HTMLSpanElement[]}
 */
export function splitWords(el) {
  const text = el.textContent.trim().replace(/\s+/g, ' ');
  el.setAttribute('aria-label', text);
  el.textContent = '';
  return text.split(' ').map((word, i, all) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = word;
    el.append(span);
    if (i < all.length - 1) el.append(' ');
    return span;
  });
}

/**
 * One passive scroll + resize listener for the whole page, one render pass per frame, attached
 * only while at least one scene is active. `host` is `window`, or a fake in tests.
 */
export class ScrollLoop {
  constructor(host = window) {
    this.host = host;
    this.renders = new Set();
    this.frameId = null;
    this.listening = false;
    this.onEvent = () => this.schedule();
  }

  add(render) {
    this.renders.add(render);
    if (!this.listening) {
      this.host.addEventListener('scroll', this.onEvent, { passive: true });
      this.host.addEventListener('resize', this.onEvent);
      this.listening = true;
    }
    this.schedule();
  }

  remove(render) {
    this.renders.delete(render);
    if (this.renders.size || !this.listening) return;
    this.host.removeEventListener('scroll', this.onEvent);
    this.host.removeEventListener('resize', this.onEvent);
    this.listening = false;
    if (this.frameId !== null) this.host.cancelAnimationFrame(this.frameId);
    this.frameId = null;
  }

  schedule() {
    if (this.frameId !== null) return;
    this.frameId = this.host.requestAnimationFrame(() => {
      this.frameId = null;
      for (const render of this.renders) render();
    });
  }
}

let sharedLoop = null;
/** The page's loop, created on first use (safe to import during server rendering). */
export function pageLoop() {
  return (sharedLoop ??= new ScrollLoop(window));
}

/**
 * Runs one scene on a section element. Returns a `stop` function (call it on unmount).
 *
 * - Draws on every scrolled frame while the section is within 25 % of a viewport of the screen.
 * - Draws one last frame when it leaves, so a fast fling never leaves it half drawn.
 * - Sets the CSS variable --scene-p on the section, for pure-CSS effects.
 * - Reduced motion (or no IntersectionObserver): adds `scroll-scene--static` and draws
 *   `staticProgress` once (default 1 = end state). Style that class to drop height and pinning.
 *
 * @param {HTMLElement} section
 * @param {(p: number) => void} render
 * @param {{ staticProgress?: number, loop?: ScrollLoop }} [options]
 */
export function mountScene(section, render, options = {}) {
  const draw = (p) => {
    section.style.setProperty('--scene-p', p.toFixed(4));
    render(p);
  };
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    section.classList.add('scroll-scene--static');
    draw(options.staticProgress ?? 1);
    return () => {};
  }
  const loop = options.loop ?? pageLoop();
  const frame = () =>
    draw(sceneProgress(section.getBoundingClientRect().top, section.offsetHeight, window.innerHeight));
  const io = new IntersectionObserver(
    (entries) => {
      // Several entries can arrive at once (in, then out): the last one is current.
      if (entries[entries.length - 1].isIntersecting) loop.add(frame);
      else {
        loop.remove(frame);
        frame();
      }
    },
    { rootMargin: '25% 0px' },
  );
  io.observe(section);
  frame();
  return () => {
    io.disconnect();
    loop.remove(frame);
  };
}
