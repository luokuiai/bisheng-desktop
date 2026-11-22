window.__ModuleLoader__.load({
  id: 'dsh-desktop-skin',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports

    /** Shared value for tokens that do not depend on the palette. */
    const both = value => ({ light: value, dark: value })

    /*
     * Alias-layer overrides go through the ui-theme registry
     * (`ctx.theme.overrideTokens`), so the base themes stay untouched and the
     * whole skin can be removed by removing this plugin. Values that differ per
     * palette carry both modes; no `body[data-ds-dark-theme]` selectors.
     *
     * The accent keeps the reference skin's static blue scale instead of an
     * alias token: DSH Desktop pins the primary fill and the active sidebar
     * pill to `--dsw-static-blue-500`, and the goal here is the same look.
     */
    const THEME_TOKENS = {
      '--dsw-radius-xs': both('6px'),
      '--dsw-radius-sm': both('10px'),
      '--dsw-radius-md': both('12px'),
      '--dsw-radius-lg': both('16px'),
      '--dsw-radius-xl': both('16px'),
      '--dsw-radius-panel': both('24px'),
      '--dsw-alias-button-primary-fill': both('var(--dsw-static-blue-500)'),
      '--dsw-alias-button-primary-hover': {
        light: 'var(--dsw-static-blue-600)',
        dark: 'var(--dsw-static-blue-400)'
      },
      '--dsw-alias-label-primary-foreground': both('var(--dsw-static-neutral-bluish-00)'),
      '--dsw-specific-bubble': {
        light: 'var(--dsw-static-neutral-bluish-00)',
        dark: 'var(--dsw-static-neutral-bluish-850)'
      },
      '--dsw-specific-input-major': {
        light: 'var(--dsw-static-neutral-bluish-00)',
        dark: 'var(--dsw-static-neutral-bluish-850)'
      }
    }

    /*
     * Structural selectors use stable data hooks wherever the host provides
     * them. The three module classes below are hash-suffixed selectors
     * (ui-layout frame/center column and ui-conversation root); they are pinned
     * by package version like the rest of the tracked patches. The hash was
     * verified against the locked 0.2.1-rc.2 packages and matches the upstream
     * 0.2.2 build, so the skin stays byte-identical to DSH Desktop's.
     *
     * `data-dsh-sidebar-new-session` is not in the 0.2.1 sidebar patch, so the
     * new-session card uses the pinned module class instead of that later hook.
     */
    const STYLE = `
      /* App shell: the frame owns scrolling; never expose document scrollbars. */
      html, body {
        overflow: hidden;
      }
      /*
       * macOS keeps the traffic lights over the content (hiddenInset). The stock
       * frame starts at 10px, which puts the card under the buttons; reserve the
       * same clearance the compact toolbars use.
       */
      html[data-platform="darwin"]:not([data-fullscreen="true"]) body[data-dsh-desktop-skin="luokui"] .pI_x6G_frame {
        padding-top: calc(var(--dsh-frame-top-clearance, 48px) + 10px);
      }

      body[data-dsh-desktop-skin="luokui"] {
        --dsk-card-radius: 24px;
        --dsk-card-border: 1px solid var(--dsw-alias-border-l2);
        --dsk-card-shadow: 0 1px 2px rgb(0 0 0 / 0.04), 0 12px 32px -24px rgb(0 0 0 / 0.30);
        --dsk-card-surface: var(--dsw-alias-bg-layer-1);
        --dsk-page-surface: var(--dsw-alias-bg-module-platform);
        background: var(--dsk-page-surface);
      }

      /* Shell: page ground, inset cards, hairline separators. */
      body[data-dsh-desktop-skin="luokui"] .pI_x6G_frame {
        background: var(--dsk-page-surface);
        padding: calc(var(--dsh-windows-titlebar-height, 0px) + 10px) 12px 12px;
        column-gap: 12px;
      }
      body[data-dsh-desktop-skin="luokui"] .pI_x6G_sidebarCol {
        background: var(--dsk-card-surface);
        border: var(--dsk-card-border);
        border-radius: var(--dsk-card-radius);
        box-shadow: var(--dsk-card-shadow);
        overflow: hidden;
      }
      body[data-dsh-desktop-skin="luokui"] [data-dsh-sidebar-root] {
        background: transparent;
      }
      body[data-dsh-desktop-skin="luokui"] .pI_x6G_centerCol {
        background: var(--dsk-card-surface);
        border: var(--dsk-card-border);
        border-radius: var(--dsk-card-radius);
        box-shadow: var(--dsk-card-shadow);
        overflow: hidden;
      }
      /*
       * Bisheng mounts 'desktop.mode.content' instead of the stock center column,
       * so chat and work share this panel. It is the visible card: the native
       * enterprise chat view is rounded to the inner radius reported from here.
       */
      body[data-dsh-desktop-skin="luokui"] .dshModes {
        box-sizing: border-box;
        background: var(--dsk-card-surface);
        border: var(--dsk-card-border);
        border-radius: var(--dsk-card-radius);
        box-shadow: var(--dsk-card-shadow);
        overflow: hidden;
      }
      /* Work mode nests the stock center column; the mode panel already carries the card. */
      body[data-dsh-desktop-skin="luokui"] .dshModes .pI_x6G_centerCol {
        background: transparent;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }

      /* Sidebar navigation: quiet rows, blue pill for the active page. */
      body[data-dsh-desktop-skin="luokui"] [data-dsh-sidebar-root] .hHd-Xa_panelRow {
        border-radius: 10px;
        color: var(--dsw-alias-label-secondary);
        transition: background-color .15s var(--ds-ease-in-out), color .15s var(--ds-ease-in-out);
      }
      body[data-dsh-desktop-skin="luokui"] [data-dsh-sidebar-root] .hHd-Xa_panelRow:hover {
        background: var(--dsw-alias-interactive-bg-hover);
        color: var(--dsw-alias-label-primary);
      }
      body[data-dsh-desktop-skin="luokui"] [data-dsh-sidebar-root] .hHd-Xa_panelRow[aria-current="page"] {
        background: var(--dsw-static-blue-500);
        color: var(--dsw-static-neutral-bluish-00);
      }
      body[data-dsh-desktop-skin="luokui"] [data-dsh-sidebar-root] .hHd-Xa_panelRow[aria-current="page"] svg {
        color: currentColor;
      }
      body[data-dsh-desktop-skin="luokui"] .hHd-Xa_newSession {
        background: var(--dsk-card-surface);
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: 12px;
        box-shadow: 0 1px 1px rgb(0 0 0 / 0.03);
      }
      body[data-dsh-desktop-skin="luokui"] .hHd-Xa_newSession:hover {
        background: var(--dsw-alias-interactive-bg-hover);
      }
      body[data-dsh-desktop-skin="luokui"] [data-dsh-workbench-switcher] {
        background: var(--dsk-page-surface);
        border-radius: 10px;
        padding: 2px;
      }
      body[data-dsh-desktop-skin="luokui"] [data-dsh-sidebar-settings] {
        border-top: 1px solid var(--dsw-alias-border-l1);
        margin-top: 4px;
        padding-top: 6px;
      }

      /* Conversation: gray surface with white user bubbles. */
      body[data-dsh-desktop-skin="luokui"] .wSkVaW_root {
        background: var(--dsk-page-surface);
      }
      /*
       * Work mode mounts the Harness conversation inside the card. Bisheng shows
       * chat through the native view (white), so the work surface stays on the
       * card surface instead of the page ground.
       */
      body[data-dsh-desktop-skin="luokui"] .dshWorkContent [class*="wSkVaW_root"] {
        background: var(--dsk-card-surface);
      }
      body[data-dsh-desktop-skin="luokui"] [class*="_bubble_"]:not([data-side]):not([data-portal]) {
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 16px;
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
      }

      /* Composer: white capsule with a soft contact shadow. */
      body[data-dsh-desktop-skin="luokui"] [data-composer-card] {
        background: var(--dsk-card-surface);
        border: 1px solid var(--dsw-alias-border-l2);
        border-radius: var(--dsk-card-radius);
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.05), 0 18px 40px -28px rgb(0 0 0 / 0.38);
      }
      body[data-dsh-desktop-skin="luokui"] [data-composer-card]:focus-within {
        border-color: color-mix(in srgb, var(--dsw-static-blue-500) 45%, var(--dsw-alias-border-l2));
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-static-blue-500) 10%, transparent), 0 18px 40px -28px rgb(0 0 0 / 0.38);
      }

      /* Thin scrollbars keep the card surface calm. */
      body[data-dsh-desktop-skin="luokui"] * {
        scrollbar-width: thin;
        scrollbar-color: var(--dsw-alias-scrollbar-bg-l2) transparent;
      }

      @media (prefers-reduced-motion: reduce) {
        body[data-dsh-desktop-skin="luokui"] [data-dsh-sidebar-root] .hHd-Xa_panelRow {
          transition: none;
        }
      }
    `

    function apply(ctx) {
      ctx.effect(
        () => ctx.theme.overrideTokens('dsh-desktop-skin', THEME_TOKENS),
        'dsh-desktop-skin: theme tokens'
      )
      ctx.effect(() => {
        document.body.dataset.dshDesktopSkin = 'luokui'
        return () => {
          delete document.body.dataset.dshDesktopSkin
        }
      }, 'dsh-desktop-skin: body scope')
      ctx.effect(() => {
        const id = 'dsh-desktop-skin-style'
        if (document.getElementById(id) !== null) return
        const style = document.createElement('style')
        style.id = id
        style.dataset.pluginCss = 'dsh-desktop-skin'
        style.textContent = STYLE
        document.head.appendChild(style)
        return () => style.remove()
      }, 'dsh-desktop-skin: styles')
    }

    exports.apply = apply
    exports.inject = ['theme']
    return module.exports
  }
})
