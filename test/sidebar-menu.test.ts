import { EventEmitter } from 'node:events'
import type { BrowserWindow } from 'electron'
import { expect, it, vi } from 'vitest'
import { popupSidebarMenu } from '../src/main/sidebar-menu'

const { buildFromTemplate, popup } = vi.hoisted(() => ({
  buildFromTemplate: vi.fn(), popup: vi.fn()
}))
vi.mock('electron', () => ({ Menu: { buildFromTemplate } }))

function windowFixture() {
  // Electron itself is mocked, so only the native popup's window methods are needed.
  const webContents = { getZoomFactor: () => 1.25 } satisfies Pick<BrowserWindow['webContents'], 'getZoomFactor'>
  return Object.assign(new EventEmitter(), {
    getContentSize: () => [900, 700], webContents
  }) as BrowserWindow
}

it('anchors the native menu in window coordinates and resolves selection or dismissal', async () => {
  const window = windowFixture()
  buildFromTemplate.mockReturnValue({ popup })
  const request = { x: 72, y: 120, labels: ['Tools & skills', 'Reorder navigation'] }
  const open = () => popupSidebarMenu(window, request)
  const selected = open()
  expect(popup.mock.lastCall?.[0]).toMatchObject({ window, x: 90, y: 150 })
  expect(buildFromTemplate.mock.lastCall?.[0][0].label).toBe('Tools && skills')
  expect(await open()).toBeNull()
  buildFromTemplate.mock.lastCall?.[0][1].click()
  popup.mock.lastCall?.[0].callback()
  await expect(selected).resolves.toBe(1)
  const dismissed = open()
  window.emit('closed')
  await expect(dismissed).resolves.toBeNull()
})

it('rejects invalid popup requests before creating a menu', async () => {
  buildFromTemplate.mockClear()
  const window = windowFixture()
  for (const request of [{ x: Infinity, y: 0, labels: ['Choice'] }, { x: 0, y: 0, labels: ['line\nbreak'] }]) {
    await expect(popupSidebarMenu(window, request)).rejects.toThrow('Invalid sidebar menu request.')
  }
  expect(buildFromTemplate).not.toHaveBeenCalled()
})
