/**
 * Dev server and playground build. `base: './'` keeps asset URLs relative, so the build works
 * under a GitHub Pages project path.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
})
