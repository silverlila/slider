import {
  Children,
  isValidElement,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type RefCallback,
} from 'react'
import { syncSliders, type Axis } from '../core'
import { SlideContext, SliderContext, ThumbContext, useSliderContext } from './context'
import { useSlider, type UseSliderOptions } from './use-slider'

type CSSVariables = CSSProperties & Record<`--${string}`, string | number | undefined>

export type SliderProps = UseSliderOptions & {
  /** Slides per view (`--slider-per-view`); `'auto'` sizes slides by content. Default `1`. */
  perView?: number | 'auto'
  /** Space between slides, written to `--slider-gap`. A number is in pixels. */
  gap?: number | string
  /** Accessible name of the carousel region. Default `'Slides'`. */
  label?: string
} & Omit<ComponentProps<'div'>, 'children' | 'onChange' | keyof UseSliderOptions> & {
    children: ReactNode
  }

function SliderRoot({
  axis,
  align,
  slidesPerMove,
  loop,
  rewind,
  draggable,
  animation,
  defaultIndex,
  index,
  onIndexChange,
  autoplay,
  slideProgress,
  perView = 1,
  gap,
  label,
  style,
  ref,
  children,
  ...props
}: SliderProps) {
  const result = useSlider({
    axis,
    align,
    slidesPerMove,
    loop,
    rewind,
    draggable,
    animation,
    defaultIndex,
    index,
    onIndexChange,
    autoplay,
    slideProgress,
  })
  const viewportId = useId()
  const resolvedAxis = axis ?? 'x'
  const context = useMemo(
    () => ({ ...result, viewportId, axis: resolvedAxis }),
    [result, viewportId, resolvedAxis]
  )
  const rootRef = useMergedRef(result.rootRef, ref)
  // Set on the root so they inherit to the viewport, where user media queries can override them.
  const variables: CSSVariables = {
    '--slider-per-view': perView === 'auto' ? undefined : perView,
    '--slider-gap': typeof gap === 'number' ? `${gap}px` : gap,
    '--slider-align': align,
    ...style,
  }

  return (
    <SliderContext value={context}>
      <div
        ref={rootRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={label ?? 'Slides'}
        data-slider=""
        style={variables}
        {...props}
      >
        {children}
      </div>
    </SliderContext>
  )
}

/**
 * The scroll container. Its children must be `<Slider.Slide>` elements (or components rendering
 * one); in loop mode each is also rendered as hidden, inert clones on both sides.
 */
function SliderViewport({ ref, children, ...props }: ComponentProps<'div'>) {
  const { viewportRef, viewportId, axis, loopCopies } = useSliderContext()
  const mergedRef = useMergedRef(viewportRef, ref)
  const slides = Children.toArray(children)

  const real = slides.map((child, i) => (
    <SlideContext value={{ index: i, clone: false }} key={keyOf(child, i)}>
      {child}
    </SlideContext>
  ))
  const copies = (side: 'before' | 'after') =>
    Array.from({ length: loopCopies }, (_, copy) =>
      slides.map((child, i) => (
        <SlideContext value={{ index: i, clone: true }} key={`${side}-${copy}-${keyOf(child, i)}`}>
          {child}
        </SlideContext>
      ))
    ).flat()

  return (
    <div
      ref={mergedRef}
      id={viewportId}
      data-slider-viewport=""
      data-axis={axis}
      tabIndex={0}
      {...props}
    >
      {[...copies('before'), ...real, ...copies('after')]}
    </div>
  )
}

/** One slide. Must be rendered inside `<Slider.Viewport>`. */
function SliderSlide(props: ComponentProps<'div'>) {
  const { slideCount } = useSliderContext()
  const slide = use(SlideContext)
  if (slide === null) throw new Error('<Slider.Slide> must be rendered inside <Slider.Viewport>')

  if (slide.clone) {
    // A clone is a visual copy only: hidden from assistive tech, unreachable, and without an id.
    return (
      <div
        data-slider-slide=""
        data-slider-clone={slide.index}
        aria-hidden="true"
        inert
        {...props}
        id={undefined}
      />
    )
  }
  return (
    <div
      data-slider-slide=""
      role="group"
      aria-roledescription="slide"
      aria-label={`${slide.index + 1} of ${slideCount}`}
      {...props}
    />
  )
}

function SliderPrev({ onClick, children = 'Previous', ...props }: ComponentProps<'button'>) {
  const { prev, canPrev, viewportId } = useSliderContext()
  return (
    <button
      type="button"
      aria-controls={viewportId}
      aria-label="Previous slide"
      disabled={!canPrev}
      {...props}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) prev()
      }}
    >
      {children}
    </button>
  )
}

function SliderNext({ onClick, children = 'Next', ...props }: ComponentProps<'button'>) {
  const { next, canNext, viewportId } = useSliderContext()
  return (
    <button
      type="button"
      aria-controls={viewportId}
      aria-label="Next slide"
      disabled={!canNext}
      {...props}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) next()
      }}
    >
      {children}
    </button>
  )
}

/** One button per snap; the active one carries `aria-current="true"` and `data-selected`. */
function SliderDots(props: Omit<ComponentProps<'div'>, 'children'>) {
  const { snapCount, index, scrollTo, viewportId } = useSliderContext()
  return (
    <div role="group" aria-label="Choose slide" data-slider-dots="" {...props}>
      {Array.from({ length: snapCount }, (_, i) => (
        <button
          key={i}
          type="button"
          data-slider-dot=""
          aria-controls={viewportId}
          aria-label={`Go to slide ${i + 1}`}
          aria-current={i === index ? 'true' : undefined}
          data-selected={i === index ? '' : undefined}
          onClick={() => scrollTo(i)}
        />
      ))}
    </div>
  )
}

export type SliderAutoplayToggleProps = Omit<ComponentProps<'button'>, 'children'> & {
  /** The button's content, or a function of the playing state. Default `'Pause'` / `'Play'`. */
  children?: ReactNode | ((isPlaying: boolean) => ReactNode)
}

/** Stops and restarts autoplay. Renders nothing when the slider has no `autoplay`. */
function SliderAutoplayToggle({ onClick, children, ...props }: SliderAutoplayToggleProps) {
  const { autoplay, viewportId } = useSliderContext()
  if (autoplay === null) return null
  const { isPlaying, play, stop } = autoplay
  return (
    <button
      type="button"
      aria-controls={viewportId}
      aria-label={isPlaying ? 'Stop automatic slide show' : 'Start automatic slide show'}
      data-playing={isPlaying ? '' : undefined}
      {...props}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        if (isPlaying) stop()
        else play()
      }}
    >
      {typeof children === 'function'
        ? children(isPlaying)
        : (children ?? (isPlaying ? 'Pause' : 'Play'))}
    </button>
  )
}

export type SliderThumbsProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** Thumbnails per view; `'auto'` sizes them by content. Default `'auto'`. */
  perView?: number | 'auto'
  /** Space between thumbnails. A number is in pixels. */
  gap?: number | string
  /** Default `'x'`. */
  axis?: Axis
  /** `<Slider.Thumb>` elements, one per main slide. */
  children: ReactNode
}

/**
 * A strip of thumbnails that is a slider of its own, kept on the enclosing slider's index:
 * clicking thumbnail `i` moves the slider to snap `i`, and the matching thumbnail carries
 * `aria-current="true"` and `data-selected`. Assumes the main slider shows one slide per snap.
 */
function SliderThumbs({
  perView = 'auto',
  gap,
  axis = 'x',
  style,
  children,
  ...props
}: SliderThumbsProps) {
  const main = useSliderContext()
  const thumbs = useSlider({ axis, align: 'start', draggable: true })

  useEffect(() => {
    if (main.slider === null || thumbs.slider === null) return
    return syncSliders(main.slider, thumbs.slider)
  }, [main.slider, thumbs.slider])

  // `initial` rather than unset, so the main slider's values are not inherited.
  const variables: CSSVariables = {
    '--slider-per-view': perView === 'auto' ? 'initial' : perView,
    '--slider-gap': gap === undefined ? 'initial' : typeof gap === 'number' ? `${gap}px` : gap,
    '--slider-align': 'start',
    ...style,
  }

  return (
    <div data-slider-thumbs="" style={variables} {...props}>
      <div ref={thumbs.viewportRef} data-slider-viewport="" data-axis={axis}>
        {Children.toArray(children).map((child, i) => (
          <ThumbContext value={i} key={keyOf(child, i)}>
            {child}
          </ThumbContext>
        ))}
      </div>
    </div>
  )
}

/** One thumbnail button. Must be rendered inside `<Slider.Thumbs>`. */
function SliderThumb(props: ComponentProps<'button'>) {
  const { viewportId } = useSliderContext()
  const index = use(ThumbContext)
  if (index === null) throw new Error('<Slider.Thumb> must be rendered inside <Slider.Thumbs>')
  // Selection attributes and the click that navigates belong to `syncSliders`.
  return (
    <button
      type="button"
      data-slider-thumb=""
      aria-controls={viewportId}
      aria-label={`Go to slide ${index + 1}`}
      {...props}
    />
  )
}

export const Slider = Object.assign(SliderRoot, {
  Viewport: SliderViewport,
  Slide: SliderSlide,
  Prev: SliderPrev,
  Next: SliderNext,
  Dots: SliderDots,
  AutoplayToggle: SliderAutoplayToggle,
  Thumbs: SliderThumbs,
  Thumb: SliderThumb,
})

/** The key `Children.toArray` gave an element, or its position for text children. */
function keyOf(child: ReactNode, position: number): string {
  return isValidElement(child) && child.key !== null ? child.key : String(position)
}

/** One callback ref that attaches `own` and the caller's `ref`, stable while both are. */
function useMergedRef<T>(
  own: (element: T | null) => void,
  ref: Ref<T> | undefined
): RefCallback<T> {
  return useCallback(
    (element: T | null) => {
      own(element)
      if (typeof ref === 'function') ref(element)
      else if (ref) ref.current = element
    },
    [own, ref]
  )
}
