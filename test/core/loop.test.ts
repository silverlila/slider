import { describe, expect, onTestFinished, test } from 'vitest'
import { createSlider, renderClones, type SliderOptions } from '../../src/core'
import { mountViewport } from '../helpers/fixtures'

const LOOP: SliderOptions = { loop: true, animation: { type: 'instant' } }
// Recentering waits for observeScroll's 120ms idle delay after the last scroll event.
const SETTLED = { timeout: 1000 }

function createLoop(viewport: HTMLElement, options: SliderOptions = {}) {
  const slider = createSlider(viewport, { ...LOOP, ...options })
  const stopCloning = renderClones(slider)
  onTestFinished(() => {
    stopCloning()
    slider.destroy()
  })
  return { slider, stopCloning }
}

// Three 300px slides in a 300px viewport: period 900, one copy each side, real set at 900..1500.
function mountThreeSlides(options: { dir?: 'ltr' | 'rtl' } = {}) {
  return mountViewport({ width: 300, slides: 3, perView: 1, gap: 0, ...options })
}

async function mountStartedLoop(options: SliderOptions = {}) {
  const viewport = mountThreeSlides()
  const { slider } = createLoop(viewport, options)
  await expect.poll(() => viewport.scrollLeft).toBe(900)
  return { viewport, slider }
}

function clones(viewport: HTMLElement): HTMLElement[] {
  return Array.from(viewport.querySelectorAll<HTMLElement>(':scope > [data-slider-clone]'))
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function pointer(type: 'pointerdown' | 'pointerup', target: EventTarget): void {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true }))
}

describe('loop', () => {
  test('renders one copy of the set on each side as hidden, inert clones', () => {
    const viewport = mountThreeSlides()
    const slider = createSlider(viewport, LOOP)
    onTestFinished(() => slider.destroy())
    expect(slider.getState().loopCopies).toBe(1)

    const stopCloning = renderClones(slider)
    onTestFinished(stopCloning)

    expect(viewport.children).toHaveLength(9)
    const markers = Array.from(viewport.children, (child) => child.getAttribute('data-slider-clone'))
    expect(markers).toEqual(['0', '1', '2', null, null, null, '0', '1', '2'])
    for (const clone of clones(viewport)) {
      expect(clone.getAttribute('aria-hidden')).toBe('true')
      expect(clone.hasAttribute('inert')).toBe(true)
    }
  })

  test('needs more copies when the set is short relative to the viewport', () => {
    const viewport = mountViewport({ width: 300, slides: [100, 100], gap: 0 })
    const { slider } = createLoop(viewport)

    expect(slider.getState().loopCopies).toBe(3)
  })

  test('starts on the first real slide, with both directions open', async () => {
    const { slider } = await mountStartedLoop()

    expect(slider.getState().index).toBe(0)
    expect(slider.getState().canPrev).toBe(true)
  })

  test('wraps forward through the clones and recentres at rest', async () => {
    const { viewport, slider } = await mountStartedLoop()
    slider.scrollTo(2)
    await expect.poll(() => viewport.scrollLeft, SETTLED).toBe(1500)

    slider.next()

    expect(viewport.scrollLeft).toBe(1800)
    await expect.poll(() => viewport.scrollLeft, SETTLED).toBe(900)
    expect(slider.getState().index).toBe(0)
  })

  test('wraps backward through the clones and recentres at rest', async () => {
    const { viewport, slider } = await mountStartedLoop()

    slider.prev()

    expect(viewport.scrollLeft).toBe(600)
    await expect.poll(() => viewport.scrollLeft, SETTLED).toBe(1500)
    expect(slider.getState().index).toBe(2)
  })

  test('recentres after native scrolling comes to rest on a clone', async () => {
    const { viewport, slider } = await mountStartedLoop()

    viewport.scrollTo({ left: 300, behavior: 'instant' })

    await expect.poll(() => viewport.scrollLeft, SETTLED).toBe(1200)
    expect(slider.getState().index).toBe(1)
  })

  test('does not recentre while a pointer is down', async () => {
    const { viewport } = await mountStartedLoop()
    pointer('pointerdown', viewport)

    viewport.scrollTo({ left: 300, behavior: 'instant' })
    await wait(300)
    expect(viewport.scrollLeft).toBe(300)

    pointer('pointerup', window)
    await expect.poll(() => viewport.scrollLeft, SETTLED).toBe(1200)
  })

  test('scrollTo takes the shorter way round', async () => {
    const { viewport, slider } = await mountStartedLoop()

    slider.scrollTo(2)

    expect(viewport.scrollLeft).toBe(600)
    await expect.poll(() => viewport.scrollLeft, SETTLED).toBe(1500)
  })

  test('scrollTo wraps out-of-range integers', async () => {
    const { slider } = await mountStartedLoop()

    slider.scrollTo(4)

    expect(slider.getState().index).toBe(1)
  })

  test('strips ids from clones and their descendants', () => {
    const viewport = mountThreeSlides()
    const first = viewport.children[0]
    first.id = 'a'
    const child = document.createElement('span')
    child.id = 'b'
    first.append(child)

    createLoop(viewport)

    for (const clone of clones(viewport)) {
      expect(clone.id).toBe('')
      expect(clone.querySelectorAll('[id]')).toHaveLength(0)
    }
    expect(document.querySelectorAll('#a')).toHaveLength(1)
    expect(document.querySelectorAll('#b')).toHaveLength(1)
  })

  test('gives clones the snap alignment of the slide they copy', async () => {
    const viewport = mountViewport({ width: 300, slides: 4, perView: 1, gap: 0 })
    createLoop(viewport, { slidesPerMove: 2 })

    await expect
      .poll(() => clones(viewport).map((clone) => clone.style.scrollSnapAlign))
      .toEqual(['start', 'none', 'start', 'none', 'start', 'none', 'start', 'none'])
  })

  test('falls back to edges once the clones are removed', async () => {
    const viewport = mountThreeSlides()
    const { slider, stopCloning } = createLoop(viewport)
    await expect.poll(() => viewport.scrollLeft).toBe(900)

    stopCloning()

    expect(clones(viewport)).toHaveLength(0)
    expect(slider.getState().loopCopies).toBe(1)
    await expect.poll(() => slider.getState().canPrev).toBe(false)
    expect(slider.getState().index).toBe(0)
  })

  test('renders nothing when loop is off', () => {
    const viewport = mountThreeSlides()
    const { slider } = createLoop(viewport, { loop: false })

    expect(slider.getState().loopCopies).toBe(0)
    expect(viewport.children).toHaveLength(3)
  })

  test('loops in a right-to-left viewport', async () => {
    const viewport = mountThreeSlides({ dir: 'rtl' })
    const { slider } = createLoop(viewport)
    await expect.poll(() => viewport.scrollLeft).toBe(-900)

    slider.prev()

    await expect.poll(() => viewport.scrollLeft, SETTLED).toBe(-1500)
    expect(slider.getState().index).toBe(2)
  })
})
