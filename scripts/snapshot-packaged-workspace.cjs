const { cp } = require('node:fs/promises')
const { constants } = require('node:fs')
const path = require('node:path')

const target = 'node_modules/@deepseek-ai/dsh-web-frontend/dist/desktop-workspace'
const builds = new WeakMap()

function workspaceFileSet(config) {
  const files = config.files.find(entry => typeof entry === 'object' && entry.to === target)
  if (!files) throw new Error('Desktop workspace is missing from the packager file sets')
  return files
}

async function pinWorkspace(packager) {
  const files = workspaceFileSet(packager.config)
  const prepared = path.resolve(packager.projectDir, files.from)
  const snapshot = await packager.info.tempDirManager.getTempDir({ prefix: 'desktop-workspace' })
  const { lockWorkspacePublication } = await import('./publish-workspace-assets.mjs')
  const release = await lockWorkspacePublication(path.dirname(prepared))
  try {
    await cp(prepared, snapshot, { recursive: true, mode: constants.COPYFILE_FICLONE })
    files.from = snapshot
  } finally { await release() }
}

// afterExtract runs before electron-builder creates file matchers. A build
// may take minutes between enumerating a lazy chunk and reading its bytes.
// Every target in this builder invocation shares one immutable snapshot.
module.exports = function snapshotPackagedWorkspace({ packager }) {
  if (!builds.has(packager.config)) builds.set(packager.config, pinWorkspace(packager))
  return builds.get(packager.config)
}
module.exports.workspaceFileSet = workspaceFileSet
