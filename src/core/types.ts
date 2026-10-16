import type { Axis, ScrollAnimation } from 'use-scroller/core'

export type { Axis, ScrollAnimation }
export type Align = 'start' | 'center' | 'end'

export interface SliderOptions {
  /** Scroll axis. Default `'x'`. */
  axis?: Axis
  /** Where a snapped slide sits in the viewport. Default `'start'`. */
  align?: Align
  /** Slides per snap: an integer >= 1, or `'auto'` for as many as fully fit. Default `1`. */
  slidesPerMove?: number | 'auto'
  /** Infinite loop through clones. Default `false`. */
  loop?: boolean
  /** Wrap from the last snap to the first (and back) by scrolling across. Ignored with `loop`. */
  rewind?: boolean
  /** Mouse and touch dragging via use-scroller's `dragScroll`. Default `true`. */
  draggable?: boolean
  /** Snap shown at creation, clamped into range. Default `0`. */
  startIndex?: number
  /** Animation for `next`/`prev`/`scrollTo`. Default `{ type: 'tween' }`. */
  animation?: ScrollAnimation
}

export interface SliderState {
  /** Active snap index; the target index while a navigation is pending. */
  index: number
  snapCount: number
  /** Real slides only, clones excluded. */
  slideCount: number
  canPrev: boolean
  canNext: boolean
  /** 0..1 along the snaps, following the real scroll position. */
  progress: number
  /** Copies of the slide set needed on each side; 0 unless looping. */
  loopCopies: number
}

export interface NavigateOptions {
  /** Overrides `SliderOptions.animation` for this call. */
  animation?: ScrollAnimation
}

export interface Slider {
  readonly viewport: HTMLElement
  readonly options: Readonly<Required<Omit<SliderOptions, 'startIndex'>>>
  getState(): SliderState
  subscribe(listener: (state: SliderState) => void): () => void
  next(options?: NavigateOptions): void
  prev(options?: NavigateOptions): void
  scrollTo(index: number, options?: NavigateOptions): void
  destroy(): void
}
