const fs = require('fs')
const childProcess = require('child_process')
const {
  checkDeployConfigExists,
  succeed,
  error,
  log,
  underline
} = require('../utils')
const { deployConfigPath } = require('../config')

/**
 * @date 2023-10-09 星期一
 * @function 默认写入配置模版
 * @param {}
 * @return {}
 */
const writeCode = function (code, filename = deployConfigPath, showLog = true) {
  fs.writeFileSync(filename, code)
  if (showLog) {
    succeed(`write code to ${filename} success!`)
  }
}

/**
 * 格式化
 * @date 2023-10-09 星期一
 * @function
 * @param {}
 * @return {}
 */
const formatConfigFile = () =>
  childProcess.execSync(`npx prettier --write ${deployConfigPath}`)

/**
 * 获取模版文件
 * @date 2023-10-09 星期一
 * @function
 * @param {}
 * @return {}
 */
const getTemplateContent = () => {
  const code = `module.exports = {
    readyTimeout: 2000,
    cluster: [], // 集群
    // 测试环境
    test: {
      script: 'npm run build', // 打包命令
      host: '192.168.0.1', // 服务器地址
      port: '22',
      username: 'root', // 服务器登录用户名
      password: '123456', // 服务器登录密码
      distPath: 'dist', // 本地打包生成目录
      // 部署之前钩子
      beforeHook() {
        return 'git checkout master &&  git merege dev'
      },
      // 部署之后钩子
      afterHook() {
        return 'git checkout dev'
      },
      webDir: '/usr/local/nginx/html', // 服务器部署路径（不可为空或'/'）
      bakDir: '/usr/local/nginx/backup', // 备份路径 (打包前备份之前部署目录 最终备份路径为 /usr/local/nginx/backup/html.zip)
      isRemoveRemoteFile: true, // 是否删除远程文件（默认true）
      isRemoveLocalFile: true, // 是否删除本地文件（默认true)
    }
  }`

  writeCode(code)
  formatConfigFile()
}

module.exports = {
  description: '初始化项目',
  apply: () => {
    if (checkDeployConfigExists()) {
      error('🍎🍌deploy.config.js 配置文件已存在')
      process.exit(1)
    } else {
      getTemplateContent()
      succeed(
        `配置文件生成成功，请查看项目目录下的 ${underline(
          'deploy.config.js'
        )} 文件确认配置是否正确`
      )
      process.exit(0)
    }
  }
}
