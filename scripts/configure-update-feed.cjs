/** Resolve the public update directory before builder writes app-update.yml. */
module.exports = function configureUpdateFeed(context) {
  const config = context.packager.config
  const value = config.publish === null ? '' : process.env.BISHENG_UPDATE_URL?.trim()
  config.extraMetadata = { ...config.extraMetadata, dshDesktopUpdatesEnabled: Boolean(value) }
  if (config.publish === null) return

  if (!value) {
    // Keep generating release YAML; this build's embedded policy disables all online checks.
    config.publish = [{ provider: 'generic', url: '' }]
    return
  }
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('BISHENG_UPDATE_URL must be an absolute HTTP(S) directory URL.')
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || /\.ya?ml\/?$/i.test(url.pathname)) {
    throw new Error('BISHENG_UPDATE_URL must be an HTTP(S) directory URL without credentials, query or fragment.')
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/'
  config.publish = [{ provider: 'generic', url: url.href }]
}
