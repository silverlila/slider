# 04 — React layer: useSlider, useSliderState and the Slider components

> Part of `00-context.md`. **Read that first** — this file assumes its background, decisions and
> out-of-scope list and does not repeat them.

- **Satisfies**: AC11
- **You will see**: `import { Slider } from '@silverlila/slider'` works: `<Slider perView={3} gap={16} loop>`
  with `Slider.Viewport`, `Slider.Slide`, `Slider.Prev`, `Slider.Next` and `Slider.Dots` renders an
  accessible, looping slider; `pnpm test` exercises it in a real browser.
- **Skills**: `component-design`, `touch-and-accessibility`

## Goal

The React entry: a headless hook, a selector hook, and compound components on top of the core
engine from units 01–02, including React-rendered loop clones and controlled/uncontrolled index.
Autoplay, effects and thumbnails in React are unit 05's — do not add those props here.

## Files

- `src/react/context.ts` — new
- `src/react/use-slider-state.ts` — new
- `src/react/use-slider.ts` — new
- `src/react/slider.tsx` — new (all components)
- `src/react/index.ts` — exports (keep `export * from '../core'`)
- `test/react/slider.test.tsx` — new

## Changes

### 1. `useSliderState(slider, selector, isEqual = Object.is)`

```ts
function useSliderState<T>(
  slider: Slider | null,
  selector: (state: SliderState) => T,
  isEqual?: (a: T, b: T) => boolean
): T
```
Built on `useSyncExternalStore`. With `slider === null` it returns `selector(INITIAL_STATE)` where
`INITIAL_STATE = { index: 0, snapCount: 0, slideCount: 0, canPrev: false, canNext: false, progress: 0, loopCopies: 0 }`.
Cache the last selection and return the cached value while `isEqual(previous, next)` so a
selector returning an object does not loop. Server snapshot = same as initial.

### 2. `useSlider(options)` (headless)

```ts
export interface UseSliderOptions extends Omit<SliderOptions, 'startIndex'> {
  defaultIndex?: number                     // uncontrolled start index
  index?: number                            // controlled index
  onIndexChange?: (index: number) => void
}
export interface UseSliderResult {
  viewportRef: (element: HTMLElement | null) => void   // callback ref
  rootRef: (element: HTMLElement | null) => void       // optional; unit 05 uses it for autoplay
  slider: Slider | null                                // null until mounted
  index: number; snapCount: number; slideCount: number
  canPrev: boolean; canNext: boolean; loopCopies: number
  next(options?: NavigateOptions): void                // no-ops while slider is null
  prev(options?: NavigateOptions): void
  scrollTo(index: number, options?: NavigateOptions): void
}
```

- The viewport element is held in state (callback ref → `useState`), so the engine is created in
  a `useLayoutEffect` once the element exists.
- **Engine lifetime**: one `useLayoutEffect` keyed on `[viewport, axis, align, slidesPerMove, loop, rewind, draggable, stableAnimation]`
  creates `createSlider(viewport, { …, startIndex })` and destroys it in cleanup.
  `stableAnimation` = the `animation` option memoised by **shallow** equality of its own fields
  (a ref holding the last value, replaced only when a field differs). `startIndex` =
  the previous engine's `getState().index` if one existed (re-creation keeps the slide), else
  `index ?? defaultIndex ?? 0`.
- Discrete state via `useSliderState(slider, selectDiscrete, shallowEqual)` where `selectDiscrete`
  picks every field **except `progress`**. The hook never re-renders on scroll frames.
- `onIndexChange` (kept in a ref so its identity does not matter) is called from a slider
  subscription whenever `index` changes — not for the initial index.
- Controlled `index`: a `useEffect` on `[index, slider]` — when `index` is defined and differs from
  `slider.getState().index`, `slider.scrollTo(index)`. React's own render never blocks native
  scrolling; controlled means "the prop drives the slider and `onIndexChange` reports moves".
- StrictMode double effects must leave exactly one live engine (cleanup fully destroys).

### 3. Context

`SliderContext` holds `{ ...UseSliderResult, viewportId: string, axis: Axis }` (viewportId from
`useId`). `useSliderContext()` throws
`Error('Slider components must be used inside <Slider>')` outside a provider. A second, internal
`SlideContext` holds `{ index: number; clone: boolean } | null` and is set per slide by the
Viewport.

### 4. Components (`slider.tsx`), attached as statics on `Slider`

`<Slider>` props = `UseSliderOptions & { perView?: number | 'auto'; gap?: number | string; label?: string } & Omit<ComponentProps<'div'>, 'children' | 'onChange'> & { children: ReactNode }`.
Renders:

```tsx
<div ref={rootRef} role="region" aria-roledescription="carousel" aria-label={label ?? 'Slides'}
     data-slider style={{ '--slider-per-view': perView === 'auto' ? undefined : perView,
                          '--slider-gap': typeof gap === 'number' ? `${gap}px` : gap,
                          '--slider-align': align, ...style }} {...rest}>
```
`perView` default `1`; `'auto'` leaves the variable unset (content-sized slides). Set the CSS
variables on the root so they inherit to the viewport (and so user media queries on the viewport
can override them). Merge a user `ref` if passed (React 19: `ref` is a normal prop).

- **`Slider.Viewport`** — `<div ref={viewportRef} id={viewportId} data-slider-viewport data-axis={axis} tabIndex={0} {...props}>`.
  Children: `Children.toArray(children)`; real children each wrapped in
  `<SlideContext value={{ index: i, clone: false }} key={child.key}>`. When
  `loopCopies > 0`, render `loopCopies` copies of the whole list before and after, each element
  wrapped in `<SlideContext value={{ index: i, clone: true }} key={`before-${copy}-${child.key}`}>`
  (`after-…` for the trailing copies). React 19 renders a context object as its provider.
- **`Slider.Slide`** — `<div data-slider-slide role="group" aria-roledescription="slide"
  aria-label={`${index + 1} of ${slideCount}`} {...props}>`; when the SlideContext says clone:
  add `data-slider-clone={index}`, `aria-hidden="true"`, `inert`, and omit `role`/`aria-label`.
  Throws if rendered outside a Viewport (no SlideContext).
- **`Slider.Prev` / `Slider.Next`** — `<button type="button" aria-controls={viewportId}
  aria-label="Previous slide" | "Next slide" disabled={!canPrev | !canNext} {...props}>`,
  `children` default `'Previous'` / `'Next'`; `onClick` calls the user's handler then `prev()`/`next()`
  unless `event.defaultPrevented`.
- **`Slider.Dots`** — `<div role="group" aria-label="Choose slide" data-slider-dots {...props}>`
  containing `snapCount` buttons: `<button type="button" data-slider-dot aria-controls={viewportId}
  aria-label={`Go to slide ${i + 1}`} aria-current={i === index ? 'true' : undefined}
  data-selected={i === index ? '' : undefined} onClick={() => scrollTo(i)} />`.
- Every component forwards `className`, `style` and the rest of its DOM props.
- Export `Slider`, `useSlider`, `useSliderState`, `useSliderContext` and the types
  `SliderProps`, `UseSliderOptions`, `UseSliderResult` from `src/react/index.ts`.

### 5. Tests — `test/react/slider.test.tsx`

Use `vitest-browser-react`'s `render` (see use-scroller's `tests/react/*.test.tsx` for the
pattern), import `../../src/styles.css`, give the root an explicit width (300px) and integer slide
sizes, and pass `animation={{ type: 'instant' }}`.

1. renders region/carousel semantics: `role="region"`, `aria-roledescription="carousel"`, label.
2. slides are labelled `1 of 3` … `3 of 3` with `aria-roledescription="slide"`.
3. Prev disabled at start, Next enabled; clicking Next → `scrollLeft 300`, Prev enabled, dot 2
   has `aria-current="true"`.
4. Next disabled at the end; `rewind` keeps it enabled.
5. dots: 3 dots; clicking dot 3 → `scrollLeft 600`.
6. `perView={3} gap={10}` at width 320 with 10 slides → each slide `offsetWidth === 100`.
7. uncontrolled `defaultIndex={2}` → starts at `scrollLeft 600`.
8. controlled: a wrapper with `useState` passes `index`/`onIndexChange`; clicking Next updates the
   wrapper's state (render it as text) to `1`; changing the state to `2` from a wrapper button
   scrolls to `600`.
9. `onIndexChange` is not called on mount and is called once per navigation.
10. loop: `loop` with 3 slides → 9 slide elements; 6 carry `data-slider-clone`, `aria-hidden="true"`
    and `inert`; Prev is enabled at index 0; Prev → polls to `scrollLeft 1500` (after recentering).
11. clones are rendered by React: a slide containing `<button onClick>` — the clone's button is
    `inert` (cannot be focused) and the real one works.
12. headless `useSlider`: a component builds its own markup with `viewportRef` and `data-slider-viewport`;
    its `canNext`/`next()` work.
13. re-render with a new inline `animation={{ type: 'instant' }}` object does not recreate the
    engine (index stays where navigation left it, no jump back to `defaultIndex`).
14. `useSliderState(slider, s => s.progress)` updates when the viewport is scrolled natively.
15. `<Slider.Slide>` outside a Viewport throws; `useSliderContext` outside `<Slider>` throws.
16. StrictMode: rendering inside `<StrictMode>` leaves one engine (Next moves exactly one slide).

## Verify

```sh
pnpm typecheck && pnpm lint && pnpm test
```

`test/react/slider.test.tsx` (16 cases) passes alongside the core suites.

## Watch out

- `eslint-plugin-react-refresh` flags `.tsx` files that export non-components. Keep hooks in `.ts`
  files and only components in `slider.tsx`; if attaching statics to `Slider` trips the rule, add
  a targeted `// eslint-disable-next-line react-refresh/only-export-components` with the reason.
- The custom properties in `style` need a cast or a typed `CSSProperties & Record<\`--${string}\`, string | number | undefined>`.
- `inert` is a boolean prop in React 19 — pass `inert`, never `inert=""` (React 19 treats `""` as false).
