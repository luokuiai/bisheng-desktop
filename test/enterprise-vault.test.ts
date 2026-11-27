import { mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  ENTERPRISE_VAULT_FILENAME,
  EnterpriseVaultError,
  SecureEnterpriseCredentialVault,
  type SafeStorageCryptoAdapter
} from '../src/main/enterprise/secure-credential-vault'

import { EnterpriseService } from '../src/main/enterprise/enterprise-service'

function memorySafeStorage(): SafeStorageCryptoAdapter {
  return {
    isEncryptionAvailable: () => true,
    getSelectedStorageBackend: () => 'keychain',
    encryptString: (plainText) => Buffer.from(plainText, 'utf8'),
    decryptString: (encrypted) => Buffer.from(encrypted as Buffer).toString('utf8')
  }
}

const validSession = {
  base: 'https://platform.example.com',
  token_type: 'Bearer',
  access_token: 'access-1',
  access_expires_at: new Date(Date.now() + 60_000).toISOString(),
  refresh_token: 'refresh-1',
  refresh_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  session_id: 'session-1',
  user: { display_name: 'Alice' }
}

describe('enterprise v2 vault', () => {
  it('writes a single session and clears it on logout', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'enterprise-vault-'))
    const filename = join(directory, ENTERPRISE_VAULT_FILENAME)
    const vault = new SecureEnterpriseCredentialVault(filename, memorySafeStorage())
    const written = await vault.replace(0, validSession)
    expect(written.generation).toBe(1)
    expect(written.session?.access_token).toBe('access-1')
    const cleared = await vault.clear()
    expect(cleared.session).toBeNull()
    expect(cleared.generation).toBe(2)
    if (process.platform !== 'win32') {
      expect((await stat(filename)).mode & 0o777).toBe(0o600)
    }
  })

  it('voids sessions that are missing security fields without networking', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'enterprise-vault-'))
    const filename = join(directory, ENTERPRISE_VAULT_FILENAME)
    const storage = memorySafeStorage()
    await writeFile(filename, storage.encryptString(JSON.stringify({
      version: 2,
      generation: 4,
      session: { display_name: 'broken' }
    })), { mode: 0o600 })
    const vault = new SecureEnterpriseCredentialVault(filename, storage)
    await expect(vault.read()).resolves.toEqual({ generation: 4, session: null })
  })

  it('quarantines a corrupt file instead of overwriting it', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'enterprise-vault-'))
    const filename = join(directory, ENTERPRISE_VAULT_FILENAME)
    const storage = memorySafeStorage()
    await writeFile(filename, storage.encryptString('{not-json'), { mode: 0o600 })
    const vault = new SecureEnterpriseCredentialVault(filename, storage)
    await expect(vault.read()).rejects.toBeInstanceOf(EnterpriseVaultError)
    const names = await readdir(directory)
    expect(names.some((name) => name.includes('.corrupt.'))).toBe(true)
    await expect(readFile(filename)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('does not read unpublished v1 vault files', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'enterprise-vault-'))
    const storage = memorySafeStorage()
    await writeFile(join(directory, 'enterprise-credentials.v1'), storage.encryptString(JSON.stringify({
      version: 1,
      generation: 1,
      activeKey: 'x',
      records: { x: validSession }
    })), { mode: 0o600 })
    const vault = new SecureEnterpriseCredentialVault(
      join(directory, ENTERPRISE_VAULT_FILENAME),
      storage
    )
    await expect(vault.read()).resolves.toEqual({ generation: 0, session: null })
  })
})

describe('on-demand macOS Keychain', () => {
  async function setup() {
    const directory = await mkdtemp(join(tmpdir(), 'enterprise-keychain-'))
    const filename = join(directory, ENTERPRISE_VAULT_FILENAME)
    const sync = vi.fn((): never => { throw new Error('Unexpected synchronous Keychain access') })
    const encode = (text: string) => Buffer.concat([Buffer.from('v10'), Buffer.from(text, 'utf8')])
    const keychain = {
      isAsyncEncryptionAvailable: vi.fn(async () => true),
      encryptStringAsync: vi.fn(async (text: string) => encode(text)),
      decryptStringAsync: vi.fn(async (bytes: Buffer) => ({ result: bytes.subarray(3).toString('utf8') }))
    }
    const vault = new SecureEnterpriseCredentialVault(filename, {
      isEncryptionAvailable: sync, encryptString: sync, decryptString: sync
    }, keychain)
    const fetchImpl = vi.fn(async (): Promise<Response> => { throw new Error('Unexpected network request') })
    const service = new EnterpriseService({ vault, fetchImpl, allowInsecureLoopback: false })
    return { directory, filename, encode, sync, keychain, vault, service, fetchImpl }
  }

  it('starts a local-only profile and serves status without checking or creating a Keychain key', async () => {
    const { filename, sync, keychain, vault, service } = await setup()
    const splash = vi.fn(async () => {})
    expect(vault.available).toBeUndefined()
    await service.restore(splash)
    expect(await service.readState()).toMatchObject({ phase: 'idle', connected: false })
    expect(service.snapshot()).not.toHaveProperty('secureStorageAvailable')
    expect((await service.logout()).phase).toBe('idle')
    expect(splash).not.toHaveBeenCalled()
    expect(sync).not.toHaveBeenCalled()
    expect(keychain.isAsyncEncryptionAvailable).not.toHaveBeenCalled()
    expect(keychain.encryptStringAsync).not.toHaveBeenCalled()
    expect(keychain.decryptStringAsync).not.toHaveBeenCalled()
    await expect(stat(filename)).rejects.toMatchObject({ code: 'ENOENT' })
    await service.stop()
  })

  it('checks the key before login and refuses an unsafe write without creating a file', async () => {
    const { filename, vault, service, keychain, fetchImpl } = await setup()
    keychain.isAsyncEncryptionAvailable.mockResolvedValue(false)
    await expect(service.startLogin('https://platform.example.com')).rejects.toMatchObject({ status: 503 })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(service.snapshot()).toMatchObject({ phase: 'error', connected: false })
    expect(service.snapshot()).not.toHaveProperty('secureStorageAvailable')
    await expect(vault.replace(0, validSession)).rejects.toMatchObject({ code: 'unavailable' })
    expect(keychain.encryptStringAsync).not.toHaveBeenCalled()
    keychain.isAsyncEncryptionAvailable.mockResolvedValue(true)
    await expect(service.startLogin('https://platform.example.com')).rejects.toThrow()
    expect(fetchImpl).toHaveBeenCalledOnce()
    keychain.encryptStringAsync.mockImplementationOnce(async text => Buffer.from(text))
    await expect(vault.replace(0, validSession)).rejects.toMatchObject({ code: 'unavailable' })
    await expect(stat(filename)).rejects.toMatchObject({ code: 'ENOENT' })
    await service.stop()
  })

  it('draws the restore notice before access, preserves locked ciphertext and retries the same vault', async () => {
    const { directory, filename, vault, encode, keychain } = await setup()
    const bytes = encode(JSON.stringify({ version: 2, generation: 5, session: validSession }))
    await writeFile(filename, bytes)
    const order: string[] = []
    const splash = async () => { order.push('splash') }
    keychain.isAsyncEncryptionAvailable.mockImplementation(async () => { order.push('inspect'); return true })
    keychain.decryptStringAsync.mockRejectedValueOnce(new Error('Keychain access denied'))
    await expect(vault.read(splash)).rejects.toMatchObject({ code: 'unavailable' })
    expect(order).toEqual(['splash', 'inspect'])
    expect(await readdir(directory)).toEqual([ENTERPRISE_VAULT_FILENAME])
    expect(await readFile(filename)).toEqual(bytes)
    await expect(vault.read(splash)).resolves.toMatchObject({ generation: 5, session: validSession })
    await expect(vault.replace(5, validSession)).resolves.toMatchObject({ generation: 6 })
    await expect(vault.clear()).resolves.toEqual({ generation: 7, session: null })
  })

  it('reports failed logout while locked and clears the saved account once access is restored', async () => {
    const { filename, vault, encode, keychain, service } = await setup()
    const bytes = encode(JSON.stringify({ version: 2, generation: 3, session: validSession }))
    await writeFile(filename, bytes)
    keychain.decryptStringAsync.mockRejectedValueOnce(new Error('Restore denied')).mockRejectedValueOnce(new Error('Logout denied'))
    await service.restore()
    expect((await service.logout()).phase).toBe('error')
    expect(await readFile(filename)).toEqual(bytes)
    expect((await service.logout()).phase).toBe('idle')
    expect(await vault.read()).toEqual({ generation: 4, session: null })
    await service.stop()
  })

  it('quarantines verified format corruption without loading public text as a credential', async () => {
    const { filename, encode, keychain, vault } = await setup()
    await writeFile(filename, JSON.stringify({ version: 2, generation: 2, session: validSession }))
    await expect(vault.read()).rejects.toMatchObject({ code: 'corrupt' })
    expect(keychain.decryptStringAsync).not.toHaveBeenCalled()
    await writeFile(filename, encode('{broken'))
    await expect(vault.read()).rejects.toMatchObject({ code: 'corrupt' })
    await expect(stat(filename)).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
