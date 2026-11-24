import lightArtwork from '../../build/app-icon.svg?raw'
import darkArtwork from '../../build/app-icon-dark.svg?raw'

export const APP_ICON_STYLES = `
  .app-icon { display:inline-flex; width:34px; height:34px; flex:none; position:relative; }
  .app-icon svg { width:100%; height:100%; }
`

export function createAppIcon(doc: Document): HTMLSpanElement {
  const icon = doc.createElement('span')
  icon.className = 'app-icon'
  icon.setAttribute('aria-hidden', 'true')
  icon.innerHTML = doc.documentElement.style.colorScheme === 'dark' ? darkArtwork : lightArtwork
  return icon
}

export function mountAppIconTheme(doc: Document, roots: () => ReadonlyArray<ParentNode | null | undefined>): () => void {
  let colorScheme = doc.documentElement.style.colorScheme
  const observer = new MutationObserver(() => {
    const nextScheme = doc.documentElement.style.colorScheme
    if (nextScheme === colorScheme) return
    colorScheme = nextScheme
    for (const root of roots()) {
      for (const icon of root?.querySelectorAll('.app-icon') ?? []) {
        const replacement = createAppIcon(doc).querySelector('svg')
        if (replacement) icon.querySelector('svg')?.replaceWith(replacement)
      }
    }
  })
  observer.observe(doc.documentElement, { attributes: true, attributeFilter: ['style'] })
  return () => observer.disconnect()
}
