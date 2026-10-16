import '../src/styles.css'
import {
  autoplay,
  createSlider,
  renderClones,
  slideProgress,
  syncSliders,
  type Slider,
  type SliderOptions,
} from '../src/core'

const HUES = [25, 85, 150, 230, 300]

const app = document.getElementById('app')
if (!app) throw new Error('Playground root #app is missing from index.html')

// Rules that inline styles cannot express: effect-driven slides and the selected thumbnail.
const style = document.createElement('style')
style.textContent = `
  .effect-slide {
    scale: calc(1 - min(var(--slide-distance, 0), 1) * 0.12);
    opacity: calc(1 - min(var(--slide-distance, 0), 1) * 0.5);
  }
  .thumbs {
    --slider-gap: 8px;
  }
  .thumb {
    width: 72px;
    height: 48px;
    border: 0;
    border-radius: 8px;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 150ms ease-out;
  }
  .thumb:hover,
  .thumb[data-selected] {
    opacity: 1;
  }
  .thumb:focus-visible {
    outline-offset: -2px;
  }
`
document.head.append(style)

interface Demo {
  slider: Slider
  section: HTMLElement
  controls: HTMLElement
}

interface DemoSetup {
  title: string
  options: SliderOptions
  perView?: number
  slideClass?: string
}

function createDemo(
  parent: HTMLElement,
  { title, options, perView = 1, slideClass }: DemoSetup
): Demo {
  const heading = document.createElement('h2')
  heading.textContent = title
  heading.style.cssText = 'margin: 0; font-size: 18px; font-weight: 600; text-wrap: balance'

  const viewport = document.createElement('div')
  viewport.setAttribute('data-slider-viewport', '')
  viewport.tabIndex = 0
  viewport.setAttribute('aria-label', title)
  viewport.style.cssText = `width: 600px; max-width: 100%; --slider-per-view: ${perView};
    --slider-gap: 16px`

  HUES.forEach((hue, i) => {
    const slide = document.createElement('div')
    slide.textContent = `Slide ${i + 1}`
    if (slideClass) slide.className = slideClass
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

  const section = document.createElement('section')
  section.style.cssText = 'display: grid; gap: 12px; margin-bottom: 32px'
  section.append(heading, viewport, controls)
  parent.append(section)

  const slider = createSlider(viewport, options)
  if (options.loop) renderClones(slider)
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
  return { slider, section, controls }
}

/** A Pause/Play button that follows the autoplay's playing state. */
function addAutoplayToggle({ slider, section, controls }: Demo): void {
  const player = autoplay(slider, { delay: 3000, root: section })
  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.addEventListener('click', () => (player.isPlaying() ? player.stop() : player.play()))

  function render(playing: boolean): void {
    toggle.textContent = playing ? 'Pause' : 'Play'
  }

  render(player.isPlaying())
  player.subscribe(render)
  controls.insertBefore(toggle, controls.lastElementChild)
}

/** A strip of small thumbnails under the demo that follows it and moves it when clicked. */
function addThumbnails({ slider, section, controls }: Demo): void {
  const strip = document.createElement('div')
  strip.setAttribute('data-slider-viewport', '')
  strip.className = 'thumbs'
  strip.setAttribute('aria-label', 'Thumbnails')

  HUES.forEach((hue, i) => {
    const thumb = document.createElement('button')
    thumb.type = 'button'
    thumb.className = 'thumb'
    thumb.setAttribute('aria-label', `Go to slide ${i + 1}`)
    thumb.style.background = `oklch(0.6 0.15 ${hue})`
    strip.append(thumb)
  })

  section.insertBefore(strip, controls)
  syncSliders(slider, createSlider(strip))
}

createDemo(app, { title: 'Coloured slides', options: {} })

// Centred with the neighbours peeking in, so the distance effect is visible at rest.
const loopDemo = createDemo(app, {
  title: 'Infinite loop',
  options: { loop: true, align: 'center' },
  perView: 1.3,
  slideClass: 'effect-slide',
})
slideProgress(loopDemo.slider)
addAutoplayToggle(loopDemo)
addThumbnails(loopDemo)
