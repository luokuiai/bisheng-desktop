import { expect, it, vi } from 'vitest'
import { getModelStatus, listTasks } from '../packages/dsh-desktop-client-ui/workspace/static/workspace-host.js'

it('uses the routable configured model, even when another provider lists the same name', async () => {
  const catalog = { default: { provider: 'local', model: 'shared' }, routableProviders: ['other'], groups: [
    { id: 'local', name: 'Local', models: [{ id: 'shared' }] }, { id: 'other', name: 'Other', models: [{ id: 'shared' }] }
  ] }
  const ctx = { remote: { session: { modelCatalog: async () => ({ ok: true, value: catalog }) } } }
  expect(await getModelStatus(ctx)).toEqual({ configured: false, model: 'shared', providerLabel: 'Local' })
  catalog.routableProviders.push('local')
  expect((await getModelStatus(ctx)).configured).toBe(true)
})

it('lists real top-level tasks with live titles and preserves an empty result or RPC failure', async () => {
  const list = vi.fn().mockResolvedValue({ ok: true, value: { items: [
    { sessionId: 'draft', blank: true }, { sessionId: 'child', origin: 'subagent' },
    { sessionId: 'a', running: true, updatedAt: 12 }
  ] } })
  const ctx = { remote: { session: { list } }, sessions: { list: { getSnapshot: () => ({ byId: { a: { title: 'Report' } } }) } } }
  expect(await listTasks(ctx)).toEqual([{ id: 'a', title: 'Report', updatedAt: 12, status: 'running' }])
  list.mockResolvedValueOnce({ ok: true, value: { items: [] } })
  expect(await listTasks(ctx)).toEqual([])
  list.mockResolvedValueOnce({ ok: false, error: { message: 'Disconnected' } })
  await expect(listTasks(ctx)).rejects.toThrow('Disconnected')
  const abort = new AbortController()
  abort.abort()
  await expect(listTasks(ctx, abort.signal)).rejects.toMatchObject({ name: 'AbortError' })
  expect(list).toHaveBeenCalledTimes(3)
})
