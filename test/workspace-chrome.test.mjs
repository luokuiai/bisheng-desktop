// @vitest-environment jsdom
import { readFile } from 'node:fs/promises'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createWorkspaceChrome, sidebarShortcut, workspaceScene } from '../packages/dsh-desktop-client-ui/workspace/static/workspace-chrome.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container
const theme = { subscribe: () => () => {}, snapshot: () => 'light', set: vi.fn() }
beforeEach(() => {
  vi.stubGlobal('localStorage', globalThis.jsdom.window.localStorage)
  window.localStorage.removeItem('dsh-desktop:workspace:compact')
  document.documentElement.dataset.platform = 'darwin'
  container = document.body.appendChild(document.createElement('div'))
  root = createRoot(container)
})
afterEach(async () => {
  if (root) await act(async () => root.unmount())
  container.remove()
  delete document.documentElement.dataset.platform
  vi.unstubAllGlobals()
})

it('opens directory links, switches to the persistent rail and transfers focus on keyboard collapse', async () => {
  const navigation = { navigate: vi.fn(), openDesktop: vi.fn() }
  const Chrome = createWorkspaceChrome(React, vi.fn())
  const render = () => act(async () => root.render(React.createElement(Chrome, { path: '/', navigation, theme, t: key => key })))
  await render()
  const account = container.querySelector('[data-workspace-account-slot="expanded"]')
  expect(account).not.toBeNull()
  expect(container.querySelector('.dshWorkspaceLibrary')).toBeNull()
  const link = container.querySelector('.dshWorkspaceDirectory [data-workspace-route="/project-board"]')
  link.click()
  expect(navigation.navigate).toHaveBeenCalledWith('/project-board')
  link.focus()
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backslash', metaKey: true, cancelable: true })))
  const toggle = container.querySelector('[data-workspace-sidebar-toggle]')
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(document.activeElement).toBe(toggle)
  expect(container.querySelector('.dshWorkspaceDirectory').hasAttribute('inert')).toBe(true)
  expect(container.querySelector('.dshWorkspaceRail').hasAttribute('inert')).toBe(false)
  expect(container.querySelector('[data-workspace-account-slot="compact"]')).toBe(account)
  await act(async () => root.unmount())
  expect(document.body.hasAttribute('data-dsh-workspace-scene')).toBe(false)
  expect(account.isConnected).toBe(false)
  root = createRoot(container)
  await render()
  expect(document.body.dataset.dshWorkspaceDensity).toBe('compact')
  expect(container.querySelector('[title="native"]')).toBeNull()
  container.querySelector('[title="settings"]').click()
  expect(navigation.navigate).toHaveBeenLastCalledWith('/settings')
  container.querySelector('[title="dark"]').click()
  expect(theme.set).toHaveBeenCalledWith('dark')
})

it('shows only workspace links in the expanded sidebar and shortcut rail', async () => {
  const Chrome = createWorkspaceChrome(React, vi.fn())
  const navigate = vi.fn()
  await act(async () => root.render(React.createElement(Chrome, {
    path: '/', navigation: { navigate }, theme, t: key => key
  })))
  for (const surface of ['.dshWorkspaceDirectory', '.dshWorkspaceRail']) {
    expect([...container.querySelectorAll(`${surface} [data-workspace-route]`)].map(button => button.dataset.workspaceRoute))
      .toEqual(['/', '/chat', '/multi-agent-chat', '/ai-chat', '/ai-image-generation', '/project-board'])
  }
  expect([...container.querySelectorAll('.dshWorkspaceNavGroup')].map(group => group.textContent)).toEqual(['spaces'])
  container.querySelector('.dshWorkspaceToolbar [title="settings"]').click()
  expect(navigate).toHaveBeenCalledWith('/settings')
})

it('keeps a page-owned sidebar out of the expanded directory and preserves template breadcrumbs', async () => {
  const Chrome = createWorkspaceChrome(React, vi.fn())
  const navigate = vi.fn()
  const mount = path => act(async () => root.render(React.createElement(Chrome, { path,
    navigation: { navigate }, theme, t: key => key })))
  await mount('/templates/finance')
  expect(container.querySelector('.dshWorkspaceDirectory')).toBeNull()
  container.querySelector('.dshWorkspaceParentLink').click()
  expect(navigate).toHaveBeenCalledWith('/templates')
  expect(container.querySelector('.dshWorkspaceRail [aria-current]')).toBeNull()
  await mount('/admin/models')
  expect(container.querySelector('.dshWorkspaceDirectory [aria-current]')).toBeNull()
  expect(container.querySelector('.dshWorkspaceTitle').textContent).toBe('admin')
  expect(workspaceScene('/chat')).toBe('chat')
})

it('accepts a remapped shortcut and rejects unrelated shortcuts and modifiers', () => {
  const event = { code: 'KeyB', ctrlKey: false, altKey: true, shiftKey: false, metaKey: true }
  const binding = { code: 'KeyB', modifiers: ['meta', 'alt'] }
  expect(sidebarShortcut(event, binding, true)).toBe(true)
  expect(sidebarShortcut({ ...event, shiftKey: true }, binding, true)).toBe(false)
  expect(sidebarShortcut({ ...event, isComposing: true }, binding, true)).toBe(false)
  expect(sidebarShortcut({ ...event, code: 'Backslash', altKey: false, ctrlKey: true, metaKey: false }, undefined, false)).toBe(true)
})

it('removes the underlying Harness navigation from the tab order only while a workspace page is active', async () => {
  const sheet = document.head.appendChild(document.createElement('style'))
  const frame = document.body.appendChild(document.createElement('div'))
  try {
    sheet.textContent = await readFile('packages/dsh-desktop-client-ui/workspace/static/workspace-chrome.css', 'utf8')
    // Harness wraps slot components in a display:contents provider.
    frame.innerHTML = '<div><div data-slot="sidebar" style="display:contents"><div data-dsh-sidebar-root><button>Native</button></div></div></div><div data-shell-overlay></div>'
    const nativeColumn = frame.querySelector('[data-dsh-sidebar-root]')
    const Chrome = createWorkspaceChrome(React, vi.fn())
    const navigation = { navigate: vi.fn(), openDesktop: vi.fn() }
    await act(async () => root.render(React.createElement(Chrome, { path: '/', navigation, theme, t: key => key })))
    expect(getComputedStyle(nativeColumn).display).toBe('none')
    await act(async () => root.render(null))
    expect(getComputedStyle(nativeColumn).display).not.toBe('none')
  } finally {
    sheet.remove()
    frame.remove()
  }
})

it('keeps one toolbar and one right-side portal when the native plugin replaces its template', async () => {
  const Chrome = createWorkspaceChrome(React, vi.fn())
  const expandBotSidebar = vi.fn()
  const render = (path, native) => act(async () => root.render(React.createElement(Chrome, { path, native, expandBotSidebar,
    navigation: { navigate: vi.fn() }, theme, t: key => key })))
  await render('/multi-agent-chat', false)
  const portal = container.querySelector('[data-workspace-right-sidebar-slot]')
  await render('/multi-agent-chat', true)
  expect(document.body.dataset.dshWorkspaceNative).toBe('agents')
  expect(expandBotSidebar).toHaveBeenCalledOnce()
  expect(container.querySelectorAll('.dshWorkspaceToolbar')).toHaveLength(1)
  expect(container.querySelector('[data-workspace-right-sidebar-slot]')).toBe(portal)
  const botPanel = document.body.appendChild(document.createElement('aside'))
  botPanel.className = 'bt-leftcol'
  try {
    botPanel.appendChild(document.createElement('button')).focus()
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backslash', metaKey: true, cancelable: true })))
    expect(document.activeElement).toBe(container.querySelector('[data-workspace-sidebar-toggle]'))
  } finally {
    botPanel.remove()
  }
  await render('/ai-image-generation', true)
  expect(document.body.dataset.dshWorkspaceNative).toBe('image')
  await render('/', false)
  expect(document.body.hasAttribute('data-dsh-workspace-native')).toBe(false)
})
