const fs = require('fs')
const program = require('commander')
const { packageInfo } = require('./config')
const check = require('./utils/check')

// 注册命令
const registerCommands = () => {
  const commandsPath = `${__dirname}/commands`

  const idToPlugin = (id) => {
    const command = require(`${commandsPath}/${id}`)
    const commandName = id.split('.')[0]
    const alias = id.charAt(0)

    if (commandName === 'deploy') {
      program
        .command(commandName)
        .description(command.description)
        .alias(alias)
        .option('-m, --mode <mode>', 'setup deploy mode')
        .action((options) => {
          command.apply(options.mode)
        })
    } else {
      program
        .command(commandName)
        .description(command.description)
        .alias(alias)
        .action(() => {
          command.apply()
        })
    }
  }

  fs.readdirSync(`${commandsPath}`).forEach(idToPlugin)
}

module.exports = class Service {
  constructor() {
    //
  }

  async run(_id, _args = {}, rawArgv = []) {
    await check.checkUpdate();
    // 
    registerCommands()
    //
    program.version(packageInfo.version, '-v, --version', '输出当前版本号')
    program.helpOption('-h, --help', '获取帮助')
    program.addHelpCommand(false)

    program.parse(rawArgv, { from: 'user' })
  }
}
