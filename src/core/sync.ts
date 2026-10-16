import type { Slider, SliderState } from './types'

const CLONE_ATTRIBUTE = 'data-slider-clone'

/**
 * Keeps a thumbnail slider on the main slider's index and lets a click on thumbnail slide `i`
 * move the main slider to snap `i`. The thumbnail matching the main index carries
 * `aria-current="true"` and `data-selected`. Assumes the main slider shows one slide per snap.
 * Returns a cleanup that stops syncing and removes both attributes.
 */
export function syncSliders(main: Slider, thumbs: Slider): () => void {
  const { viewport } = thumbs
  let index: number | null = null

  function follow(state: SliderState): void {
    if (state.index === index) return
    index = state.index
    thumbs.scrollTo(Math.min(index, thumbs.getState().snapCount - 1))
    const selected = realSlides(viewport)[index]
    for (const child of viewport.children) {
      if (child === selected) {
        child.setAttribute('aria-current', 'true')
        child.setAttribute('data-selected', '')
      } else {
        clearSelection(child)
      }
    }
  }

  function onClick(event: MouseEvent): void {
    const { target } = event
    if (!(target instanceof Node)) return
    const child = Array.from(viewport.children).find((element) => element.contains(target))
    if (child === undefined) return
    main.scrollTo(slideIndexOf(viewport, child))
  }

  follow(main.getState())
  const unsubscribe = main.subscribe(follow)
  viewport.addEventListener('click', onClick)
  return () => {
    unsubscribe()
    viewport.removeEventListener('click', onClick)
    for (const child of viewport.children) clearSelection(child)
  }
}

function realSlides(viewport: HTMLElement): Element[] {
  return Array.from(viewport.children).filter((child) => !child.hasAttribute(CLONE_ATTRIBUTE))
}

/** A real slide's position among real slides, or the real index a clone copies. */
function slideIndexOf(viewport: HTMLElement, child: Element): number {
  const source = child.getAttribute(CLONE_ATTRIBUTE)
  return source === null ? realSlides(viewport).indexOf(child) : Number(source)
}

function clearSelection(element: Element): void {
  element.removeAttribute('aria-current')
  element.removeAttribute('data-selected')
}
