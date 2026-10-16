# Field guide

Facts about this repo that cost an agent time to discover. Read by every
implementer before it starts. Budget: 40 lines — to add one, delete a
line worth less. Coding standards belong in a skill, not here.

- `pnpm test` runs on Playwright's own Chromium build; after a `playwright` version bump it fails with "Executable doesn't exist at …/chromium_headless_shell-<rev>" until `pnpm exec playwright install chromium` is run. The revision must match this repo's `playwright` version, not use-scroller's.
- Engine tests that resize or insert slides right after a programmatic `scrollTo`/`next` must wait >120ms first (use-scroller `observeScroll` default idleDelay); before that `createSlider` treats the viewport as scrolling and skips its re-anchor jump. Chromium's own mandatory-snap re-snap at rest can also hide whether that jump ran.
