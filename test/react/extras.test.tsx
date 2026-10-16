/// <reference types="@vitest/browser-playwright" />
import '../../src/styles.css'
import { Component, type ReactNode } from 'react'
import { beforeEach, describe, expect, onTestFinished, test, vi } from 'vitest'
import { cdp } from 'vitest/browser'
import { render } from 'vitest-browser-react'
import { Slider, type SliderProps } from '../../src/react'

type SlidesProps = Omit<SliderProps, 'children'> & { count?: number }

// Three 300px slides in a 300px root: snaps at 0, 300, 600.
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
      <Slider.Dots />
      <Slider.AutoplayToggle />
    </Slider>
  )
}

// Four slides with a thumbnail strip and no dots, so "Go to slide n" names one thumbnail.
function Gallery({ thumbsPerView = 4 }: { thumbsPerView?: number | 'auto' }) {
  return (
    <Slider style={{ width: 300 }} animation={{ type: 'instant' }}>
      <Slider.Viewport>
        {[1, 2, 3, 4].map((n) => (
          <Slider.Slide key={n} style={{ height: 100 }}>
            Slide {n}
          </Slider.Slide>
        ))}
      </Slider.Viewport>
      <Slider.Next />
      <Slider.Thumbs perView={thumbsPerView}>
        {[1, 2, 3, 4].map((n) => (
          <Slider.Thumb key={n} style={{ width: 50, height: 40 }}>
            {n}
          </Slider.Thumb>
        ))}
      </Slider.Thumbs>
    </Slider>
  )
}

function element(selector: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(selector)
  if (!found) throw new Error(`${selector} is not rendered`)
  return found
}

function thumbElements(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-slider-thumb]'))
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Every index reported over 150ms: several 40ms delays, so a running autoplay moves. */
async function movesOverQuietPeriod(moves: number[]): Promise<number[]> {
  const before = moves.length
  await wait(150)
  return moves.slice(before)
}

// A click leaves the pointer over the slider and focus inside it, each of which only pauses.
function releaseSlider(): void {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  element('[data-slider]').dispatchEvent(new PointerEvent('pointerleave'))
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    const { error } = this.state
    return error ? <p role="alert">{String(error)}</p> : this.props.children
  }
}

// React logs every error an error boundary catches.
function silenceCaughtErrorLog() {
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  onTestFinished(() => log.mockRestore())
}

describe('autoplay prop', () => {
  // Each slider renders at the top left, where a cursor left by an earlier click would hover it
  // and pause it; park the cursor at the opposite corner.
  beforeEach(async () => {
    await cdp().send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: window.innerWidth - 1,
      y: window.innerHeight - 1,
    })
  })

  test('advances on its own', async () => {
    const screen = await render(<Slides autoplay={{ delay: 40 }} />)

    await expect
      .element(screen.getByRole('button', { name: 'Go to slide 2' }))
      .toHaveAttribute('aria-current', 'true')
  })

  test('AutoplayToggle stops and restarts it', async () => {
    const moves: number[] = []
    const screen = await render(
      <Slides autoplay={{ delay: 40 }} onIndexChange={(index) => moves.push(index)} />
    )
    const pause = screen.getByRole('button', { name: 'Stop automatic slide show' })
    await expect.element(pause).toHaveTextContent('Pause')

    await pause.click()
    releaseSlider()

    const play = screen.getByRole('button', { name: 'Start automatic slide show' })
    await expect.element(play).toHaveTextContent('Play')
    expect(await movesOverQuietPeriod(moves)).toEqual([])

    await play.click()
    releaseSlider()

    await expect
      .element(screen.getByRole('button', { name: 'Stop automatic slide show' }))
      .toHaveTextContent('Pause')
    const stopped = moves.length
    await expect.poll(() => moves.length).toBeGreaterThan(stopped)
  })

  test('hovering the Slider root, not only the viewport, pauses it', async () => {
    const moves: number[] = []
    await render(<Slides autoplay={{ delay: 40 }} onIndexChange={(index) => moves.push(index)} />)
    await expect.poll(() => moves.length).toBeGreaterThan(0)
    const root = element('[data-slider]')

    root.dispatchEvent(new PointerEvent('pointerenter'))
    expect(await movesOverQuietPeriod(moves)).toEqual([])

    root.dispatchEvent(new PointerEvent('pointerleave'))
    const paused = moves.length
    await expect.poll(() => moves.length).toBeGreaterThan(paused)
  })

  test('AutoplayToggle renders nothing without autoplay', async () => {
    const screen = await render(<Slides />)
    await expect.poll(() => document.querySelectorAll('[data-slider-dot]').length).toBe(3)

    await expect
      .element(screen.getByRole('button', { name: /automatic slide show/ }))
      .not.toBeInTheDocument()
  })

  test('unmounting while it runs reports no error afterwards', async () => {
    const errors: unknown[] = []
    const record = (event: ErrorEvent) => errors.push(event.error)
    window.addEventListener('error', record)
    onTestFinished(() => window.removeEventListener('error', record))

    const screen = await render(<Slides autoplay={{ delay: 40 }} />)
    await expect
      .element(screen.getByRole('button', { name: 'Stop automatic slide show' }))
      .toBeVisible()

    await screen.unmount()
    await wait(150)

    expect(errors).toEqual([])
  })
})

describe('slideProgress prop', () => {
  test('writes --slide-progress on the slides until it is removed', async () => {
    const screen = await render(<Slides slideProgress />)
    const second = () => document.querySelectorAll<HTMLElement>('[data-slider-slide]')[1]

    await expect.poll(() => second().style.getPropertyValue('--slide-progress')).toBe('1')

    await screen.rerender(<Slides />)

    await expect.poll(() => second().style.getPropertyValue('--slide-progress')).toBe('')
  })
})

describe('Slider.Thumbs', () => {
  test('clicking a thumbnail moves the slider and marks that thumbnail current', async () => {
    const screen = await render(<Gallery />)
    await expect.poll(() => thumbElements()[0]?.getAttribute('aria-current')).toBe('true')

    await screen.getByRole('button', { name: 'Go to slide 3' }).click()

    await expect.poll(() => element('[data-slider-viewport]').scrollLeft).toBe(600)
    await expect
      .element(screen.getByRole('button', { name: 'Go to slide 3' }))
      .toHaveAttribute('aria-current', 'true')
  })

  test('the current thumbnail follows the slider', async () => {
    const screen = await render(<Gallery />)
    await expect.poll(() => thumbElements()[0]?.getAttribute('aria-current')).toBe('true')

    await screen.getByRole('button', { name: 'Next slide' }).click()

    await expect.poll(() => thumbElements()[1].getAttribute('aria-current')).toBe('true')
    expect(thumbElements()[0].hasAttribute('aria-current')).toBe(false)
  })

  test("perView 'auto' sizes thumbnails by content, not by the slider's perView", async () => {
    await render(<Gallery thumbsPerView="auto" />)

    expect(thumbElements().map((thumb) => thumb.offsetWidth)).toEqual([50, 50, 50, 50])
  })

  test('Slider.Thumb outside Slider.Thumbs throws', async () => {
    silenceCaughtErrorLog()
    const screen = await render(
      <ErrorBoundary>
        <Slider>
          <Slider.Thumb />
        </Slider>
      </ErrorBoundary>
    )

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('Error: <Slider.Thumb> must be rendered inside <Slider.Thumbs>')
  })
})
