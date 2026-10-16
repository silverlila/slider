import '../../src/styles.css'
import type { Axis } from '../../src/core'
import { mount } from './dom'

interface ViewportFixture {
  width: number
  height?: number
  /** A slide count (sized by `perView`), or one explicit size per slide along the axis. */
  slides: number | number[]
  perView?: number
  gap?: number
  axis?: Axis
  dir?: 'ltr' | 'rtl'
}

export function mountViewport({
  width,
  height = 100,
  slides,
  perView,
  gap,
  axis = 'x',
  dir,
}: ViewportFixture): HTMLDivElement {
  const viewport = document.createElement('div')
  viewport.setAttribute('data-slider-viewport', '')
  if (axis === 'y') viewport.setAttribute('data-axis', 'y')
  if (dir) viewport.dir = dir
  viewport.style.width = `${width}px`
  viewport.style.height = `${height}px`
  if (perView !== undefined) viewport.style.setProperty('--slider-per-view', String(perView))
  if (gap !== undefined) viewport.style.setProperty('--slider-gap', `${gap}px`)
  const sizes =
    typeof slides === 'number' ? Array.from({ length: slides }, () => undefined) : slides
  for (const size of sizes) viewport.append(createSlide(size, axis))
  return mount(viewport)
}

/** A slide sized by the viewport's CSS, or `size` px along the axis when given. */
export function createSlide(size?: number, axis: Axis = 'x'): HTMLDivElement {
  const slide = document.createElement('div')
  if (size !== undefined) slide.style[axis === 'x' ? 'width' : 'height'] = `${size}px`
  return slide
}
