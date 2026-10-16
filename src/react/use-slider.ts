import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  createSlider,
  type NavigateOptions,
  type ScrollAnimation,
  type Slider,
  type SliderOptions,
  type SliderState,
} from '../core'
import { useSliderState } from './use-slider-state'

export interface UseSliderOptions extends Omit<SliderOptions, 'startIndex'> {
  /** Snap shown first when the index is uncontrolled. Default `0`. */
  defaultIndex?: number
  /** Controlled snap index: the slider scrolls to it whenever it changes. */
  index?: number
  /** Called whenever the active snap changes, never for the initial one. */
  onIndexChange?: (index: number) => void
}

type DiscreteState = Omit<SliderState, 'progress'>

export interface UseSliderResult extends DiscreteState {
  /** Callback ref for the scroll container; the engine is created once it is attached. */
  viewportRef: (element: HTMLElement | null) => void
  /** Callback ref for the element wrapping the slider and its controls. */
  rootRef: (element: HTMLElement | null) => void
  /** The engine, or `null` until the viewport is mounted. */
  slider: Slider | null
  /** Each navigation method does nothing while `slider` is `null`. */
  next(options?: NavigateOptions): void
  prev(options?: NavigateOptions): void
  scrollTo(index: number, options?: NavigateOptions): void
}

/** Headless slider: attach `viewportRef` to a scroll container and build any markup around it. */
export function useSlider(options: UseSliderOptions = {}): UseSliderResult {
  const { axis, align, slidesPerMove, loop, rewind, draggable, animation, index } = options
  const [viewport, setViewport] = useState<HTMLElement | null>(null)
  const [slider, setSlider] = useState<Slider | null>(null)
  const stableAnimation = useShallowStable(animation)
  // Callbacks and the start index are read when needed, so their identity never re-runs an effect.
  const latest = useRef(options)
  const previousIndex = useRef<number | null>(null)
  const live = useRef<Slider | null>(null)

  useLayoutEffect(() => {
    latest.current = options
  })

  useLayoutEffect(() => {
    if (viewport === null) return
    const start = latest.current
    const engine = createSlider(viewport, {
      axis,
      align,
      slidesPerMove,
      loop,
      rewind,
      draggable,
      animation: stableAnimation,
      startIndex: previousIndex.current ?? start.index ?? start.defaultIndex ?? 0,
    })
    let reported = engine.getState().index
    engine.subscribe((state) => {
      if (state.index === reported) return
      reported = state.index
      latest.current.onIndexChange?.(state.index)
    })
    live.current = engine
    setSlider(engine)
    return () => {
      // A destroyed engine cannot be read, so the slide to keep is taken first.
      previousIndex.current = engine.getState().index
      live.current = null
      engine.destroy()
      setSlider(null)
    }
  }, [viewport, axis, align, slidesPerMove, loop, rewind, draggable, stableAnimation])

  const discrete = useSliderState(slider, selectDiscrete, shallowEqual)

  // Reads the live engine: `slider` may name one this commit has just destroyed and replaced.
  useEffect(() => {
    const engine = live.current
    if (engine === null || index === undefined) return
    if (index !== engine.getState().index) engine.scrollTo(index)
  }, [index, slider])

  const next = useCallback((navigate?: NavigateOptions) => slider?.next(navigate), [slider])
  const prev = useCallback((navigate?: NavigateOptions) => slider?.prev(navigate), [slider])
  const scrollTo = useCallback(
    (target: number, navigate?: NavigateOptions) => slider?.scrollTo(target, navigate),
    [slider]
  )

  return useMemo(
    () => ({
      ...discrete,
      viewportRef: setViewport,
      rootRef: attachRoot,
      slider,
      next,
      prev,
      scrollTo,
    }),
    [discrete, slider, next, prev, scrollTo]
  )
}

// Nothing in the slider reads its root element yet; the ref exists so markup can attach it now.
function attachRoot(): void {}

function selectDiscrete(state: SliderState): DiscreteState {
  return {
    index: state.index,
    snapCount: state.snapCount,
    slideCount: state.slideCount,
    canPrev: state.canPrev,
    canNext: state.canNext,
    loopCopies: state.loopCopies,
  }
}

/** The last `value` that differed field by field: an inline object literal keeps one identity. */
function useShallowStable(value: ScrollAnimation | undefined): ScrollAnimation | undefined {
  const stable = useRef(value)
  if (!shallowEqual(stable.current, value)) stable.current = value
  return stable.current
}

function shallowEqual<T extends object>(a: T | undefined, b: T | undefined): boolean {
  if (a === b) return true
  if (a === undefined || b === undefined) return false
  const entries = Object.entries(a)
  const other = new Map(Object.entries(b))
  return (
    entries.length === other.size &&
    entries.every(([key, value]) => other.has(key) && Object.is(value, other.get(key)))
  )
}
