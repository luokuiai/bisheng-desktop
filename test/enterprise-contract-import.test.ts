import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { registerEnterpriseLoginProtocol } from '../src/main/enterprise/login-link'

const projectRoot = path.resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)

const electronApp = vi.hoisted(() => ({
  isPackaged: true,
  getAppPath: vi.fn(),
  setAsDefaultProtocolClient: vi.fn()
}))
vi.mock('electron', () => ({ app: electronApp }))

describe('enterprise contract package export', () => {
  it('can dynamically import the pure contract functions', async () => {
    const contract = await import('dsh-desktop-enterprise/contract')
    expect(contract.CLIENT_ID).toBe('dsh-desktop')
    expect(contract.CONTRACT_VERSION).toBe('0.5.0')
    expect(typeof contract.createPkceTransaction).toBe('function')
    expect(typeof contract.parseToken).toBe('function')
    expect(typeof contract.parseModels).toBe('function')
    expect(typeof contract.normalizeAuditContext).toBe('function')
    expect(contract.normalizeAuditContext({ request_kind: 'chat' }, ['request_kind'])).toEqual({ request_kind: 'chat' })
    const pkce = contract.createPkceTransaction()
    expect(contract.pkceChallenge(pkce.codeVerifier)).toBe(pkce.codeChallenge)
  })

  it('can dynamically import deep-link helpers from the package export', async () => {
    const deepLink = await import('dsh-desktop-enterprise/deep-link')
    expect(deepLink.ENTERPRISE_LOGIN_PROTOCOL).toBe('luokuiai')
    expect(deepLink.ENTERPRISE_LOGIN_DEV_PROTOCOL).toBe('luokuiai-dev')
    expect(deepLink.normalizeEnterpriseServerUrl('https://platform.example.com')).toBe(
      'https://platform.example.com'
    )
  })

  it('keeps the registered protocols aligned with the deep-link contract', async () => {
    const packageText = await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    const packageJson = JSON.parse(packageText) as {
      build: { appId: string; protocols: Array<{ schemes: string[] }> }
    }
    const developmentConfig = require('../electron-builder.dev.cjs') as {
      protocols: Array<{ schemes: string[] }>
      extraMetadata: { dshDesktopChannel: string }
    }
    const deepLink = await import('dsh-desktop-enterprise/deep-link')

    expect(packageJson.build.protocols[0]?.schemes).toEqual([deepLink.ENTERPRISE_LOGIN_PROTOCOL])
    expect(developmentConfig.protocols[0]?.schemes).toEqual([deepLink.ENTERPRISE_LOGIN_DEV_PROTOCOL])

    electronApp.getAppPath.mockReturnValue(projectRoot)
    registerEnterpriseLoginProtocol()
    expect(electronApp.setAsDefaultProtocolClient).toHaveBeenLastCalledWith(
      deepLink.ENTERPRISE_LOGIN_PROTOCOL
    )

    const developmentAppPath = await mkdtemp(path.join(tmpdir(), 'luokuiai-login-channel-'))
    try {
      await writeFile(path.join(developmentAppPath, 'package.json'), JSON.stringify(developmentConfig.extraMetadata))
      electronApp.getAppPath.mockReturnValue(developmentAppPath)
      registerEnterpriseLoginProtocol()
      expect(electronApp.setAsDefaultProtocolClient).toHaveBeenLastCalledWith(
        deepLink.ENTERPRISE_LOGIN_DEV_PROTOCOL
      )
    } finally {
      await rm(developmentAppPath, { recursive: true, force: true })
    }

    electronApp.isPackaged = false
    registerEnterpriseLoginProtocol()
    expect(electronApp.setAsDefaultProtocolClient).toHaveBeenLastCalledWith(
      deepLink.ENTERPRISE_LOGIN_DEV_PROTOCOL,
      process.execPath,
      [process.argv[1] ? path.resolve(process.argv[1]) : process.cwd()]
    )
  })
})
