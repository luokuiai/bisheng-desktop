import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../packages/dsh-desktop-enterprise/index.js', import.meta.url), 'utf8')
const start = source.indexOf('  const applyAccountState = (state) => {')
const block = source.slice(start, source.indexOf('  const marketRequest =', start))

it('does not clear work resources repeatedly while disconnected', async () => {
  const clear = vi.fn()
  const reset = vi.fn()
  let state = { connected: false }
  const create = vm.runInNewContext('(function(deps) { let account = { connected: false }; let accountUpdate = Promise.resolve(); const { ctx, broker, brokerJson, market, workbenches, capabilityPolicy, workResources, workSkills, workCapabilities, ingestEnterpriseState, thirdPartyFlags, disabledState } = deps; ' + block + '; return readBrokerState })')
  const restore = vi.fn()
  const read = create({
    ctx: {}, broker: {}, brokerJson: async () => state,
    market: { stop: vi.fn(), restore }, workbenches: { stop: vi.fn() },
    capabilityPolicy: { reset, refresh: async () => {} },
    workResources: { clear }, workSkills: { clear }, workCapabilities: { clear },
    ingestEnterpriseState: () => {}, thirdPartyFlags: () => ({}), disabledState: () => ({ connected: false })
  })
  await read()
  await read()
  expect(clear).not.toHaveBeenCalled()
  state = { connected: true, connectionKey: 'a', revision: 1 }
  await read()
  expect(clear).toHaveBeenCalledTimes(3)
  expect(restore).toHaveBeenCalledOnce()
  state = { connected: false, revision: 2 }
  await read()
  expect(clear).toHaveBeenCalledTimes(6)
  await read()
  expect(clear).toHaveBeenCalledTimes(6)
  state = { connected: true, connectionKey: 'a', revision: 1 }
  await expect(read()).resolves.toMatchObject({ connected: false, revision: 2 })
  expect(restore).toHaveBeenCalledOnce()
})
