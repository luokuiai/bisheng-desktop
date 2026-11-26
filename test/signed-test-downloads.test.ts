import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { expect, it } from 'vitest'

it('verifies public test downloads before writing the summary', () => {
  execFileSync('python3', ['test/signed-test-downloads.test.py'], {
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  })
}, 15_000)

it('checks installers after public metadata is available without a notification secret', () => {
  const yaml = createRequire(import.meta.url)('js-yaml') as {
    load: (source: string) => { jobs: Record<string, { steps: Array<{ name?: string; if?: string; env?: Record<string, string>; run?: string }> }> }
  }
  const source = readFileSync('.github/workflows/release.yml', 'utf8')
  expect(source).not.toMatch(/feishu/i)
  const workflow = yaml.load(source)
  const steps = workflow.jobs['publish-signed']?.steps ?? []
  const metadata = steps.findIndex(step => step.name === 'Verify public ModelScope test metadata')
  const index = steps.findIndex(step => step.name === 'Verify public test downloads and record summary')
  expect(metadata).toBeGreaterThan(-1)
  expect(index).toBeGreaterThan(metadata)
  expect(steps[index]?.if).toBe('success()')
  expect(steps[index]?.run).toContain('signed_test_downloads.py')
  expect(steps[index]?.env?.COPILOT_GITHUB_TOKEN).toBe('${{ secrets.MODELS_TOKEN }}')
  const tooling = steps.findIndex(step => step.name === 'Prepare Chinese test summary tooling')
  expect(tooling).toBeGreaterThan(-1)
  expect(tooling).toBeLessThan(index)
  expect(steps[tooling]?.run).toContain('@github/copilot')
})
