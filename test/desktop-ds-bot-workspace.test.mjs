import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdir, mkdtemp, realpath, rm, symlink } from 'node:fs/promises'
import { afterEach, expect, it, vi } from 'vitest'
import { apply } from '../packages/dsh-desktop-client-ui/index.js'

const homes = []
afterEach(async () => {
  vi.unstubAllEnvs()
  await Promise.all(homes.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function fixtureHome() {
  const path = await mkdtemp(join(tmpdir(), 'dsh-bot-workspace-'))
  homes.push(path)
  const home = await realpath(path)
  vi.stubEnv('DSH_HOME', home)
  return home
}

function workspaceRoute(resolveByPath) {
  const warn = vi.fn()
  let route
  apply({
    sessionProjections: { register() {} },
    inject(services, callback) {
      expect(services).toEqual(['connection', 'workspaceRegistry'])
      callback({ workspaceRegistry: { resolveByPath }, logger: { warn },
        connection: { fetch: { register(value) { route = value } } } })
    }
  })
  expect(route.path).toBe('/api/desktop-ds-bot-workspace')
  expect(route.methods).toEqual(['GET'])
  expect(route.requestBody).toBe('buffered')
  return { route, warn }
}

it('resolves only the native default team directory and exposes only its workspace ID', async () => {
  const home = await fixtureHome()
  await mkdir(join(home, 'bot', 'workspace'), { recursive: true })
  const resolveByPath = vi.fn(async () => ({ id: 'local-id', path: 'private directory', title: 'Any name' }))
  const { route } = workspaceRoute(resolveByPath)
  const reply = await route.fetch()
  expect(resolveByPath).toHaveBeenCalledExactlyOnceWith(join(home, 'bot', 'workspace'))
  expect(reply.headers.get('cache-control')).toBe('no-store')
  expect(await reply.json()).toEqual({ workspaceId: 'local-id' })
})

it('keeps the workspace visible if its directory is absent or lookup fails', async () => {
  const home = await fixtureHome()
  const resolveByPath = vi.fn().mockRejectedValue(Object.assign(new Error('unavailable'), { code: 'EACCES' }))
  const { route, warn } = workspaceRoute(resolveByPath)
  const missing = await route.fetch()
  expect(missing.status).toBe(200)
  expect(await missing.json()).toEqual({ workspaceId: null })
  expect(resolveByPath).not.toHaveBeenCalled()
  await mkdir(join(home, 'bot', 'workspace'), { recursive: true })
  const failed = await route.fetch()
  expect(failed.status).toBe(500)
  expect(await failed.json()).toEqual({ workspaceId: null })
  expect(warn).toHaveBeenCalledOnce()
})

it('keeps a user workspace visible when the team directory links to it', async () => {
  const home = await fixtureHome()
  const ordinary = join(home, 'user-project')
  await mkdir(ordinary)
  await mkdir(join(home, 'bot'))
  await symlink(ordinary, join(home, 'bot', 'workspace'), process.platform === 'win32' ? 'junction' : 'dir')
  const resolveByPath = vi.fn(async () => ({ id: 'ordinary-project' }))
  const { route } = workspaceRoute(resolveByPath)
  expect(await (await route.fetch()).json()).toEqual({ workspaceId: null })
  expect(resolveByPath).not.toHaveBeenCalled()
})
