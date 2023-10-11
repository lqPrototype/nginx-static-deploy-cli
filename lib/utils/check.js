const chalk = require('chalk')
const pkg = require('../../package.json')
const semver = require('semver')
const { log } = require('.')
const spawn = require('cross-spawn')

const checkVersionUtil = {
  resolveRun(exitCode, stdout, stderr) {
    stdout = stdout && stdout.toString()
    stderr = stderr && stderr.toString()

    if (exitCode !== 0) {
      return Object.assign(
        new Error(`Command failed, exited with code #${exitCode}`),
        {
          exitCode,
          stdout,
          stderr
        }
      )
    }

    return {
      stdout,
      stderr
    }
  },
  runSync(command, args, options) {
    const { error, status, stdout, stderr } = spawn.sync(command, args, options)

    if (error) {
      throw error
    }

    const resolved = this.resolveRun(status, stdout, stderr)

    if (resolved instanceof Error) {
      throw resolved
    }

    return resolved
  },
  getCmdOutput(cmd, args) {
    const { stdout, stderr } = this.runSync(cmd, args)
    if (stderr && stderr.indexOf('Debugger attached') < 0) {
      throw new Error(stderr)
    }
    return stdout
  },
  getNpmPackage(packageName) {
    try {
      const output = this.getCmdOutput('npm', ['view', packageName, 'version'])
      return output
    } catch (error) {
      console.error(error)
      return null
    }
  },
  checkUpdate() {
    return new Promise((resolve) => {
      const latestVersion = this.getNpmPackage('nginx-static-deploy-cli')
      if (!latestVersion) {
        resolve(true)
      }
      const localVersion = pkg.version

      if (semver.lt(localVersion, latestVersion)) {
        log(chalk.yellow(`🍎📷 nginx-static-deploy-cli工具升级提示：`))
        log(chalk.white(`  当前版本: ${chalk.grey(localVersion)}`))
        log(chalk.white(`  最新版本: ${chalk.cyan(latestVersion)}`))
        log(
          `  运行 ${chalk.green(
            `npm install -g nginx-static-deploy-cli`
          )} 即可更新`
        )
        resolve(true)
      } else {
        resolve(false)
      }
    })
  }
}

module.exports = checkVersionUtil
