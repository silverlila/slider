/**
 * use-scroller's `observeScroll` reports the viewport at rest only 120ms (its default
 * `idleDelay`) after the last scroll event, and a programmatic jump fires a scroll event too.
 * Loop recentring lags by that much.
 */
import '../../src/styles.css'
import { StrictMode, useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import type { Slider as Engine } from '../../src/core'
import {
  Slider,
  useSlider,
  useSliderContext,
  useSliderState,
  type SliderProps,
} from '../../src/react'
import { wait } from '../helpers/dom'
import { ErrorBoundary, silenceCaughtErrorLog } from '../helpers/react'

type SlidesProps = Omit<SliderProps, 'children'> & { count?: number }

function Slides({ count = 3, ...props }: SlidesProps) {
  return (
    <Slider style={{ width: 300 }} animation={{ type: 'instant' }} {...props}>
      <Slider.Viewport>
        {Array.from({ length: count }, (_, i) => (
          <Slider.Slide key={i} style={{ height: 100 }}>
            Slide {i + 1}
          </Slider.Slide>
        ))}
      </Slider.Viewport>
      <Slider.Prev />
      <Slider.Next />
      <Slider.Dots />
    </Slider>
  )
}

function viewportElement(): HTMLElement {
  const viewport = document.querySelector<HTMLElement>('[data-slider-viewport]')
  if (!viewport) throw new Error('viewport is not rendered')
  return viewport
}

function slideElements(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-slider-slide]'))
}

describe('Slider', () => {
  test('renders a labelled carousel region', async () => {
    const screen = await render(<Slides label="Featured" />)

    const region = screen.getByRole('region', { name: 'Featured' })
    await expect.element(region).toHaveAttribute('aria-roledescription', 'carousel')
  })

  test('labels each slide with its position', async () => {
    const screen = await render(<Slides />)

    for (const name of ['1 of 3', '2 of 3', '3 of 3']) {
      await expect
        .element(screen.getByRole('group', { name }))
        .toHaveAttribute('aria-roledescription', 'slide')
    }
  })

  test('Next moves one slide and the controls follow', async () => {
    const screen = await render(<Slides />)
    const prev = screen.getByRole('button', { name: 'Previous slide' })
    const next = screen.getByRole('button', { name: 'Next slide' })
    await expect.element(next).toBeEnabled()
    await expect.element(prev).toBeDisabled()

    await next.click()

    await expect.poll(() => viewportElement().scrollLeft).toBe(300)
    await expect.element(prev).toBeEnabled()
    await expect
      .element(screen.getByRole('button', { name: 'Go to slide 2' }))
      .toHaveAttribute('aria-current', 'true')
  })

  test('Next is disabled on the last slide unless rewind is on', async () => {
    const screen = await render(<Slides defaultIndex={2} />)
    await expect.element(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled()

    await screen.rerender(<Slides defaultIndex={2} rewind />)

    await expect.element(screen.getByRole('button', { name: 'Next slide' })).toBeEnabled()
  })

  test('renders one dot per snap and a dot scrolls to its snap', async () => {
    const screen = await render(<Slides />)
    await expect.poll(() => document.querySelectorAll('[data-slider-dot]').length).toBe(3)

    await screen.getByRole('button', { name: 'Go to slide 3' }).click()

    await expect.poll(() => viewportElement().scrollLeft).toBe(600)
  })

  test('sizes slides from perView and gap', async () => {
    await render(<Slides count={10} perView={3} gap={10} style={{ width: 320 }} />)

    expect(slideElements().map((slide) => slide.offsetWidth)).toEqual(Array(10).fill(100))
  })

  test('starts on defaultIndex when uncontrolled', async () => {
    await render(<Slides defaultIndex={2} />)

    await expect.poll(() => viewportElement().scrollLeft).toBe(600)
  })

  test('controlled: reports moves through onIndexChange and follows the index prop', async () => {
    function Controlled() {
      const [index, setIndex] = useState(0)
      return (
        <>
          <Slides index={index} onIndexChange={setIndex} />
          <output aria-label="index">{index}</output>
          <button type="button" onClick={() => setIndex(2)}>
            Show third
          </button>
        </>
      )
    }
    const screen = await render(<Controlled />)

    await screen.getByRole('button', { name: 'Next slide' }).click()
    await expect.element(screen.getByLabelText('index')).toHaveTextContent('1')

    await screen.getByRole('button', { name: 'Show third' }).click()
    await expect.poll(() => viewportElement().scrollLeft).toBe(600)
  })

  test('onIndexChange is not called on mount and once per navigation', async () => {
    const onIndexChange = vi.fn()
    const screen = await render(
      <Slides onIndexChange={onIndexChange} animation={{ type: 'tween', duration: 150 }} />
    )
    const next = screen.getByRole('button', { name: 'Next slide' })
    await expect.element(next).toBeEnabled()
    expect(onIndexChange).not.toHaveBeenCalled()

    await next.click()
    await expect.poll(() => viewportElement().scrollLeft).toBe(300)
    expect(onIndexChange.mock.calls).toEqual([[1]])

    await next.click()
    await expect.poll(() => viewportElement().scrollLeft).toBe(600)
    expect(onIndexChange.mock.calls).toEqual([[1], [2]])
  })

  test('loop: renders hidden, inert clones and wraps backward', async () => {
    const screen = await render(<Slides loop />)
    await expect.poll(() => slideElements().length).toBe(9)
    const clones = slideElements().filter((slide) => slide.hasAttribute('data-slider-clone'))
    expect(clones).toHaveLength(6)
    for (const clone of clones) {
      expect(clone.getAttribute('aria-hidden')).toBe('true')
      expect(clone.hasAttribute('inert')).toBe(true)
    }
    await expect.poll(() => viewportElement().scrollLeft).toBe(900)
    const prev = screen.getByRole('button', { name: 'Previous slide' })
    await expect.element(prev).toBeEnabled()

    await prev.click()

    await expect.poll(() => viewportElement().scrollLeft, { timeout: 1000 }).toBe(1500)
  })

  test('loop clones are React-rendered: their controls are inert, the real ones work', async () => {
    function Liked() {
      const [likes, setLikes] = useState(0)
      return (
        <button type="button" onClick={() => setLikes(likes + 1)}>
          Likes {likes}
        </button>
      )
    }
    const screen = await render(
      <Slider loop style={{ width: 300 }} animation={{ type: 'instant' }}>
        <Slider.Viewport>
          {[1, 2, 3].map((n) => (
            <Slider.Slide key={n} style={{ height: 100 }}>
              {n === 1 ? <Liked /> : `Slide ${n}`}
            </Slider.Slide>
          ))}
        </Slider.Viewport>
      </Slider>
    )
    await expect.poll(() => document.querySelectorAll('[data-slider-clone] button').length).toBe(2)
    const cloneButton = document.querySelector<HTMLButtonElement>('[data-slider-clone] button')
    if (!cloneButton) throw new Error('clone button is not rendered')

    cloneButton.focus()
    expect(document.activeElement).not.toBe(cloneButton)

    await screen.getByRole('button', { name: 'Likes 0' }).click()
    await expect.element(screen.getByRole('button', { name: 'Likes 1' })).toBeVisible()
  })

  test('useSlider drives markup built by hand', async () => {
    function Headless() {
      const { viewportRef, canNext, next, index } = useSlider({ animation: { type: 'instant' } })
      return (
        <div>
          <div ref={viewportRef} data-slider-viewport="" style={{ width: 300 }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ width: 300, height: 100 }}>
                {n}
              </div>
            ))}
          </div>
          <button type="button" disabled={!canNext} onClick={() => next()}>
            Forward
          </button>
          <output aria-label="index">{index}</output>
        </div>
      )
    }
    const screen = await render(<Headless />)
    const forward = screen.getByRole('button', { name: 'Forward' })
    await expect.element(forward).toBeEnabled()

    await forward.click()

    await expect.poll(() => viewportElement().scrollLeft).toBe(300)
    await expect.element(screen.getByLabelText('index')).toHaveTextContent('1')
  })

  test('a new inline animation object keeps the same engine', async () => {
    const engines = new Set<Engine>()
    function Probe() {
      const { viewportRef, slider, next } = useSlider({ animation: { type: 'instant' } })
      if (slider) engines.add(slider)
      return (
        <div>
          <div ref={viewportRef} data-slider-viewport="" style={{ width: 300 }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ width: 300, height: 100 }} />
            ))}
          </div>
          <button type="button" onClick={() => next()}>
            Forward
          </button>
        </div>
      )
    }
    const screen = await render(<Probe />)
    await screen.getByRole('button', { name: 'Forward' }).click()
    await expect.poll(() => viewportElement().scrollLeft).toBe(300)

    await screen.rerender(<Probe />)
    await wait(50)

    expect(engines.size).toBe(1)
    expect(viewportElement().scrollLeft).toBe(300)
  })

  test('re-creating the engine keeps the current slide and retires the old engine', async () => {
    const onIndexChange = vi.fn()
    const screen = await render(<Slides onIndexChange={onIndexChange} />)
    const next = screen.getByRole('button', { name: 'Next slide' })
    await next.click()
    await expect.poll(() => viewportElement().scrollLeft).toBe(300)

    await screen.rerender(<Slides onIndexChange={onIndexChange} rewind />)
    await wait(50)

    expect(viewportElement().scrollLeft).toBe(300)
    await expect
      .element(screen.getByRole('button', { name: 'Go to slide 2' }))
      .toHaveAttribute('aria-current', 'true')

    await next.click()
    await expect.poll(() => viewportElement().scrollLeft).toBe(600)
    await wait(200)
    expect(onIndexChange.mock.calls).toEqual([[1], [2]])
  })

  test('useSliderState follows progress through native scrolling', async () => {
    function Progress() {
      const { viewportRef, slider } = useSlider()
      const progress = useSliderState(slider, (state) => state.progress)
      return (
        <div>
          <div ref={viewportRef} data-slider-viewport="" style={{ width: 300 }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ width: 300, height: 100 }} />
            ))}
          </div>
          <output aria-label="progress">{progress}</output>
        </div>
      )
    }
    const screen = await render(<Progress />)
    await expect.element(screen.getByLabelText('progress')).toHaveTextContent('0')

    viewportElement().scrollTo({ left: 300, behavior: 'instant' })

    await expect.element(screen.getByLabelText('progress')).toHaveTextContent('0.5')
  })

  test('Slider.Slide outside a Viewport throws', async () => {
    silenceCaughtErrorLog()
    const screen = await render(
      <ErrorBoundary>
        <Slider>
          <Slider.Slide />
        </Slider>
      </ErrorBoundary>
    )

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('Error: <Slider.Slide> must be rendered inside <Slider.Viewport>')
  })

  test('useSliderContext outside a Slider throws', async () => {
    silenceCaughtErrorLog()
    function Orphan() {
      useSliderContext()
      return null
    }
    const screen = await render(
      <ErrorBoundary>
        <Orphan />
      </ErrorBoundary>
    )

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('Error: Slider components must be used inside <Slider>')
  })

  test('StrictMode leaves exactly one engine', async () => {
    const onIndexChange = vi.fn()
    const screen = await render(<Slides onIndexChange={onIndexChange} />, { wrapper: StrictMode })
    const next = screen.getByRole('button', { name: 'Next slide' })
    await expect.element(next).toBeEnabled()

    await next.click()
    await expect.poll(() => viewportElement().scrollLeft).toBe(300)
    await wait(200)

    expect(viewportElement().scrollLeft).toBe(300)
    expect(onIndexChange.mock.calls).toEqual([[1]])
  })
})
