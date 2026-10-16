/**
 * Library build. Only the React entry gets the `'use client'` directive, so the banner is set per
 * entry: tsup's global `banner` would also mark core as client-only. `treeshake` stays off because
 * its rollup pass strips directives.
 */
import { defineConfig } from 'tsup'

const REACT_ENTRY = 'src/react/index.ts'

export default defineConfig({
  entry: { index: REACT_ENTRY, core: 'src/core/index.ts' },
  format: ['esm'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom', 'use-scroller'],
  plugins: [
    {
      name: 'use-client-banner',
      renderChunk(code, chunk) {
        if (chunk.entryPoint !== REACT_ENTRY) return
        return { code: `'use client'\n${code}` }
      },
    },
  ],
})
