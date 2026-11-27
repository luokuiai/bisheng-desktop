// @vitest-environment jsdom
import { readFile } from 'node:fs/promises'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { buildDestinations, createWorkspaceChrome, sidebarShortcut, workspaceScene } from '../packages/dsh-desktop-client-ui/workspace/static/workspace-chrome.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container
const theme = { subscribe: () => () => {}, snapshot: () => 'light', set: vi.fn() }
const pluginEntry = { id: 'panel:plugins', kind: 'panel', route: '/plugins', panelId: 'plugins', icon: 'plugins', label: 'Plugins' }
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
  const snapshot = { workspaceEntries: [pluginEntry] }
  const navigation = { navigate: vi.fn(), snapshot: () => snapshot, host: { openCapability: vi.fn() } }
  const Chrome = createWorkspaceChrome(React, vi.fn())
  const render = () => act(async () => root.render(React.createElement(Chrome, { path: '/', navigation, theme, t: key => key })))
  await render()
  const account = container.querySelector('[data-workspace-account-slot="expanded"]')
  expect(account).not.toBeNull()
  expect(container.querySelector('.dshWorkspaceLibrary')).toBeNull()
  const link = container.querySelector('.dshWorkspaceDirectory [data-workspace-route="/plugins"]')
  link.click()
  expect(navigation.navigate).toHaveBeenCalledWith('/plugins')
  link.focus()
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backslash', metaKey: true, cancelable: true })))
  const toggle = container.querySelector('[data-workspace-sidebar-toggle]')
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(document.activeElement).toBe(toggle)
  expect(container.querySelector('.dshWorkspaceDirectory').hasAttribute('inert')).toBe(true)
  expect(container.querySelector('.dshWorkspaceRail').hasAttribute('inert')).toBe(false)
  expect(container.querySelector('[data-workspace-account-slot="compact"]')).toBe(account)
  const toolbarStart = container.querySelector('.dshWorkspaceToolbarStart')
  expect([...toolbarStart.children].map(button => button.getAttribute('aria-label'))).toEqual(['expand', 'home'])
  expect(toolbarStart.textContent).toBe('')
  container.querySelector('.dshWorkspaceRail [data-workspace-route="/chat"]').click()
  expect(navigation.navigate).toHaveBeenLastCalledWith('/chat')
  await act(async () => root.unmount())
  expect(document.body.hasAttribute('data-dsh-workspace-scene')).toBe(false)
  expect(account.isConnected).toBe(false)
  root = createRoot(container)
  await render()
  expect(document.body.dataset.dshWorkspaceDensity).toBe('compact')
  expect(container.querySelector('[title="native"]')).toBeNull()
  container.querySelector('[title="settings"]').click()
  expect(navigation.host.openCapability).toHaveBeenCalledExactlyOnceWith('settings')
  expect(navigation.navigate).toHaveBeenLastCalledWith('/chat')
  container.querySelector('[title="dark"]').click()
  expect(theme.set).toHaveBeenCalledWith('dark')
})

it('shows one flat list of workbench and native panel entries in the expanded sidebar and shortcut rail', async () => {
  const Chrome = createWorkspaceChrome(React, vi.fn())
  const navigate = vi.fn()
  const openCapability = vi.fn()
  const entries = ['knowledge', 'channel', 'apps', 'capabilities', 'square']
    .map(id => ({ id, label: id, path: `/${id}`, active: false, primary: true }))
  const snapshot = { connected: true, navigation: { entries }, workspaceEntries: [pluginEntry] }
  await act(async () => root.render(React.createElement(Chrome, {
    path: '/', navigation: { navigate, host: { openCapability }, subscribe: () => () => {}, snapshot: () => snapshot }, theme, t: key => key
  })))
  for (const surface of ['.dshWorkspaceDirectory', '.dshWorkspaceRail']) {
    expect([...container.querySelectorAll(`${surface} [data-workspace-route]`)].map(button => button.dataset.workspaceRoute))
      .toEqual(['/', '/chat', '/plugins', '/knowledge', '/channel', '/apps', '/capabilities', '/square'])
  }
  const first = container.querySelector('.dshWorkspaceDirectory nav').firstElementChild
  expect(first.dataset.workspaceRoute).toBe('/')
  expect(first.textContent).toBe('LUOKUI-AI')
  expect(first.querySelector('img').getAttribute('src')).toBe('/desktop-workspace/luokui-ai-logo.png')
  expect(first.getAttribute('aria-label')).toBe('home')
  expect(first.getAttribute('aria-current')).toBe('page')
  expect(container.querySelector('.dshWorkspaceToolbar img')).toBeNull()
  first.click()
  expect(navigate).toHaveBeenCalledWith('/')
  expect(container.querySelector('.dshWorkspaceNavGroup')).toBeNull()
  container.querySelector('.dshWorkspaceToolbar [title="settings"]').click()
  expect(openCapability).toHaveBeenCalledExactlyOnceWith('settings')
  expect(navigate).toHaveBeenCalledExactlyOnceWith('/')
})

it('leaves AI Chat navigation to the native sidebar and keeps a route back to Overview', async () => {
  const Chrome = createWorkspaceChrome(React)
  const navigate = vi.fn()
  await act(async () => root.render(React.createElement(Chrome, {
    path: '/chat', navigation: { navigate }, theme, t: key => key
  })))
  expect(document.body.dataset.dshWorkspaceScene).toBe('chat')
  expect(container.querySelector('aside')).toBeNull()
  expect(container.querySelector('[data-workspace-account-slot]')).toBeNull()
  const home = container.querySelector('.dshWorkspaceToolbar button[aria-label="home"]')
  expect(home.querySelector('use').getAttribute('href')).toBe('/desktop-workspace/workspace-icons.svg#home')
  expect(home.textContent).toBe('')
  home.click()
  expect(navigate).toHaveBeenCalledWith('/')
  await act(async () => container.querySelector('[data-workspace-sidebar-toggle]').click())
  expect(document.body.dataset.dshWorkspaceDensity).toBe('compact')
  expect(container.querySelector('aside')).toBeNull()
  expect(container.querySelector('.dshWorkspaceToolbar button[aria-label="home"]')).toBe(home)
  expect(home.textContent).toBe('')
  home.click()
  expect(navigate).toHaveBeenLastCalledWith('/')
})

it('removes redundant toolbar titles and keeps template parent navigation', async () => {
  const Chrome = createWorkspaceChrome(React, vi.fn())
  const navigate = vi.fn()
  const mount = path => act(async () => root.render(React.createElement(Chrome, { path,
    navigation: { navigate }, theme, t: key => key })))
  await mount('/templates/finance')
  expect(container.querySelector('.dshWorkspaceDirectory')).toBeNull()
  container.querySelector('.dshWorkspaceToolbar [aria-label="templates"]').click()
  expect(navigate).toHaveBeenCalledWith('/templates')
  expect(container.querySelector('.dshWorkspaceRail [aria-current]')).toBeNull()
  await mount('/admin/models')
  expect(container.querySelector('.dshWorkspaceDirectory [aria-current]')).toBeNull()
  expect(container.querySelector('.dshWorkspaceToolbar').textContent).not.toContain('admin')
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

it('hides the header identity on desktop workspace pages while leaving the footer and template previews available', async () => {
  const sheet = document.head.appendChild(document.createElement('style'))
  try {
    sheet.textContent = await readFile('packages/dsh-desktop-client-ui/workspace/static/workspace-chrome.css', 'utf8')
    const Chrome = createWorkspaceChrome(React)
    const navigation = { navigate: vi.fn() }
    const render = path => act(async () => root.render(React.createElement(React.Fragment, null,
      React.createElement(Chrome, { path, navigation, theme, t: key => key }),
      React.createElement('div', { 'data-desktop-workspace-path': path },
        React.createElement('aside', { 'data-dsh-workspace-sidebar': '' },
          React.createElement('div', { 'data-dsh-workspace-sidebar-top': '' },
            React.createElement('div', { 'data-dsh-workspace-sidebar-identity': '', 'data-account': 'top' })),
          React.createElement('button', { 'data-account': 'footer' }, 'Account'))))))
    await render('/')
    expect(getComputedStyle(container.querySelector('[data-account=top]')).display).toBe('none')
    expect(getComputedStyle(container.querySelector('[data-account=footer]')).display).not.toBe('none')
    await render('/templates/finance')
    expect(getComputedStyle(container.querySelector('[data-account=top]')).display).not.toBe('none')
  } finally {
    sheet.remove()
  }
})

it('reserves the toolbar end for the native right sidebar button only while it is present', async () => {
  const sheet = document.head.appendChild(document.createElement('style'))
  try {
    sheet.textContent = await readFile('packages/dsh-desktop-client-ui/workspace/static/workspace-chrome.css', 'utf8')
    container.innerHTML = `
      <header class="dshWorkspaceToolbar">
        <div class="dshWorkspaceToolbarEnd">
          <div data-workspace-session-toolbar>
            <div data-conversation-header-corner><button data-sidebar-right-expand></button></div>
          </div>
          <div class="dshWorkspaceTools"></div>
        </div>
      </header>`
    const corner = container.querySelector('[data-conversation-header-corner]')
    const tools = container.querySelector('.dshWorkspaceTools')
    expect(getComputedStyle(corner).position).toBe('absolute')
    expect(getComputedStyle(tools).marginInlineEnd).toBe('36px')
    corner.firstElementChild.remove()
    expect(getComputedStyle(corner).position).not.toBe('absolute')
    expect(getComputedStyle(tools).marginInlineEnd).not.toBe('36px')
  } finally {
    sheet.remove()
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

it('merges the authorized enterprise entries after the new workbench entries without groups', () => {
  const entries = ['square', 'apps', 'channel', 'knowledge', 'capabilities']
    .map(id => ({ id, label: `label:${id}`, path: `/${id}`, active: false, primary: true }))
  expect(buildDestinations({ entries, workspaceEntries: [pluginEntry] }).map(item => item.route)).toEqual([
    '/', '/chat', '/plugins', '/knowledge', '/channel', '/apps', '/capabilities', '/square'
  ])
  expect(buildDestinations({ entries: [] }).map(item => item.route)).toEqual([
    '/', '/chat'
  ])
  expect(buildDestinations({
    entries: entries.filter(entry => entry.id === 'knowledge'), workspaceEntries: [pluginEntry]
  }).map(item => item.route)).toEqual([
    '/', '/chat', '/plugins', '/knowledge'
  ])
  expect(buildDestinations({ entries }).map(item => item.route))
    .not.toContain('/plugins')
})

it('maps the capabilities entry to tools and skills without duplicating the legacy skills identity', async () => {
  const entries = [
    { id: 'skills', label: '旧技能入口', path: '/skills', active: false, primary: true },
    { id: 'capabilities', label: '工具与技能', path: '/capabilities', active: false, primary: true }
  ]
  const destinations = buildDestinations({ entries })
  expect(destinations.filter(item => item.kind === 'remote')).toEqual([
    expect.objectContaining({ moduleId: 'capabilities', route: '/capabilities', label: '工具与技能' })
  ])

  const fallback = buildDestinations({ entries }).find(item => item.moduleId === 'capabilities')
  expect(fallback?.labelKey).toBe('skills')

  const Chrome = createWorkspaceChrome(React, vi.fn())
  const snapshot = { connected: true, navigation: { entries } }
  await act(async () => root.render(React.createElement(Chrome, {
    path: '/', navigation: {
      navigate: vi.fn(), openRemoteModule: vi.fn(), hasPanel: () => true,
      subscribe: () => () => {}, snapshot: () => snapshot
    },
    theme, t: key => key === 'skills' ? '工具与技能' : key
  })))
  const route = container.querySelector('.dshWorkspaceDirectory [data-workspace-route="/capabilities"]')
  expect(route?.textContent).toContain('工具与技能')
})

it('hides enterprise entries when logged out even if a stale navigation report exists', async () => {
  const Chrome = createWorkspaceChrome(React, vi.fn())
  const entries = ['knowledge', 'channel', 'apps', 'capabilities', 'square']
    .map(id => ({ id, label: id, path: `/${id}`, active: false, primary: true }))
  const snapshot = { connected: false, navigation: { entries } }
  await act(async () => root.render(React.createElement(Chrome, {
    path: '/',
    navigation: { navigate: vi.fn(), subscribe: () => () => {}, snapshot: () => snapshot },
    theme, t: key => key
  })))
  expect([...container.querySelectorAll('.dshWorkspaceDirectory [data-workspace-kind="remote"]')]).toHaveLength(0)
})

it('dispatches remote entries without navigating the local workspace route', async () => {
  const snapshot = { connected: true, navigation: { entries: [
    { id: 'knowledge', label: '知识空间', path: '/knowledge', active: false, primary: true }
  ] } }
  const navigation = {
    navigate: vi.fn(), openRemoteModule: vi.fn(), hasPanel: () => true,
    subscribe: () => () => {},
    snapshot: () => snapshot
  }
  const Chrome = createWorkspaceChrome(React, vi.fn())
  await act(async () => root.render(React.createElement(Chrome, { path: '/', navigation, theme, t: key => key })))
  const labels = [...container.querySelectorAll('.dshWorkspaceDirectory .dshWorkspaceRoute')]
    .filter(button => button.dataset.workspaceRoute === '/knowledge')
  expect(labels).toHaveLength(1)
  expect(labels[0].textContent).toContain('知识空间')
  labels[0].click()
  expect(navigation.openRemoteModule).toHaveBeenCalledWith('knowledge')
  expect(navigation.navigate).not.toHaveBeenCalledWith('/knowledge')
})
