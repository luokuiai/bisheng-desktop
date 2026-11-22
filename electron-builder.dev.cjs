const packageJson = require('./package.json')

const hasMacCertificate = Boolean(process.env.CSC_LINK?.trim())
if (process.platform === 'darwin') {
  if (!hasMacCertificate) delete process.env.CSC_LINK
  process.env.CSC_IDENTITY_AUTO_DISCOVERY = String(hasMacCertificate)
}

module.exports = {
  ...packageJson.build,
  appId: 'io.bisheng.dev',
  productName: 'BISHENG Dev',
  protocols: [
    {
      name: 'BISHENG Dev Enterprise Login',
      schemes: ['bisheng-dev']
    }
  ],
  directories: {
    ...packageJson.build.directories,
    output: 'dist-dev'
  },
  extraMetadata: {
    name: 'dsh-desktop-dev',
    productName: 'BISHENG Dev',
    dshDesktopChannel: 'development'
  },
  artifactName: 'bisheng-dev-${os}-${arch}.${ext}',
  mac: {
    ...packageJson.build.mac,
    identity: hasMacCertificate ? undefined : '-',
    forceCodeSigning: true
  },
  nsis: {
    ...packageJson.build.nsis,
    artifactName: 'bisheng-dev-windows-${arch}-setup.${ext}'
  },
  publish: null
}
