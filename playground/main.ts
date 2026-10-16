import '../src/styles.css'
import { createSlider } from '../src/core'

const HUES = [25, 85, 150, 230, 300]

const app = document.getElementById('app')
if (!app) throw new Error('Playground root #app is missing from index.html')

const viewport = document.createElement('div')
viewport.setAttribute('data-slider-viewport', '')
viewport.tabIndex = 0
viewport.setAttribute('aria-label', 'Coloured slides')
viewport.style.cssText = 'width: 600px; max-width: 100%; --slider-per-view: 1; --slider-gap: 16px'

HUES.forEach((hue, i) => {
  const slide = document.createElement('div')
  slide.textContent = `Slide ${i + 1}`
  slide.style.cssText = `height: 300px; display: grid; place-items: center; border-radius: 12px;
    font-size: 24px; color: white; background: oklch(0.6 0.15 ${hue})`
  viewport.append(slide)
})

const prev = document.createElement('button')
prev.type = 'button'
prev.textContent = 'Previous'
const next = document.createElement('button')
next.type = 'button'
next.textContent = 'Next'
const readout = document.createElement('span')
readout.className = 'readout'

const controls = document.createElement('div')
controls.className = 'controls'
controls.append(prev, next, readout)
app.append(viewport, controls)

const slider = createSlider(viewport)
prev.addEventListener('click', () => slider.prev())
next.addEventListener('click', () => slider.next())

function render(): void {
  const { index, snapCount, canPrev, canNext } = slider.getState()
  prev.disabled = !canPrev
  next.disabled = !canNext
  readout.textContent = `${index + 1} / ${snapCount}`
}

render()
slider.subscribe(render)
