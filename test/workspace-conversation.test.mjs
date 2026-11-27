// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { readTranscript, recentRows, submitSuggestion, WorkHistory, WorkSpeech } from '../packages/dsh-desktop-client-ui/workspace/static/work-conversation.js'

function store(value) {
  return { getSnapshot: () => value, subscribe: () => () => {} }
}

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
