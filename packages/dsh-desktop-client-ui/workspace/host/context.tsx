import { pagesMessages, type PageMessage } from "../pages-messages"
import { createContext, useCallback, useContext, useId, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { UNSAFE_PortalProvider } from 'react-aria'
import { DirectionProvider } from '@/components/foundations/direction/direction'

export type Capability = 'settings' | 'model' | 'usage'
export type ModelStatus = { configured: boolean; model?: string | null; providerLabel?: string | null }
export type TaskSummary = { id: string; title: string; updatedAt?: number | string; status?: string }
export type WorkspaceHost = {
  locale?: string
  t?: (key: PageMessage) => string
  setTheme: (mode: 'light' | 'dark') => void
  openCapability: (name: Capability) => void | Promise<void>
  getModelStatus: (signal: AbortSignal) => ModelStatus | Promise<ModelStatus>
  listTasks: (signal: AbortSignal) => TaskSummary[] | Promise<TaskSummary[]>
  openTask: (id: string) => void | Promise<void>
}
export type WorkspaceProps = {
  path: string
  navigate: (href: string) => void
  host: WorkspaceHost
  entries?: readonly WorkspaceEntry[]
}
export type WorkspaceEntry = { id: string; label: string; description?: string; glyph: ReactNode; open: () => void }
const Context = createContext<(WorkspaceProps & { portal: HTMLElement }) | null>(null)

export function WorkspaceProvider({ path, navigate, host, entries, children }: WorkspaceProps & { children: ReactNode }) {
  const [portal, setPortal] = useState<HTMLElement | null>(null)
  const owner = useId()
  useLayoutEffect(() => {
    const target = document.createElement('div')
    target.className = 'dshWorkspacePortal'
    target.dataset.workspaceOwner = owner
    document.body.append(target)
    setPortal(target)
    return () => target.remove()
  }, [owner])
  const value = useMemo(() => portal && ({ path, navigate, host, entries, portal }), [path, navigate, host, entries, portal])
  if (!value) return null
  return <Context.Provider value={value}>
    <DirectionProvider locale={host.locale || 'zh-CN'}>
      <UNSAFE_PortalProvider getContainer={() => value.portal}>{children}</UNSAFE_PortalProvider>
    </DirectionProvider>
  </Context.Provider>
}

export function useWorkspace() {
  const value = useContext(Context)
  if (!value) throw new Error('The desktop workspace provider is missing')
  return value
}

export function usePageText() {
  const { host } = useWorkspace()
  const dictionary = host.locale?.startsWith('en') ? pagesMessages.en : pagesMessages.zh
  return useCallback((key: PageMessage) => host.t?.(key) ?? dictionary[key], [host, dictionary])
}
