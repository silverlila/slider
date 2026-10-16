import { Component, type ReactNode } from 'react'
import { onTestFinished, vi } from 'vitest'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    const { error } = this.state
    return error ? <p role="alert">{String(error)}</p> : this.props.children
  }
}

export function silenceCaughtErrorLog() {
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  onTestFinished(() => log.mockRestore())
}
