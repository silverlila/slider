# 02 — Infinite loop in the engine and the DOM clone renderer

> Part of `00-context.md`. **Read that first** — this file assumes its background, decisions and
> out-of-scope list and does not repeat them.

- **Satisfies**: AC7
- **You will see**: in `pnpm dev`, a second plain-JS slider with `loop: true` that keeps going past
  the last slide back to the first (and backwards past the first) with Next/Prev, mouse drag or
  trackpad, with no visible jump when it settles.

## Goal

`loop: true` works end to end in the core: the engine publishes how many copies of the slide set
to render, a vanilla renderer `renderClones(slider)` puts them in the DOM, navigation wraps
through the clones, and the engine silently recentres into the real set when scrolling rests.
React rendering of clones is unit 04's.

## Files

- `src/core/geometry.ts` — loop math (change 1)
- `src/core/slider.ts` — loop state, wrap-aware navigation, recentering, snap-align on clones
- `src/core/clones.ts` — new, `renderClones`
- `src/core/index.ts` — export `renderClones`
- `test/core/loop.test.ts` — new
- `playground/main.ts` — add the loop demo

## Changes

### 1. Loop geometry (pure, in `geometry.ts`)

All in terms of the direction factor `d` (`layout.direction`) and a **logical offset**
`u(p) = d × (p − s0)`, where `s0` is the aligned position of the first anchor (real slide set,
**unclamped**). Logical offsets grow along slide order in every direction.

- `periodOf(layout)` = `max(box.end) − min(box.start)` over real slides `+ gap`. `0` when there are
  no slides.
- `loopSnapPositions(layout, anchorIndexes, align)` = the anchors' aligned positions,
  **not clamped**, no merging.
- `copiesNeeded(layout)` = `period > 0 ? Math.max(1, Math.ceil((2 × port.size) / period)) : 0`.
- `canonical(p, s0, period, d)` = `s0 + d × mod(u(p), period)` with `mod(a, n) = ((a % n) + n) % n`
  — the equivalent position inside the real set.
- **Virtual index.** A snap in copy `k` (k = 0 is the real set, negative before, positive after)
  with real snap index `i` has virtual index `v = k × n + i` (n = snap count) and position
  `positionOf(v) = s0 + d × (u_i + Math.floor(v / n) × period)` where `u_i = d × (snaps[i] − s0)`
  and `i = mod(v, n)`.
- `virtualAt(p)`: `k = Math.floor(u(p) / period)`, `r = u(p) − k × period`; pick the `i` minimising
  circular distance `min(|r − u_i|, period − |r − u_i|)`; if the minimum was reached through the
  wrap and `r > u_i`, the snap belongs to copy `k + 1`. Return `k × n + i`.
- Loop index for state = `mod(virtualAt(p), n)`; loop `progress` = `mod(u(p), period) / period`.

### 2. "Loop active"

`loop` is requested by the option, but the engine only behaves as a loop when it is **active**:
`options.loop && slideCount > 0 && clonesBefore === loopCopies × slideCount && clonesAfter === loopCopies × slideCount`,
where `clonesBefore`/`clonesAfter` count `[data-slider-clone]` children before the first and after
the last real slide. Until clones are present (the renderer has not run yet), the engine behaves
exactly as unit 01's non-loop engine, except that `state.loopCopies = copiesNeeded(layout)` is
already published so a renderer can react. When `loop` is false, `loopCopies` stays 0.

When loop is active:
- snaps = `loopSnapPositions` (not clamped), `canPrev = canNext = snapCount > 1`, index and
  progress per change 1, `rewind` is ignored.
- Every clone gets the same inline `scroll-snap-align` as the real slide whose index is in its
  `data-slider-clone` attribute (anchor → `align`, else `none`), so native snapping works across
  clones. `destroy()` clears it on clones too.
- On the measure that first makes the loop active (clones just inserted before the real slides,
  so content shifted), the "nothing is moving → jump to `snaps[index]`" rule from unit 01 puts the
  view on the real set. Make sure that jump uses the **canonical** loop position.

### 3. Wrap-aware navigation (loop active)

- `from = pending?.virtual ?? virtualAt(currentPosition)`.
- `next` → `from + 1`; `prev` → `from − 1`; `scrollTo(i)` → `i` is first reduced
  `mod(i, n)` (no clamping and no `RangeError` for out-of-range integers in loop mode; non-integers
  still throw), then the virtual index congruent to it that is nearest to `from` (candidates
  `base − n`, `base`, `base + n` with `base = from − mod(from, n) + i`; ties → forward).
- **Normalise before animating**: take snap ownership (inline `scroll-snap-type: none`) first,
  then `k = Math.floor(from / n)`; if `k !== 0`, jump instantly by `−d × k × period`
  (`viewport.scrollTo({ …, behavior: 'instant' })`) and subtract `k × n` from both `from` and the
  target. Then animate to `positionOf(target)`; `pending = { index: mod(target, n), virtual: target }`.
- Everything else (handle ownership, restoring snap only when the latest navigation settles)
  is unit 01's mechanism unchanged.

### 4. Recentering at rest

In the `observeScroll` listener, when loop is active and **all** hold: `isScrolling === false`,
`pointerDown === false`, no `pending` navigation, and the position is within 1px of some
`positionOf(v)` — compute `c = canonical(p, s0, period, d)`; if `|c − p| > 1`, jump instantly to
`c`. The index does not change (same snap, real copy). Do not hold/suspend snap for this jump; the
target is a snap position.

### 5. `renderClones(slider): () => void` — `src/core/clones.ts`

DOM renderer for vanilla use. Subscribes to the slider; whenever `loopCopies` or `slideCount`
changes (and once immediately), it:
1. removes every `[data-slider-clone]` child of `slider.viewport`;
2. if `loopCopies > 0`: for `copy` in `1..loopCopies`, inserts before the first real slide a
   clone of each real slide (in order), and appends after the last real slide another clone of
   each — so the DOM reads `[copies × set] [real set] [copies × set]`;
3. each clone: `slide.cloneNode(true)`, `data-slider-clone="<real index>"`,
   `aria-hidden="true"`, `inert` attribute, and `removeAttribute('id')` on the clone and every
   descendant that has one.
Returns a cleanup that unsubscribes and removes all clones. The engine's MutationObserver sees the
insertion and re-measures; nothing else is needed.

### 6. Tests — `test/core/loop.test.ts`

Fixture unless stated: width 300, 3 slides perView 1, gap 0 (period 900), `loop: true`,
`animation: { type: 'instant' }`, `renderClones(slider)` called right after `createSlider`.
Literal expectations:

1. **Copies** — `getState().loopCopies === 1`; after `renderClones`, the viewport has 9 children:
   3 clones, 3 real, 3 clones; clones carry `data-slider-clone` `0,1,2,0,1,2` in DOM order,
   `aria-hidden="true"` and `inert`.
2. **Copies grow when the set is short** — width 300, 2 slides of width 100 (content-sized), gap 0
   (period 200) → `loopCopies === 3`.
3. **Starts on the real first slide** — polls to `scrollLeft 900`, `index 0`, `canPrev true`.
4. **Wrap forward** — `scrollTo(2)` → `scrollLeft 1500`; `next()` → `scrollLeft 1800` then polls
   back to `900` (recentred), `index 0`.
5. **Wrap backward** — from the start, `prev()` → `scrollLeft 600` then polls to `1500`, `index 2`.
6. **Native scrolling into clones recentres** — `viewport.scrollTo({ left: 300, behavior: 'instant' })`
   (clone of slide 1) → polls to `scrollLeft 1200`, `index 1`.
7. **No recentering while a pointer is down** — dispatch `pointerdown` on the viewport, scroll to
   300, wait 300ms → still `300`; dispatch `pointerup` on window → polls to `1200`.
8. **scrollTo takes the short way** — at index 0, `scrollTo(2)` → `scrollLeft 600` (backwards
   through the clone), recentres to `1500`.
9. **Out-of-range integers wrap** — `scrollTo(4)` → `index 1`.
10. **ids are stripped** — give real slide 0 `id="a"` and a child `id="b"`; no clone (or clone
    descendant) has an `id`; `document.querySelectorAll('#a').length === 1`.
11. **Clone snap-align mirrors the anchors** — `slidesPerMove: 2` on a 4-slide set: clones of slides
    0 and 2 have `scrollSnapAlign 'start'`, clones of 1 and 3 `'none'`.
12. **Cleanup** — calling the `renderClones` cleanup removes all clones; `loopCopies` stays
    published; the engine falls back to non-loop behaviour (`canPrev false` at index 0).
13. **loop off** — fixture without `loop`: `loopCopies === 0` and `renderClones` inserts nothing.
14. **RTL** — `dir="rtl"` fixture → starts at `scrollLeft -900`; `prev()` from index 0 → polls to
    `-1500`, `index 2`.

## Verify

```sh
pnpm typecheck && pnpm lint && pnpm test
```

`test/core/loop.test.ts` (14 cases) and unit 01's `navigation.test.ts` both pass.

## Watch out

- The engine must never create or remove DOM; only `renderClones` does.
- Expectations 4–6 depend on `observeScroll`'s 120ms idle delay — use `expect.poll` with a timeout
  of at least 1000ms, never fixed sleeps except where a test asserts something did **not** happen.
- Do not let recentering run while `pending` is set: an `'instant'` navigation resolves its handle
  on a microtask, so there is a window where the scroll event arrives before `pending` clears.
  That is fine because recentering also waits for `isScrolling: false`.
