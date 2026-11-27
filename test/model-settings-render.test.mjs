import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { expect, it, vi } from 'vitest'

const mockContext = fallback => ({ Provider: ({ children }) => children, fallback })

it.each([false, true])('retries a failed model directory load with BoardUI enabled=%s', async board => {
  const require = createRequire(import.meta.url)
  const path = require.resolve('@deepseek-ai/dsh-client-ui-settings-models/package.json').replace('package.json', 'lib/client.js')
  const source = (await readFile(path, 'utf8')).replace('exports.apply = apply;', 'exports.ModelsSection = ModelsSection; exports.apply = apply;')
  const jsx = (type, props) => typeof type === 'function' ? type(props) : { type, props }
  const Button = props => ({ type: 'board-button', props })
  const modules = {
    react: { useState: initial => [initial, () => {}], useId: () => 'section', createContext: mockContext },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@deepseek-ai/dsh-client-ui-primitives': {},
    '@deepseek-ai/dsh-client-store': {}
  }
  let ModelsSection
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load({ factory }) {
    ModelsSection = factory(id => modules[id]).ModelsSection
  } } } })
  const load = vi.fn()
  const section = ModelsSection({
    controller: { load }, operations: {}, schema: {},
    useSnapshot: select => select({ status: 'error', error: 'Offline', rows: [] }), t: key => key,
    controls: board ? { Button } : undefined
  })
  const retry = section.props.children[1]
  expect(retry.type).toBe(board ? 'board-button' : 'button')
  expect(retry.props.children).toBe('retry')
  retry.props.onClick()
  expect(load).toHaveBeenCalledOnce()
})

it.each(['DeepSeekModelsEditor', 'ModelListEditor'].flatMap(editor => [[editor, false], [editor, true]]))('%s preserves model options with Board UI enabled=%s', async (editorName, board) => {
  const require = createRequire(import.meta.url)
  const path = require.resolve('@deepseek-ai/dsh-client-ui-settings-models/package.json').replace('package.json', 'lib/client.js')
  const source = (await readFile(path, 'utf8')).replace('exports.apply = apply;', `exports.editor = ${editorName}; exports.apply = apply;`)
  const states = []
  let cursor = 0
  let editor
  const jsx = (type, props) => {
    if (type === undefined) throw new Error('Undefined rendered component')
    return typeof type === 'function' ? type(props) : { type, props }
  }
  const react = {
    useState(initial) {
      const index = cursor++
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value }]
    },
    useMemo: fn => fn(), useEffect() {}, useRef: value => ({ current: value }),
    createContext: mockContext, useContext: context => board ? {
      Button: props => ({ type: 'board-button', props }),
      Switch: ({ label, ...props }) => ({ type: 'board-switch', props: { ...props, 'aria-label': label } })
    } : context.fallback
  }
  const primitivesSource = await readFile(require.resolve('@deepseek-ai/dsh-client-ui-primitives'), 'utf8')
  const primitives = Object.fromEntries([...primitivesSource.matchAll(/const (Icon\w+) =/g)].map(match => [match[1], () => ({ type: 'svg', props: {} })]))
  primitives.Button = props => ({ type: 'button', props })
  primitives.Modal = props => props.open ? ({ type: 'dialog', props }) : null
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load({ factory }) {
    editor = factory(id => ({ react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' }, '@deepseek-ai/dsh-client-ui-primitives': primitives, '@deepseek-ai/dsh-client-store': {} })[id]).editor
  } } } })
  let models = [{ id: 'model', inputModalities: ['text', 'image'], input: ['text', 'image'], imagePixelBudget: 'low', imageMaxBytes: 12345, contextWindow: 128000, maxTokens: 8000 }]
  const props = { probe: { settingsNs: 'llm-pi-ai' }, operations: {}, onBusyChange() {}, models, modelQuery: '', t: key => key, onChange: value => { models = value }, onReset() {}, defaultContextWindow: 256000, defaultMaxTokens: 32000 }
  const render = () => { cursor = 0; return editor({ ...props, models }) }
  const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)]
  const find = (tree, label) => flatten(tree).find(node => node.props?.['aria-label'] === label)
  const contextLabel = editorName === 'DeepSeekModelsEditor' ? 'contextWindow 1' : 'modelContextWindow 1'
  const tokensLabel = editorName === 'DeepSeekModelsEditor' ? 'maxTokens 1' : 'modelMaxTokens 1'
  let tree = render()
  expect(find(tree, contextLabel)).toBeUndefined()
  const advanced = find(tree, 'modelAdvanced 1')
  expect(advanced.type).toBe(board ? 'board-button' : 'button')
  advanced.props.onClick()
  tree = render()
  expect(find(tree, contextLabel).props.value).toBe('128K')
  expect(find(tree, tokensLabel).props.value).toBe('8K')
  find(tree, contextLabel).props.onChange({ target: { value: '256K' } })
  expect(models[0].contextWindow).toBe(256000)
  expect(models[0].inputModalities).toEqual(['text', 'image'])
  tree = render()
  find(tree, contextLabel).props.onBlur?.()
  expect(find(render(), contextLabel).props.value).toBe('256K')
  const inputToggle = find(render(), 'modelImageInput 1')
  expect(inputToggle.type).toBe(board ? 'board-switch' : 'input')
  inputToggle.props.onChange(board ? false : { target: { checked: false } })
  const inputField = editorName === 'DeepSeekModelsEditor' ? 'inputModalities' : 'input'
  expect(models[0][inputField]).toEqual(['text'])
  if (editorName === 'DeepSeekModelsEditor') {
    expect(models[0]).not.toHaveProperty('imagePixelBudget')
    expect(models[0]).not.toHaveProperty('imageMaxBytes')
  } else {
    expect(models[0].imageMaxBytes).toBe(12345)
  }
  expect(models[0].contextWindow).toBe(256000)
  find(render(), 'modelImageInput 1').props.onChange(board ? true : { target: { checked: true } })
  expect(models[0][inputField]).toEqual(['text', 'image'])
  const remove = find(render(), 'removeModel 1')
  expect(remove.type).toBe(board ? 'board-button' : 'button')
  remove.props.onClick()
  expect(models).toEqual([])
})

it.each(['loading', 'missing-key', 'ready', 'error'])('onboarding handles %s without an undefined readiness state', async status => {
  const require = createRequire(import.meta.url)
  const path = require.resolve('@deepseek-ai/dsh-client-ui-settings-models/package.json').replace('package.json', 'lib/client.js')
  const source = (await readFile(path, 'utf8')).replace('exports.apply = apply;', 'exports.dialog = DeepSeekOnboardingDialog; exports.apply = apply;')
  let dialog
  const effects = []
  const react = { useState: initial => [initial, () => {}], useEffect: fn => effects.push(fn), createContext: mockContext }
  const jsx = (type, props) => ({ type, props })
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load({ factory }) {
    dialog = factory(id => ({ react, 'react/jsx-runtime': { jsx, jsxs: jsx }, '@deepseek-ai/dsh-client-ui-primitives': {}, '@deepseek-ai/dsh-client-store': {} })[id]).dialog
  } } } })
  const row = { entry: { provider: 'deepseek-official', settingsNs: 'llm-deepseek', settingsPath: [], active: true }, apiKeyEnv: 'TEST_ONLY', credential: { configured: status === 'ready', writable: true } }
  const state = { status: status === 'error' ? 'error' : status === 'loading' ? 'loading' : 'ready', rows: status === 'loading' ? [] : [row], namespaces: new Map([['llm-deepseek', {}]]), credentialError: null, writable: true }
  let completed = 0
  const result = dialog({ automatic: true, explicit: false, useModels: fn => fn(state), complete: () => completed++, controller: { load() {} }, t: key => key, renderSlot: (_name, _props, options) => options.fallback })
  effects.forEach(fn => fn())
  expect(result === null).toBe(status !== 'missing-key')
  expect(completed).toBe(['ready', 'error'].includes(status) ? 1 : 0)
})
