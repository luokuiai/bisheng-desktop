import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createHash } from 'node:crypto'
import ts from 'typescript'

const BEGIN = '/* BISHENG_REFERENCE_ICONS_BEGIN */'
const END = '/* BISHENG_REFERENCE_ICONS_END */'
const parse = text => ts.createSourceFile('runtime.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
const one = (items, label) => {
  if (items.length !== 1) throw new Error(`Reference icon build contract changed: ${label} (${items.length})`)
  return items[0]
}
const find = (node, predicate) => {
  const result = []
  const visit = child => { if (predicate(child)) result.push(child); ts.forEachChild(child, visit) }
  visit(node)
  return result
}

/** Project canonical artwork into Harness's prebundled shared module at build time.
 * The public export locates the implementation; minified names are discovered.
 * Original builtin cases remain intact. Version/shape drift fails the build.
 */
export function prepareReferenceIcons(bundle, primitives) {
  const begin = bundle.indexOf(BEGIN)
  if (begin >= 0) {
    const end = bundle.indexOf(END, begin)
    if (end < 0 || bundle.indexOf(BEGIN, begin + 1) >= 0) throw new Error('Invalid generated reference icon region')
    bundle = bundle.slice(0, begin) + bundle.slice(end + END.length)
  }
  const ast = parse(bundle)
  const exported = one(find(ast, node => ts.isPropertyAssignment(node) && node.name.getText(ast) === 'ReferenceIconRegular'), 'public ReferenceIconRegular export')
  const regular = one(ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name.text === exported.initializer.getText(ast)), 'regular renderer')
  const call = one(find(regular, ts.isCallExpression), 'regular JSX call')
  if (!ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== 'jsx') throw new Error('Expected shared JSX runtime')
  const artwork = one(ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name.text === call.arguments[0].getText(ast)), 'reference artwork')
  const binding = artwork.parameters[0].name
  if (!ts.isObjectBindingPattern(binding)) throw new Error('Expected reference artwork props')
  const prop = name => one(binding.elements.filter(item => (item.propertyName ?? item.name).getText(ast) === name), name).name.getText(ast)
  const branch = one(artwork.body.statements.filter(ts.isSwitchStatement), 'builtin reference switch')
  const domains = branch.caseBlock.clauses.map(item => item.expression?.text)
  if (domains.join(',') !== 'session,file,folder') throw new Error('Upstream reference domains changed; review compatibility')

  const source = parse(primitives)
  const declarations = ['SkillReferenceArtwork', 'HammerReferenceArtwork'].map(name =>
    one(source.statements.filter(node => ts.isFunctionDeclaration(node) && node.name.text === name), name).getText(source))
  const canonical = one(source.statements.filter(node => ts.isFunctionDeclaration(node) && node.name.text === 'ReferenceIconArtwork'), 'canonical artwork')
  const cases = one(canonical.body.statements.filter(ts.isSwitchStatement), 'canonical switch').caseBlock.clauses
    .filter(node => ['skill', 'tool'].includes(node.expression?.text))
  if (cases.length !== 2) throw new Error('Expected skill and tool artwork')
  // A lexical block prevents collisions with all upstream minified bindings.
  const generated = `${BEGIN}{
    const { jsx, jsxs } = ${call.expression.expression.getText(ast)};
    ${declarations.join('\n')}
    const kind = ${prop('kind')}, size = ${prop('size')}, className = ${prop('className')};
    switch (kind) { ${cases.map(node => node.getText(source)).join('\n')} }
  }${END}`
  const offset = artwork.body.getStart(ast) + 1
  return bundle.slice(0, offset) + generated + bundle.slice(offset)
}

function useDshMenuExit(open, enabled, listRef, { useState, useLayoutEffect }) {
  const [wasOpen, setWasOpen] = useState(false)
  const exiting = enabled && wasOpen && !open
  useLayoutEffect(() => {
    if (!enabled || open) {
      setWasOpen(enabled && open)
      return
    }
    if (!exiting) return
    const animations = listRef.current?.getAnimations?.().filter(animation => animation.playState === 'running')
    if (!animations?.length) {
      setWasOpen(false)
      return
    }
    let active = true
    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (active) setWasOpen(false)
    })
    return () => { active = false }
  }, [enabled, open, exiting])
  return exiting
}

export function prepareMenuPresence(bundle) {
  const ast = parse(bundle)
  const assignment = one(find(ast, node => ts.isPropertyAssignment(node) && node.name.getText(ast) === 'Menu' && ts.isIdentifier(node.initializer)), 'public Menu export')
  const menu = one(ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === assignment.initializer.text), 'Menu renderer')
  const binding = menu.parameters[0].name
  if (!ts.isObjectBindingPattern(binding)) throw new Error('Expected shared Menu props')
  if (binding.elements.some(item => (item.propertyName ?? item.name).getText(ast) === 'animatePresence')) return bundle
  const open = one(binding.elements.filter(item => (item.propertyName ?? item.name).getText(ast) === 'open'), 'Menu open prop').name.getText(ast)
  const layout = one(find(menu, node => ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'useLayoutEffect'), 'Menu positioning effect')
  const react = layout.expression.expression.getText(ast)
  const guard = layout.arguments[0].body.statements[0]
  const positioned = one(find(guard, node => ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken && node.operand.getText(ast) === open), 'Menu positioning guard').operand
  const dependency = one(layout.arguments[1].elements.filter(node => node.getText(ast) === open), 'Menu positioning dependency')
  const list = one(find(menu, node => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
    node.left.getText(ast) === open && ts.isCallExpression(node.right) && node.right.arguments.some(arg => ts.isObjectLiteralExpression(arg) &&
      arg.properties.some(prop => ts.isPropertyAssignment(prop) && prop.name.getText(ast) === 'role' && ts.isStringLiteral(prop.initializer) && prop.initializer.text === 'menu'))), 'Menu surface')
  const props = list.right.arguments[1]
  const ref = one(props.properties.filter(prop => ts.isPropertyAssignment(prop) && prop.name.getText(ast) === 'ref'), 'Menu list ref').initializer.getText(ast)
  const edits = [
    [menu.getStart(ast), menu.getStart(ast), `${useDshMenuExit.toString()}\n`],
    [binding.getStart(ast) + 1, binding.getStart(ast) + 1, 'animatePresence:dshAnimatePresence=false,'],
    [layout.getStart(ast), layout.getStart(ast), `const dshExiting=useDshMenuExit(${open},dshAnimatePresence,${ref},${react});const dshVisible=${open}||dshExiting;`],
    ...[positioned, dependency, list.left].map(node => [node.getStart(ast), node.end, 'dshVisible']),
    [props.getStart(ast) + 1, props.getStart(ast) + 1, '"data-exiting":dshExiting?"":void 0,inert:dshExiting?"":void 0,']
  ]
  return edits.sort(([start], [next]) => next - start).reduce((text, [start, end, replacement]) => text.slice(0, start) + replacement + text.slice(end), bundle)
}

export function installReferenceIcons(root) {
  const modules = path.join(root, 'node_modules/@deepseek-ai')
  for (const name of ['dsh-web-frontend', 'dsh-client-ui-primitives']) {
    const pkg = JSON.parse(readFileSync(path.join(modules, name, 'package.json'), 'utf8'))
    if (pkg.version !== '0.2.1-rc.2') throw new Error(`Review reference icon projection for ${name}@${pkg.version}`)
  }
  const dist = path.join(modules, 'dsh-web-frontend/dist')
  const htmlPath = path.join(dist, 'index.html')
  const html = readFileSync(htmlPath, 'utf8')
  const entry = one([...html.matchAll(/<script\b[^>]*src="\.\/(assets\/[^"?]+\.js)(?:\?[^" ]*)?"/g)], 'frontend entry')[1]
  const target = path.join(dist, entry)
  const primitives = readFileSync(path.join(modules, 'dsh-client-ui-primitives/lib/index.js'), 'utf8')
  const result = prepareMenuPresence(prepareReferenceIcons(readFileSync(target, 'utf8'), primitives))
  writeFileSync(target, result)
  const revision = createHash('sha256').update(result).digest('hex').slice(0, 16)
  writeFileSync(htmlPath, html.replace(/(<script\b[^>]*src="\.\/assets\/[^"?]+\.js)(?:\?[^" ]*)?"/, `$1?bisheng-reference-icons=${revision}"`))
  console.log('Prepared shared frontend reference icons from canonical primitives')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  installReferenceIcons(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'))
}
