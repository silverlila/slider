# @silverlila/slider

A slider and carousel library where the browser's own scrolling moves the slides.

The slides sit in an ordinary scroll container with CSS scroll-snap. JavaScript measures the
layout, tracks which slide is active, drives the buttons and dots, and adds what the platform
lacks: mouse dragging, an infinite loop, autoplay, per-slide effect values and thumbnail sync.
Because the scroll is real, trackpads, mouse wheels, keyboard arrows, touch momentum,
find-in-page and focus scrolling all behave the way they do everywhere else on the page, and the
layout is already correct before JavaScript loads.

Scrolling, drag and animation come from [use-scroller](https://www.npmjs.com/package/use-scroller).
The package has two entry points:

- `@silverlila/slider/core`: framework-free. No React anywhere in its import graph.
- `@silverlila/slider`: React components and hooks. It also re-exports everything in `core`.

ESM only. React is an optional peer dependency (`^19`); the core works without it.

## Install

```sh
pnpm add @silverlila/slider
```

Import the stylesheet once, anywhere in your app:

```ts
import '@silverlila/slider/styles.css'
```

It makes every `[data-slider-viewport]` a flex scroll container with mandatory snapping, a hidden
scrollbar and `position: relative`, and sizes the slides from two custom properties. Every
selector is wrapped in `:where()`, so any rule you write wins over it.

## Quick start

```tsx
import { Slider } from '@silverlila/slider'
import '@silverlila/slider/styles.css'

export function Gallery({ photos }: { photos: { src: string; alt: string }[] }) {
  return (
    <Slider label="Photos" perView={1} gap={16}>
      <Slider.Viewport>
        {photos.map((photo) => (
          <Slider.Slide key={photo.src}>
            <img src={photo.src} alt={photo.alt} />
          </Slider.Slide>
        ))}
      </Slider.Viewport>
      <Slider.Prev />
      <Slider.Dots />
      <Slider.Next />
    </Slider>
  )
}
```

Run `pnpm dev` in this repository for a playground with every feature below.

## Options

These go on `<Slider>` as props, into `useSlider(options)`, or (for the engine options) into
`createSlider(viewport, options)`.

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `axis` | `'x' \| 'y'` | `'x'` | Scroll direction. |
| `align` | `'start' \| 'center' \| 'end'` | `'start'` | Where a snapped slide sits in the viewport. |
| `slidesPerMove` | `number \| 'auto'` | `1` | Slides per snap: an integer >= 1, or `'auto'` for as many as fully fit (re-measured on resize). |
| `loop` | `boolean` | `false` | Infinite loop through clones. See [Loop](#loop). |
| `rewind` | `boolean` | `false` | Next on the last snap scrolls back to the first, Prev on the first to the last. Ignored with `loop`. |
| `draggable` | `boolean` | `true` | Mouse and touch dragging through use-scroller's `dragScroll`. With `false`, touch scrolling is native and the mouse cannot drag. |
| `animation` | `ScrollAnimation` | `{ type: 'tween' }` | How `next`/`prev`/`scrollTo` move: `{ type: 'tween', duration?, easing? }` (450ms by default), `{ type: 'spring', stiffness?, damping?, mass?, velocity? }` or `{ type: 'instant' }`. |
| `startIndex` | `number` | `0` | Core only. Snap shown at creation, clamped into range. |

React-only props and hook options:

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `defaultIndex` | `number` | `0` | Snap shown first when the index is uncontrolled. |
| `index` | `number` | none | Controlled snap index. The slider scrolls to it whenever it changes. |
| `onIndexChange` | `(index: number) => void` | none | Called when the active snap changes, never for the initial one. During a navigation it fires once, with the target. |
| `autoplay` | `boolean \| { delay?, pauseOnHover?, stopOnInteraction? }` | off | Advance on a timer. See [Autoplay](#autoplay). |
| `slideProgress` | `boolean` | `false` | Write `--slide-progress` and `--slide-distance` on every slide. See [Effects](#effects). |
| `perView` | `number \| 'auto'` | `1` | `<Slider>` only. Slides per view, written to `--slider-per-view`. Fractions work (`1.4` shows the neighbours). `'auto'` sizes slides by their content. |
| `gap` | `number \| string` | none | `<Slider>` only. Space between slides, written to `--slider-gap`. A number is pixels. |
| `label` | `string` | `'Slides'` | `<Slider>` only. Accessible name of the carousel region. |

Changing `axis`, `align`, `slidesPerMove`, `loop`, `rewind`, `draggable` or `animation` re-creates
the engine and keeps the current slide. `animation` is compared field by field, so an inline
`animation={{ type: 'spring' }}` does not re-create it on every render.

## Components

Every component accepts the props of the element it renders (`className`, `style`, event
handlers, `ref`).

| Component | Renders | Attributes and ARIA |
| --- | --- | --- |
| `<Slider>` | `div` | `role="region"`, `aria-roledescription="carousel"`, `aria-label` from `label`, `data-slider`. Sets `--slider-per-view`, `--slider-gap` and `--slider-align` on itself so they inherit to the viewport. |
| `<Slider.Viewport>` | `div` | The scroll container: `data-slider-viewport`, `data-axis`, a generated `id`, `tabIndex={0}` so arrow keys scroll it. Its children must be `<Slider.Slide>` elements (or components that render one). |
| `<Slider.Slide>` | `div` | `data-slider-slide`, `role="group"`, `aria-roledescription="slide"`, `aria-label="3 of 8"`. Clones get `data-slider-clone`, `aria-hidden="true"` and `inert` instead, and lose their `id`. |
| `<Slider.Prev>` / `<Slider.Next>` | `button` | `aria-controls` (the viewport), `aria-label="Previous slide"` / `"Next slide"`, `disabled` at the edges. Content defaults to the text Previous / Next. Calling `event.preventDefault()` in your `onClick` cancels the navigation. |
| `<Slider.Dots>` | `div` of `button`s | The group: `role="group"`, `aria-label="Choose slide"`, `data-slider-dots`. One button per snap: `data-slider-dot`, `aria-controls`, `aria-label="Go to slide 2"`, and on the active one `aria-current="true"` and `data-selected`. The buttons are empty; style them with CSS. |
| `<Slider.AutoplayToggle>` | `button` | `aria-controls`, `aria-label="Stop automatic slide show"` / `"Start automatic slide show"`, `data-playing` while playing. Children are a node or `(isPlaying) => node`; default Pause / Play. Renders nothing without `autoplay`. |
| `<Slider.Thumbs>` | `div` > `div` | `data-slider-thumbs` around its own `data-slider-viewport`. Props: `perView` (default `'auto'`), `gap`, `axis` (default `'x'`). |
| `<Slider.Thumb>` | `button` | `data-slider-thumb`, `aria-controls` (the main viewport), `aria-label="Go to slide 2"`; the selected one gets `aria-current="true"` and `data-selected`. |

There is no `keydown` handler and no live region. A focused scroll container already scrolls and
snaps with the arrow, Page and Home/End keys, and the DOM never changes on navigation, so there is
nothing for a live region to announce.

## Hooks

### `useSlider(options)`: headless

Attach `viewportRef` to a scroll container and build any markup around it. The engine is created
once the viewport is mounted.

```tsx
import { useSlider } from '@silverlila/slider'

function Hero({ items }: { items: string[] }) {
  const { viewportRef, rootRef, index, snapCount, canPrev, canNext, prev, next } = useSlider({
    align: 'center',
  })
  return (
    <div ref={rootRef}>
      <div ref={viewportRef} data-slider-viewport="" tabIndex={0}>
        {items.map((item) => (
          <div key={item}>{item}</div>
        ))}
      </div>
      <button type="button" onClick={() => prev()} disabled={!canPrev}>
        Back
      </button>
      <span>
        {index + 1} of {snapCount}
      </span>
      <button type="button" onClick={() => next()} disabled={!canNext}>
        Forward
      </button>
    </div>
  )
}
```

The result holds the discrete state (`index`, `snapCount`, `slideCount`, `canPrev`, `canNext`,
`loopCopies`), `viewportRef`, `rootRef` (optional: autoplay pauses while the pointer or keyboard
focus is inside that element), `slider` (the engine, `null` until mounted), `autoplay`
(`{ isPlaying, play, stop }`, or `null` when autoplay is off) and `next`, `prev`,
`scrollTo(index)`. Each navigation method takes an optional `{ animation }` that overrides the
option for that call.

The headless hook does not render loop clones. With `loop`, render `loopCopies` copies of your
slides before and after the real ones, each with `data-slider-clone="<real index>"`,
`aria-hidden="true"` and `inert`. Do not call `renderClones` on DOM that React owns.

### `useSliderState(slider, selector, isEqual?)`

Subscribes to a slice of the engine's state, built on `useSyncExternalStore`. The component
re-renders only when the selected value changes by `isEqual` (default `Object.is`; pass a shallow
comparison when the selector returns an object). With `slider === null` it reads the initial
state.

This is the only way to read `progress` (0 to 1 along the snaps, following the real scroll
position). It changes every scroll frame, so it is deliberately left out of the components'
context: putting it there would re-render the whole slider on every frame.

### `useSliderContext()`

Returns the enclosing `<Slider>`'s `useSlider` result plus `viewportId` and `axis`. It throws
outside a `<Slider>`. Use it to build your own controls:

```tsx
import { Slider, useSliderContext, useSliderState } from '@silverlila/slider'

function ProgressBar() {
  const { slider } = useSliderContext()
  const progress = useSliderState(slider, (state) => state.progress)
  return (
    <div
      aria-hidden="true"
      style={{ height: 4, background: 'currentColor', scale: `${progress} 1`, transformOrigin: 'left' }}
    />
  )
}

// <Slider>…<Slider.Viewport>…</Slider.Viewport><ProgressBar /></Slider>
```

`slider` here is the core engine. In the React entry the name `Slider` is the component, so when
you need the engine's type, import it from the core entry:

```ts
import type { Slider as SliderEngine } from '@silverlila/slider/core'
```

## Loop

`loop` is off by default because it duplicates DOM. When on, the engine works out how many full
copies of the slide set it needs on each side (at least two viewports of buffer, minimum one
copy) and publishes that as `loopCopies`. `<Slider.Viewport>` renders the copies itself; vanilla
users call `renderClones(slider)`.

- Prev, Next, dots and `scrollTo` keep moving in the same direction through the clones.
- When scrolling comes to rest on a snap inside a clone region, with no pointer down and no
  navigation pending, the engine jumps by whole periods back into the real set. The jump lands on
  an identical snap, so nothing moves on screen. It never jumps mid-gesture, because changing the
  scroll position during momentum stops momentum on iOS.
- Clones carry `aria-hidden="true"` and `inert`, so screen readers and keyboard users meet each
  slide exactly once, and DOM clones have every `id` removed. The cost: a clone you can see (for
  example the left neighbour of the first slide with `align="center"`) cannot be clicked.
- React renders each clone as another instance of your slide element. Component state inside a
  slide is not shared with its clones: a video playing in slide 2 is not playing in the copy of
  slide 2.

`rewind` is the clone-free option: at the end, Next scrolls back across all the slides to the
first.

## Autoplay

```tsx
<Slider autoplay={{ delay: 5000 }}>
  <Slider.Viewport>{slides}</Slider.Viewport>
  <Slider.AutoplayToggle />
</Slider>
```

| Option | Default | What it does |
| --- | --- | --- |
| `delay` | `4000` | Milliseconds between moves. Must be > 0. |
| `pauseOnHover` | `true` | Pause while the pointer is over the slider. |
| `stopOnInteraction` | `true` | Stop for good on `pointerdown`, `wheel` or `keydown` on the viewport. |

Autoplay advances one snap at a time and goes back to the first snap after the last. It pauses
while the pointer is over the `<Slider>` element, while keyboard focus is anywhere inside it (the
focus a mouse click leaves on a button does not count), while a pointer is pressed on the
viewport, and while the tab is hidden. Pressing Play overrides the hover and focus pauses, so it
starts moving at once. It starts stopped under
`prefers-reduced-motion: reduce`; the user can still start it with the toggle. Navigation
animations also jump instantly under reduced motion.

Render `<Slider.AutoplayToggle>` whenever you use autoplay. WCAG 2.2.2 (Pause, Stop, Hide)
requires a way to stop content that moves on its own for more than five seconds, and hover only
pauses it for mouse users.

## Effects

With `slideProgress`, every slide and clone gets two custom properties, rewritten each scroll
frame:

- `--slide-progress`: signed distance from the aligned position, in slide steps. `0` when the
  slide is snapped, `1` for the next slide, `-1` for the previous one.
- `--slide-distance`: its absolute value.

The effect itself is plain CSS. Scale and fade the slides away from the centre:

```tsx
<Slider loop align="center" perView={1.6} slideProgress>
  <Slider.Viewport>
    {items.map((item) => (
      <Slider.Slide key={item.id} className="fade-scale">…</Slider.Slide>
    ))}
  </Slider.Viewport>
</Slider>
```

```css
.fade-scale {
  scale: calc(1 - min(var(--slide-distance, 0), 1) * 0.15);
  opacity: calc(1 - min(var(--slide-distance, 0), 1) * 0.5);
}
```

Keep the default centre `transform-origin` (see [Known limitations](#known-limitations)). The
engine measures untransformed offsets, so `scale` and `rotate` never distort its snap math.

CSS scroll-driven animations (`animation-timeline: view(inline)`) are an alternative that needs
no JavaScript at all, in browsers that support them. `slideProgress` works everywhere and counts
in slide steps rather than percentages of the viewport.

## Thumbnails

```tsx
<Slider label="Gallery">
  <Slider.Viewport>
    {photos.map((photo) => (
      <Slider.Slide key={photo.src}>
        <img src={photo.src} alt={photo.alt} />
      </Slider.Slide>
    ))}
  </Slider.Viewport>
  <Slider.Thumbs perView={5} gap={8}>
    {photos.map((photo) => (
      <Slider.Thumb key={photo.src}>
        <img src={photo.thumb} alt="" />
      </Slider.Thumb>
    ))}
  </Slider.Thumbs>
</Slider>
```

The strip is a slider of its own (draggable, aligned to the start). It scrolls to keep up with
the main slider, and clicking thumbnail `i` moves the main slider to snap `i`. Sync maps
thumbnail **slide** `i` to main **snap** `i`, so it assumes the main slider shows one slide per
snap (`slidesPerMove: 1`).

## Responsive layouts

Slide size is CSS, not an engine option. `--slider-per-view` (a number, or unset for
content-sized slides) and `--slider-gap` decide it, and the engine measures whatever layout the
CSS produced. `perView` and `gap` set them on the `<Slider>` element, so a rule on the viewport
overrides them:

```css
.products [data-slider-viewport] {
  --slider-per-view: 1;
}
@media (min-width: 640px) {
  .products [data-slider-viewport] {
    --slider-per-view: 2;
  }
}
@media (min-width: 1024px) {
  .products [data-slider-viewport] {
    --slider-per-view: 4;
    --slider-gap: 24px;
  }
}
```

Combine it with `slidesPerMove="auto"` to move a full page of slides at every width. The engine
re-measures when the viewport or a slide resizes and when slides are added or removed, and keeps
the current slide in place when nothing is scrolling.

## Vanilla core

```ts
import {
  autoplay,
  createSlider,
  renderClones,
  slideProgress,
  syncSliders,
} from '@silverlila/slider/core'
import '@silverlila/slider/styles.css'

const viewport = document.querySelector<HTMLElement>('#hero')!
// <div id="hero" data-slider-viewport tabindex="0"> <div>…</div> <div>…</div> … </div>

const slider = createSlider(viewport, { loop: true, align: 'center' })
const stopClones = renderClones(slider)
const player = autoplay(slider, { delay: 4000 })
const stopEffects = slideProgress(slider)

const counter = document.querySelector('#counter')!
document.querySelector('#next')!.addEventListener('click', () => slider.next())
slider.subscribe(({ index, snapCount }) => {
  counter.textContent = `${index + 1} / ${snapCount}`
})

// Later:
player.destroy()
stopEffects()
stopClones()
slider.destroy()
```

Every function that sets something up returns a cleanup, or an object with `destroy()`.

| Function | Returns | What it does |
| --- | --- | --- |
| `createSlider(viewport, options?)` | `Slider` | The engine. Every element child of `viewport` is a slide. |
| `renderClones(slider)` | cleanup | Renders `loopCopies` copies on each side and re-renders when the count or the slides change. Cleanup removes every clone. |
| `autoplay(slider, { delay?, root?, pauseOnHover?, stopOnInteraction? })` | `Autoplay` | `root` is the element whose hover and keyboard focus pause it (default the viewport). Returns `{ play(), stop(), isPlaying(), subscribe(listener), destroy() }`. |
| `slideProgress(slider)` | cleanup | Writes `--slide-progress` and `--slide-distance`. Cleanup removes them. |
| `syncSliders(main, thumbs)` | cleanup | Thumbnail sync, as above. Cleanup removes `aria-current` and `data-selected`. |

The `Slider` engine:

| Member | What it does |
| --- | --- |
| `viewport`, `options` | The element and the resolved options. |
| `getState()` | `{ index, snapCount, slideCount, canPrev, canNext, progress, loopCopies }`. |
| `subscribe(listener)` | Calls `listener(state)` on every change, `progress` included. Returns an unsubscribe. |
| `next(opts?)`, `prev(opts?)`, `scrollTo(index, opts?)` | Navigate. `opts.animation` overrides the option. Consecutive calls build on the pending target, so three quick `next()` calls move three snaps. |
| `destroy()` | Stops everything and removes the inline styles it wrote. Calling a method afterwards throws. |

While a navigation is in flight, `state.index` is its target; otherwise it is the snap nearest the
scroll position. `progress` always follows the real position.

`createSlider` throws if the viewport is not positioned (the stylesheet sets
`position: relative`; slide offsets are measured against it), if `slidesPerMove` is not an
integer >= 1 or `'auto'`, and if `startIndex` is not an integer. For a vertical slider, set
`data-axis="y"` on the viewport so the stylesheet lays it out as a column, and give the viewport
a height.

## Styling hooks

| Hook | On |
| --- | --- |
| `[data-slider]` | The `<Slider>` root. |
| `[data-slider-viewport]`, `[data-axis="x" \| "y"]` | The scroll container. |
| `[data-slider-slide]` | Every slide and clone (React). |
| `[data-slider-clone="<i>"]` | A clone of real slide `i`. |
| `[data-slider-dots]`, `[data-slider-dot]`, `[data-selected]` | Dots and the active dot. |
| `[data-slider-thumbs]`, `[data-slider-thumb]`, `[data-selected]` | The thumbnail strip and the selected thumbnail. |
| `[data-playing]` | The autoplay toggle while playing. |
| `--slider-per-view`, `--slider-gap` | Slide size and spacing. |
| `--slider-align` | `scroll-snap-align` before the engine starts; afterwards the engine writes it inline on each snap anchor. |
| `--slide-progress`, `--slide-distance` | Written by `slideProgress`. |

The engine writes inline `scroll-snap-align` on slides (the align value on the slide that defines
each snap, `none` on the rest), and inline `scroll-snap-type: none` on the viewport while its own
navigation animates.

## Known limitations

- `align: 'center'` with an even `slidesPerMove` centres one slide of the group (the middle one,
  rounded down), not the group itself.
- Touch dragging and loop recentring have been tested only in headless Chromium. Real-device
  verification on iOS Safari and Android is still pending.
- Native snap and transformed slides: the engine measures untransformed layout. Whether browsers
  compute snap areas from transformed or untransformed boxes has not been verified. An effect
  that scales slides around a non-centre origin with `align: 'start'` could make native snap and
  the engine disagree by the scale difference. Effects that scale around the centre are
  unaffected with `align: 'center'`.
- React 19 only (`^19`): clones rely on React 19's support for the `inert` prop.

## License

MIT
