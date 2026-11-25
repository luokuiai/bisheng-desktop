import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { afterEach, expect, it, vi } from 'vitest'
import { parse } from 'yaml'

const require = createRequire(import.meta.url)
const { build } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const { Platform } = require('app-builder-lib')
const { WinPackager } = require('app-builder-lib/out/winPackager.js')
const { getAppUpdatePublishConfiguration } = require('app-builder-lib/out/publish/PublishManager.js')
const { isSignAllowed } = require('app-builder-lib/out/codeSign/macCodeSign.js')
const configureUpdateFeed = require('../scripts/configure-update-feed.cjs')

afterEach(() => vi.unstubAllEnvs())

it('allows ad-hoc signing in GitHub macOS PR builds without injecting certificate secrets', async () => {
  const workflow = parse(await readFile(new URL('../.github/workflows/desktop-build.yml', import.meta.url), 'utf8'))
  const step = workflow.jobs.build.steps.find(step => step.run === 'npm run ${{ matrix.script }}')
  const expression = step.env.CSC_FOR_PULL_REQUEST.slice(3, -2)
  const enabled = new Function('runner', 'github', `return (${expression})`)
  const original = Object.getOwnPropertyDescriptor(process, 'platform')
  try {
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    vi.stubEnv('GITHUB_BASE_REF', 'develop')
    vi.stubEnv('CSC_FOR_PULL_REQUEST', undefined)
    expect(isSignAllowed(false)).toBe(false)
    vi.stubEnv('CSC_FOR_PULL_REQUEST', enabled({ os: 'macOS' }, { event_name: 'pull_request' }))
    expect(isSignAllowed(false)).toBe(true)
    expect(build.mac.identity).toBe('-')
    expect(Object.keys(step.env)).toEqual(['CSC_FOR_PULL_REQUEST'])
    expect(enabled({ os: 'Windows' }, { event_name: 'pull_request' })).toBe('false')
  } finally {
    Object.defineProperty(process, 'platform', original)
  }
})

it('skips Authenticode signing for the executable and installer while preserving resource editing', async () => {
  const sign = vi.fn()
  const packager = {
    platformSpecificBuildOptions: build.win,
    shouldSignFile: WinPackager.prototype.shouldSignFile,
    signingQueue: Promise.resolve(),
    _sign: sign
  }
  for (const file of ['BISHENG.exe', 'bisheng-windows-x64-setup.exe', 'uninstaller.exe']) {
    expect(await WinPackager.prototype.signIf.call(packager, file)).toBe(false)
  }
  expect(sign).not.toHaveBeenCalled()
  expect(build.win.signAndEditExecutable).not.toBe(false)
})

it('generates updater configuration without a certificate publisher requirement', async () => {
  vi.stubEnv('BISHENG_UPDATE_URL', 'https://updates.example.com/desktop/')
  const configBuild = structuredClone(build)
  configureUpdateFeed({ packager: { config: configBuild } })
  const verification = Object.getOwnPropertyDescriptor(WinPackager.prototype, 'isForceCodeSigningVerification').get
  const appInfo = { updaterCacheDirName: 'desktop-updater' }
  const packager = {
    config: configBuild,
    platformSpecificBuildOptions: build.win,
    platform: Platform.WINDOWS,
    appInfo,
    info: { config: configBuild, appInfo },
    expandMacro: value => value,
    get isForceCodeSigningVerification() { return verification.call(this) },
    get signingManager() { throw new Error('Unsigned builds must not inspect signing credentials') }
  }
  const config = await getAppUpdatePublishConfiguration(packager, null, 1, true)
  expect(config).toMatchObject({ ...configBuild.publish[0], updaterCacheDirName: 'desktop-updater' })
  expect(config.publisherName).toBeUndefined()
})
