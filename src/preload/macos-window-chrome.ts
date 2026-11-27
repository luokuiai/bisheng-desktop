const sidebarThemes = new WeakMap<Document, { style: HTMLStyleElement; owners: number }>()

/** Enable Harness's native macOS layout before its client modules mount. */
export function mountMacosWindowChrome(
  doc: Document,
  subscribe: (listener: (fullscreen: boolean) => void) => () => void,
  zoomFactor: () => number = () => 1
): () => void {
  let fullscreen = false
  let theme = sidebarThemes.get(doc)
  if (!theme) {
    theme = { style: doc.createElement('style'), owners: 0 }
    sidebarThemes.set(doc, theme)
  }
  theme.owners++
  const style = theme.style
  style.dataset.dshMacosSidebarTheme = ''
  // The Desktop sidebar uses Harness theme colors over the native window material.
  // This is window chrome: the host owns the transparent macOS BrowserWindow.
  style.textContent = 'html[data-platform="darwin"][data-dsh-desktop-web-shortcuts="true"] [data-dsh-sidebar-root] { background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-base, #f8f8f6)); }'
  const mark = (): void => {
    const root = doc.documentElement
    if (!root) return
    // This host retains Harness's browser keyboard adapter, not the official
    // desktop's native keyboard/settings bridge. Layout and keyboard are separate.
    if (!style.isConnected && doc.head) doc.head.append(style)
    root.dataset.dshDesktopWebShortcuts = 'true'
    root.dataset.platform = 'darwin'
    // The physical traffic lights keep their size when the renderer zooms out.
    const zoom = zoomFactor()
    root.style.setProperty('--dsh-caption-scale', String(zoom > 0 && zoom < 1 ? 1 / zoom : 1))
    if (fullscreen) root.dataset.fullscreen = 'true'
    else delete root.dataset.fullscreen
  }
  mark()
  doc.defaultView?.addEventListener('resize', mark)
  doc.addEventListener('DOMContentLoaded', mark, { once: true })
  const unsubscribe = subscribe(value => {
    fullscreen = value
    mark()
  })
  return () => {
    doc.removeEventListener('DOMContentLoaded', mark)
    doc.defaultView?.removeEventListener('resize', mark)
    unsubscribe()
    if (--theme.owners === 0) {
      style.remove()
      doc.documentElement?.style.removeProperty('--dsh-caption-scale')
      sidebarThemes.delete(doc)
    }
  }
}
