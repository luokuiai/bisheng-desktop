import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('desktop preload bridge', () => {
  it('uses the shared theme-aware icons from the actual preload entry', () => {
    const source = readFileSync(new URL('../src/preload/index.ts', import.meta.url), 'utf8')
    expect(source).toContain("from './app-icon'")
    expect(source).toContain('createAppIcon(document)')
    expect(source).toContain('mountAppIconTheme(document, () => [content, aboutShadow])')
  })

  it('exposes each main-world API once', () => {
    const source = readFileSync(new URL('../src/preload/index.ts', import.meta.url), 'utf8')
    const names = [...source.matchAll(/contextBridge\.exposeInMainWorld\(\s*['"]([^'"]+)['"]/g)].map(match => match[1])
    expect(names.length).toBeGreaterThan(0)
    expect(names).toEqual([...new Set(names)])
  })

  it('keeps the preload build self-contained for the sandbox', () => {
    // A sandboxed preload can only require a few builtins. Bundling the
    // `electron` npm package or emitting a shared chunk makes Electron fail
    // with "module not found", so no bridge (including `dshEnterpriseChat`)
    // reaches the renderer at all.
    const config = readFileSync(new URL('../electron.vite.config.ts', import.meta.url), 'utf8')
    const preload = config.slice(config.indexOf('preload: {'))
    expect(preload).toContain("external: ['electron']")
    expect(preload).not.toContain('manualChunks')

    // When a build is available, prove the emitted entry never imports a
    // sibling chunk. The sandbox cannot resolve those relative requires.
    const built = new URL('../out/preload/index.cjs', import.meta.url)
    if (existsSync(built)) {
      expect(readFileSync(built, 'utf8')).not.toContain('require("./chunks/')
    }
  })
})
