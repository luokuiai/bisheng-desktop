import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

interface SkinModule {
  factory: (require: (id: string) => unknown) => {
    apply: (ctx: unknown) => void
    inject: string[]
  }
}

interface FakeStyle {
  id: string
  dataset: Record<string, string>
  textContent: string
  remove: () => void
}

function loadSkin() {
  return readFile(
    path.join(projectRoot, 'packages', 'dsh-desktop-skin', 'client.js'),
    'utf8'
  )
}

/**
 * The skin is the visual layer DSH Desktop uses. It has to reach both palettes
 * through the theme registry (a bare string throws inside ui-theme) and scope
 * everything to the body hook so removing the plugin restores stock styling.
 */
describe('desktop skin', () => {
  it('overrides both palettes and scopes the stylesheet to the skin hook', async () => {
    const source = await loadSkin()
    let definition: SkinModule | undefined
    const appended: FakeStyle[] = []
    const removeStyle = vi.fn()
    const document = {
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({
        id: '',
        dataset: {} as Record<string, string>,
        textContent: '',
        remove: removeStyle
      })),
      head: { appendChild: (node: FakeStyle) => appended.push(node) },
      body: { dataset: {} as Record<string, string> }
    }
    vm.runInNewContext(source, {
      document,
      window: {
        __ModuleLoader__: {
          load: (value: SkinModule) => {
            definition = value
          }
        }
      }
    })

    expect(definition).toBeDefined()
    const skin = definition!.factory(() => {
      throw new Error('skin requires no modules')
    })
    expect(skin.inject).toEqual(['theme'])

    const overrideTokens = vi.fn(() => vi.fn())
    const disposers: Array<() => void> = []
    skin.apply({
      effect: (callback: () => unknown) => {
        const disposer = callback()
        if (typeof disposer === 'function') disposers.push(disposer as () => void)
      },
      theme: { overrideTokens }
    })

    expect(overrideTokens).toHaveBeenCalledTimes(1)
    const [sourceName, tokens] = overrideTokens.mock.calls[0] as unknown as [
      string,
      Record<string, { light: string; dark: string }>
    ]
    expect(sourceName).toBe('dsh-desktop-skin')
    for (const [name, value] of Object.entries(tokens)) {
      expect(value.light, `${name} light`).toEqual(expect.any(String))
      expect(value.dark, `${name} dark`).toEqual(expect.any(String))
    }
    expect(tokens['--dsw-radius-panel']).toEqual({ light: '24px', dark: '24px' })
    expect(tokens['--dsw-alias-button-primary-fill']).toEqual({
      light: 'var(--dsw-static-blue-500)',
      dark: 'var(--dsw-static-blue-500)'
    })
    expect(tokens['--dsw-specific-bubble']).toEqual({
      light: 'var(--dsw-static-neutral-bluish-00)',
      dark: 'var(--dsw-static-neutral-bluish-850)'
    })

    expect(document.body.dataset.dshDesktopSkin).toBe('luokui')
    expect(appended).toHaveLength(1)
    const style = appended[0]!
    expect(style.id).toBe('dsh-desktop-skin-style')
    expect(style.dataset.pluginCss).toBe('dsh-desktop-skin')
    for (const selector of [
      'body[data-dsh-desktop-skin="luokui"] .pI_x6G_frame',
      '.pI_x6G_sidebarCol',
      '.pI_x6G_centerCol',
      '.dshModes',
      '.dshModes .pI_x6G_centerCol',
      '[data-dsh-sidebar-root] .hHd-Xa_panelRow',
      '.hHd-Xa_newSession',
      '[data-dsh-workbench-switcher]',
      '[data-dsh-sidebar-settings]',
      '.wSkVaW_root',
      '.dshWorkContent',
      '[data-composer-card]',
      'prefers-reduced-motion'
    ]) {
      expect(style.textContent).toContain(selector)
    }

    for (const dispose of disposers) dispose()
    expect(document.body.dataset.dshDesktopSkin).toBeUndefined()
    expect(removeStyle).toHaveBeenCalledTimes(1)
  })

  it('does not append a second stylesheet when the shell already has one', async () => {
    const source = await loadSkin()
    let definition: SkinModule | undefined
    const document = {
      getElementById: vi.fn(() => ({ id: 'dsh-desktop-skin-style' })),
      createElement: vi.fn(),
      head: { appendChild: vi.fn() },
      body: { dataset: {} as Record<string, string> }
    }
    vm.runInNewContext(source, {
      document,
      window: {
        __ModuleLoader__: {
          load: (value: SkinModule) => {
            definition = value
          }
        }
      }
    })

    const skin = definition!.factory(() => {
      throw new Error('skin requires no modules')
    })
    skin.apply({
      effect: (callback: () => unknown) => {
        callback()
      },
      theme: { overrideTokens: vi.fn(() => vi.fn()) }
    })

    expect(document.getElementById).toHaveBeenCalledWith('dsh-desktop-skin-style')
    expect(document.createElement).not.toHaveBeenCalled()
    expect(document.head.appendChild).not.toHaveBeenCalled()
  })
})
