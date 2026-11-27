let hostRequire

export function bindHost(resolve) {
  hostRequire = resolve
}

export function resolveHost(id) {
  if (!hostRequire) throw new Error('Desktop workspace loaded before the Harness UI')
  return hostRequire(id)
}
