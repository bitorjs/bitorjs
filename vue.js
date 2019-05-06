import Application from './app/browser';

import Vue from 'vue'
import decorators from 'bitorjs-decorators';
import Router from 'bitorjs-router';
import directives from './directive';
import Vuex from './vuex';
import qs from "qs";

let vueRootComponent = null, htmlElementId = null;
const router = new Router();
export default class extends Application {
  constructor(options = {}, rootComponent, elementId) {
    super(options)
    console.log("挂载 App 至 global对象")
    global.context = this.context;
    console.info("App 应用实例化")
    this.ctx = this.context;
    this.ctx.$config = {}
    this.$config = this.ctx.$config;

    htmlElementId = elementId || "#root";
    vueRootComponent = rootComponent;
    this.handleVue();

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

  handleVue() {
    console.info("处理 vue 路由指令")
    directives(this, Vue);
    console.info("处理 vue 及 ctx上的渲染及虚拟请求方法")
    Vue.prototype.ctx = this.ctx;
    this.ctx.render = (webview, props, isTop = false) => {
      props = props || {}
      props.ref = 'innerPage';
      this.$vue.webview = webview;
      this.$vue.props = props;
      this.$vue.__update = 0;
    }
    decorators.methods.forEach((method) => {
      // this.ctx[`$${method}`] = // 为了防止view 跨过 controller 层取数据,暂时去掉
      Vue.prototype[`$${method}`] = (url, params) => {

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

  createVueRoot(vueRootComponent, htmlElementId) {
    console.info("挂载 vue 到 DOM")
    const innerPage = {
      name: 'router-view',
      render(h) {
        let vn = null;
        if (Object.prototype.toString.call(this.$root.webview) === '[object String]') {
          vn = h('span', this.$root.webview, {
            props: this.$root.props,
            ref: '_upvn'
          });
        } else {
          vn = h(this.$root.webview, {
            props: this.$root.props,
            ref: '_upvn'
          });
        }

        // console.log()
        this.$root._upvn = vn.context && vn.context.$refs._upvn;
        return vn;
      }
    }

    Vue.component(innerPage.name, innerPage);

    return new Vue({
      el: htmlElementId,
      data() {
        return {
          webview: null,
          props: null
        }
      },
      render: h => h(vueRootComponent ? vueRootComponent : innerPage)
    })
  }

  _registerRouter(path, method, fn) {
    router.register(path, { method }, fn)
  }

  _registerFilter(filename, filter) {
    Vue.filter(filename, filter)
    Vue.prototype.$filter = Vue.prototype.$filter || Object.create(null)
    this.$filter = this.$filter || Object.create(null);
    this.ctx.$filter = this.ctx.$filter || Object.create(null);
    this.$filter[filename] = filter;
    this.ctx.$filter[filename] = filter;
    Vue.prototype.$filter[filename] = filter;
  }

  _registerComponent(filename, component) {
    Vue.component(component.name || filename, component);
  }

  _registerStore(name, store) {
    let vuxStore = new Vuex.Store(store, name);
    this.$store = vuxStore; // app.$store 入口文件
    this.context.$store = vuxStore; // ctx.$store
    Vue.prototype.$store = vuxStore; // view 中 this.$store
  }

  beforeStart() {
    this.$vue = this.createVueRoot(vueRootComponent, htmlElementId)
    this.startServer()
  }
}