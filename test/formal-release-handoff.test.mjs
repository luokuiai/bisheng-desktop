import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { expect, it } from 'vitest'
import YAML from 'yaml'

it('exports each verified formal ZIP, manual-install DMG and YAML in its original format for one day', async () => {
  const { jobs } = YAML.parse(await readFile(path.resolve(import.meta.dirname, '../.github/workflows/release.yml'), 'utf8'))
  const steps = jobs.publish.steps
  const uploads = steps.filter(step => step.uses === 'actions/upload-artifact@v7')
  expect(uploads.map(step => step.with.name)).toEqual([
    'luokui-ai-mac-arm64.zip', 'luokui-ai-mac-arm64.dmg',
    'luokui-ai-mac-x64.zip', 'luokui-ai-mac-x64.dmg', 'latest-mac.yml', 'latest.yml'
  ])
  const verified = steps.findIndex(step => step.name === 'Verify release assets before publication')
  const published = steps.findIndex(step => step.name === 'Publish verified GitHub release')
  for (const step of uploads) {
    expect(steps.indexOf(step)).toBeGreaterThan(verified)
    expect(steps.indexOf(step)).toBeLessThan(published)
    expect(step.with).toEqual({
      name: step.with.name,
      path: `release-assets/${step.with.name}`,
      'if-no-files-found': 'error',
      'retention-days': 1,
      archive: false,
      overwrite: true
    })
    expect(step.if).toBeUndefined()
  }
  const expression = jobs.publish.if.replaceAll('needs.windows-x64', 'needs["windows-x64"]')
  const shouldPublish = new Function('github', 'needs', 'inputs', 'always', 'startsWith', `return (${expression})`)
  const context = { macos: { result: 'success' }, 'windows-x64': { result: 'success' } }
  const evaluate = (ref, result = 'success') => shouldPublish(
    { ref }, { ...context, 'windows-x64': { result } }, { prerelease_tag: '' }, () => true, (value, prefix) => value.startsWith(prefix)
  )
  expect(evaluate('refs/tags/v1.2.3')).toBe(true)
  expect(evaluate('refs/heads/develop')).toBe(false)
  expect(evaluate('refs/tags/v1.2.3', 'failure')).toBe(false)
  expect(evaluate('refs/tags/v1.2.3', 'cancelled')).toBe(false)
  expect(JSON.stringify(jobs.publish)).not.toMatch(/modelscope|MODELSCOPE|ModelScope/)
})

it.skipIf(process.platform === 'win32')('validates stable formal tags without requiring ModelScope credentials', async () => {
  const { jobs } = YAML.parse(await readFile(path.resolve(import.meta.dirname, '../.github/workflows/release.yml'), 'utf8'))
  const validation = jobs['validate-dispatch'].steps.find(step => step.name === 'Validate formal release tag')
  const env = { ...process.env, GITHUB_REF_NAME: 'v1.2.3', MODELSCOPE_TOKEN: '' }
  execFileSync('bash', ['-c', validation.run], { env, stdio: 'pipe' })
  expect(() => execFileSync('bash', ['-c', validation.run], {
    env: { ...env, GITHUB_REF_NAME: 'v1.2.3-rc.1' }, stdio: 'pipe'
  })).toThrow()
  const tokenCheck = jobs['validate-dispatch'].steps.find(step => step.name === 'Require ModelScope token for published releases')
  const required = new Function('github', 'inputs', `return (${tokenCheck.if})`)
  expect(required({ event_name: 'push', ref: 'refs/tags/v1.2.3' }, {})).toBe(false)
  expect(required({ event_name: 'workflow_dispatch' }, { mode: 'signed' })).toBe(true)
})

it('verifies draft handoff before exporting formal artifacts and publishing other channels', async () => {
  const source = await readFile(path.resolve(import.meta.dirname, '../.github/workflows/release.yml'), 'utf8')
  const jobs = YAML.parse(source).jobs
  const step = (job, name) => jobs[job].steps.find(item => item.name === name)
  const formal = "startsWith(github.ref, 'refs/tags/v')"
  const staged = "inputs.mode == 'signed' || inputs.mode == 'prerelease'"

  expect(step('validate-dispatch', 'Prepare draft release for verified publication').if).toContain(formal)
  expect(step('validate-dispatch', 'Prepare draft release for verified publication').if).toContain("github.event_name == 'workflow_dispatch'")
  for (const [job, name] of [
    ['macos', 'Stage ad-hoc ${{ matrix.label }} assets in draft release'],
    ['windows-x64', 'Stage unsigned Windows assets in draft release']
  ]) {
    expect(step(job, name).if).toContain(formal)
    expect(step(job, name).if).toContain(staged)
    expect(step(job, name).run).toContain('gh release upload')
  }
  for (const [name, job] of Object.entries(jobs)) {
    expect(job.steps.some(item => /actions\/download-artifact@/.test(item.uses ?? ''))).toBe(false)
    if (name !== 'publish') expect(job.steps.some(item => /actions\/upload-artifact@/.test(item.uses ?? ''))).toBe(false)
  }
  expect(jobs).not.toHaveProperty('sign-windows')
  for (const job of ['publish', 'publish-prerelease', 'publish-signed']) {
    expect(jobs[job].needs).toEqual(['macos', 'windows-x64'])
  }
  for (const asset of ['luokui-ai-windows-x64-setup.exe', 'luokui-ai-windows-x64-setup.exe.blockmap', 'latest.yml']) {
    expect(step('windows-x64', 'Stage unsigned Windows assets in draft release').run)
      .toContain(`dist/${asset}`)
  }
  for (const [job, name] of [
    ['publish', 'Download verified platform assets from draft release'],
    ['publish-prerelease', 'Download verified pre-release assets from draft release'],
    ['publish-signed', 'Download verified test assets from draft release']
  ]) {
    const run = step(job, name).run
    expect(run).toContain('verify-release-staging.mjs')
    expect(run.indexOf('gh release download')).toBeGreaterThanOrEqual(0)
    expect(run.indexOf('gh release download')).toBeLessThan(run.indexOf('verify-release-staging.mjs'))
  }
  const names = jobs.publish.steps.map(item => item.name)
  expect(names.indexOf('Download verified platform assets from draft release'))
    .toBeLessThan(names.indexOf('Verify release assets before publication'))
  expect(names.indexOf('Verify release assets before publication'))
    .toBeLessThan(names.indexOf('Upload macOS ARM64 update ZIP'))
  expect(names.indexOf('Upload Windows update YAML'))
    .toBeLessThan(names.indexOf('Publish verified GitHub release'))
  const prereleaseNames = jobs['publish-prerelease'].steps.map(item => item.name)
  expect(prereleaseNames.indexOf('Download verified pre-release assets from draft release'))
    .toBeLessThan(prereleaseNames.indexOf('Verify release assets before publication'))
  expect(prereleaseNames.indexOf('Verify release assets before publication'))
    .toBeLessThan(prereleaseNames.indexOf('Mirror pre-release assets to ModelScope'))
  expect(prereleaseNames.indexOf('Verify public ModelScope pre-release metadata'))
    .toBeLessThan(prereleaseNames.indexOf('Publish verified GitHub pre-release'))
  expect(step('publish-prerelease', 'Mirror pre-release assets to ModelScope').run)
    .toContain('releases/prerelease/latest')
  const signedNames = jobs['publish-signed'].steps.map(item => item.name)
  expect(signedNames).toEqual(expect.arrayContaining([
    'Download verified test assets from draft release',
    'Verify test assets before publication',
    'Mirror test assets to ModelScope',
    'Verify public ModelScope test metadata',
    'Record test downloads'
  ]))
  expect(signedNames.indexOf('Download verified test assets from draft release'))
    .toBeLessThan(signedNames.indexOf('Verify test assets before publication'))
  expect(signedNames.indexOf('Verify test assets before publication'))
    .toBeLessThan(signedNames.indexOf('Mirror test assets to ModelScope'))
  expect(signedNames.indexOf('Mirror test assets to ModelScope'))
    .toBeLessThan(signedNames.indexOf('Verify public ModelScope test metadata'))
  expect(signedNames.indexOf('Verify public ModelScope test metadata'))
    .toBeLessThan(signedNames.indexOf('Record test downloads'))
  expect(step('publish-signed', 'Mirror test assets to ModelScope').run)
    .toContain('releases/test/{tag}')
  expect(step('publish-signed', 'Mirror test assets to ModelScope').run)
    .toContain('releases/test/latest')
  expect(step('publish-signed', 'Mirror test assets to ModelScope').run)
    .not.toContain('releases/prerelease/')
  expect(jobs['publish-signed'].steps.map(item => item.run ?? '').join('\n')).not.toContain('--draft=false')
  expect(jobs['publish-signed'].steps.map(item => item.run ?? '').join('\n')).not.toContain('--prerelease')
  for (const [job, name] of [
    ['publish', 'Publish verified GitHub release'],
    ['publish-prerelease', 'Publish verified GitHub pre-release']
  ]) {
    const run = step(job, name).run
    expect(run).toContain('node scripts/prune-github-release-assets.mjs')
    expect(run.indexOf('prune-github-release-assets.mjs')).toBeLessThan(run.indexOf('gh release edit'))
  }
})
