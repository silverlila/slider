# 06 — Playground for every feature, README, playground build

> Part of `00-context.md`. **Read that first** — this file assumes its background, decisions and
> out-of-scope list and does not repeat them.

- **Satisfies**: AC1, AC13
- **You will see**: `pnpm dev` opens a playground page with one section per feature (basic,
  multiple per view, responsive, loop, rewind + autoplay, effects, thumbnails, vertical, RTL,
  plain JavaScript), and the README explains installation and the whole API with examples.
- **Skills**: `design-foundations`, `ui-polish`, `touch-and-accessibility`
- **Checkpoint**: `pnpm dev` → open the printed localhost URL. Do the sliders feel native and
  correct: trackpad and mouse-drag snap cleanly, loop sections never show a visible jump when they
  settle, the effects section scales smoothly without drift, autoplay pauses on hover, and the page
  looks clean at phone width?

## Goal

Replace the minimal vanilla playground with a React playground that demonstrates every feature
from units 01–05, write the real README, and add a playground build so the demos are
compile-checked. No library code changes in this unit; if a demo reveals a library bug, stop and
report it instead of fixing it here.

## Files

- `index.html` — script points at `/playground/main.tsx`
- `playground/main.ts` — delete
- `playground/main.tsx`, `playground/app.tsx`, `playground/playground.css` — new
- `playground/vanilla.ts` — new: the plain-JS demo (createSlider + renderClones + autoplay), mounted
  into a section of the React page
- `package.json` — script `"playground:build": "vite build --outDir dist-playground"`
- `README.md` — rewritten

## Changes

### 1. Playground sections (one component each in `app.tsx`)

1. **Basic** — 5 slides, Prev/Next, Dots.
2. **Multiple per view** — `perView={3} gap={12} slidesPerMove="auto"`, 12 cards.
3. **Responsive** — `perView` overridden in `playground.css` with media queries on the
   viewport's `--slider-per-view` (1 → 2 at 640px → 4 at 1024px).
4. **Loop, centred** — `loop align="center" perView={1.4}` with peeking neighbours (use
   `perView={1.4}` — fractional values are valid CSS), Dots.
5. **Rewind + autoplay** — `rewind autoplay={{ delay: 3000 }}` with `Slider.AutoplayToggle`.
6. **Effects** — `loop align="center" slideProgress perView={1.6}`; slides styled with
   `scale: calc(1 - min(var(--slide-distance), 1) * 0.15)` and
   `opacity: calc(1 - min(var(--slide-distance), 1) * 0.5)` (centre transform-origin).
7. **Thumbnails** — main `perView={1}` gallery + `Slider.Thumbs perView={5} gap={8}`.
8. **Vertical** — `axis="y"` in a 320px-tall viewport.
9. **RTL** — wrapped in `dir="rtl"`.
10. **Controlled** — external buttons and a range input driving `index`/`onIndexChange`, plus a
    progress bar from `useSliderState(slider, s => s.progress)` via `useSliderContext`.
11. **Plain JavaScript** — `playground/vanilla.ts` mounted with a ref in a `useEffect`.

Slides are simple coloured cards with large numbers; layout readable at 375px width with 16px
side gutters and no horizontal page scroll.

### 2. README

Sections: what it is (native-scroll slider on use-scroller) · install (`pnpm add @silverlila/slider`,
import `@silverlila/slider/styles.css`) · quick start (components) · options table (every
`SliderOptions` and React-only prop with default) · components and the attributes/ARIA each
renders · `useSlider` / `useSliderState` / `useSliderContext` headless usage · loop (how clones
work; clones are `aria-hidden` + `inert`, so a visible clone is not clickable; duplicated
component state inside clones) · autoplay (pausing rules, reduced motion, why to render
`AutoplayToggle` — WCAG 2.2.2) · effects (`--slide-progress`/`--slide-distance` with a scale/fade
example; mention CSS scroll-driven animations as an alternative) · thumbnails (sync assumes one
main slide per snap) · responsive layouts via CSS variables and media queries · vanilla core
(`createSlider`, `renderClones`, `autoplay`, `slideProgress`, `syncSliders`) · styling hooks
(`data-slider*` attributes) · known limitations (center + even `slidesPerMove`; real-device
touch verification pending; transformed slides and native snap, from the context file's Open
Questions).

## Verify

```sh
pnpm typecheck && pnpm lint && pnpm test && pnpm playground:build && pnpm build
```

All suites pass and `dist-playground/index.html` exists.

## Watch out

- `.gitignore` and the eslint ignore already list `dist-playground` (unit 01).
- Do not edit `src/` here. A playground that only works with a library change means a unit before
  this one is wrong — report it.
