# 03 — Core plugins: autoplay, slide progress, synced sliders

> Part of `00-context.md`. **Read that first** — this file assumes its background, decisions and
> out-of-scope list and does not repeat them.

- **Satisfies**: AC8, AC9, AC10
- **You will see**: in `pnpm dev`, the loop demo advances on its own every 3 seconds and pauses
  while you hover it, its slides scale and fade by distance from the centre as you scroll, and a
  strip of small thumbnails under it follows the main slider and moves it when clicked.

## Goal

Three framework-free functions, each taking a `Slider` from units 01–02 and returning its own
handle or cleanup. React wiring is unit 05's.

## Files

- `src/core/autoplay.ts` — new
- `src/core/slide-progress.ts` — new
- `src/core/sync.ts` — new
- `src/core/index.ts` — export the three functions and their types
- `test/helpers/media.ts` — new, copy of use-scroller's `tests/helpers/media.ts` (`emulateReducedMotion`)
- `test/core/autoplay.test.ts`, `test/core/slide-progress.test.ts`, `test/core/sync.test.ts` — new
- `playground/main.ts` — add the three behaviours to the loop demo plus a thumbnail strip

## Changes

### 1. `autoplay(slider, options?): Autoplay`

```ts
export interface AutoplayOptions {
  delay?: number              // ms between moves, default 4000; must be > 0 (RangeError)
  root?: HTMLElement          // element whose hover/focus pauses; default slider.viewport
  pauseOnHover?: boolean      // default true
  stopOnInteraction?: boolean // default true
}
export interface Autoplay {
  play(): void
  stop(): void
  isPlaying(): boolean
  subscribe(listener: (playing: boolean) => void): () => void  // called on change only
  destroy(): void
}
```

Behaviour:
- **Starts playing** unless `matchMedia('(prefers-reduced-motion: reduce)').matches`, in which
  case it starts stopped. `play()` always plays (an explicit user request overrides the
  preference).
- **Timer**: while playing and not paused, one `setTimeout(advance, delay)` is pending.
  `advance` = `slider.getState().canNext ? slider.next() : slider.scrollTo(0)` (so a non-loop,
  non-rewind slider returns to the start at the end).
- The timer **restarts** whenever the slider's `index` changes (subscribe to the slider), so a
  manual move resets the countdown.
- **Paused** (timer cleared, `isPlaying()` stays `true`, resumes with a fresh full delay) while
  any of: pointer over `root` (`pointerenter`/`pointerleave`, only when `pauseOnHover`), focus
  inside `root` (`focusin`/`focusout` with `relatedTarget` check), `document.visibilityState === 'hidden'`
  (`visibilitychange`).
- **Stops** (`isPlaying()` → false) on `pointerdown`, `wheel` or `keydown` on `slider.viewport`
  when `stopOnInteraction`.
- `destroy()` clears the timer and every listener. Methods after `destroy()` throw like the engine's.

### 2. `slideProgress(slider): () => void`

On every slider state emission (which happens each scroll frame because `progress` changes) and
once immediately, for **every** child of `slider.viewport` (real slides and clones):
- read all geometry first, then write — never interleave reads and writes;
- `value = d × (alignedPosition(box, port, align, d) − p) / (size + gap)` using unit 01's
  `readLayout`/`alignedPosition` helpers on the element's own box (not its anchor), where
  `p` = current scroll position, `size` = the element's own width/height, `d` = direction factor;
- write `--slide-progress` = `value` and `--slide-distance` = `|value|`, each rounded to 4
  decimals, via `style.setProperty`.
Cleanup unsubscribes and removes both properties from every child.

Sign: the slide at the aligned spot is 0, the next upcoming slide is +1, the previous is −1, in
LTR, RTL and vertical alike.

### 3. `syncSliders(main, thumbs): () => void`

- On every `main` index change (and once immediately): `thumbs.scrollTo(Math.min(main index, thumbs snapCount − 1))`,
  and on the **real** thumb slide whose position equals the main index set `aria-current="true"`
  and `data-selected=""`, removing both from every other thumb slide.
- A delegated `click` listener on `thumbs.viewport`: find the viewport child containing
  `event.target`; its slide index is its position among real slides, or its
  `data-slider-clone` value for a clone; call `main.scrollTo(thatIndex)`. (`dragScroll` already
  swallows the click that follows a drag.)
- Cleanup removes the listener, unsubscribes, and removes `aria-current`/`data-selected`.

### 4. Tests

Use real timers with short delays (`delay: 40`) and `expect.poll`; navigation in fixtures uses
`animation: { type: 'instant' }` where the engine is created by the test.

`test/core/autoplay.test.ts`:
1. advances: 3 slides, `delay: 40` → polls to `index 1`, then `2`.
2. wraps to the start without loop/rewind: at the last index → polls to `index 0`.
3. hover pauses: dispatch `pointerenter` on the viewport, wait 150ms → index unchanged;
   `pointerleave` → advances again.
4. focus pauses: focus a button inside the root → no advance for 150ms; blur → advances.
5. hidden tab pauses: override `document.visibilityState` to `'hidden'` (configurable getter,
   restored in `onTestFinished`) and dispatch `visibilitychange` → no advance; back to `'visible'` → advances.
6. interaction stops: `pointerdown` on the viewport → `isPlaying() === false`, subscriber called
   with `false`, no further advance.
7. reduced motion: `emulateReducedMotion()` → `isPlaying() === false` and no advance;
   `play()` → advances.
8. manual navigation restarts the countdown: `delay: 200`; at 150ms call `slider.next()`; at
   300ms the index is still 1 (not 2).
9. `delay: 0` throws `RangeError`.

`test/core/slide-progress.test.ts` (width 300, 5 slides perView 1, gap 0):
1. at rest: slide 0 `--slide-progress` `0`, slide 1 `1`, slide 2 `2`; `--slide-distance` matches
   absolute values.
2. after native scroll to 150: slide 0 → `-0.5`, slide 1 → `0.5`, `--slide-distance` `0.5`.
3. `align: 'center'`, width 300, content-sized 200px slides, at scroll 150: slide 1 → `0`.
4. RTL fixture at rest: slide 1 → `1`.
5. clones get values too (loop fixture from unit 02, the clone before the first real slide → `-1`).
6. cleanup removes both properties.

`test/core/sync.test.ts` (main: width 300, 5 slides perView 1; thumbs: width 300, 5 slides of
width 100 content-sized, gap 0):
1. `main.scrollTo(3)` → thumb 3 has `aria-current="true"` and `data-selected`, no other thumb does;
   thumbs `scrollLeft` polls to `200` (the clamped max).
2. clicking thumb 2 → `main.getState().index === 2`.
3. cleanup removes `aria-current`/`data-selected` and the click no longer moves main.

## Verify

```sh
pnpm typecheck && pnpm lint && pnpm test
```

All three new test files pass alongside units 01–02's.

## Watch out

- Overriding `document.visibilityState` is mocking a browser boundary (allowed); restore it in
  `onTestFinished` or later tests break.
- `slideProgress` is called every scroll frame: no `getComputedStyle` per child per frame — read
  computed values (gap, paddings, direction) once per layout change (when `slideCount`/`loopCopies`
  change or on the first call) and only offsets per frame.
