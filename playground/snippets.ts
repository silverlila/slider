import type { Snippet } from './code-block'

export const SNIPPETS: Record<string, Snippet[]> = {
  basic: [
    {
      file: 'Basic.tsx',
      source: `
import { Slider } from '@silverlila/slider'
import '@silverlila/slider/styles.css'

export function Basic({ items }: { items: string[] }) {
  return (
    <Slider label="Basic" gap={12}>
      <Slider.Viewport>
        {items.map((item) => (
          <Slider.Slide key={item}>{item}</Slider.Slide>
        ))}
      </Slider.Viewport>
      <Slider.Prev />
      <Slider.Dots />
      <Slider.Next />
    </Slider>
  )
}
`,
    },
  ],

  multiple: [
    {
      file: 'MultiplePerView.tsx',
      source: `
import { Slider, useSliderContext } from '@silverlila/slider'

<Slider label="Multiple per view" perView={3} gap={12} slidesPerMove="auto">
  <Slider.Viewport>
    {items.map((item) => <Slider.Slide key={item}>{item}</Slider.Slide>)}
  </Slider.Viewport>
  <Slider.Prev />
  <Slider.Next />
  <Counter />
</Slider>

// Any component inside <Slider> can read its state.
function Counter() {
  const { index, snapCount } = useSliderContext()
  return <span>{index + 1} / {snapCount}</span>
}
`,
    },
  ],

  responsive: [
    {
      file: 'Responsive.tsx',
      source: `
<Slider label="Responsive" gap={12} slidesPerMove="auto">
  <Slider.Viewport className="responsive">
    {items.map((item) => <Slider.Slide key={item}>{item}</Slider.Slide>)}
  </Slider.Viewport>
  <Slider.Prev />
  <Slider.Next />
</Slider>
`,
    },
    {
      file: 'styles.css',
      source: `
.responsive {
  --slider-per-view: 1;
}

@media (min-width: 640px) {
  .responsive {
    --slider-per-view: 2;
  }
}

@media (min-width: 1024px) {
  .responsive {
    --slider-per-view: 4;
  }
}
`,
    },
  ],

  loop: [
    {
      file: 'Loop.tsx',
      source: `
<Slider label="Loop" loop align="center" perView={1.4} gap={12}>
  <Slider.Viewport>
    {items.map((item) => <Slider.Slide key={item}>{item}</Slider.Slide>)}
  </Slider.Viewport>
  <Slider.Prev />
  <Slider.Dots />
  <Slider.Next />
</Slider>
`,
    },
  ],

  autoplay: [
    {
      file: 'Autoplay.tsx',
      source: `
<Slider label="Autoplay" rewind autoplay={{ delay: 1000 }} gap={12}>
  <Slider.Viewport>
    {items.map((item) => <Slider.Slide key={item}>{item}</Slider.Slide>)}
  </Slider.Viewport>
  <Slider.Prev />
  <Slider.Next />
  {/* Pause / Play by default; pass a function of isPlaying for your own content. */}
  <Slider.AutoplayToggle />
</Slider>
`,
    },
  ],

  effects: [
    {
      file: 'Effects.tsx',
      source: `
<Slider label="Effects" loop align="center" slideProgress perView={1.6} gap={8}>
  <Slider.Viewport>
    {items.map((item) => (
      <Slider.Slide key={item} className="card">
        {item}
      </Slider.Slide>
    ))}
  </Slider.Viewport>
  <Slider.Prev />
  <Slider.Next />
</Slider>
`,
    },
    {
      file: 'styles.css',
      source: `
/* --slide-distance is 0 for the aligned slide and 1 one slide away. */
.card {
  scale: calc(1 - min(var(--slide-distance, 0), 1) * 0.15);
  opacity: calc(1 - min(var(--slide-distance, 0), 1) * 0.5);
}
`,
    },
  ],

  thumbnails: [
    {
      file: 'Gallery.tsx',
      source: `
<Slider label="Gallery" gap={12}>
  <Slider.Viewport>
    {images.map((src) => (
      <Slider.Slide key={src}>
        <img src={src} alt="" />
      </Slider.Slide>
    ))}
  </Slider.Viewport>
  <Slider.Thumbs perView={5} gap={8}>
    {images.map((src) => (
      <Slider.Thumb key={src}>
        <img src={src} alt="" />
      </Slider.Thumb>
    ))}
  </Slider.Thumbs>
  <Slider.Prev />
  <Slider.Next />
</Slider>
`,
    },
  ],

  vertical: [
    {
      file: 'Vertical.tsx',
      source: `
<Slider label="Vertical" axis="y" gap={12}>
  <Slider.Viewport style={{ height: 320 }}>
    {items.map((item) => <Slider.Slide key={item}>{item}</Slider.Slide>)}
  </Slider.Viewport>
  <Slider.Prev />
  <Slider.Next />
</Slider>
`,
    },
  ],

  rtl: [
    {
      file: 'RightToLeft.tsx',
      source: `
<div dir="rtl">
  <Slider label="Right to left" perView={1.2} gap={12}>
    <Slider.Viewport>
      {items.map((item) => <Slider.Slide key={item}>{item}</Slider.Slide>)}
    </Slider.Viewport>
    <Slider.Prev />
    <Slider.Dots />
    <Slider.Next />
  </Slider>
</div>
`,
    },
  ],

  controlled: [
    {
      file: 'Controlled.tsx',
      source: `
import { useState } from 'react'
import { Slider, useSliderContext, useSliderState } from '@silverlila/slider'

function Controlled({ items }: { items: string[] }) {
  const [index, setIndex] = useState(0)
  return (
    <Slider label="Controlled" index={index} onIndexChange={setIndex} gap={12}>
      <Slider.Viewport>
        {items.map((item) => <Slider.Slide key={item}>{item}</Slider.Slide>)}
      </Slider.Viewport>
      <ScrollProgress />
      <button onClick={() => setIndex(0)}>First</button>
      <button onClick={() => setIndex(items.length - 1)}>Last</button>
      <input
        type="range"
        min={0}
        max={items.length - 1}
        value={index}
        onChange={(event) => setIndex(Number(event.target.value))}
      />
    </Slider>
  )
}

// Re-renders on every scroll frame, and only this component does.
function ScrollProgress() {
  const { slider } = useSliderContext()
  const progress = useSliderState(slider, (state) => state.progress)
  return <div className="bar" style={{ scale: \`\${progress} 1\` }} />
}
`,
    },
  ],

  vanilla: [
    {
      file: 'index.html',
      source: `
<div class="slider">
  <div data-slider-viewport tabindex="0" style="--slider-per-view: 1.25; --slider-gap: 12px">
    <div>1</div>
    <div>2</div>
    <div>3</div>
  </div>
  <button id="prev">Previous</button>
  <button id="next">Next</button>
  <span id="counter"></span>
</div>
`,
    },
    {
      file: 'main.ts',
      source: `
import { autoplay, createSlider, renderClones } from '@silverlila/slider/core'
import '@silverlila/slider/styles.css'

const root = document.querySelector<HTMLElement>('.slider')!
const viewport = root.querySelector<HTMLElement>('[data-slider-viewport]')!

const slider = createSlider(viewport, { loop: true, align: 'center' })
const removeClones = renderClones(slider)
const player = autoplay(slider, { delay: 1000, root })

document.querySelector('#prev')!.addEventListener('click', () => slider.prev())
document.querySelector('#next')!.addEventListener('click', () => slider.next())

const counter = document.querySelector('#counter')!
function renderCounter() {
  const { index, snapCount } = slider.getState()
  counter.textContent = \`\${index + 1} / \${snapCount}\`
}
renderCounter()
const unsubscribe = slider.subscribe(renderCounter)

// Teardown
function destroy() {
  unsubscribe()
  player.destroy()
  removeClones()
  slider.destroy()
}
`,
    },
  ],
}
