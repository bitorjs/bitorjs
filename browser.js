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
    htmlElementId = elementId || "#root";
    vueRootComponent = rootComponent;
    console.info("实例化y应用程序")
    this.ctx = this.context;
    this.ctx.$config = {}
    this.$config = this.ctx.$config;

    this.mountVue();
    this.createDirectives(this, Vue);

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

  mountVue() {
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
      this.ctx[`$${method}`] = Vue.prototype[`$${method}`] = (url, params) => {

        let ctx = Object.create(this.ctx);
        ctx.params = {}
        ctx.query = {}
        ctx.body = {}
        let urlParts = url.split("?")
        let routes = router.match(urlParts[0], method);
        console.log(routes)
        let route = routes[0];
        if (route && !route.params['0']) {
          ctx.params = route.params;

          if (urlParts[1]) {
            ctx.query = Object.assign(ctx.query, qs.parse(urlParts[1]))
          }

          if (method === "get") {
            ctx.query = Object.assign(ctx.query, params);
          } else {// if(method === "post")
            ctx.body = Object.assign(ctx.body, params);
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

  createDirectives(app, Vue) {
    console.info("处理 vue 路由指令")
    directives(app, Vue);
  }

  _registerRouter(path, method, fn) {
    router.register(path, { method }, fn)
  }

  _registerFilter(filename, filter) {
    Vue.filter(filename, filter)
  }

  _registerComponent(filename, component) {
    Vue.component(component.name || filename, component);
  }

  _registerStore(name, store) {
    let vuxStore = new Vuex.Store(store, name);
    this.$store = vuxStore;
    this.context.$store = vuxStore;
  }

  beforeStart() {
    this.$vue = this.createVueRoot(vueRootComponent, htmlElementId)
    this.startServer()
  }
}

export * from "bitorjs-decorators";