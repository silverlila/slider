import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import {
  autoplay,
  createSlider,
  slideProgress,
  type AutoplayOptions,
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
  /** Advance on a timer: `true` for the defaults, or the options to use. Off by default. */
  autoplay?: boolean | Omit<AutoplayOptions, 'root'>
  /** Write `--slide-progress` and `--slide-distance` on every slide as it scrolls. */
  slideProgress?: boolean
}

/** A running autoplay: whether it is playing, and the switches to change that. */
export interface AutoplayControls {
  isPlaying: boolean
  play(): void
  stop(): void
}

type DiscreteState = Omit<SliderState, 'progress'>

export interface UseSliderResult extends DiscreteState {
  /** Callback ref for the scroll container; the engine is created once it is attached. */
  viewportRef: (element: HTMLElement | null) => void
  /** Callback ref for the element wrapping the slider and its controls. */
  rootRef: (element: HTMLElement | null) => void
  /** The engine, or `null` until the viewport is mounted. */
  slider: Slider | null
  /** `null` while the `autoplay` option is off or the engine does not exist yet. */
  autoplay: AutoplayControls | null
  /** Each navigation method does nothing while `slider` is `null`. */
  next(options?: NavigateOptions): void
  prev(options?: NavigateOptions): void
  scrollTo(index: number, options?: NavigateOptions): void
}

/** Headless slider: attach `viewportRef` to a scroll container and build any markup around it. */
export function useSlider(options: UseSliderOptions = {}): UseSliderResult {
  const { axis, align, slidesPerMove, loop, rewind, draggable, animation, index } = options
  const { autoplay: autoplayOption, slideProgress: tracksProgress = false } = options
  const [viewport, setViewport] = useState<HTMLElement | null>(null)
  const [rootElement, setRootElement] = useState<HTMLElement | null>(null)
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
  const autoplayControls = useAutoplay(slider, live, rootElement, autoplayOption)

  useEffect(() => {
    if (!isLive(slider, live) || !tracksProgress) return
    return slideProgress(slider)
  }, [slider, live, tracksProgress])

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
      rootRef: setRootElement,
      slider,
      autoplay: autoplayControls,
      next,
      prev,
      scrollTo,
    }),
    [discrete, slider, autoplayControls, next, prev, scrollTo]
  )
}

/**
 * Runs `autoplay` on the live engine while `option` is on, rooted at `rootElement` (hover and focus
 * there pause it), and reports its playing state.
 */
function useAutoplay(
  slider: Slider | null,
  live: RefObject<Slider | null>,
  rootElement: HTMLElement | null,
  option: UseSliderOptions['autoplay']
): AutoplayControls | null {
  const settings = option === true ? {} : option || null
  const enabled = settings !== null
  const delay = settings?.delay
  const pauseOnHover = settings?.pauseOnHover
  const stopOnInteraction = settings?.stopOnInteraction
  const [controls, setControls] = useState<AutoplayControls | null>(null)

  // A layout effect, like the engine's: on unmount React runs layout cleanups before passive ones,
  // so a passive autoplay's timer could fire at an engine already destroyed.
  useLayoutEffect(() => {
    if (!isLive(slider, live) || !enabled) return
    const player = autoplay(slider, {
      delay,
      pauseOnHover,
      stopOnInteraction,
      root: rootElement ?? slider.viewport,
    })
    const publish = (isPlaying: boolean) =>
      setControls({ isPlaying, play: () => player.play(), stop: () => player.stop() })
    publish(player.isPlaying())
    player.subscribe(publish)
    return () => {
      player.destroy()
      setControls(null)
    }
  }, [slider, live, enabled, delay, pauseOnHover, stopOnInteraction, rootElement])

  return controls
}

/**
 * Whether `slider` is the engine in use. Rendered state lags the engine by one render: right after
 * creation it is still `null`, right after re-creation it names the destroyed engine. Effects
 * that wait for it to catch up run exactly once per engine.
 */
function isLive(slider: Slider | null, live: RefObject<Slider | null>): slider is Slider {
  return slider !== null && slider === live.current
}

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
