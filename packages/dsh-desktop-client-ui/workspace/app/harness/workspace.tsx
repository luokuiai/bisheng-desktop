import { useEffect, useState } from 'react'
import { RiArrowRightLine, RiRefreshLine } from '@remixicon/react'
import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { usePageText, useWorkspace, type TaskSummary } from '@/host/context'

const panel = 'rounded-3xl border border-separator-border bg-background-primary-default p-4 sm:p-5'

export function HarnessWorkspace() {
  const t = usePageText()
  const { host, navigate } = useWorkspace()
  const [revision, setRevision] = useState(0)
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [opening, setOpening] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setError('')
    setTasks(null)
    Promise.resolve().then(() => host.listTasks(controller.signal)).then(records => {
      if (!controller.signal.aborted) setTasks(records)
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : t('taskConnectionError'))
    })
    return () => controller.abort()
  }, [host, revision, t])
  async function openTask(id: string) {
    setError('')
    setOpening(id)
    try {
      await host.openTask(id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('openTaskError'))
    } finally { setOpening(null) }
  }
  const matches = tasks?.filter(task => task.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-5 py-8 sm:px-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-display-4-semibold">{t('taskConsole')}</h1>
      <Button variant="secondary" leadingIcon={RiRefreshLine} onClick={() => setRevision(n => n + 1)}>{t('refresh')}</Button>
    </div>
    <section className={panel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title-3-semibold">{t('workspaceTasks')}</h2>
        <Button onClick={() => navigate('/chat')}>{t('enterChat')}</Button>
      </div>
      <Input aria-label={t('filterTasks')} placeholder={t('titleFilter')} value={query} onChange={setQuery} />
      {error && <p role="alert" className="mt-4 text-body-regular text-text-error-primary">{error}</p>}
      {!error && !tasks && <p role="status" className="mt-4 text-body-regular text-text-secondary">{t('loadingTasks')}</p>}
      {matches?.length === 0 && <p role="status" className="mt-4 text-body-regular text-text-secondary">{query.trim() ? t('noMatches') : t('noTasks')}</p>}
      <ul className="mt-4 flex flex-col divide-y divide-separator-border">
        {matches?.map(task => <li key={task.id}>
          <button type="button" disabled={opening !== null} onClick={() => void openTask(task.id)}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-start text-body-medium hover:bg-background-secondary-hover focus-visible:outline-2 focus-visible:outline-border-focus-ring">
            <span className="min-w-0 truncate">{task.title}</span>
            <span className="flex shrink-0 items-center gap-2 text-caption-1-medium text-text-secondary">
              {task.status === 'running' || task.status === 'idle' ? t(task.status) : task.status} <RiArrowRightLine aria-hidden className="size-4" />
            </span>
          </button>
        </li>)}
      </ul>
    </section>
  </main>
}
