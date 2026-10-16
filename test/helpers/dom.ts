import { onTestFinished } from 'vitest'

export function mount<T extends HTMLElement>(element: T): T {
  document.body.append(element)
  onTestFinished(() => element.remove())
  return element
}

export function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
