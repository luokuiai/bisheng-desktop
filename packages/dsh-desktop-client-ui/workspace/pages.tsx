export { pagesMessages } from './pages-messages'
import { usePageText } from "@/host/context"
export { ChatSidebar } from './chat-sidebar'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { WorkspaceProvider, type WorkspaceProps } from './host/context'
import Home from './app/page'
import Link from './host/link'
import { PageBoundary } from './host/page-boundary'
import { useWorkspaceUrl } from './host/navigation'
import { adminSections } from './components/workspace/admin/admin-data'
import { useWorkspace } from './host/context'

const pages = {
  '/': Home,
  '/components': lazy(() => import('./app/components/page')),
  '/lab': lazy(() => import('./app/lab/page')),
  '/charts': lazy(() => import('./app/charts/page')),
  '/icons': lazy(() => import('./app/icons/page')),
  '/templates': lazy(() => import('./app/templates/page')),
  '/model': lazy(() => import('./app/model/page')),
  '/harness': lazy(() => import('./app/harness/page')),
}
const Admin = lazy(() => import('./components/workspace/admin/admin-screen').then(m => ({ default: m.AdminScreen })))
const Template = lazy(() => import('./app/templates/detail'))
const templateNames = ['dashboard', 'finance', 'marketing', 'hr', 'medical-profile'] as const

function PageContent() {
  const t = usePageText()
  const url = useWorkspaceUrl()
  const { navigate } = useWorkspace()
  const frame = useRef<HTMLDivElement>(null)
  // After a lazy page resolves, target the actual in-pane anchor, including
  // navigating directly from the directory to a lab demonstration.
  useEffect(() => {
    const root = frame.current
    if (!root) return
    if (!url.hash) { root.scrollTop = 0; return }
    let id: string
    try { id = decodeURIComponent(url.hash.slice(1)) } catch { return }
    if (!id || id.startsWith('ticket=')) return
    const reveal = () => {
      const target = root.querySelector(`#${CSS.escape(id)}`)
      if (target) target.scrollIntoView({ block: 'start' })
      return Boolean(target)
    }
    if (reveal()) return
    const observer = new MutationObserver(() => { if (reveal()) observer.disconnect() })
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [url])
  const Page = Object.hasOwn(pages, url.pathname) ? pages[url.pathname as keyof typeof pages] : null
  const admin = adminSections.find(item => item.href === url.pathname)
  const template = templateNames.find(name => url.pathname === `/templates/${name}`)
  return <div ref={frame} data-desktop-workspace-path={url.pathname} className="h-full min-h-0 w-full overflow-auto bg-background-full text-text-primary"
    onClick={event => {
      if (event.defaultPrevented || !(event.target instanceof Element)) return
      const link = event.target.closest('a')
      const href = link?.getAttribute('href')
      if (!href || !href.startsWith('/') || href.startsWith('//') || link?.hasAttribute('download')) return
      event.preventDefault()
      navigate(href)
    }}>
    <PageBoundary key={url.pathname} message={t('pageFailed')} actionLabel={url.pathname === '/' ? t('openChat') : t('returnHome')}
      onReturn={() => navigate(url.pathname === '/' ? '/chat' : '/')}>
      <Suspense fallback={<p role="status" className="px-6 py-5 text-body-regular text-text-secondary">{t('loadingWorkspace')}</p>}>
        {Page ? <Page key={url.pathname} /> : admin ? <Admin section={admin.id} /> : template ? <Template slug={template} /> :
          <main className="grid gap-3 p-6"><h1 className="text-title-2-semibold">{t('missingPage')}</h1><Link href="/">{t('returnHome')}</Link></main>}
      </Suspense>
    </PageBoundary>
  </div>
}

export function WorkspacePages(props: WorkspaceProps) {
  return <WorkspaceProvider {...props}><PageContent /></WorkspaceProvider>
}
