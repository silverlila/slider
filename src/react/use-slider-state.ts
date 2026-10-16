import { useCallback, useRef, useSyncExternalStore } from 'react'
import type { Slider, SliderState } from '../core'

/** What a slider reads as before its engine exists: on the server and before mount. */
export const INITIAL_STATE: SliderState = {
  index: 0,
  snapCount: 0,
  slideCount: 0,
  canPrev: false,
  canNext: false,
  progress: 0,
  loopCopies: 0,
}

function ignore(): void {}

/**
 * Subscribes to a slice of a slider's state. The component re-renders only when the selected
 * value changes by `isEqual`, so a selector returning an object should pass a shallow comparison.
 * With `slider === null` (not mounted yet) it reads the initial state.
 */
export function useSliderState<T>(
  slider: Slider | null,
  selector: (state: SliderState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is
): T {
  const last = useRef<{ value: T } | null>(null)

  const subscribe = useCallback(
    (onChange: () => void) => (slider ? slider.subscribe(onChange) : ignore),
    [slider]
  )

  // Returning the cached selection while it is equal keeps useSyncExternalStore from looping.
  function select(state: SliderState): T {
    const next = selector(state)
    const previous = last.current
    if (previous !== null && isEqual(previous.value, next)) return previous.value
    last.current = { value: next }
    return next
  }

  return useSyncExternalStore(
    subscribe,
    () => select(slider ? slider.getState() : INITIAL_STATE),
    () => select(INITIAL_STATE)
  )
}
