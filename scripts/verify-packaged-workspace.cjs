const fs = require('node:fs')
const path = require('node:path')
const asar = require('@electron/asar')

// Development keeps older chunks for already-open windows. Verify the release
// has exactly the current build, including lazy pages, licenses and fonts.
function verifyPackagedWorkspace(resources, prepared) {
  const archive = path.join(resources, 'app.asar')
  const prefix = '/node_modules/@deepseek-ai/dsh-web-frontend/dist/desktop-workspace/'
  const entries = asar.listPackage(archive).map(entry => entry.replaceAll('\\', '/'))
  if (entries.some(entry => entry.startsWith('/node_modules/dsh-desktop-client-ui/workspace/'))) {
    throw new Error('Packaged desktop workspace contains its build-time sources')
  }
  const emitted = new Set(fs.readdirSync(prepared, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.relative(prepared, path.join(entry.parentPath, entry.name)).split(path.sep).join('/')))
  if (!emitted.has('pages.js')) throw new Error('Prepared desktop workspace has no pages entry')
  for (const entry of entries.filter(entry => entry.startsWith(prefix))) {
    if (asar.statFile(archive, entry.slice(1)).files) continue
    const name = entry.slice(prefix.length)
    if (!emitted.delete(name)) throw new Error(`Unreferenced desktop workspace asset in package: ${name}`)
    if (!asar.extractFile(archive, entry.slice(1)).equals(fs.readFileSync(path.join(prepared, name)))) {
      throw new Error(`Packaged desktop workspace asset differs from the current build: ${name}`)
    }
  }
  if (emitted.size) throw new Error(`Packaged desktop workspace is missing: ${[...emitted].join(', ')}`)
}

module.exports = { verifyPackagedWorkspace }
