import type { ReactNode } from 'react'

/** Navigation and the title bar belong to the desktop shell. */
export function WorkspaceFrame({ children }: { active?: string; children: ReactNode }) {
  return <div className="min-h-full bg-background-full text-text-primary">{children}</div>
}
