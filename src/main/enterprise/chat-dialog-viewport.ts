interface ContentBounds { x: number; y: number; width: number; height: number }

/** Keep the app's geometry when the native view is expanded for a dialog or cropped by the sidebar. */
export function chatDialogViewportScript(bounds: ContentBounds | undefined, crop?: { radius: number }): string {
  const selector = crop ? 'html[data-dsh-sidebar-cropped]' : 'html[data-dsh-window-dialog]'
  const css = bounds ? `
    ${selector} { --dsh-chat-viewport-width: ${bounds.width}px; --dsh-chat-viewport-height: ${bounds.height}px; }
    ${selector}, ${selector} body { background: transparent !important; }
    ${selector} #root {
      position: fixed; left: ${bounds.x}px; top: ${bounds.y}px;
      width: ${bounds.width}px; height: ${bounds.height}px; overflow: hidden;
      ${crop ? `border-radius: ${crop.radius}px;` : ''}
    }
    ${selector} .dsh-web-chat { width: var(--dsh-chat-viewport-width) !important; }
  ` : ''
  return `(() => {
    const root = document.documentElement;
    const css = ${JSON.stringify(css)};
    let style = document.getElementById('dsh-window-dialog-viewport');
    if (css) {
      if (!style) { style = document.createElement('style'); style.id = 'dsh-window-dialog-viewport'; document.head.appendChild(style); }
      if (style.textContent !== css) style.textContent = css;
      root.toggleAttribute('data-dsh-sidebar-cropped', ${!!crop});
      if (${!!crop}) delete root.dataset.dshWindowDialog;
      else root.dataset.dshWindowDialog = 'open';
    } else {
      root.removeAttribute('data-dsh-sidebar-cropped');
      delete root.dataset.dshWindowDialog;
      style?.remove();
    }
  })()`
}
