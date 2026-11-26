import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { harnessPreferredPort, mobileBridgePort } from '../src/main/desktop-ports'
import { resolveDesktopUserData } from '../src/main/desktop-user-data'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('LUOKUI-AI installation identity', () => {
  it('clears the production session marker only from the production installer', async () => {
    const installer = await readFile(path.join(projectRoot, 'build', 'installer.nsh'), 'utf8')

    expect(installer).not.toContain('$APPDATA\\dsh-desktop')
    expect(installer).not.toContain('$APPDATA\\bisheng')
    expect(installer).toMatch(/!if "\$\{APP_ID\}" == "com\.luokuiai\.eai"\s+Delete "\$APPDATA\\luokuiai-eai\\desktop-service\\session\.json"\s+!endif/)
  })

  it('does not import an existing ~/.dsh home during startup', async () => {
    const main = await readFile(path.join(projectRoot, 'src', 'main', 'index.ts'), 'utf8')

    expect(main).not.toContain('maybeImportWebHome')
    expect(main).not.toContain('shouldOfferWebHomeImport')
    expect(main).toMatch(/app\.setPath\('userData', resolveDesktopUserData\(\s*app\.getPath\('appData'\),\s*developmentBuild,\s*process\.env\.BISHENG_DEV_USER_DATA\s*\)\)/)
    expect(main).not.toContain("join(app.getPath('appData'), 'dsh-desktop')")
    expect(main).toContain("app.setName('LUOKUI-AI')")
    expect(main).toContain('title: app.name')
    expect(main).toContain('window.setTitle(app.name)')
  })

  it('uses a user-data directory the Windows smoke test can find', async () => {
    const workflow = await readFile(
      path.join(projectRoot, '.github', 'workflows', 'release.yml'),
      'utf8'
    )

    expect(workflow).toContain("&& 'luokuiai-eai' || 'luokuiai-dev'")
    expect(workflow).not.toContain("&& 'dsh-desktop' || 'dsh-desktop-dev'")
  })

  it('uses the new production directory even with old production data or a development override', async () => {
    const appData = await mkdtemp(path.join(tmpdir(), 'luokuiai-production-profile-'))
    try {
      const oldDirectory = path.join(appData, 'bisheng')
      const current = path.join(appData, 'luokuiai-eai')
      const oldSettings = path.join(oldDirectory, 'settings.json')
      await mkdir(oldDirectory)
      await writeFile(oldSettings, '{}')
      expect(resolveDesktopUserData(appData, false)).toBe(current)
      expect(resolveDesktopUserData(appData, false, oldDirectory)).toBe(current)
      await expect(readFile(oldSettings, 'utf8')).resolves.toBe('{}')
    } finally {
      await rm(appData, { recursive: true, force: true })
    }
  })

  it('uses the new development directory for fresh installs and reuses an existing profile', async () => {
    const appData = await mkdtemp(path.join(tmpdir(), 'luokuiai-dev-profile-'))
    try {
      const current = path.join(appData, 'luokuiai-dev')
      const legacy = path.join(appData, 'bisheng-dev')
      const custom = path.join(appData, 'isolated')
      expect(resolveDesktopUserData(appData, true)).toBe(current)
      await mkdir(legacy)
      await writeFile(path.join(legacy, 'settings.json'), '{}')
      expect(resolveDesktopUserData(appData, true)).toBe(legacy)
      await mkdir(current)
      expect(resolveDesktopUserData(appData, true)).toBe(current)
      expect(resolveDesktopUserData(appData, true, custom)).toBe(custom)
      await expect(readFile(path.join(legacy, 'settings.json'), 'utf8')).resolves.toBe('{}')
    } finally {
      await rm(appData, { recursive: true, force: true })
    }
  })

  it('listens on ports that stay free while DSH Desktop is running', () => {
    const dshPorts = new Set([43127, 43128, 43129, 43130])
    const productPorts = [
      mobileBridgePort(false),
      mobileBridgePort(true),
      harnessPreferredPort(false),
      harnessPreferredPort(true)
    ]

    expect(new Set(productPorts).size).toBe(productPorts.length)
    for (const port of productPorts) expect(dshPorts.has(port)).toBe(false)
  })
})
