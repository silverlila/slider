import { autoplay, createSlider, renderClones } from '../src/core'

const SLIDE_COUNT = 5

const CHEVRON = `<svg class="chevron" width="20" height="20" viewBox="0 0 20 20" fill="none"
  aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5" stroke="currentColor" stroke-width="1.75"
  stroke-linecap="round" stroke-linejoin="round" /></svg>`

function button(className: string, label: string, content: string): HTMLButtonElement {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = className
  element.setAttribute('aria-label', label)
  element.innerHTML = content
  return element
}

function slide(index: number): HTMLElement {
  const element = document.createElement('div')
  element.className = 'card'
  element.style.setProperty('--hue', String((25 + index * 61) % 360))
  element.setAttribute('role', 'group')
  element.setAttribute('aria-roledescription', 'slide')
  element.setAttribute('aria-label', `${index + 1} of ${SLIDE_COUNT}`)
  const number = document.createElement('span')
  number.className = 'card-number'
  number.textContent = String(index + 1)
  element.append(number)
  return element
}

/**
 * Builds a looping, autoplaying slider inside `container` with the framework-free core only.
 * Returns a cleanup that tears everything down and empties `container`.
 */
export function mountVanillaSlider(container: HTMLElement): () => void {
  const root = document.createElement('div')
  root.className = 'slider'
  root.setAttribute('role', 'region')
  root.setAttribute('aria-roledescription', 'carousel')
  root.setAttribute('aria-label', 'Plain JavaScript')

  const viewport = document.createElement('div')
  viewport.className = 'viewport'
  viewport.id = 'vanilla-viewport'
  viewport.tabIndex = 0
  viewport.setAttribute('data-slider-viewport', '')
  viewport.style.setProperty('--slider-per-view', '1.25')
  viewport.style.setProperty('--slider-gap', '12px')
  for (let i = 0; i < SLIDE_COUNT; i++) viewport.append(slide(i))

  const prev = button(
    'icon-button',
    'Previous slide',
    CHEVRON.replace('chevron', 'chevron chevron--back')
  )
  const next = button('icon-button', 'Next slide', CHEVRON)
  const toggle = button('button', '', '')
  const counter = document.createElement('span')
  counter.className = 'counter'
  for (const control of [prev, next, toggle]) control.setAttribute('aria-controls', viewport.id)

  const controls = document.createElement('div')
  controls.className = 'controls'
  controls.append(prev, next, toggle, counter)
  root.append(viewport, controls)
  container.append(root)

  const slider = createSlider(viewport, { loop: true, align: 'center' })
  const removeClones = renderClones(slider)
  const player = autoplay(slider, { delay: 3000, root })

  prev.addEventListener('click', () => slider.prev())
  next.addEventListener('click', () => slider.next())
  toggle.addEventListener('click', () => (player.isPlaying() ? player.stop() : player.play()))

  function renderCounter(): void {
    const { index, snapCount } = slider.getState()
    counter.textContent = `${index + 1} / ${snapCount}`
  }

  function renderToggle(playing: boolean): void {
    toggle.textContent = playing ? 'Pause' : 'Play'
    toggle.setAttribute(
      'aria-label',
      playing ? 'Stop automatic slide show' : 'Start automatic slide show'
    )
  }

  renderCounter()
  renderToggle(player.isPlaying())
  const unsubscribeSlider = slider.subscribe(renderCounter)
  const unsubscribePlayer = player.subscribe(renderToggle)

  return () => {
    unsubscribePlayer()
    unsubscribeSlider()
    player.destroy()
    removeClones()
    slider.destroy()
    root.remove()
  }
}
