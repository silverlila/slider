import { observeScroll } from 'use-scroller/core'
import { alignedPosition, readLayout, type Box, type Layout } from './geometry'
import type { Axis, Slider } from './types'

/** What a layout change can alter; the computed styles are re-read whenever it differs. */
interface LayoutKey {
  childCount: number
  portSize: number
}

type Metrics = Pick<Layout, 'port' | 'gap' | 'direction'>

/**
 * Writes `--slide-progress` (signed distance from the aligned spot, in slide steps, positive for
 * upcoming slides) and `--slide-distance` (its absolute value) on every child of the viewport,
 * clones included, whenever the scroll position or the layout changes. It follows the scroll
 * position rather than slider state because a loop recentre moves the position without changing
 * the state. Returns a cleanup that removes both properties.
 */
export function slideProgress(slider: Slider): () => void {
  const { viewport } = slider
  const { axis, align } = slider.options
  let cached: { key: LayoutKey; metrics: Metrics } | null = null

  function currentMetrics(children: HTMLElement[]): Metrics {
    const key: LayoutKey = {
      childCount: children.length,
      portSize: axis === 'x' ? viewport.clientWidth : viewport.clientHeight,
    }
    if (cached === null || !isSameKey(cached.key, key)) {
      const { port, gap, direction } = readLayout(viewport, axis)
      cached = { key, metrics: { port, gap, direction } }
    }
    return cached.metrics
  }

  function write(): void {
    const children = childrenOf(viewport)
    const { port, gap, direction } = currentMetrics(children)
    const position = axis === 'x' ? viewport.scrollLeft : viewport.scrollTop
    // Read every box before writing any property, so the writes never force a layout.
    const values = children.map((child) => {
      const box = readBox(child, axis)
      const aligned = alignedPosition(box, port, align, direction)
      return (direction * (aligned - position)) / (box.end - box.start + gap)
    })
    children.forEach((child, i) => {
      child.style.setProperty('--slide-progress', String(round(values[i])))
      child.style.setProperty('--slide-distance', String(round(Math.abs(values[i]))))
    })
  }

  // Emits once now, then once per frame after a scroll or a resize of the viewport or its slides.
  const stopObserving = observeScroll(viewport, write)
  return () => {
    stopObserving()
    for (const child of childrenOf(viewport)) {
      child.style.removeProperty('--slide-progress')
      child.style.removeProperty('--slide-distance')
    }
  }
}

function isSameKey(a: LayoutKey, b: LayoutKey): boolean {
  return a.childCount === b.childCount && a.portSize === b.portSize
}

function childrenOf(viewport: HTMLElement): HTMLElement[] {
  return Array.from(viewport.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement
  )
}

function readBox(element: HTMLElement, axis: Axis): Box {
  if (axis === 'x') {
    return { start: element.offsetLeft, end: element.offsetLeft + element.offsetWidth }
  }
  return { start: element.offsetTop, end: element.offsetTop + element.offsetHeight }
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000
}
