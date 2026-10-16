import {
  animateScroll,
  cancelScroll,
  dragScroll,
  observeScroll,
  type ScrollAnimation,
  type ScrollHandle,
  type ScrollState,
} from 'use-scroller/core'
import { anchors, groupSize, nearestSnap, progressOf, readLayout, snapPositions } from './geometry'
import type { NavigateOptions, Slider, SliderOptions, SliderState } from './types'

type ResolvedOptions = Slider['options']

const DEFAULT_ANIMATION: ScrollAnimation = { type: 'tween' }

const STATE_KEYS = [
  'index',
  'snapCount',
  'slideCount',
  'canPrev',
  'canNext',
  'progress',
  'loopCopies',
] as const satisfies readonly (keyof SliderState)[]

export function createSlider(viewport: HTMLElement, options: SliderOptions = {}): Slider {
  const resolved = resolveOptions(options)
  const startIndex = options.startIndex ?? 0
  assertInteger(startIndex, 'startIndex')
  const { axis, align } = resolved

  let layout = readLayout(viewport, axis)
  let snaps: number[] = []
  const tracked = new Set<HTMLElement>()
  const listeners = new Set<(state: SliderState) => void>()
  let pendingIndex: number | null = null
  let current: ScrollHandle | null = null
  // The viewport's own inline scroll-snap-type while the engine holds snapping off; null otherwise.
  let heldSnapType: string | null = null
  let pointerDown = false
  let scrolling = false
  let destroyed = false

  const resizeObserver = new ResizeObserver(remeasure)
  const mutationObserver = new MutationObserver(remeasure)

  applyLayout()
  jumpToSnap(startIndex)
  let state = computeState(livePosition())

  const stopObservingScroll = observeScroll(viewport, onScroll)
  resizeObserver.observe(viewport)
  mutationObserver.observe(viewport, { childList: true })
  const stopDragging = resolved.draggable ? dragScroll(viewport, { axis, mouse: true }) : null
  const onPointerDown = () => {
    pointerDown = true
  }
  const onPointerUp = () => {
    pointerDown = false
  }
  viewport.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)

  function applyLayout(): void {
    const size = groupSize(layout, resolved.slidesPerMove)
    const anchorIndexes = anchors(layout.slides.length, size, align)
    snaps = snapPositions(layout, anchorIndexes, align)
    const anchorSet = new Set(anchorIndexes)
    layout.slides.forEach((slide, i) => {
      slide.style.scrollSnapAlign = anchorSet.has(i) ? align : 'none'
    })
    trackSlides(layout.slides)
  }

  function trackSlides(slides: HTMLElement[]): void {
    const present = new Set(slides)
    for (const slide of tracked) {
      if (present.has(slide)) continue
      slide.style.removeProperty('scroll-snap-align')
      resizeObserver.unobserve(slide)
      tracked.delete(slide)
    }
    for (const slide of slides) {
      if (tracked.has(slide)) continue
      resizeObserver.observe(slide)
      tracked.add(slide)
    }
  }

  function remeasure(): void {
    if (destroyed) return
    layout = readLayout(viewport, axis)
    applyLayout()
    if (pendingIndex === null && !pointerDown && !scrolling) jumpToSnap(state.index)
    update(livePosition())
  }

  function onScroll(scroll: ScrollState): void {
    scrolling = scroll.isScrolling
    update(axis === 'x' ? scroll.x : scroll.y)
  }

  function computeState(position: number): SliderState {
    const index = pendingIndex ?? nearestSnap(snaps, position)
    const snapCount = snaps.length
    const movable = snapCount > 1
    return {
      index,
      snapCount,
      slideCount: layout.slides.length,
      canPrev: movable && (resolved.rewind || index > 0),
      canNext: movable && (resolved.rewind || index < snapCount - 1),
      progress: progressOf(snaps, position),
      loopCopies: 0,
    }
  }

  function update(position: number): void {
    const next = computeState(position)
    if (STATE_KEYS.every((key) => next[key] === state[key])) return
    state = next
    for (const listener of listeners) listener(state)
  }

  function livePosition(): number {
    return axis === 'x' ? viewport.scrollLeft : viewport.scrollTop
  }

  function clampIndex(index: number): number {
    return Math.min(Math.max(index, 0), snaps.length - 1)
  }

  function jumpToSnap(index: number): void {
    if (snaps.length === 0) return
    const position = snaps[clampIndex(index)]
    viewport.scrollTo(
      axis === 'x'
        ? { left: position, behavior: 'instant' }
        : { top: position, behavior: 'instant' }
    )
  }

  function holdSnap(): void {
    if (heldSnapType !== null) return
    // A running animation (a drag's release spring) holds snap off with its own inline value.
    // Cancelling it restores that value synchronously, so the one saved here is the viewport's own.
    cancelScroll(viewport)
    heldSnapType = viewport.style.scrollSnapType
    viewport.style.scrollSnapType = 'none'
  }

  function releaseSnap(): void {
    if (heldSnapType === null) return
    viewport.style.scrollSnapType = heldSnapType
    heldSnapType = null
  }

  function navigate(index: number, navigateOptions: NavigateOptions = {}): void {
    // The engine owns snap suspension so a newer navigation never has snap restored under it.
    holdSnap()
    pendingIndex = index
    const position = snaps[index]
    const handle = animateScroll(viewport, axis === 'x' ? { x: position } : { y: position }, {
      animation: navigateOptions.animation ?? resolved.animation,
    })
    current = handle
    update(livePosition())
    void handle.finished.then(() => {
      if (current !== handle) return
      current = null
      pendingIndex = null
      releaseSnap()
      update(livePosition())
    })
  }

  function assertAlive(): void {
    if (destroyed) throw new Error('Slider was destroyed')
  }

  return {
    viewport,
    options: resolved,
    getState() {
      assertAlive()
      return state
    },
    subscribe(listener) {
      assertAlive()
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    next(navigateOptions) {
      assertAlive()
      const last = snaps.length - 1
      const from = pendingIndex ?? state.index
      if (from < last) navigate(from + 1, navigateOptions)
      else if (resolved.rewind && last > 0) navigate(0, navigateOptions)
    },
    prev(navigateOptions) {
      assertAlive()
      const last = snaps.length - 1
      const from = pendingIndex ?? state.index
      if (from > 0) navigate(from - 1, navigateOptions)
      else if (resolved.rewind && last > 0) navigate(last, navigateOptions)
    },
    scrollTo(index, navigateOptions) {
      assertAlive()
      assertInteger(index, 'index')
      if (snaps.length === 0) return
      navigate(clampIndex(index), navigateOptions)
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      stopObservingScroll()
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      stopDragging?.()
      viewport.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      current?.cancel()
      current = null
      pendingIndex = null
      releaseSnap()
      for (const slide of tracked) slide.style.removeProperty('scroll-snap-align')
      tracked.clear()
      listeners.clear()
    },
  }
}

function resolveOptions(options: SliderOptions): ResolvedOptions {
  const slidesPerMove = options.slidesPerMove ?? 1
  if (slidesPerMove !== 'auto' && !(Number.isInteger(slidesPerMove) && slidesPerMove >= 1)) {
    throw new RangeError(`slidesPerMove must be an integer >= 1 or 'auto', got ${slidesPerMove}`)
  }
  return {
    axis: options.axis ?? 'x',
    align: options.align ?? 'start',
    slidesPerMove,
    loop: options.loop ?? false,
    rewind: options.rewind ?? false,
    draggable: options.draggable ?? true,
    animation: options.animation ?? DEFAULT_ANIMATION,
  }
}

function assertInteger(value: number, name: string): void {
  if (!Number.isInteger(value)) throw new RangeError(`${name} must be an integer, got ${value}`)
}
