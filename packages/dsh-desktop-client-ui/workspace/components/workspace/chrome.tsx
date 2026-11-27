import { usePageText } from "@/host/context"
import { useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CapabilityButton } from '@/host/capability'
import { RightSidebarToolbarProvider, RightSidebarToolbarSlot } from './right-sidebar-control'
import type { WorkspaceRoute } from './navigation'

/** Navigation and the title bar belong to the desktop shell. */
export function WorkspaceFrame({ children }: { active?: string; children: ReactNode }) {
  return <div className="min-h-full bg-background-full text-text-primary">{children}</div>
}

function subscribeToToolbar(update: () => void) {
  document.addEventListener('luokui:workspace-right-sidebar-slot-ready', update)
  return () => document.removeEventListener('luokui:workspace-right-sidebar-slot-ready', update)
}

const toolbarActions = () => document.querySelector<HTMLElement>('[data-workspace-actions-slot]')

export function TemplateFrame({ route, children }: { route: WorkspaceRoute['id']; children: ReactNode }) {
  const t = usePageText()
  const seat = useSyncExternalStore(subscribeToToolbar, toolbarActions, () => null)
  const actions = (
    <div className="flex shrink-0 items-center justify-end gap-2 px-2">
      <span className="text-caption-2-medium text-text-tertiary">{t('sampleData')}</span>
      {route === 'agents' && <CapabilityButton name="agents">{t('openAgents')}</CapabilityButton>}
      {route === 'code' && <CapabilityButton name="code">{t('openCode')}</CapabilityButton>}
      {route === 'image' && <CapabilityButton name="image">{t('createImage')}</CapabilityButton>}
      {route === 'profile' && <CapabilityButton name="usage">{t('actualUsage')}</CapabilityButton>}
      {route === 'project-board' && <CapabilityButton name="board">{t('openBoard')}</CapabilityButton>}
    </div>
  )
  return <RightSidebarToolbarProvider>
    <section className="workspace-template flex h-full min-h-0 flex-col overflow-hidden bg-background-full text-text-primary">
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      {seat ? createPortal(actions, seat) : actions}
      <RightSidebarToolbarSlot />
    </section>
  </RightSidebarToolbarProvider>
}
