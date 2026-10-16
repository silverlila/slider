import { readScroll, type Axis } from 'use-scroller/core'
import type { Align } from './types'

export interface Box {
  start: number
  end: number
}

interface Port {
  size: number
  paddingBefore: number
  paddingAfter: number
}

type Direction = 1 | -1

export interface Layout {
  slides: HTMLElement[]
  clones: HTMLElement[]
  clonesBefore: number
  clonesAfter: number
  boxes: Box[]
  gap: number
  port: Port
  range: { min: number; max: number }
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
  const children = childrenOf(viewport)
  const slides = children.filter((child) => !isClone(child))
  const clones = children.filter(isClone)
  const direction: Direction = axis === 'x' && style.direction === 'rtl' ? -1 : 1
  const scroll = readScroll(viewport)
  return {
    slides,
    clones,
    clonesBefore: countLeadingClones(children),
    clonesAfter: countLeadingClones([...children].reverse()),
    boxes: slides.map((slide) => readBox(slide, axis)),
    gap: parseGap(axis === 'x' ? style.columnGap : style.rowGap),
    port: readPort(viewport, style, axis),
    range: axis === 'x' ? { min: scroll.minX, max: scroll.maxX } : { min: 0, max: scroll.maxY },
    direction,
  }
}

function isClone(child: HTMLElement): boolean {
  return child.hasAttribute('data-slider-clone')
}

function countLeadingClones(children: HTMLElement[]): number {
  const firstReal = children.findIndex((child) => !isClone(child))
  return firstReal === -1 ? children.length : firstReal
}

export function childrenOf(viewport: HTMLElement): HTMLElement[] {
  return Array.from(viewport.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement
  )
}

export function readBox(slide: HTMLElement, axis: Axis): Box {
  if (axis === 'x') return { start: slide.offsetLeft, end: slide.offsetLeft + slide.offsetWidth }
  return { start: slide.offsetTop, end: slide.offsetTop + slide.offsetHeight }
}

function parseGap(value: string): number {
  return value === 'normal' ? 0 : parseFloat(value)
}

function readPort(viewport: HTMLElement, style: CSSStyleDeclaration, axis: Axis): Port {
  const size = axis === 'x' ? viewport.clientWidth : viewport.clientHeight
  return {
    size,
    paddingBefore: resolvePadding(
      axis === 'x' ? style.scrollPaddingLeft : style.scrollPaddingTop,
      size
    ),
    paddingAfter: resolvePadding(
      axis === 'x' ? style.scrollPaddingRight : style.scrollPaddingBottom,
      size
    ),
  }
}

function resolvePadding(value: string, size: number): number {
  if (value === 'auto') return 0
  if (value.endsWith('%')) return (parseFloat(value) / 100) * size
  return parseFloat(value)
}

export function alignedPosition(box: Box, port: Port, align: Align, direction: Direction): number {
  const before = port.paddingBefore
  const after = port.paddingAfter
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

export function groupSize(layout: Layout, slidesPerMove: number | 'auto'): number {
  if (slidesPerMove !== 'auto') return slidesPerMove
  const available = layout.port.size - layout.port.paddingBefore - layout.port.paddingAfter
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

export function nearestSnap(positions: number[], p: number): number {
  let nearest = 0
  for (let i = 1; i < positions.length; i++) {
    if (Math.abs(positions[i] - p) < Math.abs(positions[nearest] - p)) nearest = i
  }
  return nearest
}

export function progressOf(positions: number[], p: number): number {
  if (positions.length < 2) return 0
  const first = positions[0]
  const last = positions[positions.length - 1]
  return clamp((p - first) / (last - first), 0, 1)
}

export interface Loop {
  snaps: number[]
  period: number
  direction: Direction
}

export function periodOf(layout: Layout): number {
  if (layout.boxes.length === 0) return 0
  return unionSize(layout.boxes) + layout.gap
}

export function loopSnapPositions(layout: Layout, anchorIndexes: number[], align: Align): number[] {
  const { boxes, port, direction } = layout
  return anchorIndexes.map((index) => alignedPosition(boxes[index], port, align, direction))
}

export function copiesNeeded(layout: Layout): number {
  const period = periodOf(layout)
  return period > 0 ? Math.max(1, Math.ceil((2 * layout.port.size) / period)) : 0
}

export function canonical(loop: Loop, p: number): number {
  return loop.snaps[0] + loop.direction * mod(logicalOffset(loop, p), loop.period)
}

export function positionOf(loop: Loop, v: number): number {
  const n = loop.snaps.length
  const offset = logicalOffset(loop, loop.snaps[mod(v, n)]) + Math.floor(v / n) * loop.period
  return loop.snaps[0] + loop.direction * offset
}

export function virtualAt(loop: Loop, p: number): number {
  const n = loop.snaps.length
  const u = logicalOffset(loop, p)
  const copy = Math.floor(u / loop.period)
  const r = u - copy * loop.period
  let nearest = 0
  let nearestDistance = Infinity
  let wrapped = false
  loop.snaps.forEach((snap, i) => {
    const direct = Math.abs(r - logicalOffset(loop, snap))
    const around = loop.period - direct
    const distance = Math.min(direct, around)
    if (distance >= nearestDistance) return
    nearest = i
    nearestDistance = distance
    wrapped = around < direct
  })
  const ownerCopy = wrapped && r > logicalOffset(loop, loop.snaps[nearest]) ? copy + 1 : copy
  return ownerCopy * n + nearest
}

export function nearestCongruent(from: number, index: number, n: number): number {
  const base = from - mod(from, n) + mod(index, n)
  let nearest = base + n
  for (const candidate of [base, base - n]) {
    if (Math.abs(candidate - from) < Math.abs(nearest - from)) nearest = candidate
  }
  return nearest
}

export function loopProgress(loop: Loop, p: number): number {
  return mod(logicalOffset(loop, p), loop.period) / loop.period
}

function logicalOffset(loop: Loop, p: number): number {
  return loop.direction * (p - loop.snaps[0])
}

export function mod(a: number, n: number): number {
  return ((a % n) + n) % n
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
