import { randomUUID } from 'node:crypto'
import { session, WebContentsView, type BrowserWindow, type Rectangle, type Session } from 'electron'
import type { EnterpriseHostedAppState } from '../../shared/enterprise-chat-view'
import type { EnterpriseWebSession } from './web-session'

const LOAD_TIMEOUT_MS = 45_000
const NETWORK_REQUESTS = { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }

interface HostedApplication {
  slug: string
  origin: string
  path: string
}

interface OpenApplication {
  owner: BrowserWindow
  target: HostedApplication
  phase: EnterpriseHostedAppState['phase']
  isolated?: Session
  view?: WebContentsView
  timer?: NodeJS.Timeout
  focused?: boolean
}

export function hostedApplication(origin: string, source: string, destination: string): HostedApplication | undefined {
  if (!URL.canParse(source) || !URL.canParse(destination)) return
  const from = new URL(source)
  const to = new URL(destination)
  if (from.origin !== origin || !/^\/workspace\/(?:apps|square)(?:\/|$)/u.test(from.pathname)) return
  if (to.origin !== origin || to.username || to.password || to.search || to.hash) return
  const slug = /^\/apps\/([a-z0-9][a-z0-9-]{0,95})\/?$/u.exec(to.pathname)?.[1]
  if (slug) return { slug, origin, path: `/apps/${slug}` }
}

function isApplicationURL(target: HostedApplication, raw: string, allowWebSocket = false): boolean {
  if (!URL.canParse(raw)) return false
  const url = new URL(raw)
  // App proxy and Chromium must agree on the route that owns the request.
  if (url.username || url.password || /%(?:2f|5c|25)/iu.test(url.pathname)) return false
  const origin = allowWebSocket ? url.origin.replace(/^ws/u, 'http') : url.origin
  return origin === target.origin && (url.pathname === target.path || url.pathname.startsWith(target.path + '/'))
}

export class HostedAppView {
  private active?: OpenApplication

  constructor(
    private credential: () => EnterpriseWebSession | undefined,
    private changed: () => void,
    private note: (line: string) => void
  ) {}

  snapshot(): EnterpriseHostedAppState | undefined {
    return this.active && { slug: this.active.target.slug, phase: this.active.phase }
  }

  visibleView(): WebContentsView | undefined {
    const view = this.active?.view
    if (view?.getVisible()) return view
  }

  open(owner: BrowserWindow, target: HostedApplication): void {
    if (this.active?.owner === owner && this.active.target.origin === target.origin && this.active.target.path === target.path && this.active.phase !== 'error') return
    this.close()
    const active: OpenApplication = { owner, target, phase: 'loading' }
    this.active = active
    this.changed()
    try {
      this.load(active)
    } catch {
      this.fail(active, 'setup')
    }
  }

  private load(active: OpenApplication): void {
    const { owner, target } = active
    const isolated = session.fromPartition(`enterprise-app-${randomUUID()}`)
    active.isolated = isolated
    const view = new WebContentsView({
      webPreferences: { session: isolated, contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true }
    })
    active.view = view
    view.setVisible(false)
    const contents = view.webContents
    const authorized = (details: { url: string, webContentsId?: number }): EnterpriseWebSession | undefined => {
      if (this.active !== active || active.view !== view || details.webContentsId !== contents.id ||
          !isApplicationURL(target, details.url, true)) return
      const credential = this.credential()
      if (credential && new URL(credential.base).origin === target.origin && credential.expiresAt > Date.now()) return credential
      // A request can hit the view during renewal. Surface expiry as retryable
      // instead of leaving the displayed app with a broken authenticated API.
      queueMicrotask(() => this.fail(active, 'session_expired'))
    }
    isolated.setPermissionCheckHandler(() => false)
    isolated.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
    isolated.webRequest.onBeforeRequest(NETWORK_REQUESTS, (details, callback) => {
      callback({ cancel: !authorized(details) })
    })
    // Keep the enterprise credential out of the app's cookie store and preload.
    // The workspace renews it, and only this app's proxy route receives it.
    isolated.webRequest.onBeforeSendHeaders(NETWORK_REQUESTS, (details, callback) => {
      const credential = authorized(details)
      if (!credential) { callback({ cancel: true }); return }
      const requestHeaders = Object.fromEntries(Object.entries(details.requestHeaders)
        .filter(([key]) => !['cookie', 'authorization'].includes(key.toLowerCase())))
      requestHeaders.Cookie = `${credential.cookieName}=${credential.cookie}`
      callback({ requestHeaders })
    })
    const allowNavigation = (details: Electron.Event<{ url: string }>): void => {
      if (!isApplicationURL(target, details.url)) details.preventDefault()
    }
    contents.on('will-frame-navigate', allowNavigation)
    contents.on('will-redirect', allowNavigation)
    contents.on('will-attach-webview', event => event.preventDefault())
    contents.setWindowOpenHandler(() => ({ action: 'deny' }))
    contents.on('did-navigate', (_event, _url, status) => {
      if (status >= 400) this.fail(active, `http_${status}`)
    })
    contents.once('render-process-gone', () => this.fail(active, 'renderer_gone'))
    contents.once('destroyed', () => {
      if (active.view === view) this.fail(active, 'view_destroyed')
    })
    owner.contentView.addChildView(view)
    active.timer = setTimeout(() => this.fail(active, 'load_timeout'), LOAD_TIMEOUT_MS)
    void contents.loadURL(target.origin + target.path + '/').then(() => {
      if (this.active !== active || active.view !== view) return
      clearTimeout(active.timer)
      active.phase = 'ready'
      this.changed()
    }).catch(() => this.fail(active, 'load'))
  }

  present(bounds: Rectangle | undefined): void {
    const active = this.active
    if (!active?.view) return
    if (bounds) active.view.setBounds(bounds)
    const visible = active.phase === 'ready' && !!bounds && bounds.width > 0 && bounds.height > 0
    active.view.setVisible(visible)
    if (visible && !active.focused) {
      active.focused = true
      active.view.webContents.focus()
    }
  }

  async retry(refresh: () => Promise<boolean>): Promise<void> {
    const active = this.active
    if (active?.phase !== 'error') return
    if (await refresh() && this.active === active && !active.owner.isDestroyed()) this.open(active.owner, active.target)
  }

  close(): boolean {
    const current = this.active
    if (!current) return false
    this.active = undefined
    this.release(current)
    return true
  }

  private fail(active: OpenApplication, stage: string): void {
    if (this.active !== active || active.phase === 'error') return
    active.phase = 'error'
    this.release(active)
    this.note(`[enterprise-app] failed stage=${stage}`)
    this.changed()
  }

  private release(active: OpenApplication): void {
    clearTimeout(active.timer)
    const { view, isolated } = active
    active.view = undefined
    active.isolated = undefined
    // The partition can outlive its view. Deny late requests without retaining
    // the former owner, the view, or the credential callback in its handlers.
    isolated?.webRequest.onBeforeRequest(NETWORK_REQUESTS, (_details, callback) => callback({ cancel: true }))
    isolated?.webRequest.onBeforeSendHeaders(NETWORK_REQUESTS, (_details, callback) => callback({ cancel: true }))
    if (view && !active.owner.isDestroyed()) active.owner.contentView.removeChildView(view)
    const contents = view?.webContents
    if (contents && !contents.isDestroyed()) contents.close()
    if (!isolated) return
    void Promise.all([isolated.clearStorageData(), isolated.closeAllConnections()])
      .catch(() => this.note('[enterprise-app] session_cleanup_failed'))
  }
}
