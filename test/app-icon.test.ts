// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { createAppIcon, mountAppIconTheme } from '../src/preload/app-icon'

const disposers: Array<() => void> = []

afterEach(() => {
  disposers.splice(0).forEach(dispose => dispose())
  document.body.replaceChildren()
  document.documentElement.removeAttribute('style')
})

it.each([
  ['light', '#product-blue'],
  ['dark', '#metal-mark']
])('creates the %s artwork from the resolved application theme', (colorScheme, selector) => {
  document.documentElement.style.colorScheme = colorScheme
  const icon = createAppIcon(document)
  expect(icon.getAttribute('aria-hidden')).toBe('true')
  expect(icon.querySelector(selector)).not.toBeNull()
})

it('updates only owned icons on theme changes and preserves progress and cleanup', async () => {
  document.documentElement.style.colorScheme = 'light'
  const notification = document.createElement('div')
  const about = document.createElement('div')
  const notificationRoot = notification.attachShadow({ mode: 'open' })
  const aboutRoot = about.attachShadow({ mode: 'open' })
  const outside = createAppIcon(document)
  const icon = createAppIcon(document)
  const spinner = document.createElement('span')
  spinner.className = 'spinner'
  icon.append(spinner)
  notificationRoot.append(icon)
  aboutRoot.append(createAppIcon(document))
  document.body.append(notification, about, outside)
  const dispose = mountAppIconTheme(document, () => [notificationRoot, aboutRoot])
  disposers.push(dispose)
  const originalSvg = icon.querySelector('svg')
  document.documentElement.style.setProperty('--layout-width', '300px')
  await Promise.resolve()
  expect(icon.querySelector('svg')).toBe(originalSvg)
  document.documentElement.style.colorScheme = 'dark'
  await Promise.resolve()
  expect(icon.querySelector('#metal-mark')).not.toBeNull()
  expect(aboutRoot.querySelector('#metal-mark')).not.toBeNull()
  expect(outside.querySelector('#product-blue')).not.toBeNull()
  expect(icon.querySelector('.spinner')).toBe(spinner)
  document.documentElement.style.colorScheme = 'light'
  await Promise.resolve()
  expect(icon.querySelector('#product-blue')).not.toBeNull()
  dispose()
  document.documentElement.style.colorScheme = 'dark'
  await Promise.resolve()
  expect(icon.querySelector('#product-blue')).not.toBeNull()
})
