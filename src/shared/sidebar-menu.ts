export interface SidebarMenuRequest {
  x: number
  y: number
  labels: string[]
}

export function parseSidebarMenuRequest(value: unknown): SidebarMenuRequest {
  if (typeof value !== 'object' || value === null || !('x' in value) || !('y' in value) || !('labels' in value)) {
    throw new Error('Invalid sidebar menu request.')
  }
  const { x, y, labels } = value
  if (typeof x !== 'number' || !Number.isFinite(x) || typeof y !== 'number' || !Number.isFinite(y) ||
      !Array.isArray(labels) || labels.length < 1 || labels.length > 100 ||
      labels.some(label => typeof label !== 'string' || !label.trim() || label.length > 256 || /[\u0000-\u001f\u007f]/u.test(label))) {
    throw new Error('Invalid sidebar menu request.')
  }
  return { x, y, labels }
}
