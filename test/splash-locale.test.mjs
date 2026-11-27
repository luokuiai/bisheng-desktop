import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

const html = readFileSync(new URL('../build/splash.html', import.meta.url), 'utf8')

function page(locale, systemLanguage, theme = 'light', stage) {
  const query = new URLSearchParams({ theme })
  if (locale !== undefined) query.set('locale', locale)
  if (stage) query.set('stage', stage)
  return new JSDOM(html, {
    url: `file:///desktop/splash.html?${query}`,
    runScripts: 'dangerously',
    beforeParse(window) {
      Object.defineProperty(window.navigator, 'language', { value: systemLanguage })
      Object.defineProperty(window.navigator, 'platform', { value: 'Win32' })
    }
  })
}

describe('startup splash language', () => {
  it.each(['light', 'dark'])('uses English Desktop text on a Chinese system in %s mode', theme => {
    const dom = page('en', 'zh-CN', theme)
    try {
      const doc = dom.window.document
      expect(doc.getElementById('title').textContent).toBe('Starting LUOKUI-AI')
      expect(doc.getElementById('status').textContent).toBe('First launch may take a moment.')
      expect(doc.documentElement.lang).toBe('en')
      expect(doc.documentElement.dataset.theme).toBe(theme)
      expect(doc.documentElement.dataset.platform).toBe('windows')
    } finally { dom.window.close() }
  })

  it('uses Chinese Desktop text on an English system', () => {
    const dom = page('zh', 'en-US')
    try {
      const doc = dom.window.document
      expect(doc.getElementById('title').textContent).toBe('正在启动 LUOKUI-AI')
      expect(doc.getElementById('status').textContent).toBe('首次启动可能需要一点时间。')
      expect(doc.documentElement.lang).toBe('zh-CN')
    } finally { dom.window.close() }
  })

  it.each([
    [undefined, 'zh-CN', 'zh-CN'],
    [undefined, 'en-US', 'en'],
    ['invalid', 'zh-TW', 'zh-CN'],
    ['invalid', 'fr-FR', 'en']
  ])('resolves a standalone page with locale=%s and system=%s', (locale, systemLanguage, expected) => {
    const dom = page(locale, systemLanguage)
    try {
      const doc = dom.window.document
      expect(doc.documentElement.lang).toBe(expected)
      expect(doc.getElementById('title').textContent).toBe(expected === 'en' ? 'Starting LUOKUI-AI' : '正在启动 LUOKUI-AI')
    } finally { dom.window.close() }
  })

  it.each([['zh', '钥匙串'], ['en', 'Keychain']])('shows a localized %s prompt only for saved credential recovery', (locale, label) => {
    const dom = page(locale, 'zh-CN', 'light', 'keychain')
    try { expect(dom.window.document.getElementById('status').textContent).toContain(label) }
    finally { dom.window.close() }
  })

  it('passes the active Desktop locale from the splash navigation entry', () => {
    const main = readFileSync(new URL('../src/main/index.ts', import.meta.url), 'utf8')
    expect(/loadDesktopResource\(window, desktopResourcePath\('splash\.html'\),\s*\{\s*query:\s*\{[^}]*locale:\s*harnessLocale\(\)/u.test(main)).toBe(true)
  })

  it('registers the synchronous storage handler before any startup window can load', () => {
    const main = readFileSync(new URL('../src/main/index.ts', import.meta.url), 'utf8')
    const bootstrap = main.slice(main.indexOf('async function bootstrap()'))
    expect(main).toMatch(/function registerHarnessHandlers\(\)[\s\S]*?ipcMain\.on\('dsh:storage-load-sync'/u)
    expect(bootstrap).toMatch(/registerHarnessHandlers\(\)\s+createWindow\(\)\s+try\s*\{\s*enterpriseDesktop = await startEnterpriseDesktop/u)
  })
})
