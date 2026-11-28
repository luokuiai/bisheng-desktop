// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import * as jsx from 'react/jsx-runtime'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { afterEach, expect, it, vi } from 'vitest'
import { WorkModelPicker } from '../packages/dsh-desktop-client-ui/workspace/work-model-picker'
import { readTranscript, recentRows, submitSuggestion, WorkHistory, WorkSpeech } from '../packages/dsh-desktop-client-ui/workspace/static/work-conversation.js'

function store(value) {
  return { getSnapshot: () => value, subscribe: () => () => {} }
}

it('hides the Work conversation only during right sidebar fullscreen and restores the same editor', async () => {
  const style = document.createElement('style')
  style.textContent = await readFile('packages/dsh-desktop-client-ui/workspace/static/work-conversation.css', 'utf8')
  document.head.append(style)
  document.body.dataset.dshWorkspaceScene = 'chat'
  document.body.innerHTML = `
    <div class="pI_x6G_frame">
      <section id="dsh-panel-work">
        <div class="pI_x6G_centerCol"><textarea>Unsaved draft</textarea></div>
        <div data-rightbar-col><div data-sidebar-right-panel="push" data-sidebar-right-open></div></div>
      </section>
    </div>`
  try {
    const frame = document.querySelector('.pI_x6G_frame')
    const center = frame.querySelector('.pI_x6G_centerCol')
    const editor = center.querySelector('textarea')
    const panel = frame.querySelector('[data-sidebar-right-panel]')
    expect(getComputedStyle(center).getPropertyValue('content-visibility')).not.toBe('hidden')
    panel.dataset.sidebarRightPanel = 'fullscreen'
    frame.setAttribute('data-rightbar-fullscreen', '')
    expect(getComputedStyle(center).getPropertyValue('content-visibility')).toBe('hidden')
    panel.dataset.sidebarRightPanel = 'push'
    frame.removeAttribute('data-rightbar-fullscreen')
    expect(getComputedStyle(center).getPropertyValue('content-visibility')).not.toBe('hidden')
    expect(center.querySelector('textarea')).toBe(editor)
    expect(editor.value).toBe('Unsaved draft')
  } finally {
    style.remove()
    delete document.body.dataset.dshWorkspaceScene
    document.body.replaceChildren()
  }
})

it('centers the blank Work composer using the scroll container without stretching the composer seat', async () => {
  const style = document.createElement('style')
  style.textContent = await readFile('packages/dsh-desktop-client-ui/workspace/static/work-conversation.css', 'utf8')
  document.head.append(style)
  document.body.dataset.dshWorkspaceScene = 'chat'
  document.body.innerHTML = `
    <section id="dsh-panel-work">
      <div data-phase="hero" data-content-phase="hero">
        <div class="wSkVaW_scrollBody" data-conversation-scroll>
          <div class="wSkVaW_composerSeat" data-composer-seat>
            <div data-slot="conversation.composer">
              <div class="wSkVaW_composerHero"><div class="pXSMma_root"></div></div>
            </div>
          </div>
        </div>
      </div>
    </section>`
  try {
    const scroll = document.querySelector('[data-conversation-scroll]')
    expect(getComputedStyle(scroll).justifyContent).toBe('safe center')
    for (const element of scroll.querySelectorAll('div')) {
      expect(getComputedStyle(element).flexGrow).not.toBe('1')
    }
    scroll.parentElement.dataset.contentPhase = 'active'
    expect(getComputedStyle(scroll).justifyContent).not.toBe('safe center')
  } finally {
    style.remove()
    delete document.body.dataset.dshWorkspaceScene
  }
})

const row = { id: 'session-one', title: 'First conversation', displayTitle: 'First conversation', retainedBy: { mainView: 1 }, updatedAt: 1000 }

it('routes suggested text through native admission without replacing a draft, attachment or pending submission', () => {
  const state = { phase: 'plain', draft: '', attachmentIds: [], occurrences: [] }
  const input = { state: store(state), focus: vi.fn(), setDraft: vi.fn(), submit: vi.fn() }
  const scope = {}
  const services = { sessions: { list: store({ byId: { one: row } }), scope: () => scope }, getInput: value => value === scope ? input : undefined }
  expect(submitSuggestion(services, 'Explain this workspace')).toBeUndefined()
  expect(input.setDraft).toHaveBeenCalledWith('Explain this workspace')
  expect(input.submit).toHaveBeenCalledOnce()
  for (const change of [{ draft: 'mine' }, { draft: '', attachmentIds: ['file'] }, { phase: 'submitting', attachmentIds: [] }]) {
    Object.assign(state, change)
    expect(submitSuggestion(services, 'replace it')).toBe('workDraft')
  }
  expect(input.setDraft).toHaveBeenCalledTimes(1)
  expect(input.focus).toHaveBeenCalledTimes(3)
})

it('uses native workspace selection to prepare a suggestion before the first session exists', () => {
  const workspace = { startSession: vi.fn() }
  const services = { workspace, sessions: { list: store({ byId: {} }) }, workspaces: store({ items: [] }) }
  expect(submitSuggestion(services, 'Hello')).toBe('workSelectFolder')
  services.workspaces = store({ items: [{ id: 'known' }] })
  submitSuggestion(services, 'Hello')
  expect(workspace.startSession).toHaveBeenCalledWith(undefined, { prompt: 'Hello' })
})

it('uses catalog membership, native visibility and archive state to choose recent chats', () => {
  const byId = { main: { ...row, id: 'main' }, new: { ...row, id: 'new', updatedAt: 5000 }, blank: { ...row, blank: true },
    child: { ...row, origin: 'subagent' }, hidden: { ...row, id: 'hidden' }, archived: { ...row, id: 'archived' }, retainedOnly: row }
  const ids = ['main', 'new', 'blank', 'child', 'hidden', 'archived', 'stale']
  expect(recentRows({ byId, ids }, ['archived'], id => id !== 'hidden').map(item => item.id)).toEqual(['new', 'main'])
})

it('exports durable human-visible messages including earlier pages, omitting injected instructions and reasoning', async () => {
  const message = (seq, type, data) => ({ type: 'event', event: { seq, time: seq, type, data } })
  const content = [{ type: 'text', text: 'Answer' }, { type: 'reasoning', text: 'Private' }]
  let window = { hasMore: true, entries: [message(11, 'assistant/message', { message: { role: 'assistant', content } })] }
  const binding = { session: { getSnapshot: () => ({ openState: 'open' }), async loadOlder() {
    window = { hasMore: false, entries: [
      message(1, 'user/message', { role: 'user', content, source: { kind: 'plugin' } }),
      message(2, 'user/message', { role: 'user', content: [{ type: 'text', text: 'Question' }], source: { kind: 'user' } }),
      ...window.entries
    ] }
  } }, eventSource: { getSnapshot: () => window } }
  const sessions = { using: async (_id, _options, task) => task({ ready: Promise.resolve(binding) }) }
  const result = await readTranscript(sessions, row, new AbortController().signal)
  expect(result.messages).toEqual([{ role: 'user', text: 'Question', time: 2 }, { role: 'assistant', text: 'Answer', time: 11 }])
  window = { hasMore: true, entries: [] }
  binding.session.loadOlder = async () => {}
  await expect(readTranscript(sessions, row, new AbortController().signal)).rejects.toThrow('earlier messages')
})

let root
afterEach(async () => {
  if (root) await act(async () => root.unmount())
  root = null
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it('hides the Work composer on the rendered trajectory view and restores the same draft on return', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const source = await readFile('node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js', 'utf8')
  const start = source.indexOf('function resolveActiveView(')
  const end = source.indexOf('//#region lib/types/client/skeleton/ConversationSession.js', start)
  const Views = runInNewContext(`${source.slice(start, end)}\nDefaultConversationViews`, {
    react: React, react_jsx_runtime: jsx, ConversationRoot_module_css_default: { viewArea: 'viewArea' }
  })
  const style = document.createElement('style')
  style.textContent = await readFile('packages/dsh-desktop-client-ui/workspace/static/work-conversation.css', 'utf8')
  document.head.append(style)
  document.body.dataset.dshWorkspaceScene = 'chat'
  const host = document.body.appendChild(document.createElement('section'))
  host.id = 'dsh-panel-work'
  root = createRoot(host)
  const tabs = [{ id: 'chat' }, { id: 'trajectory' }]
  const props = {
    useConversationViews: select => select(tabs),
    useInspectCall: select => select(undefined),
    useSession: select => select({ blank: false }),
    useConversation: select => select({}),
    inputActions: { persistDraft() {} },
    actions: {},
    bindDraftPersistence: () => () => {},
    renderSlot: (_name, _owner, { only }) => only
  }
  const render = selected => act(async () => root.render(
    jsx.jsxs('div', { 'data-conversation-scroll': '', children: [
      jsx.jsx('div', { 'data-slot': 'conversation.session', children:
        jsx.jsx(Views, { ...props, useStore: select => select({ view: selected }) }) }),
      jsx.jsx('div', { 'data-composer-seat': '', children: jsx.jsx('textarea', {}) })
    ] })
  ))
  try {
    await render('chat')
    const composer = host.querySelector('[data-composer-seat]')
    const editor = composer.querySelector('textarea')
    editor.value = 'Unsaved draft'
    expect(getComputedStyle(composer).display).not.toBe('none')

    await render('trajectory')
    expect(host.querySelector('[data-slot="conversation.session"]').textContent).toBe('trajectory')
    expect(getComputedStyle(composer).display).toBe('none')
    delete document.body.dataset.dshWorkspaceScene
    expect(getComputedStyle(composer).display).not.toBe('none')
    document.body.dataset.dshWorkspaceScene = 'chat'

    await render('chat')
    expect(getComputedStyle(composer).display).not.toBe('none')
    expect(host.querySelector('textarea')).toBe(editor)
    expect(editor.value).toBe('Unsaved draft')
  } finally {
    style.remove()
    delete document.body.dataset.dshWorkspaceScene
  }
})

it('uses catalog routes and efforts, retains failed selections, and dismisses the Work picker from the keyboard', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal('CSS', { escape: value => value })
  const host = document.body.appendChild(document.createElement('div'))
  root = createRoot(host)
  const routes = [
    { id: 'first', name: 'First provider', models: [
      { id: 'shared', name: 'First model' }, { id: 'extra-a', name: 'Model A' },
      { id: 'extra-b', name: 'Model B' }, { id: 'extra-c', name: 'Model C' }
    ] },
    { id: 'second', name: 'Second provider', models: [{ id: 'shared', name: 'Second model', reasoning: { defaultEffort: 'medium' } }] }
  ]
  const current = { provider: 'first', model: 'shared' }
  const reload = vi.fn()
  const select = vi.fn()
    .mockResolvedValueOnce({ ok: false, error: { code: 'unavailable', message: 'Try again' } })
    .mockResolvedValue({ ok: true })
  const props = {
    groups: routes.map(provider => ({ ...provider, provider })), current, disabled: false, busy: false,
    label: 'Select model', caption: 'First model', providersLabel: 'Providers', enterpriseModelsLabel: 'Enterprise models', effortLabel: 'Reasoning',
    searchLabel: 'Search', emptyLabel: 'No matches', efforts: [{ effort: 'high', label: 'High' }],
    retryLabel: 'Retry', reload, select, formatError: error => error.message
  }
  const render = (extra = {}) => act(async () => root.render(React.createElement(WorkModelPicker, { ...props, ...extra })))
  const button = name => [...document.querySelectorAll('[role=dialog] button')].find(item => item.textContent === name)
  const click = target => act(async () => target.click())
  await render()
  const trigger = host.querySelector('button')
  await click(trigger)
  expect(reload).toHaveBeenCalledOnce()
  expect(document.querySelector('[role=dialog] input[type=search]')).toBeNull()
  expect(button('First model').getAttribute('aria-pressed')).toBe('true')
  expect(button('Second model')).toBeUndefined()
  await click(button('Second provider'))
  expect(button('Second model').getAttribute('aria-pressed')).toBe('false')
  await click(button('Second model'))
  expect(select).toHaveBeenLastCalledWith({ provider: 'second', model: 'shared', reasoningEffort: 'medium' })
  expect(document.querySelector('[role=alert]').textContent).toBe('Try again')
  await click(button('Second model'))
  expect(document.querySelector('[role=dialog]')).toBeNull()
  await click(trigger)
  await click(button('High'))
  expect(select).toHaveBeenLastCalledWith({ ...current, reasoningEffort: 'high' })
  await click(trigger)
  const dialog = document.querySelector('[role=dialog]')
  await act(async () => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  expect(document.querySelector('[role=dialog]')).toBeNull()
  await render({ disabled: true })
  expect(trigger.disabled).toBe(true)
})

it('groups one enterprise tenant by the advertised providers, keeping transport routes and model slashes intact', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal('CSS', { escape: value => value })
  const host = document.body.appendChild(document.createElement('div'))
  root = createRoot(host)
  const provider = { id: 'bisheng-enterprise', name: '默认租户' }
  const selectedName = 'ChatGPT / la/auto/gpt-6.1-terra'
  const select = vi.fn().mockResolvedValue({ ok: true })
  await act(async () => root.render(React.createElement(WorkModelPicker, {
    groups: [{ ...provider, provider, models: [
      { id: 'gpt-route', name: selectedName },
      { id: 'deepseek-route', name: 'DeepSeek / deepseek/v3' },
      { id: 'routed-model', name: 'openrouter/vendor/model' }
    ] }],
    current: { provider: provider.id, model: 'gpt-route' },
    disabled: false, busy: false, label: 'Select model', caption: `${selectedName} · High`,
    providersLabel: 'Providers', enterpriseModelsLabel: 'Enterprise models', effortLabel: 'Reasoning',
    searchLabel: 'Search', emptyLabel: 'No matches', efforts: [], retryLabel: 'Retry', reload() {}, select
  })))
  const trigger = host.querySelector('button')
  expect(trigger.textContent).toBe('la/auto/gpt-6.1-terra · High')
  await act(async () => trigger.click())
  const providers = [...document.querySelectorAll('[aria-label=Providers] button')]
  expect(providers.map(button => button.textContent)).toEqual(['ChatGPT', 'DeepSeek', 'Enterprise models'])
  expect(document.querySelector('[role=group][aria-label=ChatGPT] button').getAttribute('aria-pressed')).toBe('true')
  await act(async () => providers.find(button => button.textContent === 'Enterprise models').click())
  expect(document.querySelector('[role=group][aria-label="Enterprise models"] button').textContent).toBe('openrouter/vendor/model')
  await act(async () => providers.find(button => button.textContent === 'DeepSeek').click())
  const deepseek = document.querySelector('[role=group][aria-label=DeepSeek] button')
  expect(deepseek.textContent).toBe('deepseek/v3')
  await act(async () => deepseek.click())
  expect(select).toHaveBeenCalledExactlyOnceWith({ provider: provider.id, model: 'deepseek-route', reasoningEffort: undefined })
})

it('passes turn elapsed time to the running-status slot while announcing the running state only once', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-27T12:00:00Z'))
  const source = await readFile('node_modules/@deepseek-ai/dsh-client-ui-chat/lib/client.js', 'utf8')
  const start = source.indexOf('//#region lib/types/client/chat/RunningStatus.js')
  const end = source.indexOf('//#endregion', start)
  const RunningStatus = runInNewContext(`${source.slice(start, end)}\nRunningStatus`, {
    react: React,
    react_jsx_runtime: jsx,
    Date,
    setInterval,
    clearInterval,
    LIVE_RUN_CLOCK_INTERVAL_MS: 1000,
    formatRunDuration: elapsed => [{ text: `${elapsed / 1000} s` }],
    ChatView_module_css_default: {},
    accessibility_module_css_default: {},
    RunningWhaleTail: () => null,
    _deepseek_ai_dsh_client_ui_primitives: { TextShimmer: ({ children }) => children }
  })
  const host = document.body.appendChild(document.createElement('div'))
  root = createRoot(host)
  const renderSlot = vi.fn((name, owner) => React.createElement('span', { 'data-elapsed': name }, owner.elapsedLabel))
  const startTime = Date.now() - 2000
  const render = time => act(async () => root.render(React.createElement(RunningStatus, {
    startTime: time, renderSlot, t: key => key
  })))
  await render(undefined)
  expect(host.querySelector('[data-elapsed]').textContent).toBe('')
  await render(startTime)
  expect(host.querySelector('[data-elapsed]').textContent).toBe('2 s')
  await act(async () => vi.advanceTimersByTime(1000))
  expect(host.querySelector('[data-elapsed]').textContent).toBe('3 s')
  expect(host.querySelectorAll('[role=status]')).toHaveLength(1)
  expect(renderSlot).toHaveBeenLastCalledWith('conversation.chat.runningStatus',
    expect.objectContaining({ elapsedLabel: '3 s', fallback: expect.anything() }),
    expect.objectContaining({ fallback: expect.anything() }))
  await act(async () => root.render(null))
  expect(vi.getTimerCount()).toBe(0)
})

it('retains projected tasks for the collapse transition and hides them from assistive technology', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const source = await readFile('node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js', 'utf8')
  const start = source.indexOf('//#region lib/types/client/skeleton/TodoPanel.js')
  const end = source.indexOf('//#endregion', start)
  const Icon = ({ state }) => React.createElement('span', { 'data-state': state })
  const TodoDock = runInNewContext(`${source.slice(start, end)}\nTodoDock`, {
    react: React,
    react_jsx_runtime: jsx,
    TodoPanel_module_css_default: {},
    _deepseek_ai_dsh_client_ui_primitives: {
      StateDot: Icon, IconChecklistOutlineRegular: Icon,
      IconChevronDownOutlineRegular: Icon, IconChevronUpOutlineRegular: Icon
    }
  })
  const host = document.body.appendChild(document.createElement('div'))
  root = createRoot(host)
  const render = todos => act(async () => root.render(React.createElement(TodoDock, {
    useProjection(key) {
      expect(key).toBe('todos')
      return todos
    },
    t: key => key
  })))
  await render([{ content: 'First step', status: 'in_progress' }])
  const toggle = host.querySelector('button')
  const list = document.getElementById(toggle.getAttribute('aria-controls'))
  const disclosure = list.parentElement
  expect(disclosure.hidden).toBe(true)
  expect(disclosure.getAttribute('aria-hidden')).toBe('true')
  await act(async () => toggle.click())
  expect(toggle.getAttribute('aria-expanded')).toBe('true')
  expect(disclosure.hidden).toBe(false)
  expect(list.querySelector('li').dataset.status).toBe('in_progress')
  await render([{ content: 'First step', status: 'completed' }])
  expect(list.querySelector('li').dataset.status).toBe('completed')
  await act(async () => toggle.click())
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(disclosure.hidden).toBe(true)
  expect(disclosure.getAttribute('aria-hidden')).toBe('true')
  expect(list.isConnected).toBe(true)
  await render([])
  expect(list.isConnected).toBe(false)
})

it('docks history by available width, restores the chosen dock state, and navigates from the narrow drawer', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  let resize
  vi.stubGlobal('ResizeObserver', class { constructor(fn) { resize = fn } observe() {} disconnect() {} })
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
  const host = document.createElement('section')
  const toolbar = document.createElement('span')
  toolbar.dataset.workspaceRightSidebarSlot = ''
  document.body.append(host, toolbar)
  let width = 900
  Object.defineProperty(host, 'clientWidth', { get: () => width })
  const workspace = { openSession: vi.fn(), startSession: vi.fn(), readStatus: store([]) }
  const services = { sessions: { list: store({ ids: [row.id], byId: { [row.id]: row }, phase: 'ready' }) }, workspace,
    workspaces: { state: { items: [], archivedSessionIds: [] }, getSnapshot() { return this.state }, subscribe() { return () => {} } } }
  root = createRoot(host)
  await act(async () => root.render(React.createElement(WorkHistory, {
    React, createPortal, Menu: props => props.anchor, t: key => key, rightbarWidth: 0, services
  })))
  const toggle = toolbar.querySelector('button')
  expect(toggle.getAttribute('aria-expanded')).toBe('true')
  await act(async () => host.querySelector('.dshWorkHistoryNew').click())
  expect(workspace.startSession).toHaveBeenCalledOnce()
  await act(async () => toggle.click())
  expect(host.querySelector('.dshWorkHistoryDock').hasAttribute('inert')).toBe(true)
  width = 650
  await act(async () => resize())
  expect(toggle.getAttribute('aria-haspopup')).toBe('dialog')
  await act(async () => toggle.click())
  expect(host.querySelector('dialog').open).toBe(true)
  expect(host.querySelector('dialog').contains(toggle)).toBe(true)
  expect(document.querySelectorAll('[data-chat-history-toggle]')).toHaveLength(1)
  expect(document.activeElement).toBe(toggle)
  await act(async () => toggle.click())
  expect(host.querySelector('dialog')).toBeNull()
  expect(toolbar.contains(toggle)).toBe(true)
  expect(document.activeElement).toBe(toggle)
  await act(async () => toggle.click())
  await act(async () => host.querySelector('dialog').dispatchEvent(new Event('cancel', { cancelable: true })))
  expect(toolbar.contains(toggle)).toBe(true)
  expect(document.activeElement).toBe(toggle)
  await act(async () => toggle.click())
  await act(async () => host.querySelector('dialog .dshWorkHistoryTitle').click())
  expect(workspace.openSession).toHaveBeenCalledWith(row.id)
  expect(host.querySelector('dialog')).toBeNull()
  width = 1100
  await act(async () => resize())
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
})

it('reads only the chosen finalized response and cancels the owned utterance on navigation', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const synth = { cancel: vi.fn(), speak: vi.fn() }
  vi.stubGlobal('speechSynthesis', synth)
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(text) { this.text = text } })
  const entries = ['earlier', 'current'].map(id => ({ event: { type: 'assistant/message', data: { message: {
    id, content: [{ type: 'reasoning', text: 'Hidden analysis' }, { type: 'text', text: id }]
  } } } }))
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const services = { sessions: { binding: () => ({ eventSource: store({ entries }) }) } }
  await act(async () => root.render(React.createElement(WorkSpeech, { React, sessionId: row.id, messageId: 'current', services, t: key => key })))
  await act(async () => host.querySelector('button').click())
  expect(synth.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'current' }))
  expect(host.querySelector('button').getAttribute('aria-pressed')).toBe('true')
  await act(async () => root.unmount())
  root = null
  expect(synth.cancel).toHaveBeenCalledTimes(2)
})

it('renames and marks the same host row and hands deletion to the existing confirmation flow', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  const h = React.createElement
  const host = document.createElement('section')
  Object.defineProperty(host, 'clientWidth', { value: 1100 })
  document.body.append(host)
  const rename = vi.fn(async () => ({ ok: true }))
  const setUnread = vi.fn()
  const deletion = { request: vi.fn() }
  const services = {
    sessions: { list: store({ phase: 'ready', ids: [row.id], byId: { [row.id]: row } }),
      using: async (id, options, task) => {
        expect(id).toBe(row.id)
        expect(options.signal).toBeInstanceOf(AbortSignal)
        return task({ binding: { session: { rename } } })
      } },
    workspace: { readStatus: { ...store([]), setUnread } }, deletion
  }
  function Menu({ anchor, open, items, onSelect }) {
    return h(React.Fragment, null, anchor, open && items.map(item => h('button', { key: item.id,
      type: 'button', 'data-action': item.id, onClick: () => onSelect(item.id) }, item.label)))
  }
  root = createRoot(host)
  await act(async () => root.render(h(WorkHistory, { React, createPortal, Menu, t: key => key, services })))
  async function select(id) {
    await act(async () => host.querySelector('.dshWorkHistoryMore').click())
    await act(async () => host.querySelector('[data-action="' + id + '"]').click())
  }
  await select('read')
  expect(setUnread).toHaveBeenCalledWith(row.id, true)
  await select('rename')
  const input = host.querySelector('form input')
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'New title')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => host.querySelector('form').requestSubmit())
  expect(rename).toHaveBeenCalledWith('New title')
  await select('delete')
  expect(deletion.request).toHaveBeenCalledWith(row.id, row.title)
})
