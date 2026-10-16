import { describe, expect, onTestFinished, test } from 'vitest'
import {
  autoplay,
  createSlider,
  type AutoplayOptions,
  type Slider,
  type SliderOptions,
} from '../../src/core'
import { mount } from '../helpers/dom'
import { mountViewport } from '../helpers/fixtures'
import { emulateReducedMotion } from '../helpers/media'

const INSTANT: SliderOptions = { animation: { type: 'instant' } }
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Every index the slider moves to over 150ms: several 40ms delays, so a running autoplay moves. */
async function movesOverQuietPeriod(slider: Slider): Promise<number[]> {
  const moves: number[] = []
  let last = slider.getState().index
  const unsubscribe = slider.subscribe(({ index }) => {
    if (index === last) return
    last = index
    moves.push(index)
  })
  await wait(150)
  unsubscribe()
  return moves
}

// Three 300px slides in a 300px viewport: snaps at 0, 300, 600.
function mountThreeSlides() {
  return mountViewport({ width: 300, slides: 3, perView: 1, gap: 0 })
}

function create(
  viewport: HTMLElement,
  options: AutoplayOptions = {},
  sliderOptions: SliderOptions = {}
) {
  const slider = createSlider(viewport, { ...INSTANT, ...sliderOptions })
  const player = autoplay(slider, { delay: 40, ...options })
  onTestFinished(() => {
    player.destroy()
    slider.destroy()
  })
  return { slider, player }
}

function setVisibility(value: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('autoplay', () => {
  test('advances one snap every delay', async () => {
    const { slider } = create(mountThreeSlides())

    await expect.poll(() => slider.getState().index).toBe(1)
    await expect.poll(() => slider.getState().index).toBe(2)
  })

  test('returns to the start at the last snap without loop or rewind', async () => {
    const { slider } = create(mountThreeSlides(), {}, { startIndex: 2 })

    await expect.poll(() => slider.getState().index).toBe(0)
  })

  test('pauses while the pointer is over the viewport', async () => {
    const viewport = mountThreeSlides()
    const { slider } = create(viewport)

    viewport.dispatchEvent(new PointerEvent('pointerenter'))
    expect(await movesOverQuietPeriod(slider)).toEqual([])

    viewport.dispatchEvent(new PointerEvent('pointerleave'))
    await expect.poll(() => slider.getState().index).toBe(1)
  })

  test('pauses while focus is inside the root', async () => {
    const viewport = mountThreeSlides()
    const root = mount(document.createElement('div'))
    const button = document.createElement('button')
    root.append(button, viewport)
    const { slider } = create(viewport, { root })

    button.focus()
    expect(await movesOverQuietPeriod(slider)).toEqual([])

    button.blur()
    await expect.poll(() => slider.getState().index).toBe(1)
  })

  test('pauses while the tab is hidden', async () => {
    onTestFinished(() => {
      Reflect.deleteProperty(document, 'visibilityState')
    })
    const { slider } = create(mountThreeSlides())

    setVisibility('hidden')
    expect(await movesOverQuietPeriod(slider)).toEqual([])

    setVisibility('visible')
    await expect.poll(() => slider.getState().index).toBe(1)
  })

  test('stops for good when the user presses on the viewport', async () => {
    const viewport = mountThreeSlides()
    const { slider, player } = create(viewport)
    const calls: boolean[] = []
    player.subscribe((playing) => calls.push(playing))

    viewport.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    window.dispatchEvent(new PointerEvent('pointerup'))

    expect(player.isPlaying()).toBe(false)
    expect(calls).toEqual([false])
    expect(await movesOverQuietPeriod(slider)).toEqual([])
  })

  test('without stopOnInteraction, pauses only while a pointer is pressed', async () => {
    const viewport = mountThreeSlides()
    const { slider, player } = create(viewport, { stopOnInteraction: false })

    viewport.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(await movesOverQuietPeriod(slider)).toEqual([])
    expect(player.isPlaying()).toBe(true)

    window.dispatchEvent(new PointerEvent('pointerup'))
    await expect.poll(() => slider.getState().index).toBe(1)
  })

  test('starts stopped under reduced motion, and play() overrides it', async () => {
    await emulateReducedMotion()
    const { slider, player } = create(mountThreeSlides())

    expect(player.isPlaying()).toBe(false)
    expect(await movesOverQuietPeriod(slider)).toEqual([])

    player.play()
    expect(player.isPlaying()).toBe(true)
    await expect.poll(() => slider.getState().index).toBe(1)
  })

  test('a manual move restarts the countdown', async () => {
    const { slider } = create(mountThreeSlides(), { delay: 200 })

    await wait(150)
    slider.next()
    await wait(150)

    expect(slider.getState().index).toBe(1)
  })

  test('rejects a delay that is not positive', () => {
    const slider = createSlider(mountThreeSlides(), INSTANT)
    onTestFinished(() => slider.destroy())

    expect(() => autoplay(slider, { delay: 0 })).toThrow(RangeError)
  })

  test('throws once destroyed', () => {
    const { player } = create(mountThreeSlides())

    player.destroy()

    expect(() => player.play()).toThrow('Autoplay was destroyed')
  })
})
