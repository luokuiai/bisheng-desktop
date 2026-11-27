import { useEffect, useRef, useState } from 'react'
import { usePageText, useWorkspace, type Capability } from './context'
import { RiArrowRightUpLine } from '@remixicon/react'
import { Button } from '@/components/base/buttons/button'

export function useCapability() {
  const t = usePageText()
  const { host } = useWorkspace()
  const alive = useRef(false)
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  async function open(name: Capability, prompt?: string) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await host.openCapability(name, prompt ? { prompt } : undefined)
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message : t('openError'))
    } finally {
      pending.current = false
      if (alive.current) setBusy(false)
    }
  }
  return { open, busy, error }
}

export function CapabilityButton({ name, children }: { name: Capability; children: string }) {
  const { open, busy, error } = useCapability()
  return <div className="flex flex-wrap items-center gap-2">
    <Button variant="secondary" size="small" leadingIcon={RiArrowRightUpLine} disabled={busy}
      onClick={() => void open(name)}>{children}</Button>
    {error && <span role="alert" className="text-caption-1-medium text-text-error-primary">{error}</span>}
  </div>
}
