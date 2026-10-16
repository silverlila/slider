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

interface SlideContextValue {
  index: number
  clone: boolean
}

export const SlideContext = createContext<SlideContextValue | null>(null)

export const ThumbContext = createContext<number | null>(null)
