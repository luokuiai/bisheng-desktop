/** Shared content layout for the isolated enterprise document. */
export const CHAT_LAYOUT_CSS = `
html[data-bisheng-surface="desktop"] {
  --dsh-module-gutter: 18px;
  --dsh-module-top: 12px;
}
html[data-bisheng-surface="desktop"] .dsh-web-chat :has(> header > [data-module-home-title]) {
  padding: var(--dsh-module-top) var(--dsh-module-gutter) 0;
}
html[data-bisheng-surface="desktop"] .dsh-web-chat :has(> header > [data-module-home-title]) :is(
  header:has(> [data-module-home-title]), [class*="max-w-[1000px]"]
),
html[data-bisheng-surface="desktop"] .dsh-web-chat .luokui-app-catalog-width {
  max-inline-size: none;
}
html[data-bisheng-surface="desktop"][data-dsh-page="knowledge"] .dsh-web-chat :has(> header > [data-module-home-title]) :is(
  [class*="100%+24px"], [class*="min(1000px,"]
) { inline-size: 100%; }
html[data-bisheng-surface="desktop"][data-dsh-page="knowledge"] .dsh-web-chat :has(> [class*="min(1000px,"]) {
  scrollbar-gutter: auto !important;
}
html[data-bisheng-surface="desktop"] .luokui-app-catalog-width {
  --luokui-catalog-gutter: var(--dsh-module-gutter);
  padding-inline: var(--dsh-module-gutter);
}
html[data-bisheng-surface="desktop"] .luokui-app-catalog-heading { padding-block-start: var(--dsh-module-top); }
html[data-bisheng-surface="desktop"] .luokui-app-catalog-heading-copy { padding-block-start: 6px; }
html[data-bisheng-surface="desktop"][data-dsh-page="square"] .dsh-web-chat :is([class*="max-w-[1032px]"], [class*="max-w-[1000px]"]) {
  max-inline-size: none;
  padding-inline: var(--dsh-module-gutter);
}
html[data-bisheng-surface="desktop"] .dsh-web-chat :is([data-module-home-title], .luokui-app-catalog-heading h1),
html[data-bisheng-surface="desktop"][data-dsh-page="square"] .dsh-web-chat h1:not([role="dialog"] h1) {
  font-size: 0.875rem;
  line-height: 1.428571;
  font-weight: 600;
}
html[data-bisheng-surface="desktop"][data-dsh-page="square"] .luokui-app-catalog-grid {
  grid-template-columns: minmax(0, 1fr);
}
@media (min-width: 768px) {
  html[data-bisheng-surface="desktop"][data-dsh-page="square"] .luokui-app-catalog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  html[data-bisheng-surface="desktop"][data-dsh-page="square"] .luokui-app-catalog-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
html[data-bisheng-surface="desktop"][data-dsh-page="square"] .luokui-app-catalog .luokui-app-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto auto 1fr;
  align-items: start;
  gap: 4px;
  min-block-size: calc(7.125rem + 1px);
  padding: 12px;
}
html[data-bisheng-surface="desktop"][data-dsh-page="square"] .luokui-app-catalog .luokui-app-card-icon {
  inline-size: 24px;
  block-size: 24px;
}
html[data-bisheng-surface="desktop"][data-dsh-page="square"] .luokui-app-card > :is(
  :has(> .luokui-app-card-icon), :has(> .luokui-app-card-title)
) { grid-area: 1 / 1; }
html[data-bisheng-surface="desktop"][data-dsh-page="square"] .luokui-app-card > :has(> .luokui-app-card-title) {
  align-self: center;
  margin-block-start: 0;
  padding-inline: 32px 54px;
}
html[data-bisheng-surface="desktop"][data-dsh-page="square"] .luokui-app-card-title {
  font-size: 0.875rem;
  line-height: 1.4;
}
html[data-bisheng-surface="desktop"][data-dsh-page="square"] .luokui-app-catalog .luokui-app-card-arrow {
  inset-block-start: 16px;
  inset-inline-end: 12px;
}
html[data-bisheng-surface="desktop"][data-dsh-page="square"] .luokui-app-card .luokui-app-card-description {
  grid-row: 2;
  margin-block-start: 0;
  line-height: 1.15;
}
html[data-bisheng-surface="desktop"][data-dsh-page="square"] .luokui-app-catalog .luokui-app-card-action-overlay {
  grid-row: 3;
  align-self: end;
  padding-block-start: 0;
}
html[data-bisheng-surface="desktop"][data-dsh-page="square"] .luokui-app-card-action-overlay .luokui-app-action {
  min-block-size: 24px;
  padding-block: 0;
}
html[data-bisheng-surface="desktop"] .dsh-chat-surface .dsh-chat-column {
  margin-inline-end: 0;
}
html[data-bisheng-surface="desktop"] .dsh-chat-surface .dsh-chat-landing[data-ui-library="boardui"] {
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}
html[data-bisheng-surface="desktop"] .dsh-chat-landing[data-ui-library="boardui"] > .dsh-chat-hero {
  max-inline-size: calc(clamp(680px, 64cqw, 920px) + 64px);
  margin: auto;
  padding: 24px 16px 32px;
  gap: clamp(32px, 6vh, 56px);
}
html[data-bisheng-surface="desktop"] .dsh-chat-landing .dsh-chat-headline-title {
  font-size: 1.625rem;
  line-height: 1.230769;
  font-weight: 500;
}
.dsh-chat-surface .dsh-chat-header .dsh-chat-section-row { display: none !important; }
.dsh-chat-surface .dsh-chat-header {
  grid-template-rows: 30px !important;
  row-gap: 0 !important;
  height: 48px !important;
  padding-top: 9px !important;
  padding-bottom: 9px !important;
  user-select: none;
}
/* Interactive controls retain pointer input inside the native title bar. */
.dsh-chat-surface .dsh-chat-header :is(button, a[href], input, textarea, select, [role="button"], [role="link"], [tabindex], [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]) {
  -webkit-app-region: no-drag;
}
`

/** Windows owns dragging in its separate caption row; macOS uses the Chat header. */
export function chatLayoutCss(platform: NodeJS.Platform): string {
  return platform === 'darwin'
    ? `${CHAT_LAYOUT_CSS}\n.dsh-chat-surface .dsh-chat-header { -webkit-app-region: drag; }`
    : CHAT_LAYOUT_CSS
}
