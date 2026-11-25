# Wiring the engine into a framework

The rule is the same everywhere: **mount after the first render in the browser, write styles from
the render function, never put `p` in component state, clean up on unmount.** The render function
should be a closure over element references, created once.

## Angular (standalone, signals or zones)

```ts
@Directive({ selector: '[scrollScene]', host: { class: 'scroll-scene' } })
export class ScrollScene {
  readonly render = input.required<(p: number) => void>({ alias: 'scrollScene' });
  readonly staticProgress = input(1);
  constructor() {
    const el = inject(ElementRef<HTMLElement>).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const stop = mountScene(el, (p) => this.render()(p), { staticProgress: this.staticProgress() });
      destroyRef.onDestroy(stop);
    });
  }
}
```
- Pass the render as an arrow-function property (`render = (p: number) => …`), not a method: it
  is called without `this`.
- `afterNextRender` keeps it out of server rendering. With zone.js, mount inside
  `NgZone.runOutsideAngular` so scroll events do not trigger change detection.
- A header that reacts to scroll: passive listener, update a signal only when a threshold flips.

## React

```tsx
function useScene(ref: RefObject<HTMLElement>, render: (p: number) => void, staticProgress = 1) {
  const renderRef = useRef(render);
  renderRef.current = render;
  useEffect(() => {
    if (!ref.current) return;
    return mountScene(ref.current, (p) => renderRef.current(p), { staticProgress });
  }, [ref, staticProgress]);
}
```
- Elements to move: `useRef`, written to in `render`. Never `setState` with `p`.
- Next.js / Remix: the effect only runs in the browser, so the module is safe to import.

## Vue 3

```ts
onMounted(() => { stop = mountScene(section.value!, render) });
onBeforeUnmount(() => stop?.());
```
Template refs for the moving elements; no reactive `p`.

## Svelte

```svelte
<section use:scene={render}>…</section>
<script>
  function scene(node, render) {
    const stop = mountScene(node, render);
    return { destroy: stop };
  }
</script>
```

## Demo player in any framework

Create the `DemoPlayer` on mount, call `watchVisibility(section, player)`, return its cleanup.
State that the UI needs to render (current step, paused) may live in framework state: it changes
once per step, not per frame. The timer line and the animated values inside the demo should be
direct style / text writes.
