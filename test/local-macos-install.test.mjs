import { execFileSync, spawn } from 'node:child_process'
import { once } from 'node:events'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const installer = fileURLToPath(new URL('../.agents/skills/update-build-install/scripts/install-app.py', import.meta.url))
const name = 'Fixture'
const appId = 'test.desktop.install'

describe.runIf(process.platform === 'darwin')('local macOS skill installer', () => {
  let root, source, applications, target

  function makeApp(bundle, id, version) {
    const contents = join(bundle, 'Contents')
    mkdirSync(join(contents, 'MacOS'), { recursive: true })
    cpSync('/bin/sleep', join(contents, 'MacOS', name))
    const plist = { CFBundleIdentifier: id, CFBundleVersion: version, CFBundleShortVersionString: version,
      CFBundleExecutable: name, CFBundlePackageType: 'APPL', CFBundleName: name }
    execFileSync('plutil', ['-convert', 'xml1', '-o', join(contents, 'Info.plist'), '-'], { input: JSON.stringify(plist) })
    execFileSync('codesign', ['--force', '--sign', '-', bundle], { stdio: 'pipe' })
  }

  function install() {
    // Exercise the real copy, signature verification and rename, inside a temporary Applications directory.
    const run = 'import json, runpy, sys; from pathlib import Path; runpy.run_path(sys.argv[1])["install"](Path(sys.argv[2]), Path(sys.argv[3]), json.loads(sys.argv[4]))'
    const manifest = { build: { productName: name, appId }, version: '2' }
    execFileSync('python3', ['-I', '-c', run, installer, source, applications, JSON.stringify(manifest)], { stdio: 'pipe' })
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'local-macos-install-'))
    applications = join(root, 'Applications')
    source = join(root, `${name}.app`)
    target = join(applications, `${name}.app`)
    mkdirSync(applications)
    makeApp(source, appId, '2')
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('installs a fresh bundle and removes stale files on replacement', () => {
    install()
    const stale = join(target, 'Contents', 'previous-only')
    writeFileSync(stale, 'old')
    install()
    expect(existsSync(stale)).toBe(false)
    execFileSync('codesign', ['--verify', '--deep', '--strict', target])
  })

  it('preserves an installed bundle belonging to another channel', () => {
    makeApp(target, `${appId}.dev`, '1')
    const plist = join(target, 'Contents', 'Info.plist')
    const previous = readFileSync(plist)
    expect(install).toThrow(/其他应用/)
    expect(readFileSync(plist)).toEqual(previous)
  })

  it('rejects a damaged incoming bundle before replacing the existing one', () => {
    makeApp(target, appId, '1')
    writeFileSync(join(source, 'Contents', 'MacOS', name), 'damaged')
    expect(install).toThrow(/codesign/)
    expect(execFileSync('plutil', ['-extract', 'CFBundleShortVersionString', 'raw', join(target, 'Contents', 'Info.plist')], { encoding: 'utf8' }).trim()).toBe('1')
  })

  it('preserves a running application', async () => {
    makeApp(target, appId, '1')
    const child = spawn(join(target, 'Contents', 'MacOS', name), ['60'])
    await once(child, 'spawn')
    const exited = once(child, 'exit')
    try {
      expect(install).toThrow(/仍在运行/)
    } finally {
      child.kill()
      await exited
    }
  })
})
