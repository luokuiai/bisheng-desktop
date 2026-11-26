# DSH Desktop development guide

This guide covers local development, validation, patch maintenance, and target-native packaging. For the runtime design, see [Architecture](architecture.md). For formal releases, see the [release runbook](release-runbook.md).

## Prerequisites

- Node.js 22 or later
- npm
- macOS on Apple Silicon or Intel, or Windows x64

This baseline pins `@deepseek-ai/dsh@0.2.1-rc.2`. Windows packages run Harness in Electron Node mode, while macOS uses an Electron UtilityProcess. Both are independent of the Node.js version used to run development commands.

## Local setup

```bash
git clone https://github.com/dataelement/dsh-desktop.git
cd dsh-desktop
npm ci
npm run dev
```

`npm ci` runs the repository's `postinstall` hook. It reapplies the tracked `patch-package` patches, installs DSH brand assets into the pinned Harness frontend, and installs Electron.

The application icon sources are `build/app-icon.svg` (light/default) and `build/app-icon-dark.svg` (dark). After changing either, run `npm run icons:generate` manually and include the updated PNG, macOS ICNS, and Windows ICO files in the change. These icon files remain checked in as packaging inputs; ordinary builds consume them directly. Generation works on all build platforms without `iconutil`. The sidebar and default conversation mark select the installed light/dark icons through the Harness theme service. About and update dialogs follow the resolved `documentElement.style.colorScheme` published by the Harness layout presenter; no image theme token is provided for these preload-owned surfaces. Packaged desktop icons retain the default artwork. The wordmark remains a separate branding input.

Development builds use the application name `LUOKUI-AI` and the login protocol `luokuiai-dev://login`. Fresh development profiles default to `luokuiai-dev`. If that directory is absent, the app reuses an existing development profile from the previous default path. Development installers use the same `luokui-ai-<platform>-<arch>` filename prefix as release installers, with output under `dist-dev`.

To run another worktree concurrently, set `BISHENG_DEV_USER_DATA` to a distinct profile path and use `BISHENG_DEV_PORT_OFFSET` to select a free port pair. For example, on macOS:

```bash
BISHENG_DEV_USER_DATA="$(mktemp -d)" BISHENG_DEV_PORT_OFFSET=100 npm run dev
```

On PowerShell, set the same variables using `$env:BISHENG_DEV_USER_DATA` and `$env:BISHENG_DEV_PORT_OFFSET` before `npm run dev`. The offset is added to the production mobile and Harness ports 43227 and 43229. The development default offset is 1.

## Validation

Run the core checks before submitting a change:

```bash
npm test
npm run typecheck
npm run build
```

Static checks are not a substitute for runtime verification. Changes that affect startup, profiles, plugins, native dialogs, updates, mobile access, or packaging should also be exercised through the corresponding real application flow.

To exercise the Cloudflare-to-Pinggy fallback without disrupting the machine's network, start the development app with Cloudflare failure simulation enabled:

```bash
DSH_TUNNEL_FORCE_PINGGY=1 npm run dev
```

Then enable the temporary public tunnel from the phone connection screen. The tunnel status should report `pinggy`, and the generated URL should use a Pinggy hostname. This variable affects only the process started from that command; omit it on the next launch to restore the normal Cloudflare-first behavior.

Automatic fallback still happens only when Cloudflare fails to start. If a Cloudflare pairing link is already showing but the phone cannot open it, use **扫码打不开？换一条线路** / **Can't open? Try another link** on the pairing page to switch to Pinggy.

## Project map

```text
src/main/                 Electron main process and application orchestration
src/main/runtime/         Harness process lifecycle and diagnostics
src/main/state/           Profile consistency, repair, recovery, and Safe Mode
src/main/mobile/          Paired phone bridge and optional Cloudflare tunnel
src/main/update/          Installed-build update state and lifecycle
src/preload/              Narrow renderer-to-main IPC and desktop UI seams
src/shared/               Shared contracts and desktop menu definitions
packages/                 Bundled desktop support packages
patches/                  Reproducible patches for the pinned Harness packages
build/                    Packaged HTML, icons, loaders, and Harness entry files
scripts/                  Build, signing, metadata, and target verification tools
test/                     Unit and source-contract regression coverage
.github/workflows/        Native CI, signing, release, and publication workflows
```

## Maintaining upstream patches

The desktop product intentionally reuses the upstream Harness UI. Desktop-specific provider onboarding, preset transfer, model selection, workspace, branding, and layout changes are captured under `patches/` rather than stored as untracked edits in `node_modules`.

When upgrading Harness:

1. Install the intended upstream version.
2. Verify the current Settings, Credentials, Provider Directory, workspace, and preset contracts.
3. Reapply or rewrite each desktop customization.
4. Regenerate the relevant `patch-package` patches.
5. Run the full automated suite.
6. Start the real app and exercise every affected user flow.

## Packaging

Harness includes architecture-specific native dependencies. Build each installer on the operating system and architecture where it will run.

To enable updates in a production package, set `BISHENG_UPDATE_URL` to the public HTTP(S) update directory containing `latest-mac.yml`, `latest.yml`, and their referenced packages. On macOS use `export BISHENG_UPDATE_URL="https://updates.example.com/desktop/"`; on Windows PowerShell use `$env:BISHENG_UPDATE_URL = "https://updates.example.com/desktop/"`. The URL is embedded in `resources/app-update.yml` during packaging. Missing, empty, or whitespace-only values allow packaging but disable online checks, with no upstream fallback. Nonempty invalid URLs fail packaging. Release YAML is still generated when the URL is blank; its existence does not enable updates in that build. `package:dev:*` commands require no update URL and keep online updates disabled. For GitHub builds, set the repository Actions variable of the same name; see the [release runbook](release-runbook.md).

```bash
# macOS Apple Silicon, on an Apple Silicon Mac or runner
npm run package:mac:arm64

# macOS Intel, on an Intel Mac or runner
npm run package:mac:x64

# Windows x64 NSIS installer, on a Windows x64 machine or runner
npm run package:win
```

Do not invoke `electron-builder --win` from macOS or Linux for a distributable Windows package. The target verification scripts intentionally reject host/target mismatches.

For local development packages, use the corresponding `package:dev:*` command. Production packages use app ID `com.luokuiai.eai`. Development packages use `com.luokuiai.eai.dev`. Both use ad-hoc signing on macOS and unsigned NSIS installers on Windows. Windows resource editing remains enabled so the icon and product metadata are included. Apple certificate, notarization, and Windows UKey credentials are not required.

Packages run Harness and package commands through the packaged Electron runtime (a utility process and the Helper in Node mode on macOS, the executable in Node mode on Windows); no standalone `node_modules/node` may be present under `app.asar.unpacked`. Verify the packaged native-module, pnpm and Harness smokes, then the final installer's separate installed-app smoke before handoff. Office preparation is included in dev, build and test: it fetches hash-locked native Python and wheels into `.build/office-runtime`, outside ASAR, and ships no second Node runtime. See [Office runtime](office-runtime.md). The locked Electron 43.0.0 must remain compatible with the native loader: `scripts/verify-target.mjs` fails packaging when Electron in Node mode cannot load it, and changing Electron still requires a new Windows package qualification. Before packaging, `node scripts/probe-electron-node-runtime.mjs` boots Harness from the repository through Electron Node mode with a disposable `DSH_HOME` and checks an authenticated HTTP response; the Windows CI job runs it on every build.

Formal release artifacts are built and published by the tag workflow using the same signing policy. A local build or pull-request check is not formal release evidence.

## Contribution hygiene

- Never include real API keys in issues, logs, screenshots, fixtures, or test data.
- Preserve unrelated worktree changes.
- Keep temporary research, local reports, and internal working documents under the ignored `doc/` directory.
- Update all localized README files when changing user-visible facts.
