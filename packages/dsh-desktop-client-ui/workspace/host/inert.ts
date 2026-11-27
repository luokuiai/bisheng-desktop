/** React 18 passes presence attributes through as strings. An empty value
 * enables the Chromium focus and pointer boundary on collapsed panels. */
export function inertWhen(disabled: boolean | undefined): Record<string, string> {
  return disabled ? { inert: '' } : {}
}
