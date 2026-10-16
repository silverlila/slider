/**
 * use-scroller's `observeScroll` reports the viewport at rest only 120ms (its default
 * `idleDelay`) after the last scroll event, and a programmatic jump fires a scroll event too.
 * The engine re-anchors after a resize only at rest, so resize tests wait that long first.
 *
 * A use-scroller `animateScroll` spring, such as a drag release, holds snapping off with its own
 * inline `scroll-snap-type` while it runs.
 */
import { animateScroll } from 'use-scroller/core'
import { describe, expect, onTestFinished, test } from 'vitest'
import { createSlider, type SliderOptions, type SliderState } from '../../src/core'
import { nextFrame } from '../helpers/dom'
import { createSlide, mountViewport } from '../helpers/fixtures'

const INSTANT: SliderOptions = { animation: { type: 'instant' } }

function create(viewport: HTMLElement, options: SliderOptions = {}) {
  const slider = createSlider(viewport, { ...INSTANT, ...options })
  onTestFinished(() => slider.destroy())
  return slider
}

function scrollIdle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 200))
}

function mountFiveSlides(options: { dir?: 'ltr' | 'rtl' } = {}) {
  return mountViewport({ width: 300, slides: 5, perView: 1, gap: 0, ...options })
}

function mountTenSlidesThreePerView() {
  return mountViewport({ width: 320, slides: 10, perView: 3, gap: 10 })
}

describe('createSlider', () => {
  test('derives one snap per slide', () => {
    const slider = create(mountFiveSlides())

    expect(slider.getState()).toEqual({
      index: 0,
      snapCount: 5,
      slideCount: 5,
      canPrev: false,
      canNext: true,
      progress: 0,
      loopCopies: 0,
    })
  })

  test('follows native scrolling with index and progress', async () => {
    const viewport = mountFiveSlides()
    const slider = create(viewport)

    viewport.scrollTo({ left: 600, behavior: 'instant' })

    await expect.poll(() => slider.getState().index).toBe(2)
    expect(slider.getState().progress).toBe(0.5)
  })

  test('moves with next, prev and scrollTo, and stops at the edges', () => {
    const viewport = mountFiveSlides()
    const slider = create(viewport)

    slider.next()
    expect(viewport.scrollLeft).toBe(300)
    expect(slider.getState().index).toBe(1)

    slider.scrollTo(4)
    expect(viewport.scrollLeft).toBe(1200)
    expect(slider.getState().canNext).toBe(false)

    slider.next()
    expect(viewport.scrollLeft).toBe(1200)
    expect(slider.getState().index).toBe(4)

    slider.prev()
    expect(viewport.scrollLeft).toBe(900)
  })

  test('builds rapid next calls on the pending target', async () => {
    const viewport = mountFiveSlides()
    const slider = create(viewport, { animation: { type: 'tween' } })

    slider.next()
    slider.next()
    slider.next()

    expect(slider.getState().index).toBe(3)
    await expect.poll(() => viewport.scrollLeft).toBe(900)
  })

  test('restores snapping after navigating over a running scroll animation', async () => {
    const viewport = mountFiveSlides()
    const slider = create(viewport, { animation: { type: 'tween', duration: 100 } })
    animateScroll(viewport, { x: 600 }, { animation: { type: 'spring' }, respectReducedMotion: false })

    slider.next()

    await expect.poll(() => viewport.scrollLeft).toBe(300)
    await nextFrame()
    expect(viewport.style.scrollSnapType).toBe('')
    expect(getComputedStyle(viewport).scrollSnapType).toBe('x mandatory')
  })

  test('wraps across the slides with rewind', () => {
    const viewport = mountFiveSlides()
    const slider = create(viewport, { rewind: true })

    slider.scrollTo(4)
    expect(slider.getState().canNext).toBe(true)
    slider.next()
    expect(viewport.scrollLeft).toBe(0)
    expect(slider.getState().canPrev).toBe(true)

    slider.prev()
    expect(viewport.scrollLeft).toBe(1200)
  })

  test('merges snaps clamped at the end of the scroll range', () => {
    const viewport = mountTenSlidesThreePerView()
    const slider = create(viewport)

    expect(slider.getState().snapCount).toBe(8)
    slider.scrollTo(7)
    expect(viewport.scrollLeft).toBe(770)
  })

  test("moves by as many slides as fit with slidesPerMove: 'auto'", () => {
    const viewport = mountTenSlidesThreePerView()
    const slider = create(viewport, { slidesPerMove: 'auto' })

    expect(slider.getState().snapCount).toBe(4)
    slider.next()
    expect(viewport.scrollLeft).toBe(330)
    slider.next()
    expect(viewport.scrollLeft).toBe(660)
    slider.next()
    expect(viewport.scrollLeft).toBe(770)
  })

  test('moves by groups with a numeric slidesPerMove', () => {
    const viewport = mountViewport({ width: 300, slides: 6, perView: 1 })
    const slider = create(viewport, { slidesPerMove: 2 })

    expect(slider.getState().snapCount).toBe(3)
    slider.next()
    expect(viewport.scrollLeft).toBe(600)
  })

  test('writes inline scroll-snap-align on anchors only, and removes it on destroy', () => {
    const viewport = mountViewport({ width: 300, slides: 6, perView: 1 })
    const slider = create(viewport, { slidesPerMove: 2 })
    const slides = viewport.querySelectorAll<HTMLElement>(':scope > *')
    const aligns = () => Array.from(slides, (slide) => slide.style.scrollSnapAlign)

    expect(aligns()).toEqual(['start', 'none', 'start', 'none', 'start', 'none'])
    slider.destroy()
    expect(aligns()).toEqual(['', '', '', '', '', ''])
  })

  test("centres slides with align: 'center'", () => {
    const viewport = mountViewport({ width: 300, slides: [200, 200, 200, 200, 200] })
    const slider = create(viewport, { align: 'center' })

    expect(slider.getState().snapCount).toBe(5)
    slider.scrollTo(1)
    expect(viewport.scrollLeft).toBe(150)
    slider.scrollTo(0)
    expect(viewport.scrollLeft).toBe(0)
  })

  test('starts at startIndex, clamped into range', () => {
    const first = mountFiveSlides()
    create(first, { startIndex: 3 })
    expect(first.scrollLeft).toBe(900)

    const second = mountFiveSlides()
    create(second, { startIndex: 99 })
    expect(second.scrollLeft).toBe(1200)
  })

  test('navigates vertically on the y axis', () => {
    const viewport = mountViewport({ width: 300, height: 200, slides: 4, perView: 1, axis: 'y' })
    const slider = create(viewport, { axis: 'y' })

    slider.next()
    expect(viewport.scrollTop).toBe(200)
  })

  describe('in a right-to-left viewport', () => {
    test('moves next into negative scroll positions', () => {
      const viewport = mountFiveSlides({ dir: 'rtl' })
      const slider = create(viewport)

      slider.next()
      expect(viewport.scrollLeft).toBe(-300)
      expect(slider.getState().index).toBe(1)
    })

    test('reports progress along the reversed range', async () => {
      const viewport = mountFiveSlides({ dir: 'rtl' })
      const slider = create(viewport)

      slider.scrollTo(1)

      await expect.poll(() => slider.getState().progress).toBe(0.25)
    })
  })

  test('keeps the current slide in place when the viewport resizes', async () => {
    const viewport = mountFiveSlides()
    const slider = create(viewport)

    slider.scrollTo(2)
    await scrollIdle()
    viewport.style.width = '400px'

    await expect.poll(() => viewport.scrollLeft).toBe(800)
    expect(slider.getState().index).toBe(2)
  })

  test('re-measures when a slide is inserted', async () => {
    const viewport = mountFiveSlides()
    const slider = create(viewport)

    viewport.append(createSlide())

    await expect.poll(() => slider.getState().snapCount).toBe(6)
  })

  test('notifies subscribers on change only, until they unsubscribe', async () => {
    const slider = create(mountFiveSlides())
    const calls: SliderState[] = []
    const unsubscribe = slider.subscribe((state) => calls.push(state))
    expect(calls).toEqual([])

    slider.next()
    await nextFrame()
    await nextFrame()
    expect(calls.map((state) => state.index)).toEqual([1])

    unsubscribe()
    slider.next()
    await nextFrame()
    expect(calls).toHaveLength(1)
  })

  test('rejects invalid options and use after destroy', () => {
    const viewport = mountFiveSlides()
    expect(() => createSlider(viewport, { slidesPerMove: 0 })).toThrow(RangeError)
    expect(() => createSlider(viewport, { slidesPerMove: 1.5 })).toThrow(RangeError)

    const slider = create(viewport)
    expect(() => slider.scrollTo(1.5)).toThrow(RangeError)

    slider.destroy()
    expect(() => slider.getState()).toThrow('Slider was destroyed')
    expect(() => slider.subscribe(() => {})).toThrow('Slider was destroyed')
    expect(() => slider.next()).toThrow('Slider was destroyed')
    expect(() => slider.prev()).toThrow('Slider was destroyed')
    expect(() => slider.scrollTo(0)).toThrow('Slider was destroyed')
    expect(() => slider.destroy()).not.toThrow()

    const unpositioned = mountFiveSlides()
    unpositioned.style.position = 'static'
    expect(() => createSlider(unpositioned)).toThrow('Slider viewport must be positioned')
  })

  test('takes over touch gestures only when draggable', () => {
    const draggable = mountFiveSlides()
    create(draggable, { draggable: true })
    expect(draggable.style.touchAction).toBe('pan-y pinch-zoom')

    const fixed = mountFiveSlides()
    create(fixed, { draggable: false })
    expect(fixed.style.touchAction).toBe('')
  })
})
