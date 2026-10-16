import { readScroll, type Axis } from 'use-scroller/core'
import type { Align } from './types'

/** A slide's edges in scroll coordinates along the axis. */
export interface Box {
  start: number
  end: number
}

/** The viewport's size along the axis and its scroll-padding at the logical start and end. */
export interface Port {
  size: number
  paddingStart: number
  paddingEnd: number
}

export type Direction = 1 | -1

export interface Layout {
  /** Real slides, DOM order. */
  slides: HTMLElement[]
  /** `[data-slider-clone]` children, DOM order. */
  clones: HTMLElement[]
  /** One per real slide. */
  boxes: Box[]
  gap: number
  port: Port
  range: { min: number; max: number }
  /** -1 only for axis 'x' in a right-to-left viewport. */
  direction: Direction
}

const SNAP_MERGE_DISTANCE = 1
const FIT_TOLERANCE = 0.5
const MIRRORED: Record<Align, Align> = { start: 'end', center: 'center', end: 'start' }

export function readLayout(viewport: HTMLElement, axis: Axis): Layout {
  const style = getComputedStyle(viewport)
  if (style.position === 'static') {
    throw new Error(
      'Slider viewport must be positioned; add position: relative (the stylesheet does this)'
    )
  }
  const children = Array.from(viewport.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement
  )
  const slides = children.filter((child) => !child.hasAttribute('data-slider-clone'))
  const clones = children.filter((child) => child.hasAttribute('data-slider-clone'))
  const direction: Direction = axis === 'x' && style.direction === 'rtl' ? -1 : 1
  const scroll = readScroll(viewport)
  return {
    slides,
    clones,
    boxes: slides.map((slide) => readBox(slide, axis)),
    gap: parseGap(axis === 'x' ? style.columnGap : style.rowGap),
    port: readPort(viewport, style, axis, direction),
    range: axis === 'x' ? { min: scroll.minX, max: scroll.maxX } : { min: 0, max: scroll.maxY },
    direction,
  }
}

function readBox(slide: HTMLElement, axis: Axis): Box {
  if (axis === 'x') return { start: slide.offsetLeft, end: slide.offsetLeft + slide.offsetWidth }
  return { start: slide.offsetTop, end: slide.offsetTop + slide.offsetHeight }
}

function parseGap(value: string): number {
  return value === 'normal' ? 0 : parseFloat(value)
}

function readPort(
  viewport: HTMLElement,
  style: CSSStyleDeclaration,
  axis: Axis,
  direction: Direction
): Port {
  const size = axis === 'x' ? viewport.clientWidth : viewport.clientHeight
  const before = resolvePadding(
    axis === 'x' ? style.scrollPaddingLeft : style.scrollPaddingTop,
    size
  )
  const after = resolvePadding(
    axis === 'x' ? style.scrollPaddingRight : style.scrollPaddingBottom,
    size
  )
  return direction === 1
    ? { size, paddingStart: before, paddingEnd: after }
    : { size, paddingStart: after, paddingEnd: before }
}

function resolvePadding(value: string, size: number): number {
  if (value === 'auto') return 0
  if (value.endsWith('%')) return (parseFloat(value) / 100) * size
  return parseFloat(value)
}

/** The scroll position that puts `box` at the aligned spot of the port. */
export function alignedPosition(box: Box, port: Port, align: Align, direction: Direction): number {
  // Physical left/top and right/bottom paddings; in RTL the logical start is on the right.
  const before = direction === 1 ? port.paddingStart : port.paddingEnd
  const after = direction === 1 ? port.paddingEnd : port.paddingStart
  const physicalAlign = direction === 1 ? align : MIRRORED[align]
  switch (physicalAlign) {
    case 'start':
      return box.start - before
    case 'end':
      return box.end - (port.size - after)
    case 'center':
      return (box.start + box.end) / 2 - (before + (port.size - before - after) / 2)
    default: {
      const exhaustive: never = physicalAlign
      return exhaustive
    }
  }
}

/** Slides per group: the given number, or for `'auto'` how many from slide 0 fully fit. */
export function groupSize(layout: Layout, slidesPerMove: number | 'auto'): number {
  if (slidesPerMove !== 'auto') return slidesPerMove
  const available = layout.port.size - layout.port.paddingStart - layout.port.paddingEnd
  let size = 1
  while (size < layout.boxes.length) {
    const span = unionSize(layout.boxes.slice(0, size + 1))
    if (span > available + FIT_TOLERANCE) break
    size++
  }
  return size
}

function unionSize(boxes: Box[]): number {
  const start = Math.min(...boxes.map((box) => box.start))
  const end = Math.max(...boxes.map((box) => box.end))
  return end - start
}

/** The anchor slide index of each group of `size` consecutive slides. */
export function anchors(slideCount: number, size: number, align: Align): number[] {
  const result: number[] = []
  for (let first = 0; first < slideCount; first += size) {
    const last = Math.min(first + size, slideCount) - 1
    result.push(anchorOf(first, last, align))
  }
  return result
}

function anchorOf(first: number, last: number, align: Align): number {
  if (align === 'start') return first
  if (align === 'end') return last
  return Math.floor((first + last) / 2)
}

/** Each anchor's aligned position clamped to the scroll range, near-duplicates merged. */
export function snapPositions(layout: Layout, anchorIndexes: number[], align: Align): number[] {
  const { boxes, port, range, direction } = layout
  const positions: number[] = []
  for (const index of anchorIndexes) {
    const aligned = alignedPosition(boxes[index], port, align, direction)
    const position = clamp(aligned, range.min, range.max)
    const previous = positions[positions.length - 1]
    if (previous !== undefined && Math.abs(position - previous) <= SNAP_MERGE_DISTANCE) continue
    positions.push(position)
  }
  return positions
}

/** Index of the position closest to `p`; ties go to the lower index; 0 when there are none. */
export function nearestSnap(positions: number[], p: number): number {
  let nearest = 0
  for (let i = 1; i < positions.length; i++) {
    if (Math.abs(positions[i] - p) < Math.abs(positions[nearest] - p)) nearest = i
  }
  return nearest
}

/** 0..1 from the first snap to the last; 0 when there are fewer than two snaps. */
export function progressOf(positions: number[], p: number): number {
  if (positions.length < 2) return 0
  const first = positions[0]
  const last = positions[positions.length - 1]
  return clamp((p - first) / (last - first), 0, 1)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
