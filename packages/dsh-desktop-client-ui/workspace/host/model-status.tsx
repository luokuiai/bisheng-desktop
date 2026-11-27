import { useEffect, useState } from 'react'
import { RiRefreshLine } from '@remixicon/react'
import { Button } from '@/components/base/buttons/button'
import { usePageText, useWorkspace, type ModelStatus } from './context'
import { CapabilityButton } from './capability'

export function ModelStatusPanel() {
  const t = usePageText()
  const { host } = useWorkspace()
  const [status, setStatus] = useState<ModelStatus>()
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setError('')
    setStatus(undefined)
    Promise.resolve().then(() => host.getModelStatus(controller.signal)).then(next => {
      if (!controller.signal.aborted) setStatus(next)
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : t('modelReadError'))
    })
    return () => controller.abort()
  }, [host, revision, t])
  return <section aria-label={t('modelStatus')} className="flex flex-col items-start gap-3 rounded-3xl border border-border-button-default p-5">
    <h2 className="text-title-3-semibold">{t('modelStatus')}</h2>
    {error ? <p role="alert" className="text-body-regular text-text-error-primary">{error}</p> :
      <p role="status" className="text-body-regular text-text-secondary">{!status ? t('checkingModel') : status.configured ? `${t('modelConfigured')} ${status.providerLabel || t('modelService')}` : t('modelMissing')}</p>}
    {status?.model && <p className="text-body-medium">{t('model')} <code>{status.model}</code></p>}
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" leadingIcon={RiRefreshLine} onClick={() => setRevision(value => value + 1)}>{t('recheck')}</Button>
      <CapabilityButton name="model">{t('configureModel')}</CapabilityButton>
    </div>
  </section>
}
