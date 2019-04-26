# bitorjs


### 安装
> npm i -S bitorjs

### 使用
```javascript
import bitorjs from 'bitorjs';

new bitorjs([options, root, id]).start((app, options)=>{
  app.on('ready', ()=>{

  })
  app.watch(require.context("./config", true, /.*\.js$/));
  app.watch(require.context("./app", true, /.*\.js$/));
}[,port=1030])
```



###  babel 参考配置
- 依赖插件
```json
{
  "@babel/core": "^7.4.0",
  "@babel/plugin-proposal-class-properties": "^7.4.0",
  "@babel/plugin-proposal-decorators": "^7.4.0",
  "@babel/plugin-proposal-export-default-from": "^7.2.0",
  "@babel/plugin-proposal-export-namespace-from": "^7.2.0",
  "@babel/plugin-proposal-object-rest-spread": "^7.4.0",
  "@babel/plugin-syntax-dynamic-import": "^7.2.0",
  "@babel/plugin-syntax-export-namespace-from": "^7.2.0",
  "@babel/plugin-syntax-object-rest-spread": "^7.2.0",
  "@babel/plugin-transform-spread": "^7.2.2",
  "@babel/preset-env": "^7.4.2",
  "babel-loader": "^8.0.5",
}
```
- babelrc 
```javascript
module.exports = {
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "node": "current",
        },
        "modules": 'commonjs',
        debug: true,
        "useBuiltIns": false
      }
    ]
  ],
  "plugins": [
    [
      "@babel/plugin-proposal-decorators",
      {
        "legacy": true
      }
    ],
    "@babel/plugin-proposal-export-default-from",
    "@babel/plugin-proposal-export-namespace-from",
    "@babel/plugin-syntax-export-namespace-from",
    "@babel/plugin-syntax-dynamic-import",
    "@babel/plugin-transform-spread",
    "@babel/plugin-syntax-object-rest-spread",
    ["@babel/plugin-proposal-object-rest-spread", {
      "loose": true,
      "useBuiltIns": true
    }],
    [
      "@babel/plugin-proposal-class-properties",
      {
        "loose": true
      }
    ]
  ]
}

```

### API
- 实例方法
```javascript
app {
-  start
-  watch
-  $config
-  $service
-  $store.state.[name].key // for vuejs
-  $store[name].get|set  // for nodejs
-  context: {
-     $store
-  }
}
```



- 常用注解
```javascript
import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Middleware,
  Service
} from 'bitorjs';
```