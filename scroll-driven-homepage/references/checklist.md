# Checklist for each scene

Run it before asking for a review. Every line is something that went wrong at least once.

## Mobile
- [ ] Captures at 360, 390, 768 and 1440 px wide; also a short phone (375×667) and landscape.
- [ ] No horizontal page scroll; no element off-screen or over the text at any size.
- [ ] Stage height is `100dvh`, and the scene redraws on resize (mobile toolbars change it).
- [ ] Small screens have their own positions / fewer floating elements where needed; the JS and
      CSS breakpoints are the same `rem` media query.
- [ ] Screenshots inside device frames are readable at the start (phone frame + mobile capture on
      small screens) and sharp at the end of a zoom (capture at 1.5–2×).

## Reduced motion
- [ ] With `prefers-reduced-motion: reduce`: no pinning, no extra height, end state drawn once,
      demos show their finished state with manual controls.
- [ ] The end state is complete (last word at 100 %, all elements placed).

## Accessibility
- [ ] One `h1` on the page.
- [ ] Animated text is real text: the container has the whole sentence (`aria-label` or visually
      hidden copy), the per-word spans are `aria-hidden`.
- [ ] Decorative or currently hidden layers are `inert` (Tab never lands in them).
- [ ] Anything that moves for more than 5 s can be paused (WCAG 2.2.2). Auto-advance holds while
      keyboard focus or the pointer is inside the controls.
- [ ] Tabs / step lists are keyboard operable; in-page links scroll below the sticky header and
      move focus to the target.
- [ ] Contrast checked over photos and in dark mode if the site has one.

## Performance
- [ ] Zero framework re-renders per scroll frame (React Profiler, Angular profiler, Vue devtools).
      Only threshold crossings (header shown/hidden) may update state.
- [ ] The scroll listener is detached when no scene is near the screen.
- [ ] Each render reads layout first, then writes; no read after a write in the same frame.
- [ ] Animate `transform`, `opacity` and CSS variables; avoid animating `filter: blur()` on large
      areas, or measure it (CPU ×4, count frames > 33 ms) and confirm on a real device.
- [ ] Lighthouse on the production build, mobile and desktop; layout shift < 0.1.
- [ ] Bundle: report the homepage chunk size; the engine should add < 20 kB raw.

## Tests
- [ ] Unit tests on the pure helpers, with `p` at exactly 0 and 1.
- [ ] Unit tests on the loop with a fake `window` (attach on first scene, detach on last, one
      render per frame) and on the demo run with a fake clock (cancel clears timers, k never < 0,
      a step that throws does not stop the cycle).
- [ ] Captures at fixed scroll positions with `window.scrollTo({ top, behavior: 'instant' })`
      (a global `scroll-behavior: smooth` otherwise makes captures land mid-scroll), compared
      with the approved video.
- [ ] The real feature on the page (form, search, sign-up) still works end to end.

## Content
- [ ] Copy is the approved copy; anything not approved is flagged.
- [ ] Figures in demos are marked illustrative; numbers formatted with `Intl.NumberFormat` for the
      page's locale.
- [ ] No text, image or code taken from the inspiration site.
