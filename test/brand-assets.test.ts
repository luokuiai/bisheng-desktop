import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')
const build = (...segments: string[]) => path.join(projectRoot, 'build', ...segments)

async function alphaBounds(file: string | Buffer) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let left = info.width
  let top = info.height
  let right = -1
  let bottom = -1

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + 3] === 0) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  return { left, top, right, bottom }
}

async function icnsPngFrames(file: string) {
  const icns = await readFile(file)
  expect(icns.subarray(0, 4).toString('ascii')).toBe('icns')
  expect(icns.readUInt32BE(4)).toBe(icns.length)

  let offset = 8
  const frames = new Map<string, Buffer>()
  while (offset < icns.length) {
    const type = icns.subarray(offset, offset + 4).toString('ascii')
    const length = icns.readUInt32BE(offset + 4)
    expect(length).toBeGreaterThan(8)
    expect(offset + length).toBeLessThanOrEqual(icns.length)
    const payload = icns.subarray(offset + 8, offset + length)
    expect(payload.subarray(1, 4).toString('ascii')).toBe('PNG')
    frames.set(type, payload)
    offset += length
  }

  expect(offset).toBe(icns.length)
  return frames
}

describe('BISHENG brand assets', () => {
  it('keeps the downloaded SVG artwork as the authoritative source', async () => {
    const mark = await readFile(build('bisheng-logo-mark.svg'), 'utf8')
    const horizontal = await readFile(build('bisheng-logo-horizontal.svg'), 'utf8')

    expect(mark).toContain('viewBox="0 0 2400 2400"')
    expect(mark).toContain('<rect width="2400" height="2400" rx="360" fill="#000000"/>')
    expect(mark).toContain('fill="#000000"')
    expect(mark).not.toContain('#034FE5')
    expect(mark.match(/<path /g)).toHaveLength(8)
    expect(horizontal).toContain('viewBox="0 0 8220 2400"')
    expect(horizontal).toContain('fill="#000000"')
    expect(horizontal).not.toContain('#034FE5')
    expect(await readFile(build('brand-mark.svg'), 'utf8')).toBe(mark)
    expect(await readFile(build('logo-light.svg'), 'utf8')).toBe(mark)
  })

  it('uses the application icon while preserving blue for ordinary mobile UI', async () => {
    const desktopBrand = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'),
      'utf8'
    )
    const mobilePages = await readFile(
      path.join(projectRoot, 'src', 'main', 'mobile', 'lan-mobile-pages.ts'),
      'utf8'
    )

    expect(desktopBrand).toContain("'/dsh-desktop-logo-light.png'")
    expect(desktopBrand).toContain("'/dsh-desktop-logo-dark.png'")
    expect(desktopBrand).not.toContain('BISHENG_MARK_PATHS')
    expect(mobilePages).toContain('--brand:#034FE5')
  })

  it('ships correctly sized raster derivatives', async () => {
    const cases = [
      [build('app-icon.png'), 1024, 1024],
      [build('icon.png'), 1024, 1024],
      [build('logo-light.png'), 240, 240],
      [build('logo-dark.png'), 240, 240],
      [path.join(projectRoot, 'docs', 'images', 'readme-logo-black-v020.png'), 1644, 480]
    ] as const
    for (const [file, width, height] of cases) {
      await expect(sharp(file).metadata()).resolves.toMatchObject({ width, height })
    }
  })

  it('renders the supplied application artwork into the web and mobile icons', async () => {
    const source = await readFile(build('app-icon.svg'))
    const darkSource = await readFile(build('app-icon-dark.svg'))
    for (const [filename, size, artwork] of [['icon.png', 1024, source], ['logo-light.png', 240, source], ['logo-dark.png', 240, darkSource]] as const) {
      const actual = await sharp(build(filename)).ensureAlpha().raw().toBuffer()
      const expected = await sharp(artwork).resize(size, size).ensureAlpha().raw().toBuffer()
      expect(actual.equals(expected)).toBe(true)
    }
    const frontend = path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh-web-frontend', 'dist')
    expect((await readFile(path.join(frontend, 'dsh-desktop-logo.png'))).equals(await readFile(build('icon.png')))).toBe(true)
    for (const mode of ['light', 'dark']) {
      expect((await readFile(path.join(frontend, `dsh-desktop-logo-${mode}.png`))).equals(await readFile(build(`logo-${mode}.png`)))).toBe(true)
    }
    expect((await readFile(build('logo-light.png'))).equals(await readFile(build('logo-dark.png')))).toBe(false)
  })

  it('uses a macOS safe area without shrinking full-bleed web artwork', async () => {
    await expect(alphaBounds(build('app-icon.png'))).resolves.toEqual({
      left: 106,
      top: 106,
      right: 917,
      bottom: 917
    })
    await expect(alphaBounds(build('icon.png'))).resolves.toEqual({
      left: 8,
      top: 8,
      right: 1015,
      bottom: 1015
    })
  })

  it('builds the macOS icns from the same padded app icon', async () => {
    const frames = await icnsPngFrames(build('icon.icns'))
    const sizes = { icp4: 16, icp5: 32, icp6: 64, ic07: 128, ic08: 256, ic09: 512, ic10: 1024, ic11: 32, ic12: 64, ic13: 256, ic14: 512 }
    expect([...frames.keys()]).toEqual(Object.keys(sizes))
    for (const [type, size] of Object.entries(sizes)) {
      const frame = frames.get(type)
      expect(frame).toBeDefined()
      await expect(sharp(frame).metadata()).resolves.toMatchObject({ width: size, height: size })
      const expected = await sharp(build('app-icon.png')).resize(size, size).ensureAlpha().raw().toBuffer()
      const actual = await sharp(frame).ensureAlpha().raw().toBuffer()
      expect(actual.equals(expected)).toBe(true)
    }
  })

  it('embeds every Windows icon size with valid offsets and the supplied artwork', async () => {
    const ico = await readFile(build('icon.ico'))
    expect(ico.readUInt16LE(0)).toBe(0)
    expect(ico.readUInt16LE(2)).toBe(1)
    const sizes = [16, 24, 32, 48, 64, 128, 256]
    expect(ico.readUInt16LE(4)).toBe(sizes.length)
    let offset = 6 + sizes.length * 16
    for (const [index, size] of sizes.entries()) {
      const entry = 6 + index * 16
      expect(ico.readUInt8(entry) || 256).toBe(size)
      expect(ico.readUInt8(entry + 1) || 256).toBe(size)
      expect(ico.readUInt16LE(entry + 6)).toBe(32)
      expect(ico.readUInt32LE(entry + 12)).toBe(offset)
      const length = ico.readUInt32LE(entry + 8)
      const frame = ico.subarray(offset, offset + length)
      await expect(sharp(frame).metadata()).resolves.toMatchObject({ width: size, height: size })
      const expected = await sharp(await readFile(build('app-icon.svg'))).resize(size, size).ensureAlpha().raw().toBuffer()
      const actual = await sharp(frame).ensureAlpha().raw().toBuffer()
      expect(actual.equals(expected)).toBe(true)
      offset += length
    }
    expect(offset).toBe(ico.length)
  })

  it('keeps the startup splash text-only and bilingual', async () => {
    const splash = await readFile(build('splash.html'), 'utf8')

    expect(splash).toContain('Starting BISHENG')
    expect(splash).toContain('First launch may take a moment.')
    expect(splash).toContain('正在启动 BISHENG')
    expect(splash).toContain('首次启动可能需要一点时间。')
    expect(splash).toContain('data-platform="windows"')
    expect(splash).toContain("data-theme='dark'")
    expect(splash).not.toMatch(/<img\b/u)
    expect(splash).not.toMatch(/\.gif\b/u)
  })

  it('records actual manifest dimensions', async () => {
    const installer = await readFile(
      path.join(projectRoot, 'scripts', 'install-brand-assets.mjs'),
      'utf8'
    )

    expect(installer).toContain('readPngDimensions(iconContents')
    expect(installer).not.toContain("target.sizes = '1254x1254'")
  })
})
