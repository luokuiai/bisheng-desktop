import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { expect, it, vi } from 'vitest'

const source = readFileSync('node_modules/@deepseek-ai/dsh-client-ui-agent-preset/lib/client.js', 'utf8')
const ast = ts.createSourceFile('client.js', source, ts.ScriptTarget.Latest, true)
let section
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'AgentPresetSection') section = node.getText(ast)
  ts.forEachChild(node, visit)
}
visit(ast)

it.each([['en', false], ['zh', false], ['en', true], ['zh', true]])('offers preset search and local import without an external action in %s with BoardUI enabled=%s', (lang, board) => {
  const Button = () => {}
  const BoardButton = () => {}
  const Input = () => {}
  const open = vi.fn()
  const setSearch = vi.fn()
  let stateIndex = 0
  const jsx = (type, props) => ({ type, props })
  const render = new Function('react', 'react_jsx_runtime', '_deepseek_ai_dsh_client_ui_primitives', 'AgentPresetSection_module_css_default', 'document', 'window', `${section}; return AgentPresetSection`)(
    { useState: initial => [initial, stateIndex++ === 0 ? setSearch : () => {}], useRef: current => ({ current }), useEffect() {}, useLayoutEffect() {} },
    { jsx, jsxs: jsx }, { Button, Modal: () => {} }, {}, { documentElement: { lang } }, { open }
  )
  const tree = render({ useAgentPresetSection: fn => fn({ rows: [], view: null, error: null }), useDeveloperTools: fn => fn(false), t: key => key,
    controls: board ? { Button: BoardButton, Input } : undefined })
  const nodes = []
  function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    nodes.push(node); walk(node.props?.children)
  }
  walk(tree)
  const heading = nodes.find(n => n.props?.['data-dsh-preset-heading'] === '')
  const actions = nodes.find(node => node.props?.['data-dsh-preset-actions'] === '')
  expect(heading.props.children).toEqual([expect.objectContaining({ type: 'h2' }), actions])
  const importButton = actions.props.children
  expect(importButton.type).toBe(board ? BoardButton : Button)
  expect(importButton.props.variant).toBe(board ? 'secondary' : 'outline')
  expect(importButton.props.children).toBe('desktopImport')
  const input = nodes.find(n => n.props?.type === 'file')
  const click = vi.fn(); input.props.ref.current = { click }
  importButton.props.onClick()
  expect(click).toHaveBeenCalledOnce()
  expect(open).not.toHaveBeenCalled()
  const search = nodes.find(node => node.props?.type === 'search')
  expect(search.type).toBe(board ? Input : 'input')
  search.props.onChange(board ? 'test' : { target: { value: 'test' } })
  expect(setSearch).toHaveBeenCalledWith('test')
})
