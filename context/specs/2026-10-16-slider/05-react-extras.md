# 05 — React: autoplay, slide-progress effects, autoplay toggle, thumbnails

> Part of `00-context.md`. **Read that first** — this file assumes its background, decisions and
> out-of-scope list and does not repeat them.

- **Satisfies**: AC12
- **You will see**: `<Slider autoplay={{ delay: 3000 }} slideProgress>` plays on its own with a
  `Slider.AutoplayToggle` pause button, slides can be styled with `var(--slide-distance)`, and a
  `Slider.Thumbs` strip of `Slider.Thumb` buttons inside a `<Slider>` drives it.
- **Skills**: `component-design`, `touch-and-accessibility`

## Goal

Wire unit 03's core plugins into the React layer from unit 04.

## Files

- `src/react/use-slider.ts` — `autoplay` and `slideProgress` options; `rootRef` used
- `src/react/context.ts` — autoplay in context
- `src/react/slider.tsx` — `Slider.AutoplayToggle`, `Slider.Thumbs`, `Slider.Thumb`
- `src/react/index.ts` — new exports/types
- `test/react/extras.test.tsx` — new

## Changes

### 1. `useSlider` options

Add to `UseSliderOptions`:
```ts
autoplay?: boolean | AutoplayOptions   // true → defaults; object → those options (minus root)
slideProgress?: boolean
```
Add to `UseSliderResult`:
```ts
autoplay: { isPlaying: boolean; play(): void; stop(): void } | null   // null when the option is off
```
- A `useEffect` keyed on `[slider, autoplayEnabled, delay, pauseOnHover, stopOnInteraction, rootElement]`
  creates `autoplay(slider, { …, root: rootElement ?? slider.viewport })` and destroys it in
  cleanup. `rootRef` stores the root element in state (callback ref). `isPlaying` comes from the
  autoplay's `subscribe` through `useSyncExternalStore`.
- A `useEffect` keyed on `[slider, slideProgress]` runs `slideProgress(slider)` and its cleanup.
- `<Slider>` passes both props through and already attaches `rootRef` to its root `div`.

### 2. `Slider.AutoplayToggle`

`<button type="button" aria-controls={viewportId} aria-label={isPlaying ? 'Stop automatic slide show' : 'Start automatic slide show'}
data-playing={isPlaying ? '' : undefined} onClick={isPlaying ? stop : play}>`; `children` may be a
node or `(isPlaying: boolean) => ReactNode`; default children `isPlaying ? 'Pause' : 'Play'`.
Renders nothing when the slider has no autoplay.

### 3. `Slider.Thumbs` and `Slider.Thumb`

Used **inside** a `<Slider>`:
```tsx
<Slider>
  <Slider.Viewport>…</Slider.Viewport>
  <Slider.Thumbs perView={5} gap={8}>
    {images.map((src) => <Slider.Thumb key={src}><img src={src} alt="" /></Slider.Thumb>)}
  </Slider.Thumbs>
</Slider>
```
- `Slider.Thumbs` props: `perView?`, `gap?`, `axis?`, `className`, `style`, rest div props,
  `children`. It reads the main slider from `useSliderContext()`, creates its own engine with
  `useSlider({ axis, align: 'start', draggable: true })` (never loop), and renders
  `<div data-slider-thumbs style={{ '--slider-per-view', '--slider-gap' }} {...rest}>
     <div ref={thumbs.viewportRef} data-slider-viewport data-axis={axis}>{children with ThumbIndex context}</div>
   </div>`.
  `perView` default `'auto'`. A `useEffect` on `[main.slider, thumbs.slider]` runs
  `syncSliders(main.slider, thumbs.slider)` and its cleanup.
- `Slider.Thumb` renders `<button type="button" data-slider-thumb aria-controls={main viewportId}
  aria-label={`Go to slide ${index + 1}`} {...props}>` as the direct viewport child (it is the
  thumb slide). Selection (`aria-current`, `data-selected`) and clicks are handled by
  `syncSliders` — the component renders neither attribute nor an onClick for navigation.
  Throws outside `Slider.Thumbs`.

### 4. Tests — `test/react/extras.test.tsx`

Width 300, integer sizes, `animation={{ type: 'instant' }}`, real timers with short delays.

1. `autoplay={{ delay: 40 }}` → polls to index 1 (dot 2 `aria-current`).
2. `Slider.AutoplayToggle` reads "Pause" with label "Stop automatic slide show"; clicking it stops
   advancing and switches to "Play"; clicking again resumes.
3. hovering the `<Slider>` root (dispatch `pointerenter` on it) pauses — the root, not just the viewport.
4. `AutoplayToggle` renders nothing without `autoplay`.
5. `slideProgress` → slide 2 has `--slide-progress: 1` at rest; removing the prop removes it.
6. Thumbs: 4 thumbs; clicking thumb 3 → main `scrollLeft 600`; thumb 3 has `aria-current="true"`.
7. Next on the main slider → thumb 2 gets `aria-current`, thumb 1 loses it.
8. `Slider.Thumb` outside `Slider.Thumbs` throws.

## Verify

```sh
pnpm typecheck && pnpm lint && pnpm test
```

`test/react/extras.test.tsx` (8 cases) passes alongside everything earlier.

## Watch out

- The thumbs engine is a second `useSlider` call inside `Slider.Thumbs`; it must not override the
  main `SliderContext` for anything rendered inside the thumbs (thumbs children read only
  `ThumbIndex` context and the main slider's `viewportId`).
