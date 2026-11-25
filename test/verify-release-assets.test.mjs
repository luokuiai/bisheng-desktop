import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { stringify } from 'yaml'
import { describe, expect, it } from 'vitest'
import { verifyReleaseAssets } from '../scripts/verify-release-assets.mjs'

const minimumBytes = { dmg: 1, zip: 1, exe: 1, blockmap: 1, yml: 1 }

async function digest(content) {
  return createHash('sha512').update(content).digest('base64')
}

async function writeFixture(root, name, content) {
  await writeFile(path.join(root, name), content)
  return { url: name, size: content.length, sha512: await digest(content) }
}

async function createFixture(root) {
  const armZip = await writeFixture(root, 'luokui-ai-mac-arm64.zip', Buffer.from('PK-arm'))
  const x64Zip = await writeFixture(root, 'luokui-ai-mac-x64.zip', Buffer.from('PK-x64'))
  const windows = await writeFixture(root, 'luokui-ai-windows-x64-setup.exe', Buffer.from('MZ-win'))
  const dmg = Buffer.concat([Buffer.alloc(512), Buffer.from('koly')])
  const armDmg = await writeFixture(root, 'luokui-ai-mac-arm64.dmg', dmg)
  const x64Dmg = await writeFixture(root, 'luokui-ai-mac-x64.dmg', dmg)
  await Promise.all([
    writeFile(path.join(root, 'luokui-ai-mac-arm64.zip.blockmap'), 'blockmap'),
    writeFile(path.join(root, 'luokui-ai-mac-x64.zip.blockmap'), 'blockmap'),
    writeFile(path.join(root, 'luokui-ai-windows-x64-setup.exe.blockmap'), 'blockmap'),
    writeFile(path.join(root, 'latest-mac.yml'), stringify({ version: '1.2.3', files: [armZip, x64Zip, armDmg, x64Dmg] })),
    writeFile(path.join(root, 'latest.yml'), stringify({ version: '1.2.3', files: [windows] }))
  ])
}

describe('release asset verification', () => {
  it.each(['arm64', 'x64'])('rejects a %s DMG that no longer matches the manual download metadata', async architecture => {
    const root = await mkdtemp(path.join(tmpdir(), 'dsh-release-assets-'))
    try {
      await createFixture(root)
      await writeFile(path.join(root, `luokui-ai-mac-${architecture}.dmg`), Buffer.concat([Buffer.alloc(512, 1), Buffer.from('koly')]))
      await expect(verifyReleaseAssets(root, '1.2.3', { minimumBytes })).rejects.toThrow('latest-mac.yml checksum or size does not match')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('accepts complete assets whose update metadata matches', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dsh-release-assets-'))
    try {
      await createFixture(root)
      await expect(verifyReleaseAssets(root, '1.2.3', { minimumBytes })).resolves.toBeUndefined()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects an unexpectedly small Windows installer before publication', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dsh-release-assets-'))
    try {
      await createFixture(root)
      await expect(verifyReleaseAssets(root, '1.2.3')).rejects.toThrow('unexpectedly small')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects a missing release asset', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dsh-release-assets-'))
    try {
      await createFixture(root)
      await rm(path.join(root, 'luokui-ai-mac-x64.dmg'))
      await expect(
        verifyReleaseAssets(root, '1.2.3', { minimumBytes })
      ).rejects.toThrow('Missing required release asset: luokui-ai-mac-x64.dmg')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects an installer whose file signature is invalid', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dsh-release-assets-'))
    try {
      await createFixture(root)
      await writeFile(path.join(root, 'luokui-ai-windows-x64-setup.exe'), 'not-an-exe')
      await expect(
        verifyReleaseAssets(root, '1.2.3', { minimumBytes })
      ).rejects.toThrow('is not a PE executable')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects update metadata whose digest or size does not match the package', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dsh-release-assets-'))
    try {
      await createFixture(root)
      await writeFile(
        path.join(root, 'latest.yml'),
        stringify({
          version: '1.2.3',
          files: [
            {
              url: 'luokui-ai-windows-x64-setup.exe',
              size: 6,
              sha512: 'wrong-digest'
            }
          ]
        })
      )
      await expect(
        verifyReleaseAssets(root, '1.2.3', { minimumBytes })
      ).rejects.toThrow('latest.yml checksum or size does not match')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
