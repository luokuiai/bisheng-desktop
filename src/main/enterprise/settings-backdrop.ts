import type { BrowserWindow, WebContentsView } from 'electron'
import { setTimeout as delay } from 'node:timers/promises'

const BACKDROP_WORLD = 1040
const HANDOFF_TIMEOUT_MS = 300

async function captureBackdrop(view: WebContentsView, isCurrent: () => boolean): Promise<Electron.NativeImage | undefined> {
  for (let attempt = 0; attempt < 3 && isCurrent(); attempt++) {
    try {
      const image = await view.webContents.capturePage()
      if (!image.isEmpty()) return image
    } catch (error) {
      if (attempt === 2) throw error
    }
    if (attempt < 2) await delay(20)
  }
}

export class SettingsBackdrop {
  private active?: { owner: BrowserWindow, timer?: NodeJS.Timeout, pending: boolean, delivered: boolean }

  constructor(private note: (line: string) => void) {}

  get pending(): boolean { return this.active?.pending === true }

  ensure(owner: BrowserWindow, view: WebContentsView | undefined, radius: number, changed: () => void): void {
    if (this.active) return
    const active = { owner, pending: false, delivered: false, timer: undefined as NodeJS.Timeout | undefined }
    this.active = active
    if (!view?.getVisible()) return
    const { x, y, width, height } = view.getBounds()
    if (!width || !height) return
    const contents = owner.webContents
    const frame = contents.mainFrame
    const zoom = contents.getZoomFactor()
    const origin = new URL(contents.getURL()).origin
    const isCurrent = () => this.active === active && active.pending && !owner.isDestroyed() && contents.mainFrame === frame
    const finish = (stage?: string) => {
      if (!isCurrent()) return
      clearTimeout(active.timer)
      active.pending = false
      if (stage) {
        if (active.delivered) {
          this.remove(owner)
          active.delivered = false
        }
        this.note(`[enterprise-settings] backdrop_failed stage=${stage}`)
      }
      changed()
    }
    active.pending = true
    active.timer = setTimeout(() => finish('timeout'), HANDOFF_TIMEOUT_MS)
    void captureBackdrop(view, isCurrent).then(async image => {
      if (!isCurrent()) return
      if (!image) { finish('empty'); return }
      active.delivered = true
      const rendered: unknown = await contents.executeJavaScriptInIsolatedWorld(BACKDROP_WORLD, [{ code: `
        (async () => {
          if (location.origin !== ${JSON.stringify(origin)}) return false
          const backdrop = document.createElement('div')
          backdrop.setAttribute('aria-hidden', 'true')
          backdrop.style.cssText = 'position:fixed;pointer-events:none;z-index:40;overflow:hidden;left:${x / zoom}px;top:${y / zoom}px;width:${width / zoom}px;height:${height / zoom}px;border-radius:${radius / zoom}px'
          globalThis.__dshSettingsBackdrop?.remove()
          globalThis.__dshSettingsBackdrop = backdrop
          const image = new Image()
          image.alt = ''
          image.style.cssText = 'display:block;width:100%;height:100%'
          image.src = ${JSON.stringify(image.resize({ width, height }).toDataURL())}
          await image.decode()
          if (globalThis.__dshSettingsBackdrop !== backdrop) return false
          backdrop.attachShadow({ mode: 'closed' }).append(image)
          document.body.append(backdrop)
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
          return true
        })()
      ` }])
      finish(rendered === true ? undefined : 'paint')
    }).catch(() => finish(active.delivered ? 'paint' : 'capture'))
  }

  clear(): void {
    const active = this.active
    this.active = undefined
    clearTimeout(active?.timer)
    if (active?.delivered) this.remove(active.owner)
  }

  private remove(owner: BrowserWindow): void {
    if (owner.isDestroyed()) return
    void owner.webContents.executeJavaScriptInIsolatedWorld(BACKDROP_WORLD, [{ code: `
      (() => {
        globalThis.__dshSettingsBackdrop?.remove()
        delete globalThis.__dshSettingsBackdrop
      })()
    ` }]).catch(() => this.note('[enterprise-settings] backdrop_cleanup_failed'))
  }
}
