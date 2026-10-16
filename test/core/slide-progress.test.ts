import { describe, expect, onTestFinished, test } from 'vitest'
import {
  createSlider,
  renderClones,
  slideProgress,
  type SliderOptions,
} from '../../src/core'
import { mountViewport } from '../helpers/fixtures'

const INSTANT: SliderOptions = { animation: { type: 'instant' } }

function track(viewport: HTMLElement, options: SliderOptions = {}) {
  const slider = createSlider(viewport, { ...INSTANT, ...options })
  const stop = slideProgress(slider)
  onTestFinished(() => {
    stop()
    slider.destroy()
  })
  return stop
}

function progressOf(element: Element | undefined): string | undefined {
  if (!(element instanceof HTMLElement)) return undefined
  return element.style.getPropertyValue('--slide-progress')
}

function distanceOf(element: Element | undefined): string | undefined {
  if (!(element instanceof HTMLElement)) return undefined
  return element.style.getPropertyValue('--slide-distance')
}

// Five 300px slides in a 300px viewport: a slide every 300px.
function mountFiveSlides(options: { dir?: 'ltr' | 'rtl' } = {}) {
  return mountViewport({ width: 300, slides: 5, perView: 1, gap: 0, ...options })
}

describe('slideProgress', () => {
  test('counts slide steps from the aligned spot at rest', () => {
    const viewport = mountFiveSlides()
    track(viewport)

    const slides = Array.from(viewport.children)
    expect(slides.slice(0, 3).map(progressOf)).toEqual(['0', '1', '2'])
    expect(slides.slice(0, 3).map(distanceOf)).toEqual(['0', '1', '2'])
  })

  test('follows native scrolling between snaps', async () => {
    const viewport = mountFiveSlides()
    track(viewport)
    // Hold the position halfway between two snaps.
    viewport.style.scrollSnapType = 'none'

    viewport.scrollTo({ left: 150, behavior: 'instant' })

    await expect.poll(() => progressOf(viewport.children[0])).toBe('-0.5')
    expect(progressOf(viewport.children[1])).toBe('0.5')
    expect(distanceOf(viewport.children[0])).toBe('0.5')
    expect(distanceOf(viewport.children[1])).toBe('0.5')
  })

  test('measures from the centre with align center', async () => {
    // Five 200px slides in a 300px viewport: slide 1 is centred at scroll 150.
    const viewport = mountViewport({ width: 300, slides: [200, 200, 200, 200, 200], gap: 0 })
    track(viewport, { align: 'center' })

    viewport.scrollTo({ left: 150, behavior: 'instant' })

    await expect.poll(() => progressOf(viewport.children[1])).toBe('0')
    expect(progressOf(viewport.children[2])).toBe('1')
  })

  test('counts upcoming slides as positive in a right-to-left viewport', () => {
    const viewport = mountFiveSlides({ dir: 'rtl' })
    track(viewport)

    expect(progressOf(viewport.children[1])).toBe('1')
  })

  test('gives clones values too', async () => {
    // Three 300px slides, one copy each side: the real set starts at 900.
    const viewport = mountViewport({ width: 300, slides: 3, perView: 1, gap: 0 })
    const slider = createSlider(viewport, { ...INSTANT, loop: true })
    const stopCloning = renderClones(slider)
    const stop = slideProgress(slider)
    onTestFinished(() => {
      stop()
      stopCloning()
      slider.destroy()
    })
    await expect.poll(() => viewport.scrollLeft).toBe(900)

    const beforeFirst = viewport.children[2]
    expect(beforeFirst.getAttribute('data-slider-clone')).toBe('2')
    await expect.poll(() => progressOf(beforeFirst)).toBe('-1')
  })

  test('follows the loop recentring jump', async () => {
    // Three 300px slides, one copy each side: the real set spans 900–1800.
    const viewport = mountViewport({ width: 300, slides: 3, perView: 1, gap: 0 })
    const slider = createSlider(viewport, { ...INSTANT, loop: true })
    const stopCloning = renderClones(slider)
    const stop = slideProgress(slider)
    onTestFinished(() => {
      stop()
      stopCloning()
      slider.destroy()
    })
    await expect.poll(() => viewport.scrollLeft).toBe(900)
    slider.scrollTo(2)
    await expect.poll(() => viewport.scrollLeft).toBe(1500)

    // Lands on the clone after the last slide at 1800, then jumps one period back to 900.
    slider.next()
    await expect.poll(() => viewport.scrollLeft).toBe(900)

    const firstReal = viewport.children[3]
    expect(firstReal.hasAttribute('data-slider-clone')).toBe(false)
    await expect.poll(() => progressOf(firstReal)).toBe('0')
    expect(progressOf(viewport.children[4])).toBe('1')
    expect(progressOf(viewport.children[6])).toBe('3')
  })

  test('cleanup removes both properties', () => {
    const viewport = mountFiveSlides()
    const stop = track(viewport)

    stop()

    for (const slide of viewport.children) {
      expect(progressOf(slide)).toBe('')
      expect(distanceOf(slide)).toBe('')
    }
  })
})
