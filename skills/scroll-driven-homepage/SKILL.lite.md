---
name: scroll-driven-homepage
description: Design and build a scroll-driven ("scrollytelling") homepage — pinned scenes whose animation follows the scroll, text written word by word, a camera dive into a product screen, timed product demos — from an inspiration site to a reviewed, accessible, fast production page. No animation library; works with any framework. Use when someone wants a homepage or landing page "like <site>" with scroll animations, pinned sections, parallax, or animated product demos.
license: MIT — © 2026 Ecclesiaste Panda (keep this notice in copies)
metadata:
  author: Ecclesiaste Panda
  version: {{version}}
  edition: essential (single file)
  commit: {{commit}}
---

# Scroll-driven homepage (essential edition)

Install: put this file at `.claude/skills/scroll-driven-homepage/SKILL.md`.

A method for turning "I like how <site> moves when you scroll" into a production homepage that
the owner approved, that runs at 60 fps, works on a phone, and respects people who ask for less
motion. Get approval on a cheap mockup before building anything expensive.

## 1. Study the inspiration, mock it, get a yes

1. Describe each scene of the inspiration site in words: what is pinned, what moves, over how
   much scroll, what the visitor learns. Style reference only: never copy its text, images,
   brand or code.
2. Write the page as a story for *this* product, 3–5 scenes. A pattern that works:
   opening (photo of the customer's world + headline, then a dive into the product's real screen)
   → problem (a statement written word by word; the mess around it gathers into the product's
   name) → answer + calls to action → "how it works" with short timed demos → the usual
   sections, restyled, not animated.
3. Build a single-file HTML mockup with the engine below, real copy, real screenshots. Mark
   invented figures as illustrative on the page.
4. Record a video of a steady scroll through it (Playwright `recordVideo`) and send it to the
   decision maker. Write down exactly what was approved and what was never shown.

## 2. Plan

- Check the mockup at 390 px wide first and list what breaks (devices too small to read → phone
  frame with a mobile screenshot; strips cut off → wrap; floating elements placed in % that land
  off-screen or over text → own positions and fewer elements on small screens).
- One scene per phase. Each phase ends with tests, a build, captures at 1440 and 390 px, and a
  review of the diff by someone who only gets the diff and the rules.
- Open one draft PR at the first scene so a half-built page cannot be merged.

## 3. The engine (no library)

A pinned scene is a tall section (`height: 300vh`; taller = slower) holding a
`position: sticky; top: 0; height: 100dvh` stage. Its scroll position becomes `p` from 0 to 1,
and every moving part is "between p = a and p = b, go from X to Y with this easing":

```js
mountScene(section, (p) => {
  const t = ease(seg(p, 0.35, 0.9));
  device.style.scale = String(lerp(1, 4, t));
}, { staticProgress: 0 }); // reduced motion: draw p = 0 once (use 1 when the end state is the content)
```

Rules: render functions write styles and CSS variables directly — never framework state — so
scrolling re-renders nothing. Read layout first, then write. Mount after the first render in the
browser; call the returned `stop` on unmount. Style `.scroll-scene--static` to remove the extra
height and the pinning.

```js
{{engine.js}}
```

## 4. Timed demos ("how it works")

Each step has `reset()`, `final()` and an async `play(run)`. `run` is a cancellable runner whose
helpers (`wait`, `type`, `count`, `progress`) all reject when the run is cancelled and clear their
own timers. Play only when the section is ≥ 45 % on screen, the tab is visible and the user has not
paused; otherwise show each step's finished state. Start `play` inside a promise so a step that
throws cannot freeze the cycle. Give a pause button (WCAG 2.2.2) and hold the auto-advance while
keyboard focus or the pointer is inside the step list. Format numbers with `Intl.NumberFormat`.

## 5. Checks for every scene

- Mobile: 360, 390, 768, 1440 px, a short phone and landscape; nothing off-screen or over text.
- Reduced motion: no pinning, complete end state (the last word at 100 %), demos static.
- Accessibility: one `h1`; animated text is real text (`aria-label` on the sentence, word spans
  `aria-hidden`); hidden and decorative layers `inert`; in-page links land below the sticky header
  and move focus.
- Performance: zero framework re-renders per scroll frame; listener detached when no scene is
  near; animate `transform`/`opacity`; measure `filter: blur()`; Lighthouse on the production
  build (watch for a footer causing layout shift on a lazy page).
- Tests: helpers at `p` exactly 0 and 1; captures with `scrollTo({ behavior: 'instant' })`; the
  page's real feature (form, search) still works end to end.
- Static description / Open Graph tags in the HTML shell: link previews do not run JavaScript.

## Mistakes already made, so you don't

- A word reveal whose last word stopped at ~79 %: test `p = 1` exactly.
- Reading the first IntersectionObserver entry instead of the last.
- A fast fling leaving a scene half drawn: draw one last frame when it leaves.
- Invisible layers still reachable with Tab.
- A scroll listener updating framework state on every event.
- `100vh` on mobile: use `100dvh` and redraw on resize.

---

This is the essential edition. A full edition exists with the demo player code, a runnable
example page, the complete checklist and notes for Angular, React, Vue and Svelte: if you get
stuck, ask Ecclesiaste for it.

MIT licence — © 2026 Ecclesiaste Panda. Free to use and modify; keep this notice in copies.
