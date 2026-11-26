# Desktop release runbook

## Manual workflow dispatch

The `Release desktop installers` workflow accepts a `mode` on `workflow_dispatch`. `target` defaults to `macos` and is always honored: `macos` does not start Windows jobs, and `windows` does not start macOS jobs.

- `development` (default): isolated development packages with ad-hoc signing on macOS and unsigned installers on Windows. Packages are stored in a per-run draft GitHub Release (`dev-<run_id>-<run_attempt>`). Its location is recorded in the validation job summary.
- `signed` (legacy input name): production-identity test packages using macOS ad-hoc signatures and unsigned Windows installers. Fill `signed_version` with a non-`v` semver such as `0.9.2-test.1`. Every target uses a draft GitHub Release for handoff, then publishes to ModelScope `releases/test/<version>/`. `target=all` also updates `releases/test/latest/`. The GitHub Release stays a draft and is not marked pre-release. After public metadata and installer downloads are verified, the GitHub Actions run summary lists the selected platforms' ModelScope links and testing notes. These builds check the public stable update feed; draft and ModelScope test-channel builds are not offered as online updates.
- `prerelease`: production-identity packages using the same signing policy. Fill `prerelease_tag` with a non-`v` semver such as `2.1.0-rc.1`. When `target=all`, publish to GitHub `--prerelease` and ModelScope `releases/prerelease/<tag>/` plus `releases/prerelease/latest/`. A single-platform prerelease builds that platform and skips publish.

Official releases are still created by pushing a `v*` tag, not by filling the dispatch form. Do not put `v0.9.1` in `prerelease_tag` or `signed_version`.

Installed production-identity macOS and Windows builds check the configured stable feed on startup, every six hours, after a sufficiently long sleep, and on manual request. Unpackaged and development builds do not check this feed. Clicking Update opens the matching installer URL in the default browser on both macOS and Windows. The browser owns downloading; users save their work, quit the app, and run the downloaded installer themselves. Prereleases and downgrades are not offered. Production packaging accepts optional `BISHENG_UPDATE_URL`, the anonymously accessible HTTP(S) directory containing the update YAML and packages. Missing, empty, or whitespace-only values produce a package with online updates disabled, without an upstream fallback. Nonempty invalid values fail packaging. The builder validates the URL, adds a trailing slash, and writes it into the installed app's `resources/app-update.yml`. The build also embeds `dshDesktopUpdatesEnabled` in the application package metadata; the update manager checks this policy before initializing an updater or scheduling checks. Launch-time environment variables do not override the embedded URL or enablement. `ops/nginx/work-updates.conf` remains an upstream deployment example; it is not an embedded service. Exporting Actions artifacts does not deploy an update feed.

Production packages use app ID `com.luokuiai.eai` and login scheme `luokuiai`. Development packages use app ID `com.luokuiai.eai.dev` and login scheme `luokuiai-dev`. On Windows, each ID is used for shell notifications and determines its NSIS installer GUID. Both channels use `LUOKUI-AI.exe` on Windows and mount macOS DMGs as `LUOKUI-AI v<version>`. Production starts a fresh Profile under `luokuiai-eai` in the OS application-data directory. Fresh development profiles use `luokuiai-dev` and reuse a legacy development Profile when the new directory is absent. Verify fresh installs under the new application IDs and test subsequent upgrades within each channel on native Windows.

Old installed builds that require the previous publisher certificate may reject unsigned online updates. Verify fresh installation and upgrades on each native OS, including ad-hoc macOS update installation.

Formal release builds export `luokui-ai-mac-arm64.zip`, `luokui-ai-mac-x64.zip`, `luokui-ai-mac-arm64.dmg`, `luokui-ai-mac-x64.dmg`, `latest-mac.yml`, and `latest.yml` as six separate Actions artifacts, in their original formats, with one-day retention. These uploads run after draft asset verification and final package/update-hash checks. Formal tags do not require a ModelScope token, upload to ModelScope, or verify an upstream public feed. The GitHub Release continues to provide the two DMGs and Windows installer. Copy all six Actions artifact files and the Windows EXE from the Release to the same anonymously accessible HTTPS directory on the enterprise update server (for example, Silo). Upload the packages first and the YAML files last, and verify every URL referenced by the YAML. The current client opens the matching DMG (macOS) or EXE (Windows) in the browser; it does not download or extract the ZIP. ZIP assets remain available in the exported release set. The merged macOS YAML retains both architectures' ZIP and DMG entries; release verification checks the hashes of all four files. Actions artifacts are build outputs, not a public client update endpoint.

Both macOS and Windows use the same browser download flow. The desktop reuses the updater's version and YAML feed protocol, then selects the matching platform/architecture installer from resolved metadata: DMG for macOS ARM64/x64 (ARM64 under Rosetta), or EXE for Windows x64. Clicking Update invokes a trusted main-window action that opens that HTTP(S) installer URL in the default browser. No URL is supplied by the renderer. Opening failures are shown and can be retried; Download again reopens the link after a successful handoff.

The client reports only that the browser was opened. It does not track download progress, verify the browser-downloaded package hash, cache packages, replace the app, or quit automatically. After the browser download finishes, the user saves work and exits LUOKUI-AI, then opens the downloaded installer. On macOS, drag the app into Applications to replace the installed version; on Windows, run the EXE and follow the installer. Reopen LUOKUI-AI when installation completes. Package hashes are still generated and checked in the release pipeline.

## Build layout and timing

`windows-preflight` runs type checking and portable release/handoff/update-metadata tests on GitHub-hosted Ubuntu. Native dependency installation, Office/PPT preparation, application packaging, recovery UI checks, and packaged runtime checks remain on GitHub-hosted Windows. macOS ARM64 uses `macos-15`; Intel uses `macos-15-intel`. Shared runtime inputs are prepared on `macos-15`. No self-hosted runner or UKey signing job is required.

Windows builds the final NSIS installer once, then stages the installer, blockmap, and `latest.yml` in the draft Release. macOS builds ad-hoc signed DMG/ZIP files without a separate post-build signature-verification step. Neither platform performs certificate signing or notarization. Draft download digest checks and final package/header/update-hash checks must pass before publication.

CI builds each native application once, preparing Office/PPT inputs in that build, then invokes `npx --no-install vitest run` directly so npm pretest hooks do not assemble the inputs again. Windows uses `--config vitest.windows.config.ts` by default: serial platform regressions for Windows UI/process behavior, paths (including workbench junction containment and Office engine resolution), Profile and generation loading, packaging, and updates. The ARM64 macOS job runs the full suite; Intel retains its native build and packaged-runtime checks without a second full suite. Enable `windows_full_tests` on manual dispatch when changing shared runtime dependencies or investigating a Windows-specific regression that falls outside this subset. New Windows regressions must be included in `vitest.windows.config.ts` if their filename does not match an existing pattern.

After the single application build and tests, CI calls the Windows builder adapter directly to package the existing output. This retains the custom directory installer and resource editing without calling a `package:*` script that would build again. The three-scale recovery UI check is opt-in with `windows_recovery_ui`; enable it when changing recovery pages, Safe Mode, titlebars, or display scaling. It captures screenshots and verifies recovery actions and layout at 100%, 125%, and 150% on native Windows. Diagnostics are archived as `windows-recovery-ui.tar.gz` in the development draft Release when requested, including after a failed UI check if files were produced.

The packaged Harness smoke remains enabled for manual Windows dispatches. It runs the unpacked application outside the repository, checks the bundled Node and Koffi native binding, reaches authenticated Harness HTTP/RPC, creates a workspace and session, and checks for crashes or runtime errors. It does not establish visual UI activation or final-installer installation/upgrade acceptance. Formal tag runs retain their existing behavior and do not run this smoke.

Local `npm test` and `package:*` commands still prepare their own inputs. Local `npm run test:windows` prepares only PPT, without the Python/Office payload. Installers are uploaded directly as GitHub Release assets without an additional archive. Formal publication reuses the full history fetched by checkout to generate GitHub release notes, with validation and a deterministic fallback. The obsolete DSH archive-backfill workflow and orphaned version-index declaration have been removed: LUOKUI-AI does not expose that rollback index, and the old workflow targeted the DSH repository. Existing remote archives are unaffected.

The [Build desktop installers workflow](../.github/workflows/desktop-build.yml) packages development installers for macOS ARM64, macOS Intel, and Windows x64 on pull requests targeting `develop`. Both PR and develop push builds use macOS ad-hoc signatures and unsigned Windows installers. No certificate secrets are injected, and there is no separate post-build macOS signature-verification step. The PR signing flag remains enabled so electron-builder generates the ad-hoc signature. These apps are not notarized; Gatekeeper and Windows security warnings remain possible.

Pushes to `develop`, including PR merges, upload each `.dmg` and `.exe` as a directly downloadable Actions artifact under its original filename with one-day retention. The application is named `LUOKUI-AI`; installer filenames are `luokui-ai-mac-arm64.dmg`, `luokui-ai-mac-x64.dmg`, and `luokui-ai-windows-x64-setup.exe`. The development channel retains its separate app ID, login protocol, and user-data directory. Builds also export and upload the corresponding `latest-mac-arm64.yml`, `latest-mac-x64.yml`, or `latest.yml`, recording the completed update package's version, SHA-512, size, and modification time. Only the installers and YAML files are uploaded; ZIPs and blockmaps are not added to Actions artifacts. All uploaded files retain their original format, expire after one day, and are replaced on reruns. PR runs do not export or upload these update assets. The macOS manifests still describe ZIPs as well as DMGs; these daily artifacts omit the ZIPs, so they do not supply every file referenced by the manifests. Exporting the YAML does not enable development-channel auto-updates, change the stable feed, or establish installed-app upgrade acceptance.

The release workflow uses per-run draft Releases for development packages and recovery diagnostics. Test-channel, prerelease (including single-platform), and formal builds use versioned draft Releases for cross-job handoff. Draft assets do not expire automatically. Delete obsolete drafts manually after downloads and diagnosis are complete.

The macOS and Windows jobs stage their final installers and update assets directly. Publish jobs check draft asset sizes and SHA-256 digests, then verify the complete release set when all platforms are present. Formal runs export the update ZIPs, DMGs, and YAML files to Actions artifacts before pruning the draft Release to the two DMGs and Windows EXE. Complete pre-release runs retain their existing public metadata checks and pruning. Test-channel and single-platform prerelease runs leave their GitHub Release as a draft. The inherited test and prerelease modes still mirror their update assets to ModelScope; the formal release path does not. GitHub generates source-code archives from the tag separately. A failed run leaves the draft for inspection and retry; it must not be presented as a published release.

The NSIS directory installer stages files before shutting down the previous application, promotes the staged directory, and restores the old directory if promotion fails. A user-selected different installation directory remains a separate installation. Native installation and rollback acceptance must still be run on Windows; workflow-level staging checks do not cover that behavior.

PPT packages are generated under `.build/ppt-runtime/packages/` and overlaid into the Electron package. The `afterPack` gate checks ASAR unpacking, the generated `dsh-ppt` and `dsh-ppt-composer` payloads, and the offline Office runtime. A successful source build alone does not verify the packaged paths.

## Rebuilding a macOS installer from an existing app

Pass the `.app` bundle itself to `--prepackaged`, for example `--prepackaged "dist-dev/mac-arm64/LUOKUI-AI.app"`. Electron Builder treats this argument as the application bundle and copies it into the image under the product name. Passing the containing `mac-arm64` directory creates a nested `.app` directory that Finder cannot launch.

Before delivering a rebuilt DMG, mount it read-only and check the top-level application has `Contents/Info.plist`, its executable in `Contents/MacOS/`, and `Contents/Resources/app.asar`. Compare the mounted ASAR and enterprise plugin files against the selected build. Store artifacts in a distinct delivery folder with their commit and SHA-256 checksums.

## Native packaging runners

The release and daily workflows use GitHub-hosted native runners: `macos-15` for ARM64, `macos-15-intel` for Intel, and `windows-2022` for Windows x64. `verify-target` checks the executing OS and architecture before packaging. Local packaging must also run on the corresponding native OS. Linux cannot build the locked Office runtime for these targets.

Shared runtime preparation caches Office downloads, templates, and generated PPT inputs. Windows caches Electron, electron-builder, and verified Office downloads before `npm ci --prefer-offline`; the cache never substitutes for native verification. Portable release checks and publication run on Ubuntu.

## Signing and publishing configuration

`package.json` enforces macOS `identity: '-'`, `forceCodeSigning: true`, and `notarize: false`; no `afterSign` notarization hook is configured. Windows uses `signExecutable: false`, keeps icon/version resource editing, and disables certificate-publisher verification for the new unsigned distribution. Update metadata still includes package hashes, and the update manager retains its existing user-consent and download flow.

The `signed` dispatch mode and `signed_version` input remain as legacy test-channel API names; they do not enable certificate signing. The obsolete `resign` mode has been removed. Commercial signing scripts retained in the repository are not called by the packaging or release workflows.

Only the inherited test and prerelease publication paths require `MODELSCOPE_TOKEN`. Optional generated release and testing notes use `MODELS_TOKEN` for Copilot. Tag pushes and complete prereleases continue to verify draft asset digests, package structure, and update hashes before publishing. Creating or building a package is separate from publishing it.

Set the GitHub repository variable **Settings → Secrets and variables → Actions → Variables → BISHENG_UPDATE_URL** to the public update directory, for example `https://updates.example.com/desktop/`. Both packaging workflows pass it into their build jobs; leave it unset or blank to build with online updates disabled; a nonempty invalid URL fails packaging. Startup, periodic, resume, and manual checks remain disabled in that build. Release YAML is still generated for distribution, even when this particular build has no update source. Development packages keep `publish: null` and do not require this variable or enable online updates. The URL must point to a directory, not `latest-mac.yml` or `latest.yml`, and cannot contain embedded credentials, a query, or a fragment. Use HTTPS for distribution.

Local production commands (set the environment variable in the same shell first to enable online updates; omit it to disable them):

```bash
# macOS / POSIX shell
export BISHENG_UPDATE_URL="https://updates.example.com/desktop/"
```

```powershell
# Windows PowerShell
$env:BISHENG_UPDATE_URL = "https://updates.example.com/desktop/"
```

```bash
# On an ARM64 Mac
npm run package:mac:arm64
# On an Intel Mac
npm run package:mac:x64
# On Windows x64
npm run package:win
```

Production outputs go to `dist`; `package:dev:*` outputs go to `dist-dev`. Both use the display name `LUOKUI-AI`. Packaging commands use `--publish never`. Native installed-app checks are still required; passing portable tests or generating update YAML does not prove successful installation or update.
