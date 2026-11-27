import { usePageText, useWorkspace } from "@/host/context"
import { useState } from 'react'
import { RiAddLine, RiArrowUpLine, RiSettings3Line } from '@remixicon/react'
import { useCapability } from './capability'

/** Launch the actual Harness draft so model, attachment and permission choices
 * belong to the same session that will send the prompt. */
export function TaskComposer({ name }: { name: 'code' | 'image' }) {
  const t = usePageText()
  const { host } = useWorkspace()
  const saved = host.getTaskDraft?.(name)
  const existing = saved?.sessionId
  const [prompt, setPrompt] = useState(() => saved?.prompt ?? '')
  const { open, busy, error } = useCapability()
  const icon = 'grid size-9 shrink-0 place-items-center rounded-full bg-background-secondary-default text-foreground-icon-secondary hover:bg-background-secondary-hover focus-visible:outline-2 focus-visible:outline-border-focus-ring'
  return <div className="w-full">
    <form className="flex min-h-[52px] w-full items-center gap-2.5 rounded-full bg-background-primary-default p-2 shadow-xs" onSubmit={event => {
      event.preventDefault()
      if (!busy && prompt.trim()) void open(name, prompt.trim())
    }}>
      <button type="button" className={icon} aria-label={t('fullEditor')} title={t('fullEditor')} disabled={busy}
        onClick={() => void open(name, prompt.trim())}><RiAddLine className="size-5" aria-hidden /></button>
      <input aria-label={t('taskPrompt')} value={prompt} onChange={event => { setPrompt(event.target.value); host.setTaskDraft?.(name, event.target.value) }} placeholder={name === 'image' ? t('imagePrompt') : t('codePrompt')}
        className="h-6 min-w-0 flex-1 bg-transparent text-body-regular text-text-primary caret-accent-500 outline-none placeholder:text-text-tertiary"
        onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }} />
      <button type="button" disabled={busy} aria-label={t('configureModel')} title={t('configureModel')} className={icon} onClick={() => void open('model')}><RiSettings3Line className="size-4" aria-hidden /></button>
      <button type="submit" disabled={busy || !prompt.trim()} aria-label={t('openDraft')} title={t('openDraft')} className="grid size-9 shrink-0 place-items-center rounded-full bg-button-primary text-white disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-border-focus-ring">
        <RiArrowUpLine className="size-5" aria-hidden />
      </button>
    </form>
    {(error || saved?.error) && <p role="alert" className="mt-1 px-3 text-caption-1-medium text-text-error-primary">
      {error || saved?.error}
      {existing && <button type="button" className="ms-2 underline" onClick={() => host.openTask(existing)}>{t('editExistingDraft')}</button>}
    </p>}
  </div>
}
