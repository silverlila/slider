import { childrenOf } from './geometry'
import type { Slider, SliderState } from './types'

/**
 * Renders a looping slider's clones into its viewport for vanilla use: `loopCopies` copies of the
 * real slide set on each side, re-rendered whenever `loopCopies` or `slideCount` changes.
 * Returns a cleanup that stops rendering and removes every clone.
 */
export function renderClones(slider: Slider): () => void {
  const { viewport } = slider
  let rendered: Pick<SliderState, 'loopCopies' | 'slideCount'> | null = null

  function render({ loopCopies, slideCount }: SliderState): void {
    if (rendered?.loopCopies === loopCopies && rendered.slideCount === slideCount) return
    rendered = { loopCopies, slideCount }
    removeClones(viewport)
    const slides = childrenOf(viewport)
    if (loopCopies === 0 || slides.length === 0) return
    slides[0].before(copiesOf(slides, loopCopies))
    slides[slides.length - 1].after(copiesOf(slides, loopCopies))
  }

  render(slider.getState())
  const unsubscribe = slider.subscribe(render)
  return () => {
    unsubscribe()
    removeClones(viewport)
  }
}

function removeClones(viewport: HTMLElement): void {
  for (const clone of viewport.querySelectorAll(':scope > [data-slider-clone]')) clone.remove()
}

function copiesOf(slides: HTMLElement[], copies: number): DocumentFragment {
  const fragment = document.createDocumentFragment()
  for (let copy = 0; copy < copies; copy++) {
    slides.forEach((slide, index) => fragment.append(cloneSlide(slide, index)))
  }
  return fragment
}

function cloneSlide(slide: HTMLElement, index: number): Node {
  const clone = slide.cloneNode(true)
  if (!(clone instanceof HTMLElement)) throw new Error('Slider slides must be HTML elements')
  clone.setAttribute('data-slider-clone', String(index))
  clone.setAttribute('aria-hidden', 'true')
  clone.inert = true
  clone.removeAttribute('id')
  for (const element of clone.querySelectorAll('[id]')) element.removeAttribute('id')
  return clone
}
