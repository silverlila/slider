/**
 * Timed advancing for a slider, with the pauses WCAG 2.2.2 users expect.
 *
 * Browsers leave focus on a button after a mouse click, so only focus that matches
 * `:focus-visible` (keyboard focus) pauses; otherwise clicking Next or the toggle would keep
 * autoplay paused until the user clicked somewhere else.
 *
 * `play()` clears the current hover and focus pauses, so a Play button starts it even though
 * pressing it put the pointer and focus inside the slider.
 */
import type { Slider, SliderState } from './types'

export interface AutoplayOptions {
  /** Milliseconds between moves; must be > 0. Default `4000`. */
  delay?: number
  /** Element whose hover and keyboard focus pause autoplay. Default `slider.viewport`. */
  root?: HTMLElement
  /** Pause while the pointer is over `root`. Default `true`. */
  pauseOnHover?: boolean
  /** Stop for good on `pointerdown`, `wheel` or `keydown` on the viewport. Default `true`. */
  stopOnInteraction?: boolean
}

export interface Autoplay {
  play(): void
  stop(): void
  isPlaying(): boolean
  /** Called with the new playing state on change only. */
  subscribe(listener: (playing: boolean) => void): () => void
  destroy(): void
}

const DEFAULT_DELAY = 4000
const INTERACTIONS = ['pointerdown', 'wheel', 'keydown'] as const

/**
 * Advances `slider` every `delay` ms, back to the first snap at the end. Pauses while hovered,
 * while keyboard focus is inside `root`, while a pointer is pressed on the viewport and while the
 * tab is hidden. Starts stopped under `prefers-reduced-motion: reduce`.
 */
export function autoplay(slider: Slider, options: AutoplayOptions = {}): Autoplay {
  const delay = options.delay ?? DEFAULT_DELAY
  if (!(delay > 0)) throw new RangeError(`delay must be > 0, got ${delay}`)
  const root = options.root ?? slider.viewport
  const pauseOnHover = options.pauseOnHover ?? true
  const stopOnInteraction = options.stopOnInteraction ?? true
  const { viewport } = slider

  const listeners = new Set<(playing: boolean) => void>()
  let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches
  let hovered = false
  let focused = false
  let pressed = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let index = slider.getState().index
  let destroyed = false

  function isPaused(): boolean {
    return hovered || focused || pressed || document.visibilityState === 'hidden'
  }

  function schedule(): void {
    if (timer !== null) clearTimeout(timer)
    timer = playing && !isPaused() ? setTimeout(advance, delay) : null
  }

  function advance(): void {
    timer = null
    if (slider.getState().canNext) slider.next()
    else slider.scrollTo(0)
    schedule()
  }

  function setPlaying(value: boolean): void {
    if (playing === value) return
    playing = value
    schedule()
    for (const listener of listeners) listener(playing)
  }

  function onSliderChange(state: SliderState): void {
    if (state.index === index) return
    index = state.index
    schedule()
  }

  function onPointerEnter(): void {
    hovered = true
    schedule()
  }

  function onPointerLeave(): void {
    hovered = false
    schedule()
  }

  function onFocusIn(event: FocusEvent): void {
    focused = event.target instanceof Element && event.target.matches(':focus-visible')
    schedule()
  }

  function onFocusOut(event: FocusEvent): void {
    focused = event.relatedTarget instanceof Node && root.contains(event.relatedTarget)
    schedule()
  }

  function onPointerDown(): void {
    pressed = true
    schedule()
  }

  function onPointerUp(): void {
    pressed = false
    schedule()
  }

  function onInteraction(): void {
    setPlaying(false)
  }

  const unsubscribe = slider.subscribe(onSliderChange)
  if (pauseOnHover) {
    root.addEventListener('pointerenter', onPointerEnter)
    root.addEventListener('pointerleave', onPointerLeave)
  }
  root.addEventListener('focusin', onFocusIn)
  root.addEventListener('focusout', onFocusOut)
  viewport.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  document.addEventListener('visibilitychange', schedule)
  if (stopOnInteraction) {
    for (const type of INTERACTIONS) viewport.addEventListener(type, onInteraction)
  }
  schedule()

  function assertAlive(): void {
    if (destroyed) throw new Error('Autoplay was destroyed')
  }

  return {
    play() {
      assertAlive()
      hovered = false
      focused = false
      setPlaying(true)
      schedule()
    },
    stop() {
      assertAlive()
      setPlaying(false)
    },
    isPlaying() {
      assertAlive()
      return playing
    },
    subscribe(listener) {
      assertAlive()
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      if (timer !== null) clearTimeout(timer)
      timer = null
      unsubscribe()
      root.removeEventListener('pointerenter', onPointerEnter)
      root.removeEventListener('pointerleave', onPointerLeave)
      root.removeEventListener('focusin', onFocusIn)
      root.removeEventListener('focusout', onFocusOut)
      viewport.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      document.removeEventListener('visibilitychange', schedule)
      for (const type of INTERACTIONS) viewport.removeEventListener(type, onInteraction)
      listeners.clear()
    },
  }
}
