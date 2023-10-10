const fs = require('fs')
const ora = require('ora')
const chalk = require('chalk')
const { deployConfigPath } = require('../config')

module.exports = {
  checkDeployConfigExists: () => fs.existsSync(deployConfigPath),
  log: (message) => console.log(message),
  succeed: (...message) => ora().succeed(chalk.greenBright.bold(message)),
  info: (...message) => ora().info(chalk.blueBright.bold(message)),
  error: (...message) => ora().fail(chalk.redBright.bold(message)),
  underline: (message) => chalk.underline.blueBright.bold(message)
}
