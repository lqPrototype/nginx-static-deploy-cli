const fs = require('fs')
const ora = require('ora')
const dayjs = require('dayjs')
const inquirer = require('inquirer')
const archiver = require('archiver')
const { NodeSSH } = require('node-ssh')
const childProcess = require('child_process')
const { deployConfigPath } = require('../config')
const {
  checkDeployConfigExists,
  log,
  succeed,
  error,
  underline,
  info
} = require('../utils')

const ssh = new NodeSSH()
const maxBuffer = 5000 * 1024

// 任务列表
let taskList

// 是否确认部署
const confirmDeploy = (message) => {
  return inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message
    }
  ])
}

// 执行打包前脚本
const execBeforeHook = async (config, index) => {
  try {
    const { beforeHook } = config
    const script = typeof beforeHook === 'string' ? beforeHook : beforeHook()
    log(`(${index}) ${script}`)
    const spinner = ora('正在执行前置钩子...\n')

    spinner.start()

    await new Promise((resolve, reject) => {
      childProcess.exec(
        script,
        { cwd: process.cwd(), maxBuffer: maxBuffer },
        (e) => {
          spinner.stop()
          if (e === null) {
            succeed('前置钩子执行完成')
            resolve()
          } else {
            reject(e.message)
          }
        }
      )
    })
  } catch (e) {
    error('前置钩子执行失败')
    error(e)
    process.exit(1)
  }
}

// 执行打包后脚本
const execAfterHook = async (config, index) => {
  try {
    const { afterHook } = config
    const script = typeof afterHook === 'string' ? afterHook : afterHook()
    log(`(${index}) ${script}`)
    const spinner = ora('正在执行后置钩子...\n')

    spinner.start()

    await new Promise((resolve, reject) => {
      childProcess.exec(
        script,
        { cwd: process.cwd(), maxBuffer: maxBuffer },
        (e) => {
          spinner.stop()
          if (e === null) {
            succeed('后置钩子执行完成')
            resolve()
          } else {
            reject(e.message)
          }
        }
      )
    })
  } catch (e) {
    error('后置钩子执行失败')
    error(e)
    process.exit(1)
  }
}

// 执行打包脚本
const execBuild = async (config, index) => {
  try {
    const { script } = config
    log(`(${index}) ${script}`)
    const spinner = ora('正在打包中\n')

    spinner.start()

    await new Promise((resolve, reject) => {
      childProcess.exec(
        script,
        { cwd: process.cwd(), maxBuffer: maxBuffer },
        (e) => {
          spinner.stop()
          if (e === null) {
            succeed('打包成功')
            resolve()
          } else {
            reject(e.message)
          }
        }
      )
    })
  } catch (e) {
    error('打包失败')
    error(e)
    process.exit(1)
  }
}

// 打包Zip
const buildZip = async (config, index) => {
  await new Promise((resolve, reject) => {
    log(`(${index}) 打包 ${underline(config.distPath)} Zip`)
    const archive = archiver('zip', {
      zlib: { level: 9 }
    }).on('error', (e) => {
      error(e)
    })

    const output = fs
      .createWriteStream(`${process.cwd()}/${config.distPath}.zip`)
      .on('close', (e) => {
        if (e) {
          error(`打包zip出错: ${e}`)
          reject(e)
          process.exit(1)
        } else {
          succeed(`${underline(`${config.distPath}.zip`)} 打包成功`)
          resolve()
        }
      })

    archive.pipe(output)
    archive.directory(config.distPath, false)
    archive.finalize()
  })
}

// 连接ssh
const connectSSH = async (config, index) => {
  try {
    log(`(${index}) ssh连接 ${underline(config.host)}`)

    const { password } = config
    if (!password) {
      const answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'password',
          message: '请输入服务器密码'
        }
      ])

      config.password = answers.password
    }

    await ssh.connect(config)
    succeed(`ssh连接成功`)
  } catch (e) {
    error(e)
    process.exit(1)
  }
}

// 上传本地文件
const uploadLocalFile = async (config, index) => {
  try {
    const localFileName = `${config.distPath}.zip`
    const remoteFileName = `${config.webDir}.zip`
    const localPath = `${process.cwd()}/${localFileName}`

    log(`(${index}) 上传打包zip至目录 ${underline(remoteFileName)}`)

    const spinner = ora('正在上传中\n')

    spinner.start()

    await ssh.putFile(localPath, remoteFileName, null, {
      concurrency: 1
    })

    spinner.stop()
    succeed('上传成功')
  } catch (e) {
    error(`上传失败: ${e}`)
    process.exit(1)
  }
}

// 备份远程文件
const backupRemoteFile = async (config, index) => {
  try {
    const { webDir, bakDir } = config
    const dirName = webDir.split('/')[webDir.split('/').length - 1]
    const zipFileName = `${dirName}_${dayjs().format(
      'YYYY_MM_DD_HH_mm_ss'
    )}.zip`

    log(`(${index}) 备份远程文件 ${underline(webDir)}`)

    await ssh.execCommand(`[ ! -d ${bakDir} ] && mkdir ${bakDir}`)

    await ssh.execCommand(`zip -q -r ${bakDir}/${zipFileName} ${webDir}`)

    succeed(`备份成功 备份至 ${underline(`${bakDir}/${zipFileName}`)}`)
  } catch (e) {
    error(e)
    process.exit(1)
  }
}

// 删除远程文件
const removeRemoteFile = async (config, index) => {
  try {
    const { webDir } = config

    log(`(${index}) 删除远程文件 ${underline(webDir)}`)

    await ssh.execCommand(`rm -rf ${webDir}`)

    succeed('删除成功')
  } catch (e) {
    error(e)
    process.exit(1)
  }
}

// 解压远程文件
const unzipRemoteFile = async (config, index) => {
  try {
    const { webDir } = config
    const remoteFileName = `${webDir}.zip`

    log(`(${index}) 解压远程文件 ${underline(remoteFileName)}`)

    await ssh.execCommand(
      `unzip -o ${remoteFileName} -d ${webDir} && rm -rf ${remoteFileName}`
    )

    succeed('解压成功')
  } catch (e) {
    error(e)
    process.exit(1)
  }
}

// 删除本地打包文件
const removeLocalFile = (config, index) => {
  const localPath = `${process.cwd()}/${config.distPath}`

  log(`(${index}) 删除本地打包目录 ${underline(localPath)}`)

  const remove = (path) => {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach((file) => {
        let currentPath = `${path}/${file}`
        if (fs.statSync(currentPath).isDirectory()) {
          remove(currentPath)
        } else {
          fs.unlinkSync(currentPath)
        }
      })
      fs.rmdirSync(path)
    }
  }

  remove(localPath)
  fs.unlinkSync(`${localPath}.zip`)
  succeed('删除本地打包目录成功')
}

// 断开ssh
const disconnectSSH = () => {
  ssh.dispose()
}

// 创建任务列表
const createTaskList = (config) => {
  const {
    script,
    bakDir,
    beforeHook,
    afterHook,
    isRemoveRemoteFile = true,
    isRemoveLocalFile = true
  } = config

  taskList = []
  // 前置钩子
  beforeHook && taskList.push(execBeforeHook)
  // 打包
  script && taskList.push(execBuild)
  // 压缩
  taskList.push(buildZip)
  // SSH
  taskList.push(connectSSH)
  // 上传文件
  taskList.push(uploadLocalFile)
  // 远程备份
  bakDir && taskList.push(backupRemoteFile)
  // 远程移除
  isRemoveRemoteFile && taskList.push(removeRemoteFile)
  // 解压
  taskList.push(unzipRemoteFile)
  // 删除本地文件
  isRemoveLocalFile && taskList.push(removeLocalFile)
  // 后置钩子
  afterHook && taskList.push(execAfterHook)
  // 断开
  taskList.push(disconnectSSH)
}

// 执行任务列表
const executeTaskList = async (config) => {
  for (const [index, execute] of new Map(
    taskList.map((execute, index) => [index, execute])
  )) {
    await execute(config, index + 1)
  }
}

module.exports = {
  description: '部署项目',
  apply: async (env) => {
    if (checkDeployConfigExists()) {
      info(`启动部署中...`)
      const config = require(deployConfigPath)
      const cluster = config.cluster
      const currentTime = new Date().getTime()

      const createdEnvConfig = (env) =>
        Object.assign(config[env], {
          readyTimeout: config.readyTimeout
        })

      if (env) {
        const envConfig = createdEnvConfig(env)

        const answers = await confirmDeploy(
          `项目是否部署到服务器地址： ${underline(
            envConfig.host
          )}, 目录： ${underline(envConfig.webDir)}?`
        )

        if (answers.confirm) {
          createTaskList(envConfig)

          await executeTaskList(envConfig)

          succeed(
            `恭喜您，${underline(envConfig.host)}已部署成功 耗时${
              (new Date().getTime() - currentTime) / 1000
            }s\n`
          )
          process.exit(0)
        } else {
          process.exit(1)
        }
      } else if (cluster && cluster.length > 0) {
        const envClusterHostConfig = cluster
          .map((item) => createdEnvConfig(item).host)
          .join(',')
        const answers = await confirmDeploy(
          `项目是否部署到服务器地址： ${underline(envClusterHostConfig)}集群?`
        )

        if (answers.confirm) {
          for (const env of cluster) {
            const envConfig = createdEnvConfig(env)

            createTaskList(envConfig)

            await executeTaskList(envConfig)

            succeed(
              `恭喜您，${underline(envConfig.host)}已部署成功， 耗时${
                (new Date().getTime() - currentTime) / 1000
              }s\n`
            )
          }

          succeed(
            `恭喜您，集群${underline(envClusterHostConfig)}已部署成功，耗时${
              (new Date().getTime() - currentTime) / 1000
            }s\n`
          )
        } else {
          process.exit(1)
        }
      } else {
        error(
          '请使用 nginx-static-deploy-cli -mode 指定部署环境或在配置文件中指定 cluster（集群）地址'
        )
        process.exit(1)
      }
    } else {
      error(
        '🍎🍌deploy.config.js 文件不存，请使用 nginx-static-deploy-cli init 命令创建'
      )
      process.exit(1)
    }
  }
}
