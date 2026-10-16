/**
 * The slider engine: snap positions from the slides, navigation between them, and the infinite
 * loop, all on top of the browser's own scroll-snap.
 *
 * use-scroller sets an inline `scroll-snap-type: none` while one of its animations runs, a drag's
 * release spring included, and `cancelScroll` restores the previous inline value synchronously.
 * So the engine cancels before it saves the viewport's own value to hold snapping off. Writing the
 * scroll position while the browser is still scrolling stops native momentum, which is why the
 * loop only recentres at rest on a snap.
 */
import {
  animateScroll,
  cancelScroll,
  dragScroll,
  observeScroll,
  type ScrollAnimation,
  type ScrollHandle,
  type ScrollState,
} from 'use-scroller/core'
import {
  anchors,
  canonical,
  copiesNeeded,
  groupSize,
  loopProgress,
  loopSnapPositions,
  mod,
  nearestCongruent,
  nearestSnap,
  periodOf,
  positionOf,
  progressOf,
  readLayout,
  snapPositions,
  virtualAt,
  type Layout,
  type Loop,
} from './geometry'
import type { NavigateOptions, Slider, SliderOptions, SliderState } from './types'

type ResolvedOptions = Slider['options']

interface Pending {
  index: number
  virtual: number
}

const DEFAULT_ANIMATION: ScrollAnimation = { type: 'tween' }
const SNAP_TOLERANCE = 1

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
  let loopCopies = 0
  let loop: Loop | null = null
  const tracked = new Set<HTMLElement>()
  const listeners = new Set<(state: SliderState) => void>()
  let pending: Pending | null = null
  let current: ScrollHandle | null = null
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
    recentre()
  }
  viewport.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)

  function applyLayout(): void {
    const size = groupSize(layout, resolved.slidesPerMove)
    const anchorIndexes = anchors(layout.slides.length, size, align)
    loopCopies = resolved.loop ? copiesNeeded(layout) : 0
    loop = isLoopActive(layout, loopCopies)
      ? {
          snaps: loopSnapPositions(layout, anchorIndexes, align),
          period: periodOf(layout),
          direction: layout.direction,
        }
      : null
    snaps = loop ? loop.snaps : snapPositions(layout, anchorIndexes, align)
    const anchorSet = new Set(anchorIndexes)
    layout.slides.forEach((slide, i) => {
      slide.style.scrollSnapAlign = anchorSet.has(i) ? align : 'none'
    })
    for (const clone of layout.clones) {
      const source = Number(clone.getAttribute('data-slider-clone'))
      clone.style.scrollSnapAlign = loop && anchorSet.has(source) ? align : 'none'
    }
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
    if (pending === null && !pointerDown && !scrolling) jumpToSnap(state.index)
    update(livePosition())
  }

  function onScroll(scroll: ScrollState): void {
    scrolling = scroll.isScrolling
    update(axis === 'x' ? scroll.x : scroll.y)
    recentre()
  }

  function recentre(): void {
    if (loop === null || scrolling || pointerDown || pending !== null) return
    const position = livePosition()
    const onSnap = Math.abs(positionOf(loop, virtualAt(loop, position)) - position)
    if (onSnap > SNAP_TOLERANCE) return
    const target = canonical(loop, position)
    if (Math.abs(target - position) > SNAP_TOLERANCE) jumpTo(target)
  }

  function computeState(position: number): SliderState {
    const snapCount = snaps.length
    const slideCount = layout.slides.length
    if (loop) {
      const looping = snapCount > 1
      return {
        index: pending?.index ?? mod(virtualAt(loop, position), snapCount),
        snapCount,
        slideCount,
        canPrev: looping,
        canNext: looping,
        progress: loopProgress(loop, position),
        loopCopies,
      }
    }
    const index = pending?.index ?? nearestSnap(snaps, position)
    const movable = snapCount > 1
    return {
      index,
      snapCount,
      slideCount,
      canPrev: movable && (resolved.rewind || index > 0),
      canNext: movable && (resolved.rewind || index < snapCount - 1),
      progress: progressOf(snaps, position),
      loopCopies,
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
    jumpTo(snaps[clampIndex(index)])
  }

  function jumpTo(position: number): void {
    viewport.scrollTo(
      axis === 'x'
        ? { left: position, behavior: 'instant' }
        : { top: position, behavior: 'instant' }
    )
  }

  function holdSnap(): void {
    if (heldSnapType !== null) return
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
    holdSnap()
    animateTo({ index, virtual: index }, snaps[index], navigateOptions)
  }

  function navigateLoop(
    active: Loop,
    from: number,
    target: number,
    navigateOptions: NavigateOptions = {}
  ): void {
    holdSnap()
    const n = active.snaps.length
    const copy = Math.floor(from / n)
    if (copy !== 0) jumpTo(livePosition() - active.direction * copy * active.period)
    const virtual = target - copy * n
    animateTo({ index: mod(virtual, n), virtual }, positionOf(active, virtual), navigateOptions)
  }

  function loopFrom(active: Loop): number {
    return pending?.virtual ?? virtualAt(active, livePosition())
  }

  function animateTo(target: Pending, position: number, navigateOptions: NavigateOptions): void {
    pending = target
    const handle = animateScroll(viewport, axis === 'x' ? { x: position } : { y: position }, {
      animation: navigateOptions.animation ?? resolved.animation,
    })
    current = handle
    update(livePosition())
    void handle.finished.then(() => {
      if (current !== handle) return
      current = null
      pending = null
      releaseSnap()
      update(livePosition())
      recentre()
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
      if (loop) {
        const from = loopFrom(loop)
        if (snaps.length > 1) navigateLoop(loop, from, from + 1, navigateOptions)
        return
      }
      const last = snaps.length - 1
      const from = pending?.index ?? state.index
      if (from < last) navigate(from + 1, navigateOptions)
      else if (resolved.rewind && last > 0) navigate(0, navigateOptions)
    },
    prev(navigateOptions) {
      assertAlive()
      if (loop) {
        const from = loopFrom(loop)
        if (snaps.length > 1) navigateLoop(loop, from, from - 1, navigateOptions)
        return
      }
      const last = snaps.length - 1
      const from = pending?.index ?? state.index
      if (from > 0) navigate(from - 1, navigateOptions)
      else if (resolved.rewind && last > 0) navigate(last, navigateOptions)
    },
    scrollTo(index, navigateOptions) {
      assertAlive()
      assertInteger(index, 'index')
      if (snaps.length === 0) return
      if (loop) {
        const from = loopFrom(loop)
        navigateLoop(loop, from, nearestCongruent(from, index, snaps.length), navigateOptions)
        return
      }
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
      pending = null
      releaseSnap()
      for (const slide of tracked) slide.style.removeProperty('scroll-snap-align')
      for (const clone of layout.clones) clone.style.removeProperty('scroll-snap-align')
      tracked.clear()
      listeners.clear()
    },
  }
}

function isLoopActive(layout: Layout, copies: number): boolean {
  const expected = copies * layout.slides.length
  return expected > 0 && layout.clonesBefore === expected && layout.clonesAfter === expected
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
