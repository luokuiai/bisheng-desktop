import { copyFile, mkdir, readdir, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import lockfile from 'proper-lockfile'

export function lockWorkspacePublication(cache) {
  return lockfile.lock(cache, {
    lockfilePath: path.join(cache, 'desktop-workspace.publish.lock'),
    stale: 120_000, retries: { retries: 240, minTimeout: 250, maxTimeout: 1000 }
  })
}

/** Install a complete browser build. An already-open renderer can still import
 * its old hashed chunks until npm ci clears the development installation. The
 * packager receives only the files emitted by this build. */
export async function publishWorkspace(prepared, live, packaging, scratch = path.dirname(prepared)) {
  const entries = await readdir(prepared, { recursive: true, withFileTypes: true })
  const files = entries.filter(entry => entry.isFile()).map(entry => path.relative(prepared, path.join(entry.parentPath, entry.name)))
  // Publish the entry point after all dependencies. Atomic individual renames
  // leave concurrent reads (and the previous renderer's module graph) intact.
  for (const file of [...files.filter(name => name !== 'pages.js'), 'pages.js']) {
    const target = path.join(live, file)
    await mkdir(path.dirname(target), { recursive: true })
    const pending = path.join(scratch, 'asset.tmp')
    try {
      await copyFile(path.join(prepared, file), pending)
      await rename(pending, target)
    } finally { await rm(pending, { force: true }) }
  }
  const previous = path.join(path.dirname(prepared), 'previous')
  let moved = false
  try { await rename(packaging, previous); moved = true } catch (error) { if (error.code !== 'ENOENT') throw error }
  try { await rename(prepared, packaging) } catch (error) {
    if (moved) await rename(previous, packaging)
    throw error
  }
}
