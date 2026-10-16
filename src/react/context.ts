import { createContext, use } from 'react'
import type { Axis } from '../core'
import type { UseSliderResult } from './use-slider'

export interface SliderContextValue extends UseSliderResult {
  /** The viewport's `id`, for `aria-controls` on the controls. */
  viewportId: string
  axis: Axis
}

export const SliderContext = createContext<SliderContextValue | null>(null)

/** The enclosing `<Slider>`'s state and navigation. Throws outside one. */
export function useSliderContext(): SliderContextValue {
  const context = use(SliderContext)
  if (context === null) throw new Error('Slider components must be used inside <Slider>')
  return context
}

/** Which real slide a `<Slider.Slide>` renders, and whether this copy is a loop clone. */
export interface SlideContextValue {
  index: number
  clone: boolean
}

/** Set per slide by `<Slider.Viewport>`; `null` means the slide is outside a viewport. */
export const SlideContext = createContext<SlideContextValue | null>(null)
