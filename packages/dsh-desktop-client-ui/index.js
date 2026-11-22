import { join } from 'node:path'
import { realpath } from 'node:fs/promises'
import { completionProjection } from './completion-projection.js'

/** Desktop completion facts share Harness's authenticated, reconnecting control stream. */
export const inject = ['sessionProjections']
export function apply(ctx) {
  ctx.sessionProjections.register(completionProjection)
  ctx.inject(['connection', 'workspaceRegistry'], (scope) => {
    scope.connection.fetch.register({
      path: '/api/desktop-ds-bot-workspace', methods: ['GET'], requestBody: 'buffered',
      async fetch() {
        const headers = { 'cache-control': 'no-store' }
        const home = process.env.DSH_HOME
        let workspaceId = null
        if (home) {
          try {
            const folder = join(await realpath(home), 'bot', 'workspace')
            // A link into a user project is not the plugin's own directory.
            if (await realpath(folder) === folder) {
              const workspace = await scope.workspaceRegistry.resolveByPath(folder)
              workspaceId = workspace?.id ?? null
            }
          } catch (error) {
            if (error?.code !== 'ENOENT' && error?.code !== 'ENOTDIR') {
              scope.logger.warn('Could not resolve the desktop DS Bot workspace: %s', error?.code ?? 'unknown error')
              return Response.json({ workspaceId: null }, { status: 500, headers })
            }
          }
        }
        return Response.json({ workspaceId }, { headers })
      }
    })
  })
}
