import Application from './app';

import KoaRouter from 'koa-router';
import decorators from 'bitorjs-decorators';
import qs from "qs";

const router = new KoaRouter();
export default class extends Application {

  constructor() {
    super()
    console.log("挂载 App 至 global对象")
    global.context = this.context;
    console.info("App 应用实例化")
    this.context.$config = {}
    this.$config = this.context.$config;

    decorators.methods.forEach((method) => {
      this.context[`$${method}`] = (url, params) => {

        const request = {};
        request.params = {}
        request.query = {}
        request.body = {}
        let urlParts = url.split("?")
        let routes = router.match(urlParts[0], method);
        console.log(routes, this)
        let route = routes.path[0];
        if (route) {
          //   request.params = route.params;

          if (urlParts[1]) {
            request.query = Object.assign(request.query, qs.parse(urlParts[1]))
          }

          if (method === "get") {
            request.query = Object.assign(request.query, params);
          } else {//if(method === "post")
            request.body = Object.assign(request.body, params);
          }
          return route.stack[0](this.context)
        } else {
          return Promise.reject(`未找到路由[${url}]`);
        }
      }
    })
  }

  _registerRouter(path, method, fn) {
    console.log(method, path)
    router[method](path, fn)
  }

  _registerFilter(filename, filter) {

  }

  _registerComponent(filename, component) {

  }

  _registerStore(name, store) {

  }

  beforeStart(port = 1030) {
    this.use(router.routes())
    this.listen(port, () => {
      console.log(`server is running at http://localhost:${port}`)
    });
  }

}

export * from "bitorjs-decorators";

