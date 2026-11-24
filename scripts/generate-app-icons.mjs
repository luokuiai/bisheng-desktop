import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const buildDirectory = path.join(projectRoot, 'build')
const markSource = path.join(buildDirectory, 'app-icon.svg')
const appIcon = path.join(buildDirectory, 'app-icon.png')
const webIcon = path.join(buildDirectory, 'icon.png')
const icnsDestination = path.join(buildDirectory, 'icon.icns')
const icoDestination = path.join(buildDirectory, 'icon.ico')
const appIconCanvasSize = 1024
const appIconMarkSize = 824

const markSvg = await readFile(markSource)
const darkMarkSvg = await readFile(path.join(buildDirectory, 'app-icon-dark.svg'))

async function rasterise(svg, width, height, destination) {
  await sharp(svg)
    .resize(width, height, { fit: 'contain' })
    .png()
    .toFile(destination)
}

async function rasterisePaddedAppIcon(svg, destination) {
  const mark = await sharp(svg)
    .resize(appIconMarkSize, appIconMarkSize, { fit: 'contain' })
    .png()
    .toBuffer()

  await sharp({
    create: {
      width: appIconCanvasSize,
      height: appIconCanvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{
      input: mark,
      left: (appIconCanvasSize - appIconMarkSize) / 2,
      top: (appIconCanvasSize - appIconMarkSize) / 2
    }])
    .png()
    .toFile(destination)
}

await rasterisePaddedAppIcon(markSvg, appIcon)
await rasterise(markSvg, 1024, 1024, webIcon)
await rasterise(markSvg, 240, 240, path.join(buildDirectory, 'logo-light.png'))
await rasterise(darkMarkSvg, 240, 240, path.join(buildDirectory, 'logo-dark.png'))
const icnsFrames = []
for (const [type, size] of [
  ['icp4', 16], ['icp5', 32], ['icp6', 64], ['ic07', 128],
  ['ic08', 256], ['ic09', 512], ['ic10', 1024],
  ['ic11', 32], ['ic12', 64], ['ic13', 256], ['ic14', 512]
]) {
  const png = await sharp(appIcon).resize(size, size).png().toBuffer()
  const header = Buffer.alloc(8)
  header.write(type, 0, 4, 'ascii')
  header.writeUInt32BE(header.length + png.length, 4)
  icnsFrames.push(header, png)
}
const icnsHeader = Buffer.alloc(8)
icnsHeader.write('icns', 0, 4, 'ascii')
icnsHeader.writeUInt32BE(8 + icnsFrames.reduce((total, frame) => total + frame.length, 0), 4)
await writeFile(icnsDestination, Buffer.concat([icnsHeader, ...icnsFrames]))

const icoSizes = [16, 24, 32, 48, 64, 128, 256]
const icoImages = []
for (const size of icoSizes) {
  icoImages.push(await sharp(markSvg).resize(size, size).png().toBuffer())
}
const header = Buffer.alloc(6 + icoImages.length * 16)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(icoImages.length, 4)

let offset = header.length
for (let index = 0; index < icoImages.length; index += 1) {
  const size = icoSizes[index]
  const entry = 6 + index * 16
  header.writeUInt8(size === 256 ? 0 : size, entry)
  header.writeUInt8(size === 256 ? 0 : size, entry + 1)
  header.writeUInt8(0, entry + 2)
  header.writeUInt8(0, entry + 3)
  header.writeUInt16LE(1, entry + 4)
  header.writeUInt16LE(32, entry + 6)
  header.writeUInt32LE(icoImages[index].length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += icoImages[index].length
}
await writeFile(icoDestination, Buffer.concat([header, ...icoImages]))

console.log('Generated app, web, mobile, macOS, and Windows icons from build/app-icon.svg.')
