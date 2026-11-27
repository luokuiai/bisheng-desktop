import { Component, type ReactNode } from 'react'

/** A failed lazy scene stays inside its desktop slot. A new route mounts a
 * fresh boundary, so recovery navigation also works when a chunk is missing. */
export class PageBoundary extends Component<
  { children: ReactNode; message: string; actionLabel: string; onReturn: () => void },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  render() {
    if (!this.state.failed) return this.props.children
    return <section className="grid justify-items-start gap-3 p-6">
      <p role="alert" className="text-body-regular text-text-error-primary">{this.props.message}</p>
      <button type="button" className="rounded-lg border border-border-button-default px-3 py-2 text-body-medium hover:bg-background-secondary-hover focus-visible:outline-2 focus-visible:outline-border-focus-ring"
        onClick={this.props.onReturn}>{this.props.actionLabel}</button>
    </section>
  }
}
