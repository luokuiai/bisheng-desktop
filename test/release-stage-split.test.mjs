import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, it } from 'vitest'
import YAML from 'yaml'

const root = path.resolve(import.meta.dirname, '..')
const { jobs } = YAML.parse(await readFile(path.join(root, '.github/workflows/release.yml'), 'utf8'))
const step = (job, name) => jobs[job].steps.find(item => item.name === name)

it('gates Windows builds on shared checks while retaining native coverage', async () => {
  expect(jobs['windows-preflight'].needs).toBe('validate-dispatch')
  expect(jobs['windows-x64'].needs).toBe('windows-preflight')
  expect(jobs['windows-preflight'].if).toBe(jobs['windows-x64'].if)
  expect(jobs['windows-preflight']['runs-on']).toBe('ubuntu-24.04')
  expect(jobs['windows-x64']['runs-on']).toBe('windows-2022')
  expect(jobs['windows-preflight'].steps.some(item => item.run === 'npm run typecheck')).toBe(true)
  expect(jobs['windows-x64'].steps.some(item => item.run === 'npm run typecheck')).toBe(false)
  const checks = step('windows-preflight', 'Check Windows release tooling').run
  const config = await readFile(path.join(root, 'vitest.windows.config.ts'), 'utf8')
  for (const name of ['release.test.ts', 'formal-release-handoff.test.mjs', 'sign-windows-unpacked.test.ts', 'finalize-windows-release.test.ts']) {
    expect(checks).toContain(`test/${name}`)
    expect(config).not.toContain(`'test/${name}'`)
  }
  expect(step('windows-x64', 'Run focused Windows regressions').run).toBe('npx --no-install vitest run --config vitest.windows.config.ts')
  expect(step('windows-x64', 'Run complete Windows test suite').run).toBe('npx --no-install vitest run')
  expect(step('windows-x64', 'Smoke test packaged Windows Harness').run).toContain('GetCurrentProcessId')
})

it('prepares application inputs once before CI tests and reuses the build for packaging', () => {
  for (const job of ['macos', 'windows-x64']) {
    const steps = jobs[job].steps
    const builds = steps.filter(item => item.run?.includes('npm run build'))
    expect(builds).toHaveLength(1)
    const buildIndex = steps.indexOf(builds[0])
    const tests = steps.filter(item => item.run?.startsWith('npx --no-install vitest run'))
    expect(tests.length).toBeGreaterThan(0)
    for (const test of tests) expect(steps.indexOf(test)).toBeGreaterThan(buildIndex)
    const packages = steps.filter(item => item.run?.includes('--publish never'))
    expect(packages.length).toBeGreaterThan(0)
    for (const pack of packages) {
      expect(steps.indexOf(pack)).toBeGreaterThan(buildIndex)
      for (const test of tests) expect(steps.indexOf(pack)).toBeGreaterThan(steps.indexOf(test))
      expect(pack.run).not.toContain('npm run build')
    }
    // These commands would trigger npm pretest hooks and prepare Office again.
    expect(steps.some(item => /^npm (test|run test:windows)$/.test(item.run ?? ''))).toBe(false)
  }
})

it('reuses checkout history and installs formal release note tooling once', () => {
  const steps = jobs.publish.steps
  expect(steps.find(item => item.uses === 'actions/checkout@v4').with['fetch-depth']).toBe(0)
  const installs = steps.filter(item => item.run?.includes('npm install -g @github/copilot'))
  expect(installs).toHaveLength(1)
  const notes = steps.filter(item => item.name?.startsWith('Generate '))
  expect(notes).toHaveLength(2)
  for (const note of notes) {
    expect(steps.indexOf(note)).toBeGreaterThanOrEqual(steps.indexOf(installs[0]))
    expect(note.run).toContain('validate --tag')
    expect(note.run).toContain('generate-fallback')
  }
  expect(steps.some(item => item.run?.includes('git fetch --force --tags'))).toBe(false)
})

it('builds and stages unsigned Windows installers directly and preserves development installers', () => {
  const build = step('windows-x64', 'Build Windows application once').run
  expect(build).toBe('node scripts/verify-target.mjs win32 x64 && npm run build')
  expect(step('windows-x64', 'Build Windows release package').run).toBe('node scripts/electron-builder-windows.mjs --win --x64 --publish never')
  expect(step('windows-x64', 'Build isolated Windows development package').run).toBe('node scripts/electron-builder-windows.mjs --win --x64 --publish never --config electron-builder.dev.cjs')
  const upload = step('windows-x64', 'Stage unsigned Windows assets in draft release').run
  for (const asset of ['bisheng-windows-x64-setup.exe', 'bisheng-windows-x64-setup.exe.blockmap', 'latest.yml']) {
    expect(upload).toContain(`dist/${asset}`)
  }
  expect(upload).not.toContain('win-unpacked.tar.gz')
  expect(jobs['windows-x64'].steps.some(item => item.run?.includes('archive-windows-unpacked.mjs'))).toBe(false)
  expect(jobs['sign-windows']).toBeUndefined()
  for (const name of ['publish', 'publish-prerelease', 'publish-signed']) {
    expect(jobs[name].needs).toEqual(['macos', 'windows-x64'])
    expect(jobs[name].if).toContain("needs.macos.result == 'success'")
    expect(jobs[name].if).toContain("needs.windows-x64.result == 'success'")
  }
})

it.skipIf(process.platform === 'win32')('verifies downloaded platform assets and rejects corruption before publication', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'release-publish-handoff-'))
  try {
    await mkdir(path.join(directory, 'scripts'))
    await copyFile(path.join(root, 'scripts/verify-release-staging.mjs'), path.join(directory, 'scripts/verify-release-staging.mjs'))
    const bytes = Buffer.from('release platform payload')
    const digest = createHash('sha256').update(bytes).digest('hex')
    const names = [
      'bisheng-mac-arm64.dmg', 'bisheng-mac-arm64.zip',
      'bisheng-mac-arm64.zip.blockmap', 'latest-mac-arm64.yml',
      'bisheng-mac-x64.dmg', 'bisheng-mac-x64.zip',
      'bisheng-mac-x64.zip.blockmap', 'latest-mac-x64.yml',
      'bisheng-windows-x64-setup.exe',
      'bisheng-windows-x64-setup.exe.blockmap', 'latest.yml'
    ]
    const assets = names.map(name => ({ name, size: bytes.length, digest: `sha256:${digest}` }))
    await writeFile(path.join(directory, 'payload'), bytes)
    await writeFile(path.join(directory, 'gh'), `#!/usr/bin/env node
const fs = require('node:fs'), path = require('node:path')
const args = process.argv.slice(2)
const assets = ${JSON.stringify(assets)}
if (args[1] === 'download') {
  const patterns = args.flatMap((arg, i) => arg === '--pattern' ? [args[i + 1]] : [])
  if (JSON.stringify(patterns) !== JSON.stringify(['bisheng-*', 'latest*.yml'])) process.exit(2)
  const directory = args[args.indexOf('--dir') + 1]
  fs.mkdirSync(directory, { recursive: true })
  for (const { name } of assets) fs.copyFileSync('payload', path.join(directory, name))
} else if (args[1] === 'view') {
  process.stdout.write(JSON.stringify({isDraft:true,assets}))
} else process.exit(3)
`, { mode: 0o755 })
    const env = {
      ...process.env,
      PATH: `${directory}${path.delimiter}${process.env.PATH}`,
      GITHUB_REF_NAME: 'v1.0.4', GITHUB_REPOSITORY: 'example/desktop'
    }
    const download = step('publish', 'Download verified platform assets from draft release')
    for (const name of ['Upload macOS ARM64 update ZIP', 'Publish verified GitHub release']) {
      const publishIndex = jobs.publish.steps.findIndex(item => item.name === name)
      expect(publishIndex).toBeGreaterThan(jobs.publish.steps.indexOf(download))
    }
    const script = download.run
    expect(execFileSync('bash', ['-c', script], { cwd: directory, env, encoding: 'utf8', stdio: 'pipe' }))
      .toContain(`Verified ${names.length} draft release assets for v1.0.4`)
    await writeFile(path.join(directory, 'payload'), Buffer.alloc(bytes.length, 'x'))
    expect(() => execFileSync('bash', ['-c', script], { cwd: directory, env, stdio: 'pipe' })).toThrow(/SHA-256 mismatch/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
