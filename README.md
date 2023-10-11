## nginx-static-deploy-cli

前端nginx静态文件一键自动化部署。

![Image text](https://github.com/lqPrototype/nginx-static-deploy-cli/blob/master/sc.png)


## 使用

```
npm install -g nginx-static-deploy-cli

```

## 初始化

```
nginx-static-deploy-cli init | i

```

## 部署

```javascript
nginx-static-deploy-cli deploy | d --mode test

```

> --mode test 和 deploy.config.js test映射


## 配置文件

```javascript
module.exports = {
  readyTimeout: 2000,
  cluster: [], // 集群
  // 测试环境
  test: {
    script: "npm run build", // 打包命令
    host: "171.18.0.93", // 服务器地址
    username: "root", // 服务器登录用户名
    port: "22",
    password: "", // 服务器登录密码
    distPath: "dist", // 本地打包生成目录
    // 部署之前钩子
    beforeHook() {
      return "git checkout dev && git tag -a v1.1 -m '2023_10_10' && git push origin v1.1";
    },
    // 部署之后钩子
    afterHook() {
      return "git checkout dev";
    },
    webDir: "/data/zh/pc", // 服务器部署路径
    bakDir: "/data/zh/pc_backup", // 备份路径
    isRemoveRemoteFile: true, // 是否删除远程文件（默认true）
    isRemoveLocalFile: true, // 是否删除本地文件（默认true）
  },
};


```

## 备注

> .gitignore 添加 deploy.config.js
