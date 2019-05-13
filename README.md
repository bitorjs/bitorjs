# bitorjs

> bitorjs 可以帮助开发者更好地在 VUE & NODE 项目中快速集成插件式开发等功能

### 使用方法见[文档](https://bitorjs.github.io/)

### 安装
> npm i -S bitorjs


### Bitorjs 做了什么

- 统一了项目目录划分
- 统一了配置方式
- 统一了中间件定义及使用
- 统一的 service 及 Mock
- 统一采用 webpack 去中心化 require.context 进行目录监听
- 统一使用注解进行路由注入
- 统一使用 webpack 进行代码处理

### 为什么要选择 Bitorjs

- 让项目迅速具有插件式插件功能
- 让你使用注解式路由
- 可与 node 开发统一开发习惯
- 增加前端 中间件 功能
- service 与 mock 切换更方便

以上功能是能想到的, 更多功能及作用等你解锁

# vue中使用

##### 创建 项目

使用 vue 官方脚手架 vue-cli

```
  $ vue init webpack xxx
```

##### 安装依赖

```
  $ npm install -S bitorjs
  $ npm install -S vuex vuex-persist
  $ npm install -D babel-plugin-transform-decorators-legacy


  and add the following line to your .babelrc file:
  {
    "plugins": ["transform-decorators-legacy"]
}
```

##### 修改

1. 创建文件 config/index.env.js
2. 修改文件 src/main.js
3. ```
    // The Vue build version to load with the `import` command
    // (runtime-only or standalone) has been set in webpack.base.conf with an alias.
    import Vue from 'vue'
    import Application from 'bitorjs/vue';
    import App from './App'

    Vue.config.productionTip = false

    new Application({}, App, "#app").start(app => {
      app.watch(require.context('../config', false, /\.js$/))
      app.watch(require.context('.', true, /^((?!\/view\/).)+\.(vue|js)$/));
    })
         
   ```

4. 修改文件 src/router/index.js
5. ```
    import {
      Get,
      Controller
    } from 'bitorjs'

    import HelloWorld from '@/components/HelloWorld'

    @Controller('/')
    export default class {
      @Get('/')
      async index(ctx){
        ctx.render(HelloWorld)
      }
    }
   ```

到此, 改造完毕, 接下来,你就可以 开启 bitorjs 之旅
