const qs = require("qs");
const React = require('react')
const ReactDOM = require('react-dom')
const decorators = require('bitorjs-decorators');
const Router = require('@bitores/router');
const Application = require('./app/browser');
const directives = require('./directive');
const extend = require('./extends');

let reactRootComponent = null, htmlElementId = null;
const router = new Router();
const _stores = {};

function ReactApplication(options = {}, rootComponent, elementId) {
  Application.call(this, options)

  console.log("挂载 App 至 global对象")
  global.context = this.context;
  console.info("App 应用实例化")
  this.ctx = this.context;
  this.ctx.$config = {}
  this.$config = this.ctx.$config;

  htmlElementId = elementId || "#root";
  reactRootComponent = rootComponent;
  this.handleReact();

  console.info("处理 路由查找中间件")
  this.use((ctx, next) => {
    ctx.params = {}
    let arr = ctx.url.split('?')
    let routes = router.match(arr[0]);
    console.log(routes)
    let route = routes[0];
    if (route) {
      ctx.params = route.params;
      route.handle(ctx, next)
    }
  })
}

extend(Application, ReactApplication);

// export default class extends Application {
//   constructor() {
//     super(options)

//   }

ReactApplication.prototype.handleReact = function () {
  console.info("处理 vue 及 ctx上的渲染及虚拟请求方法")
  this.ctx.render = (webview, props) => {
    this.$react.webview = webview;
    this.$react.webviewprops = props;
    this.$react.setState({
      __update__: true
    })
  }

  React.Component.prototype.$bitor = this;
  React.Component.prototype.reload = this.reload;
  React.Component.prototype.replace = this.replace;
  React.Component.prototype.redirect = this.redirect.bind(this);

  decorators.methods.forEach((method) => {
    // this.ctx[`$${method}`] = // 为了防止view 跨过 controller 层取数据,暂时去掉
    React.Component.prototype[`$${method}`] = (url, params) => {

      let ctx = Object.create(this.ctx);
      ctx.params = {}
      ctx.request = {};
      ctx.query = ctx.request.query = {}
      ctx.request.body = {}
      let urlParts = url.split("?")
      let routes = router.match(urlParts[0], method);
      console.log(routes)
      let route = routes[0];
      if (route && !route.params['0']) {
        ctx.params = route.params;

        if (urlParts[1]) {
          ctx.query = ctx.request.query = Object.assign(ctx.request.query, qs.parse(urlParts[1]))
        }

        if (method === "get") {
          ctx.query = ctx.request.query = Object.assign(ctx.request.query, params);
        } else {// if(method === "post")
          ctx.request.body = Object.assign(ctx.request.body, params);
        }
        return route.handle(ctx)
      } else {
        return Promise.reject(`未找到路由[${url}]`);
      }
    }
  })

}

ReactApplication.prototype.createReactRoot = function (RootComponent, rootElementId) {
  const RootElement = this.createRootElement(this);

  if (RootComponent) {
    ReactDOM.render(React.createElement(RootComponent, null, React.createElement(RootElement, null)), document.querySelector(rootElementId));
  } else {
    ReactDOM.render(React.createElement(RootElement, null), document.querySelector(rootElementId));
  }
}

ReactApplication.prototype.createRootElement = function (app) {
  return class RootElement extends React.Component {
    constructor(props) {
      super(props);
      this.webview = null;
      this.webviewprops = {}
      this.count = 0;
      app.$react = this;
    }
    render() {
      return this.webview ? React.Children.only(React.createElement(this.webview, this.webviewprops)) : ''
    }
  }
}

ReactApplication.prototype._registerRouter = function (path, method, fn) {
  router.register(path, { method }, fn)
}

ReactApplication.prototype._registerFilter = function (filename, filter) {

}

ReactApplication.prototype._registerComponent = function (filename, component) {

}

ReactApplication.prototype._registerStore = function (name, store) {
  const rStore = new store();
  _stores[name] = rStore;
}

ReactApplication.prototype.beforeStart = function () {
  this.createReactRoot(reactRootComponent, htmlElementId)
  this.startServer()
}
// }

module.exports = ReactApplication;