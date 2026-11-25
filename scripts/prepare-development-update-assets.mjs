import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { appendFile, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import YAML from 'yaml'
import { developmentAssets } from './stage-development-assets.mjs'

const PLATFORMS = { 'mac-arm64': 'arm64', 'mac-x64': 'x64', 'windows-x64': 'windows' }

export async function prepareDevelopmentUpdateAssets(directory, target, version) {
  assert(Object.hasOwn(PLATFORMS, target), `Unknown development target: ${target}`)
  const platform = PLATFORMS[target]
  const assets = await developmentAssets(directory, platform)
  const updatePackage = assets.find(file => file.endsWith(platform === 'windows' ? '.exe' : '.dmg'))
  assert(updatePackage, `Missing development update package: ${target}`)
  const hash = createHash('sha512')
  for await (const chunk of createReadStream(updatePackage)) hash.update(chunk)
  const sha512 = hash.digest('base64')
  const info = await stat(updatePackage)
  const filename = basename(updatePackage)
  const metadata = join(directory, platform === 'windows' ? 'latest.yml' : `latest-mac-${platform}.yml`)
  await writeFile(metadata, YAML.stringify({
    version,
    files: [{ url: filename, sha512, size: info.size }],
    path: filename,
    sha512,
    releaseDate: info.mtime.toISOString()
  }))
  return { metadata, updatePackage }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [target, directory = 'dist-dev'] = process.argv.slice(2)
  const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const assets = await prepareDevelopmentUpdateAssets(resolve(directory), target, version)
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `metadata=${basename(assets.metadata)}\n`)
  }
  console.log(`Prepared ${basename(assets.metadata)} for ${basename(assets.updatePackage)}.`)
}
