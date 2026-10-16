import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Slider, useSliderContext, useSliderState } from '../src/react'
import { CodeBlock, type Snippet } from './code-block'
import logoUrl from './logo.svg'
import { SNIPPETS } from './snippets'
import { mountVanillaSlider } from './vanilla'

type HueStyle = CSSProperties & { '--hue': number }

function hueStyle(index: number): HueStyle {
  return { '--hue': (215 + index * 47) % 360 }
}

function cards(count: number, className = 'card'): ReactNode[] {
  return Array.from({ length: count }, (_, i) => (
    <Slider.Slide key={i} className={className} style={hueStyle(i)}>
      <span className="card-number">{i + 1}</span>
    </Slider.Slide>
  ))
}

function Chevron({ back = false }: { back?: boolean }) {
  return (
    <svg
      className={back ? 'chevron chevron--back' : 'chevron'}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7.5 4.5 13 10l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PrevButton() {
  return (
    <Slider.Prev className="icon-button">
      <Chevron back />
    </Slider.Prev>
  )
}

function NextButton() {
  return (
    <Slider.Next className="icon-button">
      <Chevron />
    </Slider.Next>
  )
}

function Counter() {
  const { index, snapCount } = useSliderContext()
  return (
    <span className="counter">
      {index + 1} / {snapCount}
    </span>
  )
}

function Demo({
  id,
  title,
  description,
  code,
  children,
}: {
  id: string
  title: string
  description: ReactNode
  code: Snippet[]
  children: ReactNode
}) {
  return (
    <section className="demo" aria-labelledby={`${id}-title`}>
      <header className="demo-header">
        <h2 id={`${id}-title`}>{title}</h2>
        <p>{description}</p>
      </header>
      {children}
      {code.map((snippet) => (
        <CodeBlock key={snippet.file} {...snippet} />
      ))}
    </section>
  )
}

function BasicDemo() {
  return (
    <Demo
      id="basic"
      code={SNIPPETS.basic}
      title="Basic"
      description="One slide per view with buttons and dots."
    >
      <Slider label="Basic" gap={12} className="slider">
        <Slider.Viewport className="viewport">{cards(5)}</Slider.Viewport>
        <div className="controls controls--spread">
          <PrevButton />
          <Slider.Dots className="dots" />
          <NextButton />
        </div>
      </Slider>
    </Demo>
  )
}

function MultipleDemo() {
  return (
    <Demo
      id="multiple"
      code={SNIPPETS.multiple}
      title="Multiple per view"
      description={
        <>
          Three cards per view; <code>slidesPerMove="auto"</code> moves by as many as fully fit.
        </>
      }
    >
      <Slider
        label="Multiple per view"
        perView={3}
        gap={12}
        slidesPerMove="auto"
        className="slider"
      >
        <Slider.Viewport className="viewport">{cards(12, 'card card--small')}</Slider.Viewport>
        <div className="controls">
          <PrevButton />
          <NextButton />
          <Counter />
        </div>
      </Slider>
    </Demo>
  )
}

function ResponsiveDemo() {
  return (
    <Demo
      id="responsive"
      code={SNIPPETS.responsive}
      title="Responsive"
      description={
        <>
          Media queries set <code>--slider-per-view</code>: one card on phones, two from 640px, four
          from 1024px. Resize the window and the snap count follows.
        </>
      }
    >
      <Slider label="Responsive" gap={12} slidesPerMove="auto" className="slider">
        <Slider.Viewport className="viewport viewport--responsive">
          {cards(8, 'card card--small')}
        </Slider.Viewport>
        <div className="controls">
          <PrevButton />
          <NextButton />
          <Counter />
        </div>
      </Slider>
    </Demo>
  )
}

function LoopDemo() {
  return (
    <Demo
      id="loop"
      code={SNIPPETS.loop}
      title="Loop, centred"
      description="An infinite loop with the neighbours peeking in. Keep going in either direction."
    >
      <Slider label="Loop" loop align="center" perView={1.4} gap={12} className="slider">
        <Slider.Viewport className="viewport">{cards(5)}</Slider.Viewport>
        <div className="controls controls--spread">
          <PrevButton />
          <Slider.Dots className="dots" />
          <NextButton />
        </div>
      </Slider>
    </Demo>
  )
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="1" fill="currentColor" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M5 2.8v10.4a.8.8 0 0 0 1.2.7l8-5.2a.8.8 0 0 0 0-1.4l-8-5.2a.8.8 0 0 0-1.2.7Z"
        fill="currentColor"
      />
    </svg>
  )
}

function AutoplayDemo() {
  return (
    <Demo
      id="autoplay"
      code={SNIPPETS.autoplay}
      title="Rewind and autoplay"
      description="Advances every second and rewinds to the first slide at the end. Hovering or focusing the slider pauses it; dragging, wheeling or a key press stops it."
    >
      <Slider label="Autoplay" rewind autoplay={{ delay: 1000 }} gap={12} className="slider">
        <Slider.Viewport className="viewport">{cards(5)}</Slider.Viewport>
        <div className="controls">
          <PrevButton />
          <NextButton />
          <Slider.AutoplayToggle className="button">
            {(isPlaying) =>
              isPlaying ? (
                <>
                  <PauseIcon /> Pause
                </>
              ) : (
                <>
                  <PlayIcon /> Play
                </>
              )
            }
          </Slider.AutoplayToggle>
          <Counter />
        </div>
      </Slider>
    </Demo>
  )
}

function EffectsDemo() {
  return (
    <Demo
      id="effects"
      code={SNIPPETS.effects}
      title="Effects"
      description={
        <>
          <code>slideProgress</code> writes <code>--slide-distance</code> on every slide each frame;
          plain CSS turns it into scale and fade.
        </>
      }
    >
      <Slider
        label="Effects"
        loop
        align="center"
        slideProgress
        perView={1.6}
        gap={8}
        className="slider"
      >
        <Slider.Viewport className="viewport">{cards(6, 'card card--effect')}</Slider.Viewport>
        <div className="controls">
          <PrevButton />
          <NextButton />
        </div>
      </Slider>
    </Demo>
  )
}

const GALLERY_SIZE = 8

function ThumbnailsDemo() {
  return (
    <Demo
      id="thumbnails"
      code={SNIPPETS.thumbnails}
      title="Thumbnails"
      description="The strip follows the gallery, and choosing a thumbnail moves the gallery."
    >
      <Slider label="Gallery" gap={12} className="slider">
        <Slider.Viewport className="viewport">{cards(GALLERY_SIZE)}</Slider.Viewport>
        <Slider.Thumbs perView={5} gap={8} className="thumbs">
          {Array.from({ length: GALLERY_SIZE }, (_, i) => (
            <Slider.Thumb key={i} className="thumb" style={hueStyle(i)}>
              {i + 1}
            </Slider.Thumb>
          ))}
        </Slider.Thumbs>
        <div className="controls">
          <PrevButton />
          <NextButton />
          <Counter />
        </div>
      </Slider>
    </Demo>
  )
}

function VerticalDemo() {
  return (
    <Demo
      id="vertical"
      code={SNIPPETS.vertical}
      title="Vertical"
      description={<code>axis="y"</code>}
    >
      <Slider label="Vertical" axis="y" gap={12} className="slider slider--vertical">
        <Slider.Viewport className="viewport viewport--vertical">
          {cards(5, 'card card--fill')}
        </Slider.Viewport>
        <div className="controls">
          <PrevButton />
          <NextButton />
          <Counter />
        </div>
      </Slider>
    </Demo>
  )
}

function RtlDemo() {
  return (
    <Demo
      id="rtl"
      code={SNIPPETS.rtl}
      title="Right to left"
      description={
        <>
          Inside <code>dir="rtl"</code> the first slide starts at the right and Next moves left.
        </>
      }
    >
      <div dir="rtl">
        <Slider label="Right to left" perView={1.2} gap={12} className="slider">
          <Slider.Viewport className="viewport">{cards(5)}</Slider.Viewport>
          <div className="controls controls--spread">
            <PrevButton />
            <Slider.Dots className="dots" />
            <NextButton />
          </div>
        </Slider>
      </div>
    </Demo>
  )
}

function ScrollProgress() {
  const { slider } = useSliderContext()
  const progress = useSliderState(slider, (state) => state.progress)
  return (
    <div className="progress" aria-hidden="true">
      <div className="progress-bar" style={{ scale: `${progress} 1` }} />
    </div>
  )
}

const CONTROLLED_SIZE = 8

function ControlledDemo() {
  const [index, setIndex] = useState(0)
  return (
    <Demo
      id="controlled"
      code={SNIPPETS.controlled}
      title="Controlled"
      description={
        <>
          <code>index</code> and <code>onIndexChange</code> keep the slider and the outside controls
          in step. The bar reads <code>progress</code> with <code>useSliderState</code>.
        </>
      }
    >
      <Slider label="Controlled" index={index} onIndexChange={setIndex} gap={12} className="slider">
        <Slider.Viewport className="viewport">{cards(CONTROLLED_SIZE)}</Slider.Viewport>
        <ScrollProgress />
        <div className="controls">
          <button
            type="button"
            className="button"
            disabled={index === 0}
            onClick={() => setIndex(0)}
          >
            First
          </button>
          <button
            type="button"
            className="button"
            disabled={index === CONTROLLED_SIZE - 1}
            onClick={() => setIndex(CONTROLLED_SIZE - 1)}
          >
            Last
          </button>
          <label className="range-field">
            <span className="counter">Slide {index + 1}</span>
            <input
              type="range"
              min={0}
              max={CONTROLLED_SIZE - 1}
              value={index}
              onChange={(event) => setIndex(Number(event.target.value))}
            />
          </label>
        </div>
      </Slider>
    </Demo>
  )
}

function VanillaDemo() {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = container.current
    if (element === null) return
    return mountVanillaSlider(element)
  }, [])

  return (
    <Demo
      id="vanilla"
      code={SNIPPETS.vanilla}
      title="Plain JavaScript"
      description={
        <>
          No React: <code>createSlider</code>, <code>renderClones</code> and <code>autoplay</code>{' '}
          from <code>@silverlila/slider/core</code> on hand-written markup.
        </>
      }
    >
      <div ref={container} />
    </Demo>
  )
}

export function App() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>
          <img src={logoUrl} alt="" width={32} height={32} />
          @silverlila/slider
        </h1>
        <p>
          Sliders that move with the browser’s own scrolling. Swipe, drag with the mouse, scroll
          with a trackpad or wheel, or focus a slider and use the arrow keys.
        </p>
      </header>
      <BasicDemo />
      <MultipleDemo />
      <ResponsiveDemo />
      <LoopDemo />
      <AutoplayDemo />
      <EffectsDemo />
      <ThumbnailsDemo />
      <VerticalDemo />
      <RtlDemo />
      <ControlledDemo />
      <VanillaDemo />
    </main>
  )
}
