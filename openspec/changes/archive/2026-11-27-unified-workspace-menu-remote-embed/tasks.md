# Tasks

## 1. Unified destination list

- [x] 1.1 Add a single destination registry with `local`, `panel`, and `remote` kinds and the confirmed order (new six entries first, original six entries second); verify with a unit test that the rendered list has no group headings.
- [x] 1.2 Merge authorized `state.navigation.entries` into the registry and hide unauthorized remote entries; verify signed-in, signed-out, and partial-permission cases with unit tests.
- [x] 1.3 Update `DirectoryNav` and the `/chat` `ChatNav`/`DashboardSidebar` to consume the same registry; verify both scenes render the same entries and active state.
- [x] 1.4 Update page messages, icons, and titles for the original six entries; verify the menu renders the expected labels in Chinese and English.

## 2. Native panel routing

- [x] 2.1 Map the `plugins` entry to the existing `plugins` main panel and register `/plugins` in the workspace panel routes; verify it opens the existing plugin manager and does not create a new page.
- [x] 2.2 Keep the workspace chrome mounted while `plugins` and existing native panels are open; verify switching local page → plugin → local page leaves the flat menu mounted and in place.
- [x] 2.3 Add regression coverage for native panel selection and active state; run `npm test -- test/desktop-workspace-pages.test.mjs`.

## 3. Remote module embedding

- [x] 3.1 Add a remote-module scene (`remotePageId`, module path, and active entry) to the desktop navigation state; verify `openRemoteModule()` keeps `workspacePath` and does not call `openDesktop()`.
- [x] 3.2 Add a dedicated content-area seat for the remote `WebContentsView` and calculate its bounds from that seat; verify bounds exclude the flat menu, top bar, and system window controls.
- [x] 3.3 Update `present()` visibility and panel hide/show conditions so remote modules remain visible while the workspace chrome stays mounted; verify local, panel, and remote scenes do not hide each other's shared chrome.
- [x] 3.4 Synchronize remote navigation state from the enterprise navigation entries and clear it on sign-out or account switch; verify stale remote pages cannot remain active under a new identity.
- [ ] 3.5 Keep hosted-app launch and return working from embedded apps and discover; verify opening an app and returning preserves the directory page, filter, and scroll position. Implemented by rendering `HostedAppContent` in the remote content seat and reusing the existing `closeHostedApp()` owner; the directory/filter/scroll assertion still needs a live enterprise account.
- [x] 3.6 Add regression coverage for remote module visibility, bounds, switching, and account changes; run `npm test -- test/enterprise-chat-view.test.ts` and the desktop navigation tests.

## 4. Documentation

- [x] 4.1 Document the unified menu, three destination kinds, and remote-module content boundary in `docs/architecture.md` or the relevant desktop navigation doc; verify links and commands are current.

## 5. Verification

- [ ] 5.1 Run `npm run typecheck` and verify it passes. Blocked by pre-existing errors outside this change (`electron.vite.config.ts`, `test/packaged-dependency-closure.test.ts`: missing `rollup`; `src/main/update/browser-updater.ts`: `BrowserUpdater.doDownloadUpdate` signature). The workspace project's own `tsc -p packages/dsh-desktop-client-ui/workspace/tsconfig.json` passes.
- [x] 5.2 Run `npm run build` and verify it passes.
- [ ] 5.3 Run the related test files and `git diff --check`; verify no failures or whitespace errors. Passing: `workspace-chrome` (8), `desktop-workspace-pages` (18), `enterprise-chat-view` (76), and the new desktop-modes cases. Pre-existing failures remain in `workspace-assets` (missing archive fixture) and two `Promise.withResolvers` cases in `desktop-modes-ui`; `git diff --check` reports only unrelated CRLF warnings.
- [ ] 5.4 Verify in a real Electron window on the target platform: all 12 entries render in one list, each opens in the main window, the flat menu stays visible, and resizing/compact mode never covers it. Not run in this session; requires a signed-in enterprise account and a live Electron window.
