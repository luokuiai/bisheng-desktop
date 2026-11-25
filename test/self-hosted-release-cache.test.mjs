import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, it } from 'vitest'
import YAML from 'yaml'

it('bounds Node setup on hosted preparation workers and caches Windows npm downloads', async () => {
  const source = await readFile(path.resolve(import.meta.dirname, '../.github/workflows/release.yml'), 'utf8')
  const { jobs } = YAML.parse(source)
  const persistentJobs = Object.values(jobs).filter(job =>
    Array.isArray(job['runs-on']) && job['runs-on'].includes('self-hosted')
  )
  expect(persistentJobs).toHaveLength(0)
  for (const name of ['prepare-shared-runtime-assets', 'windows-preflight', 'macos']) {
    const setups = jobs[name].steps.filter(step => step.uses?.startsWith('actions/setup-node@'))
    expect(setups.length).toBeGreaterThan(0)
    for (const setup of setups) {
      expect(setup.with?.cache).toBeUndefined()
      expect(setup['timeout-minutes']).toBe(5)
    }
  }
  const hostedSetup = jobs['windows-x64'].steps.find(step => step.uses?.startsWith('actions/setup-node@'))
  expect(hostedSetup.with.cache).toBe('npm')
  expect(hostedSetup.with['cache-dependency-path']).toBe('package-lock.json')
})

it('keeps portable checks on Linux and macOS preparation and builds on hosted native runners', async () => {
  const source = await readFile(path.resolve(import.meta.dirname, '../.github/workflows/release.yml'), 'utf8')
  const { jobs } = YAML.parse(source)
  for (const name of ['validate-dispatch', 'windows-preflight', 'publish', 'publish-prerelease', 'publish-signed']) {
    expect(jobs[name]['runs-on']).toBe('ubuntu-24.04')
  }
  expect(jobs['prepare-shared-runtime-assets']['runs-on']).toBe('macos-15')
  expect(jobs.macos['runs-on']).toBe('${{ matrix.runner }}')
  expect(jobs.macos.strategy.matrix.include.map(({ arch, runner }) => ({ arch, runner }))).toEqual([
    { arch: 'arm64', runner: 'macos-15' },
    { arch: 'x64', runner: 'macos-15-intel' }
  ])
  expect(jobs['windows-x64']['runs-on']).toBe('windows-2022')
})

it('restores Windows download caches before installing dependencies', async () => {
  const source = await readFile(path.resolve(import.meta.dirname, '../.github/workflows/release.yml'), 'utf8')
  const job = YAML.parse(source).jobs['windows-x64']
  const cacheIndex = job.steps.findIndex(step => step.uses === 'actions/cache@v4')
  const installIndex = job.steps.findIndex(step => step.run?.startsWith('npm ci'))
  expect(cacheIndex).toBeGreaterThan(-1)
  expect(cacheIndex).toBeLessThan(installIndex)
  const cache = job.steps[cacheIndex].with
  expect(cache.path.trim().split('\n')).toEqual([
    '${{ env.ELECTRON_CACHE }}',
    '${{ env.ELECTRON_BUILDER_CACHE }}',
    '.build/office-downloads'
  ])
  const configureIndex = job.steps.findIndex(step => step.name === 'Configure Windows packaging cache')
  expect(configureIndex).toBeGreaterThan(-1)
  expect(configureIndex).toBeLessThan(cacheIndex)
  expect(job.steps[configureIndex].shell).toBe('pwsh')
  expect(job.steps[configureIndex].run).toContain('"ELECTRON_CACHE=$env:RUNNER_TEMP/electron-cache" >> $env:GITHUB_ENV')
  expect(job.steps[configureIndex].run).toContain('"ELECTRON_BUILDER_CACHE=$env:RUNNER_TEMP/electron-builder-cache" >> $env:GITHUB_ENV')
  expect(cache.key).toBe("windows-x64-packaging-v1-${{ hashFiles('package-lock.json', 'scripts/office-runtime/lock.json') }}")
  expect(job.steps[installIndex].run).toBe('npm ci --prefer-offline')
})
