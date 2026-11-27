import type { AnchorHTMLAttributes } from 'react'
import { useWorkspace } from './context'

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { onNavigate?: () => void }

export default function WorkspaceLink({ href, onClick, onNavigate, children, ...props }: Props) {
  const { navigate } = useWorkspace()
  return <a {...props} href={href} onClick={event => {
    onClick?.(event)
    if (event.defaultPrevented || !href?.startsWith('/') || href.startsWith('//')) return
    event.preventDefault()
    onNavigate?.()
    navigate(href)
  }}>{children}</a>
}
