# Field guide

Facts about this repo that cost an agent time to discover. Read by every
implementer before it starts. Budget: 40 lines — to add one, delete a
line worth less. Coding standards belong in a skill, not here.

- `pnpm test` runs on Playwright's own Chromium build; after a `playwright` version bump it fails with "Executable doesn't exist at …/chromium_headless_shell-<rev>" until `pnpm exec playwright install chromium` is run. The revision must match this repo's `playwright` version, not use-scroller's.
- Engine tests that resize or insert slides right after a programmatic `scrollTo`/`next` must wait >120ms first (use-scroller `observeScroll` default idleDelay); before that `createSlider` treats the viewport as scrolling and skips its re-anchor jump. Chromium's own mandatory-snap re-snap at rest can also hide whether that jump ran.
- use-scroller's `observeScroll` emits only when scroll position or element size changes. Any engine decision gated on "at rest" (`!pointerDown`, no pending navigation) must also re-run when that gate clears (on `pointerup`, or when a navigation settles) or it never fires — see `recentre()` in `src/core/slider.ts`. Conversely, `recentre()` jumps scroll by a whole period without a slider state emission, so anything that must follow scroll position (e.g. `slideProgress`) uses `observeScroll(slider.viewport, …)`, not `slider.subscribe`.
- In autoplay/timer tests, "index unchanged after N ms" proves nothing when N covers slides × delay — autoplay wraps back to the start. Record every index change over the window and assert there were none (see `test/core/autoplay.test.ts`).
- vitest-browser-react renders each test at the page's top-left, and Chromium fires real `pointerenter` on elements appearing under a cursor left there by an earlier `.click()` — which pauses autoplay's hover handling. Park the cursor first: `cdp().send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: innerWidth - 1, y: innerHeight - 1 })` (see `test/react/extras.test.tsx`).
- No prettier config here; `npx prettier --no-semi --single-quote --print-width 100 --trailing-comma es5` reproduces the src/ style (Prettier 3's default `trailingComma: "all"` does not match).
- Vitest 5 browser `expect.element(...).toHaveTextContent(string)` is an exact whole-text match (unlike jest-dom's substring); use `toMatchTextContent` for partial matches.
- `useSlider` (`src/react/use-slider.ts`) creates its engine one render after mount (viewport held in state via callback ref), so StrictMode double effects never create two engines. To test engine teardown, re-render with a changed structural option (see the "re-creating the engine" test in `test/react/slider.test.tsx`).
