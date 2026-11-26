import { existsSync } from 'node:fs'
import { join } from 'node:path'

export function resolveDesktopUserData(appData: string, development: boolean, developmentOverride?: string): string {
  if (!development) return join(appData, 'luokuiai-eai')
  if (developmentOverride) return developmentOverride

  const current = join(appData, 'luokuiai-dev')
  if (existsSync(current)) return current

  const legacy = join(appData, 'bisheng-dev')
  return existsSync(legacy) ? legacy : current
}
