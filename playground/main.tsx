import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/styles.css'
import './playground.css'
import { App } from './app'

const root = document.getElementById('app')
if (!root) throw new Error('Playground root #app is missing from index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
