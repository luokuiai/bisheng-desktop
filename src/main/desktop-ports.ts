/**
 * LUOKUI-AI uses a separate port range so it can run alongside DSH Desktop.
 * The mobile bridge binds its configured port. Harness prefers its configured
 * loopback port and can fall back to a temporary port if it is occupied.
 */
const LUOKUIAI_MOBILE_PORT = 45227
const LUOKUIAI_HARNESS_PORT = 45229

/** Development profiles can shift both ports by the same offset, defaulting to one. */
function developmentOffset(developmentBuild: boolean): number {
  if (!developmentBuild) return 0
  const raw = process.env.BISHENG_DEV_PORT_OFFSET
  if (!raw) return 1
  const offset = Number(raw)
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(offset) || offset < 1 || offset > 65535 - LUOKUIAI_HARNESS_PORT) {
    throw new Error('BISHENG_DEV_PORT_OFFSET must keep both development ports between 1 and 65535.')
  }
  return offset
}

export function mobileBridgePort(developmentBuild: boolean): number {
  return LUOKUIAI_MOBILE_PORT + developmentOffset(developmentBuild)
}

export function harnessPreferredPort(developmentBuild: boolean): number {
  return LUOKUIAI_HARNESS_PORT + developmentOffset(developmentBuild)
}
