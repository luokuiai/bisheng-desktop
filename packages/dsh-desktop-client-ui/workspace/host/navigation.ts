import { useMemo } from 'react'
import { useWorkspace } from './context'

export function useWorkspaceUrl() {
  const { path } = useWorkspace()
  return useMemo(() => new URL(path, 'https://desktop.invalid/'), [path])
}

export function usePathname() {
  return useWorkspaceUrl().pathname
}

export function useSearchParams() {
  return useWorkspaceUrl().searchParams
}
