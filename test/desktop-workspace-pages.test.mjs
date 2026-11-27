// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { WorkspaceProvider } from '../packages/dsh-desktop-client-ui/workspace/host/context'
import { TaskComposer } from '../packages/dsh-desktop-client-ui/workspace/host/composer'
import { ModelStatusPanel } from '../packages/dsh-desktop-client-ui/workspace/host/model-status'
import { HarnessWorkspace } from '../packages/dsh-desktop-client-ui/workspace/app/harness/workspace'
import { RightSidebarButton } from '../packages/dsh-desktop-client-ui/workspace/components/workspace/right-sidebar-control'
import { ChatSidebar } from '../packages/dsh-desktop-client-ui/workspace/chat-sidebar'
import HomePage from '../packages/dsh-desktop-client-ui/workspace/app/page'
import TemplatesPage from '../packages/dsh-desktop-client-ui/workspace/app/templates/page'
import SettingsPage from '../packages/dsh-desktop-client-ui/workspace/app/settings/page'
import { PageBoundary } from '../packages/dsh-desktop-client-ui/workspace/host/page-boundary'
import { inertWhen } from '../packages/dsh-desktop-client-ui/workspace/host/inert'
import Links from '../packages/dsh-desktop-client-ui/workspace/host/link'

vi.mock('../packages/dsh-desktop-client-ui/workspace/components/workspace/hero-agents', () => ({ HeroAgents: () => null }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container, host, navigate

beforeEach(() => {
  container = document.body.appendChild(document.createElement('div'))
  root = createRoot(container)
  host = { locale: 'en', openCapability: vi.fn(), listTasks: vi.fn(), openTask: vi.fn() }
  navigate = vi.fn()
})

afterEach(async () => {
  await act(async () => root.unmount())
  expect(document.querySelector('.dshWorkspacePortal')).toBeNull()
  container.remove()
  vi.unstubAllGlobals()
})

async function mount(component, props) {
  await act(async () => root.render(React.createElement(WorkspaceProvider, { path: '/', host, navigate },
    React.createElement(component, props))))
}

it.each([['zh-CN', '开始对话', '6 个入口'], ['en', 'Start a chat', '6 destinations']])(
  'shows only the chat action and six workspace cards on the overview in %s', async (locale, chatLabel, count) => {
    host.locale = locale
    await mount(HomePage)
    const [hero, workspaces] = container.querySelectorAll('main > section')
    expect([...hero.querySelectorAll('a')].map(link => [link.getAttribute('href'), link.textContent.trim()]))
      .toEqual([['/chat', chatLabel]])
    expect(workspaces.querySelector('header').textContent).toContain(count)
    expect([...workspaces.querySelectorAll('a')].map(link => link.getAttribute('href'))).toEqual([
      '/chat', '/multi-agent-chat', '/ai-chat', '/ai-image-generation', '/ai-profile', '/project-board'
    ])
    expect(container.querySelectorAll('main > section')).toHaveLength(2)
    await act(async () => hero.querySelector('a').click())
    expect(navigate).toHaveBeenCalledWith('/chat')
  })

it('omits AI activity from the shared workspace sidebar', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  await mount(ChatSidebar, { path: '/chat', host, navigate })
  const sidebar = container.querySelector('.dshWorkspaceChatSidebar')
  expect(sidebar.querySelector('a[href="/project-board"]')).not.toBeNull()
  expect(sidebar.querySelector('a[href="/ai-profile"]')).toBeNull()
})

it('renders the shared flat destination list when the chat scene receives one', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  const icon = () => null
  const items = [
    { key: 'home', label: '总览', icon, href: '/' },
    { key: 'knowledge', label: '知识空间', icon, href: '/knowledge' }
  ]
  await mount(ChatSidebar, { path: '/chat', host, navigate, items, selected: 'knowledge' })
  const sidebar = container.querySelector('.dshWorkspaceChatSidebar')
  expect([...sidebar.querySelectorAll('nav')[0].querySelectorAll('a')].map(link => link.getAttribute('href'))).toEqual(['/', '/knowledge'])
  expect(sidebar.querySelector('a[href="/knowledge"]').getAttribute('aria-current')).toBe('page')
})

it('keeps workbench links in the Harness document and forwards real settings actions', async () => {
  await mount(SettingsPage)
  await act(async () => container.querySelectorAll('button')[1].click())
  expect(host.openCapability).toHaveBeenCalledWith('profile', undefined)
  await act(async () => container.querySelector('a').click())
  expect(navigate).toHaveBeenCalledWith('/model')
  await mount(Links, { href: '/charts?chart=funnel-chart-card#chart-preview', children: 'Chart' })
  await act(async () => container.querySelector('a').click())
  expect(navigate).toHaveBeenLastCalledWith('/charts?chart=funnel-chart-card#chart-preview')
})

it.each([['zh-CN', '打开桌面会话与插件'], ['en', 'Open desktop sessions and plugins']])(
  'opens the desktop from Settings in %s', async (locale, label) => {
    host.locale = locale
    await mount(SettingsPage)
    const action = [...container.querySelectorAll('button')].find(button => button.textContent === label)
    expect(action).toBeDefined()
    await act(async () => action.click())
    expect(host.openCapability).toHaveBeenCalledWith('desktop', undefined)
  })

it('transfers a typed image prompt to the real task draft without inventing an image result', async () => {
  await mount(TaskComposer, { name: 'image' })
  const input = container.querySelector('input')
  const submit = container.querySelector('[type=submit]')
  expect(submit.disabled).toBe(true)
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '  forest at dusk  ')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => submit.click())
  expect(host.openCapability).toHaveBeenCalledWith('image', { prompt: 'forest at dusk' })
})

it('restores the exact source text and opens the conflicting native blank when the template is revisited', async () => {
  host.getTaskDraft = () => ({ prompt: 'a retained template task', error: 'Existing draft', sessionId: 'occupied-blank' })
  await mount(TaskComposer, { name: 'code' })
  expect(container.querySelector('input').value).toBe('a retained template task')
  const alert = container.querySelector('[role=alert]')
  expect(alert.textContent).toContain('Existing draft')
  await act(async () => alert.querySelector('button').click())
  expect(host.openTask).toHaveBeenCalledWith('occupied-blank')
})

it('renders connection failures, retries with current model metadata and aborts stale requests', async () => {
  host.getModelStatus = vi.fn()
    .mockRejectedValueOnce(new Error('unavailable'))
    .mockResolvedValueOnce({ configured: true, model: 'local-model', providerLabel: 'test service' })
  await mount(ModelStatusPanel)
  expect(container.querySelector('[role=alert]').textContent).toBe('unavailable')
  await act(async () => container.querySelector('button').click())
  expect(host.getModelStatus.mock.calls[0][0].aborted).toBe(true)
  expect(container.querySelector('code').textContent).toBe('local-model')
  expect(container.textContent).toContain('Configured test service')
})

it('lists real tasks, opens the selected session and exposes a readable empty state after refresh', async () => {
  host.listTasks.mockResolvedValueOnce([{ id: 'task-1', title: 'Run regression checks', status: 'running' }]).mockResolvedValueOnce([])
  await mount(HarnessWorkspace)
  await act(async () => container.querySelector('li button').click())
  expect(host.openTask).toHaveBeenCalledWith('task-1')
  await act(async () => container.querySelector('button').click())
  expect(container.querySelector('[role=status]').textContent).toBe('No tasks yet.')
  expect(container.querySelector('li')).toBeNull()
})

it('keeps a failed lazy scene inside the page and offers recovery navigation', async () => {
  const expected = new Error('scene unavailable')
  const suppressExpected = event => { if (event.error === expected) event.preventDefault() }
  window.addEventListener('error', suppressExpected)
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  function BrokenPage() { throw expected }
  try {
    await mount(PageBoundary, {
      message: 'Scene unavailable', actionLabel: 'Back', onReturn: navigate,
      children: React.createElement(BrokenPage)
    })
    expect(container.querySelector('[role=alert]').textContent).toBe('Scene unavailable')
    await act(async () => container.querySelector('button').click())
    expect(navigate).toHaveBeenCalledOnce()
  } finally {
    window.removeEventListener('error', suppressExpected)
    log.mockRestore()
  }
})

it('applies and releases the real DOM inert boundary in React 18', async () => {
  const panel = disabled => React.createElement('aside', inertWhen(disabled), 'Tools')
  await act(async () => root.render(panel(true)))
  expect(container.querySelector('aside').getAttribute('inert')).toBe('')
  await act(async () => root.render(panel(false)))
  expect(container.querySelector('aside').hasAttribute('inert')).toBe(false)
})

it('keeps all four interactive template previews available when business plugins are installed', async () => {
  await mount(TemplatesPage)
  for (const slug of ['multi-agent-chat', 'ai-chat', 'ai-image-generation', 'project-board']) {
    const href = `/${slug}?preview=1`
    await act(async () => container.querySelector(`a[href="${href}"]`).click())
    expect(navigate).toHaveBeenLastCalledWith(href)
  }
})

it('retains the same focusable toolbar button ref across drawer open and close', async () => {
  const ref = React.createRef()
  function Toggle() {
    const [open, setOpen] = React.useState(false)
    return React.createElement(RightSidebarButton, { ref, expanded: open, label: 'Inspector', onClick: () => setOpen(value => !value) })
  }
  await mount(Toggle)
  const button = ref.current
  expect(button).toBeInstanceOf(HTMLButtonElement)
  for (const expanded of ['true', 'false']) {
    await act(async () => button.click())
    expect(ref.current).toBe(button)
    expect(button.getAttribute('aria-expanded')).toBe(expanded)
  }
})

it('keeps a transparent avatar grain tile when an offscreen canvas cannot allocate a 2D context', async () => {
  const { grainTile } = await import('../packages/dsh-desktop-client-ui/workspace/components/application/agent-avatar/avatar-grain')
  const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  try {
    const tile = grainTile()
    expect([tile.width, tile.height]).toEqual([192, 192])
    expect(grainTile()).toBe(tile)
    expect(context).toHaveBeenCalledOnce()
  } finally {
    context.mockRestore()
  }
})

it.each(['program', 'fragment shader'])('keeps the settings artwork visible when WebGL cannot create a %s', async missing => {
  const { PlanArtFlame } = await import('../packages/dsh-desktop-client-ui/workspace/components/application/settings/plan-art-flame')
  const program = {}, shader = {}
  const gl = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, viewport: vi.fn(),
    createProgram: () => missing === 'program' ? null : program,
    createShader: type => type === 1 ? shader : null,
    shaderSource: vi.fn(), compileShader: vi.fn(), attachShader: vi.fn(), deleteShader: vi.fn(), deleteProgram: vi.fn()
  }
  const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gl)
  try {
    await mount(PlanArtFlame)
    expect(container.querySelector('canvas')).toBeNull()
    expect(container.querySelector('[aria-hidden] > span')).not.toBeNull()
    if (missing === 'fragment shader') {
      expect(gl.deleteProgram).toHaveBeenCalledWith(program)
      expect(gl.deleteShader).toHaveBeenCalledWith(shader)
      expect(gl.attachShader).toHaveBeenCalledExactlyOnceWith(program, shader)
    }
  } finally {
    context.mockRestore()
  }
})
