/** Public, read-only identity projection. No credentials or role fields cross IPC. */
export interface EnterpriseProfile {
  avatar: string | null
  department_name: string | null
}

function data(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function text(value: unknown, limit: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed && trimmed.length <= limit ? trimmed : null
}

/** Avatars are stored as origin-relative paths such as `avatar/1/xxx.png`. */
export function resolveEnterpriseAvatar(value: string | null, base?: string): string | null {
  if (!value) return null
  try {
    const url = new URL(value, base)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

/** The two enterprise reads are independent, so a missing side degrades to null. */
export function parseEnterpriseProfile(userInfo: unknown, dshProfile: unknown, base?: string): EnterpriseProfile {
  const user = data(userInfo)
  const profile = data(dshProfile)
  return {
    avatar: resolveEnterpriseAvatar(text(user.avatar, 4096), base),
    department_name: text(profile.department_name, 200)
  }
}
