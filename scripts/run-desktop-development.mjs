import { execFileSync, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const root = resolve(import.meta.dirname, '..')
const [command, ...args] = process.argv.slice(2)
if (!['dev', 'preview'].includes(command)) throw new Error('Expected electron-vite dev or preview.')

function prepareMacDevelopmentApp(electron) {
  const app = resolve(dirname(electron), '../..')
  const originalPlist = join(app, 'Contents', 'Info.plist')
  const { build: { productName } } = require('../package.json')
  const stamp = createHash('sha256').update(readFileSync(originalPlist))
    .update(JSON.stringify([productName, electron, statSync(electron).ino])).digest('hex').slice(0, 16)
  const cache = join(root, '.build', 'desktop-development-app')
  const destination = join(cache, stamp)
  const appName = `${productName}.app`
  const executable = join(destination, appName, 'Contents', 'MacOS', 'Electron')
  if (existsSync(executable)) return executable

  mkdirSync(cache, { recursive: true })
  const staging = mkdtempSync(join(cache, '.prepare-'))
  try {
    const stagedApp = join(staging, appName)
    execFileSync('/bin/cp', ['-cR', app, stagedApp])
    const plist = join(stagedApp, 'Contents', 'Info.plist')
    for (const key of ['CFBundleName', 'CFBundleDisplayName']) {
      execFileSync('/usr/bin/plutil', ['-replace', key, '-string', productName, plist])
    }
    // Leave the installed Electron distribution untouched. Re-sign the copy
    // only if the original bundle carries a signature that the plist edit invalidates.
    const signature = join(app, 'Contents', '_CodeSignature', 'CodeResources')
    if (existsSync(signature)) {
      execFileSync('/usr/bin/codesign', ['--force', '--sign', '-', '--preserve-metadata=entitlements', stagedApp])
    }
    try { renameSync(staging, destination) }
    catch (error) { if (!existsSync(executable)) throw error }
    return executable
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }
}

const env = { ...process.env }
if (process.platform === 'darwin' && !env.ELECTRON_EXEC_PATH) {
  env.ELECTRON_EXEC_PATH = prepareMacDevelopmentApp(require('electron'))
}
const vite = join(dirname(require.resolve('electron-vite/package.json')), 'bin', 'electron-vite.js')
const child = spawn(process.execPath, [vite, command, ...args], { env, stdio: 'inherit' })
child.once('error', error => { console.error(error); process.exitCode = 1 })
child.once('exit', code => { process.exitCode = code ?? 1 })
