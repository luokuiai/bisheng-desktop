const packageJson = require('./package.json')

module.exports = {
  ...packageJson.build,
  appId: 'com.luokuiai.bisheng.dev',
  protocols: [
    {
      name: packageJson.build.protocols[0].name,
      schemes: ['bisheng-dev']
    }
  ],
  directories: {
    ...packageJson.build.directories,
    output: 'dist-dev'
  },
  extraMetadata: {
    name: 'dsh-desktop-dev',
    productName: packageJson.build.productName,
    dshDesktopChannel: 'development'
  },
  publish: null
}
