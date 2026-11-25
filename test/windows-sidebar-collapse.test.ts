// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { expect, it } from 'vitest'
import { WINDOWS_TITLEBAR_HEIGHT } from '../src/shared/desktop-menu'
import { markWindowsTitlebar } from '../src/preload/windows-titlebar'
import { mountMacosWindowChrome } from '../src/preload/macos-window-chrome'

const client = readFileSync('node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js', 'utf8')
const ast = ts.createSourceFile('client.js', client, ts.ScriptTarget.Latest, true)

function functionSource(name: string): string {
  let source: string | undefined
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) source = node.getText(ast)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  if (!source) throw new Error(`Harness layout function ${name} is unavailable`)
  return source
}

function declarationSource(name: string): string {
  let source: string | undefined
  const visit = (node: ts.Node): void => {
    if (ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration =>
      ts.isIdentifier(declaration.name) && declaration.name.text === name
    )) source = node.getText(ast)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  if (!source) throw new Error(`Harness layout declaration ${name} is unavailable`)
  return source
}

interface CollapsedLayout { sidebar: number; center: number; leadingMounted: boolean }

function createColumns(doc: Document): () => CollapsedLayout {
  const compute = new Function('document', `
    ${functionSource('clampWidth')}
    ${functionSource('computeColumns')}
    ${functionSource('isMacosFullscreen')}
    const darwin = document.documentElement.dataset.platform === 'darwin'
    return () => {
      const sidebarCollapsed = true
      const macosFullscreen = isMacosFullscreen()
      ${declarationSource('collapsedWidth')}
      ${declarationSource('leadingMounted')}
      return { ...computeColumns(1200, 0, 0, collapsedWidth), leadingMounted }
    }
  `) as (doc: Document) => () => CollapsedLayout
  return compute(doc)
}

it('keeps the Windows collapsed column at zero even with a fullscreen marker', () => {
  const doc = document.implementation.createHTMLDocument()
  markWindowsTitlebar(doc)
  expect(doc.documentElement.hasAttribute('data-windows-titlebar')).toBe(true)
  expect(doc.documentElement.style.getPropertyValue('--dsh-windows-titlebar-height')).toBe(`${WINDOWS_TITLEBAR_HEIGHT}px`)
  doc.documentElement.dataset.fullscreen = 'true'
  expect(createColumns(doc)()).toMatchObject({ sidebar: 0, center: 1200 })
  const webDoc = document.implementation.createHTMLDocument()
  expect(createColumns(webDoc)()).toMatchObject({ sidebar: 56, center: 1144 })
})

it('keeps the macOS rail while moving leading controls between the window and fullscreen', () => {
  const doc = document.implementation.createHTMLDocument()
  let fullscreen = (_value: boolean) => {}
  const dispose = mountMacosWindowChrome(doc, listener => {
    fullscreen = listener
    return () => {}
  })
  const columns = createColumns(doc)
  expect(columns()).toMatchObject({ sidebar: 56, center: 1144, leadingMounted: true })
  fullscreen(true)
  expect(columns()).toMatchObject({ sidebar: 56, center: 1144, leadingMounted: false })
  fullscreen(false)
  expect(columns()).toMatchObject({ sidebar: 56, center: 1144, leadingMounted: true })
  dispose()
})
