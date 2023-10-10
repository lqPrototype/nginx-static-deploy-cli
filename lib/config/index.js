const path = require('path')

module.exports = {
  packageInfo: require('../../package.json'),
  deployConfigPath: `${path.join(process.cwd())}/deploy.config.js`,
  resolve: (file) => path.resolve(__dirname, file),
}
