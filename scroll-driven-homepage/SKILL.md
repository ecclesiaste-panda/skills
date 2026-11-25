---
name: scroll-driven-homepage
description: Design and build a scroll-driven ("scrollytelling") homepage — pinned scenes whose animation follows the scroll, text written word by word, a camera dive into a product screen, timed product demos — from an inspiration site to a reviewed, accessible, fast production page. No animation library; works with any framework. Use when someone wants a homepage or landing page "like <site>" with scroll animations, pinned sections, parallax, or animated product demos.
---

# Scroll-driven homepage

A method for turning "I like how <site> moves when you scroll" into a production homepage that
the owner has approved, that runs at 60 fps, that works on a phone, and that respects people who
ask for less motion.

The method has seven phases. Each one ends with something you can show. Do not skip phase 1 or 2:
motion is expensive to build and cheap to mock, so get approval on a mockup first.

Reference material in this folder:

| File | What it is |
|---|---|
| `references/engine.js` | The scroll engine: easing helpers, one shared scroll loop, `mountScene()`. Plain ES module, no dependency, typed with JSDoc. |
| `references/demo-player.js` | Timed, cancellable demos that auto-advance (typing, counters, cursors). |
| `references/example.html` | A minimal working page using both: a pinned dive scene, a sentence written word by word, a 3-step demo. Serve the folder (`npx serve references` or `python3 -m http.server -d references`) and open it. |
| `references/checklist.md` | The checks every scene must pass: mobile, reduced motion, accessibility, performance, tests. |
| `references/framework-notes.md` | How to wire the engine into Angular, React, Vue, Svelte without re-rendering on every frame. |

## Phase 1 — Study the inspiration, then mock it

1. Open the inspiration site and **describe each scene in words**: what is pinned, what moves,
   over how much scroll, what the user learns. Note the narrative, not the pixels. Take it as a
   style reference only: never copy its text, images, brand, or code.
2. Write the page as a story for *this* product: usually 3–5 scenes. A pattern that works:
   1. **Opening** — a real-world photo of the customer's context, the headline, then the camera
      dives into the product's screen (a real screenshot) — "this is where it happens".
   2. **Problem** — a statement written word by word as you scroll; the mess around it
      (documents, tools, chips) flies in, then gets pulled together into the product's name.
   3. **Answer** — one sentence and the calls to action.
   4. **How it works** — 3–5 steps, each with a short timed demo of the real screen.
   5. The usual sections (proof, pricing, FAQ, final call to action), restyled, not animated.
3. Build a **single-file HTML mockup** of the scenes with `references/engine.js` copied inline.
   Real copy in the target language, real screenshots. Mark anything invented (figures in a demo)
   as illustrative on the page itself.
4. Record a **video** of a scroll through the mockup (Playwright `recordVideo`, scrolling with a
   steady wheel) and send it to the decision maker. A video gets a clear yes/no; a link to a
   mockup gets "looks nice" and no decision.

Done when: the owner approved the video. Write down exactly which scenes and which copy were
approved, and which parts were never shown (they still need approval).

## Phase 2 — Plan

1. Check the mockup at **390 px wide** before writing production code, and list what breaks.
   Typical: a laptop frame too small to read (use a phone frame with a mobile screenshot), a logo
   strip cut off (wrap it), floating elements placed in % that land off-screen or over the text
   (give small screens their own positions and fewer elements), a demo panel that scrolls out of
   view when a step opens (put it inside the open step, or make it sticky).
2. Decide the motion approach and record why. Default: **no library** (see "Why no library").
3. Split the work into phases, one scene per phase, each ending with tests, a build, captures at
   1440 px and 390 px, and an independent review of the diff. Open one draft PR at the first scene
   so the half-built page cannot be merged by accident.

## Phase 3 — Engine

Port `references/engine.js` and `references/demo-player.js` into the project (see
`references/framework-notes.md`). Keep them as plain modules with unit tests on the pure parts:

- `sceneProgress(top, height, viewportHeight)` turns a section's position into `p` from 0 to 1.
- `seg(p, a, b)` maps a slice of `p` to 0..1; `ease`, `lerp` shape it. Every moving part of a
  scene is "between p = a and p = b, go from X to Y with this easing". That one idea is the whole
  animation language; the scene's timing lives in a table of `[a, b]` ranges you can tune.
- One passive scroll listener for the whole page, throttled to one `requestAnimationFrame`,
  attached **only while a scene is near the viewport** (IntersectionObserver).
- Renders write **styles and CSS variables directly** — never framework state — so scrolling
  never triggers a re-render or change detection.

Done when: the helpers are tested (including `p` exactly at 0 and 1, and the last word of a
sentence reaching 100 %), and the loop detaches when the last scene leaves the screen.

## Phase 4 — Scenes, one at a time

For each scene:

1. Markup: a tall section (`height: 300vh` or so — more height = slower scene) containing a
   `position: sticky; top: 0; height: 100dvh` stage. All animated text is **real text in the DOM**.
2. A render function `(p) => { ...style writes... }` built from `seg/ease/lerp`. Read layout once
   per frame (positions, sizes) before writing anything.
3. Reduced motion: the section gets `scroll-scene--static`; style it to remove the extra height
   and the pinning, and draw the end state once.
4. Small screens: separate positions or element counts where needed, chosen with one media query
   shared by CSS and JS (`matchMedia` on the same `rem` breakpoint).
5. Capture frames at fixed scroll positions (scroll with `behavior: 'instant'`; smooth scrolling
   makes captures land mid-scroll) and compare with the approved video.
6. Run `references/checklist.md`. Then have the diff reviewed by someone (or an agent) that only
   gets the diff, the rules and the PR description — not your reasoning.

Timed demos (the "how it works" steps) use `references/demo-player.js`: each step has `reset`,
`final` and an async `play(run)` that only awaits the run's helpers (`wait`, `type`, `count`,
`progress`), so cancelling is always clean. The player plays only when the section is at least
~45 % on screen, the tab is visible and the user has not paused it; otherwise it shows each
step's finished state. Provide a pause button (WCAG 2.2.2) and hold the auto-advance while
keyboard focus or the pointer is inside the step list.

## Phase 5 — Keep the real feature working

The homepage usually holds a real entry point (a search, a sign-up, a "describe your project"
form). Moving it into the new design must not break it: keep its tests, run the journey by hand,
and make the scene's call to action scroll to it with focus moved to it (account for the sticky
header height).

## Phase 6 — Rest of the page

Restyle the remaining sections to the new tokens (type scale, spacing, corners). Add nothing that
was not approved; propose new sections separately. Delete components the new page no longer uses.

## Phase 7 — Polish and measure

- Lighthouse on the **production build**, mobile and desktop. A lazily loaded homepage often
  shows a large layout shift from the footer appearing under the header before the page loads:
  render the footer only after the first navigation ends.
- Smoothness: scroll the whole page with CPU throttled ×4 and count frames over 33 ms and long
  tasks. Blur and filter animations are the usual culprit; measure on a real device before
  trading them away.
- Static `description` / Open Graph tags in the HTML shell: chat and social previews do not run
  JavaScript.
- Then merge, deploy, and send the owner the link.

## Why no library

A pinned scene needs three things: CSS `position: sticky`, a 0..1 progress, and a few easing
functions. That is about 150 lines. GSAP + ScrollTrigger adds ~27 kB gzipped and a re-tuning of
every timing; CSS `animation-timeline: view()` runs off the main thread but cannot express motion
that depends on measured positions and is not in every browser yet. Revisit if pinning must
survive cases the engine handles badly (iOS toolbar resizes on very short viewports) and fixing
them costs more than adopting a library.

## Mistakes we made, so you don't

- A word-reveal formula that ended the last word at ~79 %, visible only in the end state. Test
  `p = 1` exactly, not `p > 1`.
- Reading the first IntersectionObserver entry instead of the last (several can arrive at once).
- A fast fling leaving a scene half drawn: draw one last frame when a scene leaves the viewport.
- Invisible layers still reachable by Tab: make every hidden or decorative layer `inert`.
- In-page anchor links that ignore the sticky header, or work only once with a client router:
  write your own jump (scroll to `top - headerHeight`, then move focus).
- A `scroll` listener on the header running a full re-render on every event in a zoneless /
  signal-based app: make it passive and update state only when a threshold is crossed.
- Demo timers that kept running after cancel, or went below 0, or a step that threw synchronously
  and froze the cycle: start `play` inside a promise and route every timer through the run.
- `100vh` on mobile: use `100dvh` for the stage and redraw on resize.
- Decimal formats: format demo numbers with `Intl.NumberFormat` for the page's locale.
