import { shell, WebContentsView, type BrowserWindow, type Rectangle, type Session } from 'electron'
import { join } from 'node:path'
import type { EnterpriseSettingsSection, EnterpriseChatPresentation } from '../../shared/enterprise-chat-view'
import { MODULE_THEME_CSS, moduleThemeScript } from './chat-module-theme'
import { chatLocaleScript } from './chat-locale'
import { chatLayoutCss } from './chat-layout'

const READY_TIMEOUT_MS = 45_000

export class EnterpriseSettingsView {
  readonly view: WebContentsView
  section?: EnterpriseSettingsSection
  failure?: 'load' | 'unsupported'
  private ready = false
  private request = 0
  private timer?: NodeJS.Timeout

  constructor(
    private owner: BrowserWindow,
    isolated: Session,
    private origin: string,
    private changed: () => void,
    private note: (line: string) => void
  ) {
    const view = new WebContentsView({ webPreferences: {
      session: isolated, preload: join(import.meta.dirname, '../preload/enterprise-chat.cjs'),
      contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true
    } })
    this.view = view
    view.setVisible(false)
    const contents = view.webContents
    const allowNavigation = (event: Electron.Event, url: string) => {
      if (new URL(url).origin !== this.origin) event.preventDefault()
    }
    contents.on('will-frame-navigate', event => allowNavigation(event, event.url))
    contents.on('will-redirect', event => allowNavigation(event, event.url))
    contents.on('will-attach-webview', event => event.preventDefault())
    contents.setWindowOpenHandler(({ url }) => {
      if (view.getVisible() && /^https?:\/\//u.test(url)) {
        void shell.openExternal(url).catch(() => this.note('[enterprise-settings] external_link_failed'))
      }
      return { action: 'deny' }
    })
    contents.on('did-start-navigation', (_event, _url, inPage, mainFrame) => {
      if (mainFrame && !inPage && this.section) {
        this.waitForReady()
        this.changed()
      }
    })
    contents.on('did-navigate-in-page', (_event, _url, mainFrame) => {
      if (!mainFrame || !this.section || this.isReady()) return
      this.waitForReady()
      this.changed()
    })
    contents.on('did-finish-load', () => {
      if (!this.section) return
      void contents.insertCSS(`${MODULE_THEME_CSS}\n${chatLayoutCss(process.platform)}`)
        .catch(() => this.note('[enterprise-settings] module_style_failed'))
      this.changed()
    })
    contents.on('render-process-gone', () => this.fail('renderer_gone'))
    contents.on('ipc-message', (event, channel, input: unknown) => {
      if (event.senderFrame !== contents.mainFrame || !this.matchesSection() || !input || typeof input !== 'object') return
      const report = input as Record<string, unknown>
      if (report.path !== `/workspace/settings/${this.section}`) return
      if (channel === 'enterprise-chat:settings-ready' && report.section === this.section) {
        this.ready = true
        this.failure = undefined
        clearTimeout(this.timer)
        this.changed()
      } else if (view.getVisible() && !this.owner.isDestroyed()) {
        if (channel === 'enterprise-chat:settings-close') {
          this.owner.webContents.focus()
          this.owner.webContents.send('enterprise-chat:close-settings')
        } else if (channel === 'enterprise-chat:settings-focus' && (report.direction === 'previous' || report.direction === 'next')) {
          this.owner.webContents.focus()
          this.owner.webContents.send(channel, { section: this.section, direction: report.direction })
        }
      }
    })
    owner.contentView.addChildView(view)
  }

  private matchesSection(): boolean {
    const contents = this.view.webContents
    if (!this.section || contents.isDestroyed()) return false
    const url = new URL(contents.getURL() || 'about:blank')
    return url.origin === this.origin && url.pathname === `/workspace/settings/${this.section}` && url.searchParams.get('dshSettings') === '1'
  }

  isReady(): boolean { return this.ready && this.matchesSection() }

  load(section: EnterpriseSettingsSection, url: string): void {
    this.section = section
    const request = ++this.request
    this.failure = undefined
    this.waitForReady()
    this.changed()
    void this.view.webContents.loadURL(url).catch(error => {
      if (request !== this.request) return
      const code = error && typeof error.code === 'string' && /^[A-Za-z0-9_-]{1,64}$/u.test(error.code) ? error.code : 'transport'
      this.fail(code)
    })
  }

  private waitForReady(): void {
    this.ready = false
    clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.failure = 'unsupported'
      this.note('[enterprise-settings] content_ready_timeout')
      this.changed()
    }, READY_TIMEOUT_MS)
  }

  private fail(code: string): void {
    if (!this.section) return
    clearTimeout(this.timer)
    this.ready = false
    this.failure = 'load'
    this.note(`[enterprise-settings] navigation_failed code=${code}`)
    this.changed()
  }

  present(presentation: EnterpriseChatPresentation, bounds: Rectangle, visible: boolean): void {
    const { theme, palette, locale } = presentation
    const view = this.view
    view.setBounds(bounds)
    view.setBorderRadius(presentation.radius ?? 0)
    const background = palette?.surface.map(channel => channel.toString(16).padStart(2, '0')).join('')
    view.setBackgroundColor(background ? `#${background}` : theme === 'dark' ? '#141416' : '#ffffff')
    view.setVisible(visible && bounds.width > 0 && bounds.height > 0 && this.isReady())
    if (this.matchesSection()) {
      const contents = view.webContents
      void contents.executeJavaScript(moduleThemeScript(theme, palette)).catch(() => this.note('[enterprise-settings] appearance_delivery_failed'))
      if (locale) void contents.executeJavaScript(chatLocaleScript(locale)).catch(() => this.note('[enterprise-settings] locale_delivery_failed'))
    }
  }

  focus(): void {
    if (this.view.getVisible()) this.view.webContents.focus()
  }

  dispose(): void {
    this.request++
    this.section = undefined
    clearTimeout(this.timer)
    if (!this.owner.isDestroyed()) this.owner.contentView.removeChildView(this.view)
    if (!this.view.webContents.isDestroyed()) this.view.webContents.close()
  }
}
