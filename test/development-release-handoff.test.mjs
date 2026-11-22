import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { runInNewContext } from 'node:vm'
import { afterEach, expect, it } from 'vitest'
import YAML from 'yaml'
import { developmentAssets } from '../scripts/stage-development-assets.mjs'

const temporaryDirectories = []
async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'development-release-'))
  temporaryDirectories.push(directory)
  return directory
}
afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})

it.each([
  ['arm64', ['bisheng-dev-mac-arm64.dmg', 'bisheng-dev-mac-arm64.zip']],
  ['x64', ['bisheng-dev-mac-x64.dmg', 'bisheng-dev-mac-x64.zip']],
  ['windows', ['bisheng-dev-windows-x64-setup.exe']]
])('requires the %s installers while allowing absent updater metadata', async (platform, names) => {
  const directory = await temporaryDirectory()
  await expect(developmentAssets(directory, platform)).rejects.toThrow()
  for (const name of names) await writeFile(path.join(directory, name), 'installer')
  expect(await developmentAssets(directory, platform)).toEqual(names.map(name => path.join(directory, name)))
  const metadata = platform === 'windows' ? 'latest.yml' : `bisheng-dev-mac-${platform}.zip.blockmap`
  await writeFile(path.join(directory, metadata), 'metadata')
  expect(await developmentAssets(directory, platform)).toContain(path.join(directory, metadata))
  await writeFile(path.join(directory, names[0]), '')
  await expect(developmentAssets(directory, platform)).rejects.toThrow('empty development installer')
})

it('keeps release handoff on draft Releases', async () => {
  const source = await readFile(path.resolve(import.meta.dirname, '../.github/workflows/release.yml'), 'utf8')
  expect(source).not.toMatch(/actions\/(?:upload|download)-artifact@|gh\s+run\s+download|\/actions\/artifacts/)
})

it.each([
  [undefined, '-', 'false'],
  ['', '-', 'false'],
  ['  ', '-', 'false'],
  ['test-cert.p12', undefined, 'true']
])('selects macOS Dev signing for CSC_LINK=%j', async (certificate, identity, discovery) => {
  const configPath = path.resolve(import.meta.dirname, '../electron-builder.dev.cjs')
  const source = await readFile(configPath, 'utf8')
  const require = createRequire(configPath)
  const env = { CSC_IDENTITY_AUTO_DISCOVERY: discovery === 'true' ? 'false' : 'true' }
  if (certificate !== undefined) env.CSC_LINK = certificate
  const module = { exports: {} }
  runInNewContext(source, { require, module, process: { platform: 'darwin', env } })

  expect(module.exports.mac).toMatchObject({
    ...require('./package.json').build.mac,
    identity,
    forceCodeSigning: true
  })
  expect(env.CSC_IDENTITY_AUTO_DISCOVERY).toBe(discovery)
  expect(env.CSC_LINK).toBe(identity === '-' ? undefined : certificate)
})

it('packages PRs and develop pushes, and uploads the original installers only on develop pushes', async () => {
  const source = await readFile(path.resolve(import.meta.dirname, '../.github/workflows/desktop-build.yml'), 'utf8')
  const workflow = YAML.parse(source)
  expect(workflow.on).toEqual({
    pull_request: { branches: ['develop'] },
    push: { branches: ['develop'] }
  })
  const build = workflow.jobs.build
  expect(build.strategy.matrix.include.map(({ script, installer }) => [script, installer])).toEqual([
    ['package:dev:mac:arm64', 'bisheng-dev-mac-arm64.dmg'],
    ['package:dev:mac:x64', 'bisheng-dev-mac-x64.dmg'],
    ['package:dev:win', 'bisheng-dev-windows-x64-setup.exe']
  ])
  const packageStep = build.steps.findIndex(step => step.run === 'npm run ${{ matrix.script }}')
  const verifyStep = build.steps.findIndex(step => step.name === 'Verify app signature inside the macOS installer')
  const artifactStep = build.steps.findIndex(step => step.uses?.startsWith('actions/upload-artifact@'))
  expect(packageStep).toBeGreaterThanOrEqual(0)
  expect(build.steps[packageStep].if).toBeUndefined()
  expect(verifyStep).toBeGreaterThan(packageStep)
  expect(build.steps[verifyStep].if).toBe("runner.os == 'macOS'")
  expect(build.steps[verifyStep].run).toContain('codesign --verify --deep --strict')
  expect(artifactStep).toBeGreaterThan(verifyStep)
  const upload = build.steps[artifactStep]
  expect(upload.uses).toBe('actions/upload-artifact@v7')
  expect(upload.with).toMatchObject({
    name: '${{ matrix.installer }}',
    path: 'dist-dev/${{ matrix.installer }}',
    archive: false,
    overwrite: true,
    'retention-days': 1,
    'if-no-files-found': 'error'
  })
  const shouldUpload = new Function('github', `return (${upload.if})`)
  expect(shouldUpload({ event_name: 'pull_request', ref: 'refs/pull/1/merge' })).toBe(false)
  expect(shouldUpload({ event_name: 'push', ref: 'refs/heads/develop' })).toBe(true)
  expect(shouldUpload({ event_name: 'push', ref: 'refs/heads/main' })).toBe(false)
})

it('only supplies macOS certificate secrets to develop push packaging', async () => {
  const source = await readFile(path.resolve(import.meta.dirname, '../.github/workflows/desktop-build.yml'), 'utf8')
  const { steps } = YAML.parse(source).jobs.build
  const { env } = steps.find(step => step.run === 'npm run ${{ matrix.script }}')
  const secrets = { DESKTOP_CSC_LINK: 'test-cert.p12', DESKTOP_CSC_KEY_PASSWORD: 'fixture' }
  function signingEnvironment(os, event_name, ref) {
    return Object.fromEntries(Object.entries(env).map(([key, expression]) => [
      key,
      new Function('runner', 'github', 'secrets', `return (${expression.slice(3, -2)})`)(
        { os }, { event_name, ref }, secrets
      )
    ]))
  }
  expect(signingEnvironment('macOS', 'push', 'refs/heads/develop')).toEqual({
    CSC_LINK: secrets.DESKTOP_CSC_LINK,
    CSC_KEY_PASSWORD: secrets.DESKTOP_CSC_KEY_PASSWORD,
    CSC_FOR_PULL_REQUEST: 'false'
  })
  expect(signingEnvironment('macOS', 'pull_request', 'refs/pull/1/merge')).toEqual({
    CSC_LINK: '',
    CSC_KEY_PASSWORD: '',
    CSC_FOR_PULL_REQUEST: 'true'
  })
  expect(signingEnvironment('macOS', 'push', 'refs/heads/main')).toEqual({
    CSC_LINK: '',
    CSC_KEY_PASSWORD: '',
    CSC_FOR_PULL_REQUEST: 'false'
  })
  expect(signingEnvironment('Windows', 'push', 'refs/heads/develop')).toEqual({
    CSC_LINK: '',
    CSC_KEY_PASSWORD: '',
    CSC_FOR_PULL_REQUEST: 'false'
  })
})

it.skipIf(process.platform === 'win32').each([
  ['development', 'refs/heads/main', 'dev-123-2'],
  ['signed', 'refs/heads/main', '1.0.3-test.1'],
  ['prerelease', 'refs/heads/main', '1.0.3-rc.1'],
  ['prerelease', 'refs/tags/v1.0.3', 'v1.0.3']
])('prepares the correct draft for %s at %s and rejects published releases', async (mode, ref, expectedTag) => {
  const directory = await temporaryDirectory()
  const workflow = YAML.parse(await readFile(path.resolve(import.meta.dirname, '../.github/workflows/release.yml'), 'utf8'))
  const prepare = workflow.jobs['validate-dispatch'].steps.find(step => step.name === 'Prepare draft release for verified publication')
  const script = path.join(directory, 'prepare.sh')
  const calls = path.join(directory, 'calls.jsonl')
  await writeFile(script, prepare.run)
  await writeFile(path.join(directory, 'gh'), `#!/usr/bin/env node
const fs = require('node:fs')
const args = process.argv.slice(2)
fs.appendFileSync(process.env.CALLS, JSON.stringify(args) + '\\n')
if (args[1] === 'view') {
  if (args.includes('url')) {
    process.stdout.write('https://github.com/example/desktop/releases/tag/untagged-test\\n')
    process.exit(0)
  }
  if (process.env.PUBLISHED === 'true') process.stdout.write('false\\n')
  else process.exitCode = 1
}
`, { mode: 0o755 })
  const env = {
    ...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH}`, CALLS: calls,
    MODE: mode, GITHUB_REF: ref, GITHUB_REF_NAME: ref.split('/').at(-1),
    SIGNED_VERSION: '1.0.3-test.1', PRERELEASE_TAG: '1.0.3-rc.1', DEV_RELEASE_TAG: 'dev-123-2',
    GITHUB_REPOSITORY: 'example/desktop', GITHUB_SHA: 'example-sha', GITHUB_RUN_ID: '123',
    GITHUB_SERVER_URL: 'https://github.com', GITHUB_STEP_SUMMARY: path.join(directory, 'summary'), PUBLISHED: 'false'
  }
  execFileSync('bash', [script], { env, stdio: 'pipe' })
  const invocations = (await readFile(calls, 'utf8')).trim().split('\n').map(line => JSON.parse(line))
  const create = invocations.find(args => args[1] === 'create')
  expect(create.slice(0, 3)).toEqual(['release', 'create', expectedTag])
  expect(create).toContain('--draft')
  expect(await readFile(env.GITHUB_STEP_SUMMARY, 'utf8')).toContain(`[${expectedTag}](https://github.com/example/desktop/releases/tag/untagged-test)`)
  expect(() => execFileSync('bash', [script], { env: { ...env, PUBLISHED: 'true' }, stdio: 'pipe' }))
    .toThrow()
})

it('stages every signed and prerelease target before Windows signing', async () => {
  const workflow = YAML.parse(await readFile(path.resolve(import.meta.dirname, '../.github/workflows/release.yml'), 'utf8'))
  const jobs = workflow.jobs
  const evaluate = (expression, mode, target) => new Function('github', 'inputs', 'startsWith', `return (${expression})`)(
    { event_name: 'workflow_dispatch', ref: 'refs/heads/main' }, { mode, target }, (value, prefix) => value.startsWith(prefix)
  )
  for (const target of ['all', 'macos', 'windows']) {
    for (const mode of ['signed', 'prerelease', 'development']) {
      const prepare = jobs['validate-dispatch'].steps.find(step => step.name === 'Prepare draft release for verified publication')
      expect(evaluate(prepare.if, mode, target)).toBe(true)
      for (const [job, name] of [
        ['windows-x64', 'Stage unsigned Windows assets in draft release'],
        ['sign-windows', 'Download unsigned Windows assets from draft release'],
        ['sign-windows', 'Stage signed Windows assets in draft release'],
        ['macos', 'Stage signed ${{ matrix.label }} assets in draft release']
      ]) {
        expect(evaluate(jobs[job].steps.find(step => step.name === name).if, mode, target)).toBe(mode !== 'development')
      }
    }
  }
})

it.skipIf(process.platform === 'win32')('uploads validated development files and propagates upload failures', async () => {
  const directory = await temporaryDirectory()
  const installer = path.join(directory, 'bisheng-dev-windows-x64-setup.exe')
  await writeFile(installer, 'installer')
  await writeFile(path.join(directory, 'gh'), `#!/usr/bin/env node
require('node:fs').writeFileSync(process.env.CALLS, JSON.stringify(process.argv.slice(2)))
process.exitCode = Number(process.env.UPLOAD_EXIT)
`, { mode: 0o755 })
  const env = {
    ...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH}`,
    CALLS: path.join(directory, 'calls.json'), DEV_RELEASE_TAG: 'dev-123-2', GITHUB_REPOSITORY: 'example/desktop', UPLOAD_EXIT: '0'
  }
  const script = path.resolve(import.meta.dirname, '../scripts/stage-development-assets.mjs')
  execFileSync(process.execPath, [script, 'windows', directory], { env, stdio: 'pipe' })
  expect(JSON.parse(await readFile(env.CALLS, 'utf8'))).toEqual([
    'release', 'upload', 'dev-123-2', installer, '--clobber', '--repo', 'example/desktop'
  ])
  expect(() => execFileSync(process.execPath, [script, 'windows', directory], {
    env: { ...env, UPLOAD_EXIT: '1' }, stdio: 'pipe'
  })).toThrow()
})
