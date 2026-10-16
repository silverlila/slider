# @silverlila/slider — a slider/carousel library built on native browser scrolling

> Master file for this effort. Every unit file assumes what is here and does not repeat it —
> **read this first**.
> Generated from a working session on 2026-10-16.
> Audience: an engineer or agent with zero prior context on this effort.
> Design: no `/architect` document — the shape was settled in conversation with the user and is
> recorded in full under **Decisions Made** below.

## Goal

Replace the experimental transform-based carousel in this repo with **`@silverlila/slider`**: a
small, very capable slider library where the browser's own scrolling does the moving. The slides
sit in a normal scroll container with CSS scroll-snap; JavaScript only measures, tracks which
slide is active, drives prev/next/dots, and adds what the platform lacks (mouse dragging, an
infinite loop, autoplay, per-slide effect values, thumbnail sync). Because the scroll is real,
trackpads, mouse wheels, keyboard arrows, momentum, find-in-page and focus-scrolling all work
natively, and the layout works before JavaScript loads. It ships as a framework-free core
(`@silverlila/slider/core`) plus a React layer (`@silverlila/slider`): a headless `useSlider()`
hook and compound components named `Slider`, `Slider.Viewport`, `Slider.Slide`, `Slider.Prev`,
`Slider.Next`, `Slider.Dots`, `Slider.Thumbs`, `Slider.Thumb`, `Slider.AutoplayToggle`.

## Background & Context

**The repo today** (`/Users/silver/Desktop/Projects/my-libs/glide`, package name `glide`,
`"private": true`) is a Vite + React 19 + TypeScript app scaffold, managed with **pnpm**
(`pnpm-lock.yaml`). Its 26 tracked files include an experimental carousel in `src/lib/`
(`carousel.tsx`, `context.tsx`, `index.ts`, `next.tsx`, `prev.tsx`, `slide.tsx`, `styles.css`,
`track.tsx`, `types.ts`, `use-controlled-state.tsx`) that moves a flex track with
`@react-spring/web` springs and `@use-gesture/react` drags, plus demos in `src/examples/`
(`App.tsx`, `MultipleSlides.tsx`), `src/main.tsx`, `src/index.css`, `src/vite-env.d.ts`,
`index.html`, `public/vite.svg`. Nothing in it is kept: the whole thing is replaced. `clsx` is a
devDependency that nothing imports (`grep -rn clsx src` → no hits). There are no tests and no test
runner today. Scripts today: `dev` (vite), `build` (`tsc -b && vite build`), `lint` (`eslint .`),
`preview`.

**TypeScript config today**: `tsconfig.json` is references-only (`files: []`, references
`tsconfig.app.json` and `tsconfig.node.json`). `tsconfig.app.json` has `strict`,
`verbatimModuleSyntax` (so type-only imports must use `import type`), `erasableSyntaxOnly` (no
enums, no parameter properties), `allowImportingTsExtensions`, `noUnusedLocals`,
`noUnusedParameters`, `jsx: react-jsx`, `include: ["src"]`. `eslint.config.js` uses
`typescript-eslint` recommended, `eslint-plugin-react-hooks` recommended-latest and
`eslint-plugin-react-refresh` (vite config), ignoring `dist`.

**use-scroller** (npm `use-scroller@2.x`, MIT, by the same author, zero dependencies, ESM-only)
is the foundation. Its source is on this machine at
`/Users/silver/Desktop/Projects/personal/use-scroller` (read it; do **not** modify it — a separate
effort owns that repo). Entry `use-scroller/core` is framework-free; `use-scroller` adds React
hooks. What this library uses from it, all from `use-scroller/core`:

| Export | What it does (verified by reading `src/core/*.ts` in that repo) |
| --- | --- |
| `readScroll(target)` | `{ x, y, minX, maxX, maxY, viewportWidth, viewportHeight }`. In RTL, `minX = -max, maxX = 0`. |
| `animateScroll(target, { x? , y? }, { animation?, interruptible?, respectReducedMotion? })` → `ScrollHandle { finished: Promise<'completed'\|'interrupted'\|'cancelled'>, cancel() }` | Animates scroll per frame. Starting a new one on the same target cancels the running one (`'cancelled'`). Interrupted by `wheel`/`touchstart`/`pointerdown`/`keydown` **on the target**. Suspends CSS snapping by setting inline `scroll-snap-type: none` **only if the computed value is not already `none`**, and restores it when it stops. Jumps instantly under `prefers-reduced-motion: reduce`. `animation` is `{ type: 'tween', duration?=450, easing? }`, `{ type: 'spring', stiffness?, damping?, mass?, velocity? }` or `{ type: 'instant' }`. Targets are clamped to the scroll range every frame. |
| `cancelScroll(target)` | Cancels a running `animateScroll` on that target. |
| `observeScroll(target, listener, { idleDelay = 120 })` → stop fn | Emits a `ScrollState` once on subscribe, then at most once per animation frame when something changed (scroll **or** a resize of the element/its content). `isScrolling` becomes `false` `idleDelay` ms after the last scroll event. Fields used here: `x`, `y`, `isScrolling`. |
| `dragScroll(element, { axis, mouse })` → stop fn | Sets inline `touch-action: pan-y pinch-zoom` (`pan-x pinch-zoom` for `axis: 'y'`). Takes over **touch** gestures always, and mouse drags when `mouse: true`, after 8px of movement along the axis. On release, picks a CSS snap position (from the computed `scroll-snap-align` of the children) using the release velocity and springs there with `animateScroll` (`respectReducedMotion: false`). Suppresses the click that would follow a drag. Inline `scroll-snap-type: none` during the drag. |
| Types `ScrollAnimation`, `ScrollHandle`, `Axis` | As above. `Axis = 'x' \| 'y'`. |

use-scroller does **not** export its internal snap-position reader, so this library measures its
own geometry (see Decisions Made).

**Conventions to mirror from use-scroller** (it is the author's house style): Vitest **browser
mode** with Playwright Chromium, headless (`/Users/silver/Desktop/Projects/personal/use-scroller/vitest.config.ts`);
tests under a top-level test folder split into `core/`, `react/`, `helpers/`; real DOM, real
scrolling, no mocks of the library's own code; the helpers in
`/Users/silver/Desktop/Projects/personal/use-scroller/tests/helpers/` (`dom.ts` — `mount`,
`nextFrame`; `media.ts` — `emulateReducedMotion` via CDP; `pointer.ts` — real mouse/touch input via
CDP) are the model to copy. tsup builds with two entries and a `'use client'` banner on the React
entry only (`/Users/silver/Desktop/Projects/personal/use-scroller/tsup.config.ts`). Every
function that sets something up returns a cleanup function. Prettier style there: no semicolons,
single quotes, width 100 — **this repo has no prettier config; match the style of the files you
create consistently (use the use-scroller style).**

Playwright's Chromium is already installed on this machine (`~/Library/Caches/ms-playwright`
contains `chromium-1243` and `chromium_headless_shell-1243`). If the installed Playwright version
wants a different build, run `pnpm exec playwright install chromium`.

### Terms used throughout

- **viewport** — the scroll container element (overflow + scroll-snap). Its element children are
  the slides.
- **slide** — a direct element child of the viewport that does **not** carry
  `data-slider-clone`. "Real slide".
- **clone** — a direct child carrying `data-slider-clone="<i>"`, a visual copy of real slide `i`,
  present only in loop mode.
- **snap** — one stop the slider can rest on. With `slidesPerMove: 1` and nothing clamped, there
  is one snap per slide; groups and end-clamping make fewer. `index` is always a **snap index**.
- **anchor** — the slide whose CSS `scroll-snap-align` defines a snap (one per group).
- **period** — in loop mode, the distance in scroll coordinates between a slide and the same
  slide in the next copy of the set.
- **loop copies** — how many full copies of the real slide set are rendered on **each** side.
- **direction factor `d`** — `+1` for `axis: 'y'` and for LTR `axis: 'x'`; `-1` for RTL
  `axis: 'x'` (in RTL, scrollLeft is 0 at the start and goes negative).

## Requirements

1. The package is named `@silverlila/slider`, is ESM-only, and exposes three entry points:
   `@silverlila/slider` (React layer, also re-exporting the core), `@silverlila/slider/core`
   (framework-free, no React import anywhere in its graph), `@silverlila/slider/styles.css`.
2. `@react-spring/web`, `@use-gesture/react` and `clsx` are removed; `use-scroller` is a runtime
   dependency; React is an optional peer dependency (`^19`).
3. Layout is CSS: the shipped stylesheet makes the viewport a horizontal (or vertical) flex scroll
   container with mandatory scroll-snap, a hidden scrollbar and `position: relative`; slide size
   comes from the CSS custom properties `--slider-per-view` (a number, or unset/auto for
   content-sized slides) and `--slider-gap`. All selectors are wrapped in `:where()` so any user
   CSS overrides them; responsive slides-per-view is done with ordinary media queries.
4. The core engine `createSlider(viewport, options)` measures the laid-out slides, derives the
   snap list, tracks the active `index` and `progress` from the real scroll position, and offers
   `next()`, `prev()`, `scrollTo(index)`. Options: `axis`, `align`, `slidesPerMove` (number or
   `'auto'`), `loop`, `rewind`, `draggable`, `startIndex`, `animation`.
5. Navigation respects the edges unless `rewind` (wraps by scrolling back across the slides) or
   `loop` (wraps seamlessly through clones) is on. `canPrev`/`canNext` reflect that.
6. The engine re-measures on viewport/slide resize and on slides being added/removed, and keeps
   the current slide in place when nothing is scrolling.
7. Infinite loop: the engine computes how many copies of the slide set are needed on each side;
   a renderer (DOM `renderClones()` for vanilla use, React for the components) renders them as
   `aria-hidden`, `inert` clones; prev/next/scrollTo move forward/back through clones; when
   scrolling comes to rest on a snap inside a clone region, the engine jumps by whole periods back
   into the real set with no visible change.
8. Mouse and touch dragging go through use-scroller's `dragScroll` when `draggable` (default on).
   Keyboard scrolling is native (the viewport is focusable); there is no custom key handler.
9. Autoplay: advances every `delay` ms, wraps to the first snap at the end, pauses while hovered,
   while focus is inside, and while the tab is hidden; stops for good on user interaction with the
   viewport; does not start under `prefers-reduced-motion: reduce`; exposes `play()`/`stop()` and
   a playing state.
10. Effects: an opt-in plugin writes `--slide-progress` (signed, in slide steps, 0 when the slide
    is at the aligned position, positive for upcoming slides) and `--slide-distance` (its
    absolute value) on every slide and clone each scroll frame, so effects are pure CSS.
11. Synced sliders: a thumbnail slider follows the main slider's index, clicking a thumbnail
    moves the main slider, and the thumbnail matching the main index carries `aria-current="true"`
    and `data-selected`.
12. React: `useSlider(options)` (headless) and `useSliderState(slider, selector)`; components with
    full accessibility semantics (region/carousel roledescription, slide groups labelled "n of
    total", buttons with `aria-controls`, dots with `aria-current`); controlled (`index` +
    `onIndexChange`) and uncontrolled (`defaultIndex`) use; components re-render only when
    discrete state (index, counts, edges, loop copies) changes, never per scroll frame.
13. A playground (`pnpm dev`) demonstrates every feature, and the README documents the API.

## Decisions Made

| Decision | Rationale | Rejected alternatives & why |
|---|---|---|
| Native scrolling (scroll container + CSS scroll-snap) moves the slides; no transforms on a track. | The user's core goal. Real momentum/trackpad/wheel/keyboard/find-in-page/focus behaviour for free, SSR-friendly, small. | Transform-based track (react-spring/use-gesture, the current code; Embla/Swiper style): reimplements physics and loses native scroll behaviour. |
| Build on `use-scroller` (`animateScroll`, `observeScroll`, `dragScroll`, `readScroll`). | The author's own library already handles programmatic scroll animation that suspends snapping and stops when the user takes over, per-frame scroll state, and axis-locked drag with momentum onto snap points. | Re-implementing those; a third-party scroll lib. |
| Framework-free core + React layer, mirroring use-scroller's `core` / React split. | Works in any framework; engine testable without React. User chose this explicitly. | React-only. |
| React API = headless `useSlider()` hook **and** thin compound components built on it. Components are named `Slider*`, never `Carousel*`. Package `@silverlila/slider`. | User's explicit choice of both shape and naming. The npm name `glide` is taken (an unrelated scroll-to component) and Glide.js (`@glidejs/glide`) is a well-known slider, so the old name is dropped. | Components only; hook only; the name `glide`. |
| Infinite loop is **opt-in** (`loop: false` default) and built from **clones**; `rewind` is the clone-free middle ground. | Clones are the only robust way to loop with native momentum and snap. Off by default, so only people who opt in pay for duplicated DOM. User chose this. | Reordering slides (moving the first to the end): forces a `scrollLeft` correction on every reorder, which kills iOS momentum mid-fling. Transform-wrapping individual slides: unreliable with native snap. Dropping loop: a hole for a "can do everything" slider. |
| Clones are `aria-hidden="true"` + `inert`, carry `data-slider-clone="<real index>"`, and (DOM clones) have every `id` attribute removed. | Screen readers and keyboard users see each slide exactly once; no duplicate ids. **Accepted tradeoff:** a clone that is visible at rest (e.g. the neighbour of the first slide with `align: 'center'`) cannot be clicked. Document it. | Interactive clones: duplicate tab stops and duplicate screen-reader content. |
| Loop recentering happens only when scrolling has come to rest (`observeScroll` reports `isScrolling: false`), no pointer is down on the viewport, no programmatic navigation is pending, **and** the position is on a snap (within 1px). It jumps by whole periods with `scrollTo({ behavior: 'instant' })`. | Changing scroll position during native momentum stops momentum on iOS; at rest on a snap point, the jump target is an identical snap point, so nothing moves visually and snap does not re-adjust. | Recentering on every scroll event; recentering mid-gesture. |
| Clone count per side = `ceil(2 × viewport size ÷ period)`, minimum 1. | At least two viewports of buffer each side so flings and several quick clicks never hit the end of the clones. | A fixed one copy: too small when the set is short relative to the viewport. |
| During its own programmatic navigation the engine **owns** snap suspension: it sets inline `scroll-snap-type: none` before calling `animateScroll` (so `animateScroll` sees `none` and leaves snap alone) and restores it only when the **latest** navigation settles. In loop mode, before each navigation it may jump the scroll position by whole periods (while snap is suspended) so the target stays inside the clone buffer. | Rapid clicks start a new animation before the previous one ends; if each animation restored snap itself, snap could come back mid-flight and fight the animation, and an instant jump while snap is active gets re-snapped by the browser. One owner, one restore. | Relying on `animateScroll`'s own suspension. |
| While a programmatic navigation is pending, `state.index` is the **target** index; otherwise it is the snap nearest the scroll position. `progress` always follows the real position. | Dots highlight the destination immediately and `onIndexChange` fires once per navigation rather than once per slide passed. Consecutive `next()` calls build on the pending target, so three quick clicks move three slides. | Index purely from position (dots flicker through intermediate slides). |
| Geometry is measured from `offsetLeft`/`offsetTop`/`offsetWidth`/`offsetHeight` relative to the viewport (which must be the slides' `offsetParent` — the stylesheet sets `position: relative`; `createSlider` throws if the viewport's computed `position` is `static`). | Offsets ignore CSS transforms, so per-slide effects (`scale`, `rotate`) never distort snap math, and offsets are already in scroll coordinates (they do not change while scrolling; in RTL they are negative for content left of the start, matching negative `scrollLeft`). Integer rounding (≤1px) is absorbed because the browser's own snap has the final say. | `getBoundingClientRect` (transform-affected; needs scroll compensation). Reading use-scroller's private snap reader (not exported). |
| Snaps come from **anchors**: slides are grouped by `slidesPerMove`; the anchor of each group is its first slide for `align: 'start'`, last for `'end'`, middle (`Math.floor((first + last) / 2)`) for `'center'`. The engine writes inline `scroll-snap-align: <align>` on anchors and `none` on every other slide and clone, so native snapping and the engine agree. Without loop, each anchor position is clamped to the scroll range and consecutive positions within 1px are merged. | Keeps CSS snap the source of truth for trackpad/touch/keyboard while the engine knows the same list. **Known limit:** `align: 'center'` with an even `slidesPerMove` centres a slide, not the group — document it. | Invisible absolutely-positioned snap markers (precise for any group, but more moving parts). |
| Slides-per-view and gap are CSS custom properties, not engine options. `slidesPerMove: 'auto'` = the number of slides that fully fit in the viewport, measured. | Responsive layouts work with plain CSS media queries; the engine stays layout-agnostic (it measures whatever the CSS produced, including variable-width slides). | `perView`/`breakpoints` options inside the engine. |
| Keyboard navigation is the browser's native scrolling of a focused scroll container (`tabIndex={0}` on the viewport). No `keydown` handler, no `aria-live` region. | Arrow keys/Page/Home/End already scroll and snap; the DOM never changes on navigation, so there is nothing for a live region to announce. | The old custom ArrowLeft/ArrowRight handler. |
| Dragging uses `dragScroll(viewport, { axis, mouse: true })` when `draggable` (default `true`). With `draggable: false`, touch scrolling is fully native and the mouse cannot drag. | Mouse drag is expected of a slider, and `dragScroll` adds axis locking for diagonal swipes. | Native touch only (no mouse drag). |
| The engine never creates DOM. It publishes `loopCopies` in its state; a separate renderer creates clones (`renderClones(slider)` in core for vanilla users; React renders them itself). | Separates policy (how many) from mechanism (how). React must render clones itself: foreign DOM nodes inside a React-managed list break reconciliation order, and DOM-cloned nodes lose React event handlers and state. | `cloneNode` inside the engine for everyone; an engine option switching clone strategies. |
| Autoplay, slide-progress effects and thumbnail sync are separate core functions taking a slider (`autoplay(slider, opts)`, `slideProgress(slider)`, `syncSliders(main, thumbs)`), each returning cleanup. | One thing each; the engine stays small; React wires them from options. | Folding them into `createSlider` options. |
| Thumbnail sync maps thumbnail **slide** `i` ↔ main **snap** `i`. | The main slider of a gallery shows one slide per snap. Document that sync assumes this. | A slide↔snap mapping API on the engine (nobody asked for it yet). |
| React components re-render only on discrete state. `useSliderState(slider, selector, isEqual?)` (built on `useSyncExternalStore`) is how anything reads `progress`. | `progress` changes every scroll frame; putting it in context would re-render the whole tree per frame. | Everything in context. |
| React's engine is (re)created in a layout effect keyed on the structural options and a **shallow-equal** memo of `animation`, keeping the current index across re-creation. | Users write `animation={{ type: 'spring' }}` inline; identity-based deps would recreate the engine every render. | An engine `setOptions` method (API surface for one field). |
| React peer is `^19` only. | Clones rely on React 19's boolean `inert` prop (React 18 does not support `inert`). | `^18 \|\| ^19`. |
| Tests run in a real browser (Vitest browser mode, Playwright Chromium) and assert on real scroll positions with literal expected numbers. Programmatic navigation in tests uses `animation: { type: 'instant' }` so results are deterministic. | Mirrors use-scroller; scroll-snap and layout cannot be faked in jsdom. | jsdom; mocking use-scroller. |

## Current State

Nothing of the new library exists. Every file listed under **Background & Context → The repo
today** is replaced or deleted by unit 01 (and the playground by unit 06). There is no `test/`
directory, no `context/` beyond this spec, and no test tooling installed.

## Out of Scope

- **Modifying use-scroller.** A separate effort (running in parallel in its own repo) exports
  use-scroller's `readSnapPositions` and makes `dragScroll` respect `scroll-snap-stop: always`.
  Do not depend on either: pin `use-scroller` at `^2.0.0` and use only the exports listed above.
- **Publishing** to npm, a release workflow, changesets, CI. The package is made publishable
  (name, exports, `files`, `publishConfig.access: public`, no `private`) but nothing is published.
- **Renaming the repo folder** (`glide`) or the GitHub repo. Only the package name changes.
- **Fade / cross-fade, cube, flip, coverflow-3D transitions.** Native scroll moves slides
  side by side; a cross-fade stack does not fit this model. Effects are what `--slide-progress`
  can drive (scale, opacity, parallax, rotate).
- **`skipSnaps` / `scroll-snap-stop` options.** Flick behaviour on release is `dragScroll`'s.
- **Lazy-loading helpers, `slidesInView` tracking, virtualisation.** Not requested.
- **Making clones interactive** (see Decisions Made).
- **React 18 support.**
- **CSS-only `::scroll-button` / `::scroll-marker` carousels** (Chromium-only today).

## Acceptance Criteria

- AC1 — `pnpm typecheck` exits 0. The whole repo (src, test, playground) type-checks.
- AC2 — `pnpm lint` exits 0.
- AC3 — `pnpm build && ls dist/index.js dist/core.js dist/index.d.ts dist/core.d.ts dist/styles.css`
  exits 0. Both entries and the stylesheet are built.
- AC4 — `! grep -nE '"(@react-spring/web|@use-gesture/react|clsx)"' package.json` exits 0. The old
  animation/gesture dependencies are gone.
- AC5 — `! grep -rn "from 'react'\|from \"react\"" src/core` exits 0. The core entry never imports React.
- AC6 — `pnpm test test/core/navigation.test.ts` exits 0. Engine measurement, index tracking,
  next/prev/scrollTo, edges, rewind, `slidesPerMove`, `startIndex`, vertical axis, RTL, re-measure
  on resize and on slide insertion.
- AC7 — `pnpm test test/core/loop.test.ts` exits 0. `loopCopies`, `renderClones`, wrap forward and
  backward through clones, recentering at rest, clone accessibility attributes.
- AC8 — `pnpm test test/core/autoplay.test.ts` exits 0.
- AC9 — `pnpm test test/core/slide-progress.test.ts` exits 0.
- AC10 — `pnpm test test/core/sync.test.ts` exits 0.
- AC11 — `pnpm test test/react/slider.test.tsx` exits 0. Components, accessibility semantics,
  controlled/uncontrolled index, React-rendered loop clones, `useSlider` headless use.
- AC12 — `pnpm test test/react/extras.test.tsx` exits 0. `autoplay` and `slideProgress` props,
  `Slider.AutoplayToggle`, `Slider.Thumbs`/`Slider.Thumb`.
- AC13 — `pnpm playground:build` exits 0. Every playground demo compiles and bundles.

## Units

| # | File | What it changes |
|---|---|---|
| 01 | `01-core-engine.md` | Tooling swap (deps, tsup, Vitest browser), old lib deleted, stylesheet, core engine without loop, minimal vanilla playground |
| 02 | `02-loop.md` | Infinite loop in the core engine plus the DOM `renderClones` renderer |
| 03 | `03-core-plugins.md` | `autoplay`, `slideProgress`, `syncSliders` core functions |
| 04 | `04-react-slider.md` | React layer: `useSlider`, `useSliderState`, `Slider` compound components incl. loop clones |
| 05 | `05-react-extras.md` | React `autoplay`/`slideProgress` props, `Slider.AutoplayToggle`, `Slider.Thumbs`/`Slider.Thumb` |
| 06 | `06-playground-docs.md` | React playground demoing every feature, README, playground build script |

Run them in order. Each leaves the repo green on its own.

## Verification

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build && ls dist/index.js dist/core.js dist/index.d.ts dist/core.d.ts dist/styles.css
! grep -nE '"(@react-spring/web|@use-gesture/react|clsx)"' package.json
! grep -rn "from 'react'\|from \"react\"" src/core
pnpm playground:build
```

## Open Questions

- **Native snap vs. transformed slides.** The engine measures untransformed layout (offsets).
  Whether Chromium/WebKit compute snap areas from transformed or untransformed boxes was not
  verified. If an effect scales slides around a non-centre origin with `align: 'start'`, native
  snap and the engine could disagree by the scale difference. Effects that scale around the
  centre (the default `transform-origin`) are unaffected for `align: 'center'`. Unit 06's
  playground uses centre-origin effects; flag any visible drift in its Checkpoint.
- **Real-device verification** of touch dragging (via `dragScroll`) and loop recentering on iOS
  Safari and Android is not possible in this environment; the test suite runs headless Chromium only.

## Landed

01. ✔ 37 files. Ran the unit Verify: typecheck, lint, 20 real-Chromium navigation tests (incl. a regression test for snap being left off after navigating over a running drag-release animation), tsup build emitting dist/index.js, core.js, both .d.ts and styles.css; old deps gone; core imports no React.
02. ✔ 6 files. typecheck + lint clean; 34 real-Chromium tests (20 navigation + 14 loop: copies, DOM clones with aria-hidden/inert/ids stripped, wrap forward/back, recentre at rest, RTL) passed.
03. ✔ 9 files. typecheck + lint clean; 55 real-Chromium tests passed incl. 12 autoplay (each pause condition mutation-checked), 7 slide-progress (incl. regression: values follow a loop recentre), 3 sync.
04. ✔ 6 files. typecheck + lint clean; 73 real-Chromium tests passed incl. 18 React (a11y semantics, controlled/uncontrolled, React-rendered inert loop clones, headless useSlider, engine re-creation keeps the slide); mutation-checked key hook paths.
05. ✔ 5 files. typecheck + lint clean; 83 real-Chromium tests passed incl. 10 React extras (autoplay prop + toggle, root hover pause, unmount teardown, slideProgress prop, Thumbs sync both ways); mutation-checked.
06. ✔ 8 files. typecheck + lint clean; 83 tests passed; playground:build bundled 45 modules into dist-playground/index.html; lib build OK; reviewer drove the built playground at 375/800/1200px with no console errors and no page overflow. Checkpoint (feel/visual) awaits the user.
