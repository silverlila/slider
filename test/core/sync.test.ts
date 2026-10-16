import { describe, expect, onTestFinished, test } from 'vitest'
import { createSlider, syncSliders, type Slider, type SliderOptions } from '../../src/core'
import { mountViewport } from '../helpers/fixtures'

const INSTANT: SliderOptions = { animation: { type: 'instant' } }

function create(viewport: HTMLElement): Slider {
  const slider = createSlider(viewport, INSTANT)
  onTestFinished(() => slider.destroy())
  return slider
}

// Main: five 300px slides in a 300px viewport. Thumbs: five 100px slides in a 300px viewport,
// scroll range 0..200, so thumb snaps are 0, 100 and 200.
function mountGallery() {
  const main = create(mountViewport({ width: 300, slides: 5, perView: 1, gap: 0 }))
  const thumbs = create(mountViewport({ width: 300, slides: [100, 100, 100, 100, 100], gap: 0 }))
  const stop = syncSliders(main, thumbs)
  onTestFinished(stop)
  return { main, thumbs, stop }
}

function selectedThumbs(thumbs: Slider): number[] {
  return Array.from(thumbs.viewport.children).flatMap((thumb, i) =>
    thumb.getAttribute('aria-current') === 'true' || thumb.hasAttribute('data-selected') ? [i] : []
  )
}

describe('syncSliders', () => {
  test('marks the thumb matching the main index and scrolls the thumbs to it', async () => {
    const { main, thumbs } = mountGallery()

    main.scrollTo(3)

    const thumb = thumbs.viewport.children[3]
    expect(thumb.getAttribute('aria-current')).toBe('true')
    expect(thumb.hasAttribute('data-selected')).toBe(true)
    expect(selectedThumbs(thumbs)).toEqual([3])
    await expect.poll(() => thumbs.viewport.scrollLeft).toBe(200)
  })

  test('clicking a thumb moves the main slider', () => {
    const { main, thumbs } = mountGallery()

    thumbs.viewport.children[2].dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(main.getState().index).toBe(2)
  })

  test('cleanup removes the marks and stops following clicks', () => {
    const { main, thumbs, stop } = mountGallery()

    stop()
    thumbs.viewport.children[2].dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(selectedThumbs(thumbs)).toEqual([])
    expect(main.getState().index).toBe(0)
  })
})
