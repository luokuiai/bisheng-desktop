import { Menu, type BrowserWindow } from 'electron'
import { parseSidebarMenuRequest } from '../shared/sidebar-menu'

const activeMenus = new WeakSet<BrowserWindow>()

/** The system menu floats above both Electron renderers and handles dismissal. */
export async function popupSidebarMenu(window: BrowserWindow, value: unknown): Promise<number | null> {
  const request = parseSidebarMenuRequest(value)
  if (activeMenus.has(window)) return null
  const zoom = window.webContents.getZoomFactor()
  const [width = 1, height = 1] = window.getContentSize()
  const x = Math.max(0, Math.min(width - 1, Math.round(request.x * zoom)))
  const y = Math.max(0, Math.min(height - 1, Math.round(request.y * zoom)))
  activeMenus.add(window)
  try {
    return await new Promise<number | null>(resolve => {
      let selected: number | null = null
      const onClose = (): void => {
        window.removeListener('closed', onClose)
        resolve(selected)
      }
      const menu = Menu.buildFromTemplate(request.labels.map((label, index) => ({
        label: label.replace(/&/gu, '&&'),
        click: () => { selected = index }
      })))
      window.once('closed', onClose)
      try {
        menu.popup({ window, x, y, callback: onClose })
      } catch (error) {
        window.removeListener('closed', onClose)
        throw error
      }
    })
  } finally {
    activeMenus.delete(window)
  }
}
