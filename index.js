import Application from './app';

import KoaRouter from 'koa-router';
import decorators from 'bitorjs-decorators';
import compose from 'koa-compose';
import HashMap from './hashmap';
import qs from "qs";

const _modules = [];
const _filters = new Map();
const _services = new Map();
const _webstore = new Map();
const _middlewares = new Map();

const _componentHashMap = new HashMap();
const _filterHashMap = new HashMap();
const _webstoreHashMap = new HashMap();

const _controllerHashMap = new HashMap();
const _middlewareHashMap = new HashMap();
const _serviceHashMap = new HashMap();
const _mockHashMap = new HashMap();

const router = new KoaRouter();
export default class extends Application {
  constructor(options = {}) {
    super(options)
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

  registerFilter(filename, filter) {
    if (_filters.get(filename) === undefined) {
      _filters.set(filename, filter)
      // Vue.filter(filename, filter)
    } else {
      throw new Error(`Fliter [${filename}] has been declared`)
    }
  }

  registerService(filename, allService) {
    let serviceName = undefined;
    const defaultService = allService.default;
    if (defaultService) {
      // console.log(allService, defaultService)
      let instance;
      try {
        instance = new defaultService(this.context);
        instance.ctx = this.context;
      } catch (error) {
        console.log(defaultService, error)
      } finally {
        // console.log(defaultService.constructor)
      }

      let name = decorators.getService(defaultService);
      if (name) {
        serviceName = name;
        if (_services.has(serviceName)) {
          throw new Error(`Service [${serviceName}] has been declared`)
        }
      } else {
        serviceName = filename;
        if (_services.has(serviceName)) {
          throw new Error(`Service [${serviceName}] has been declared`)
        } else {
          console.warn('Service ', serviceName, 'use @Service(name)')
        }
      }

      _services.set(serviceName, defaultService)
      this.context.$service = this.context.$service || {};
      this.context.$service[serviceName] = instance;
    }

    delete allService.default;
    let extraServices = Object.keys(allService);
    if (extraServices.length > 0) {
      if (serviceName !== undefined) {
        this.context.$service[serviceName] = {};
      }
      extraServices.forEach(key => {
        let extraService = allService[key];
        extraService.bind(this.context);
        this.context.$service[serviceName][key] = extraService;
      })
    }
  }

  registerController(filename, controller) {
    const instance = new controller(this.context);
    instance.ctx = this.context;

    let controllMiddlewares = decorators.getMiddleware(controller);
    controllMiddlewares = controllMiddlewares || [];
    controllMiddlewares.reverse();

    const preMiddlewares = [];
    for (let index = 0; index < controllMiddlewares.length; index++) {
      let middleware = controllMiddlewares[index];
      if (Object.prototype.toString.call(middleware) === "[object String]") {
        if (_middlewares.has(middleware)) preMiddlewares.push(_middlewares.get(middleware));
      } else {
        // 直接注入中间件函数
        preMiddlewares.push(middleware)
      }
    }

    decorators.iterator(controller, (prefix, subroute) => {
      let path;
      if (prefix.path && prefix.path.length > 1) { //:   prefix='/'
        subroute.path = subroute.path === '/' ? '(/)?' : subroute.path;
        subroute.path = subroute.path === '*' ? '(.*)' : subroute.path;
        path = `${prefix.path}${subroute.path}`
      } else {
        path = `${subroute.path}`
      }
      console.log(path)
      let middlewares = decorators.getMiddleware(instance, subroute.prototype)
      middlewares = middlewares || [];
      middlewares.reverse();

      if (middlewares.length > 0 || preMiddlewares.length > 0) {
        let controllerMiddlewares = [].concat(preMiddlewares);
        for (let index = 0; index < middlewares.length; index++) {
          let middleware = middlewares[index];
          if (Object.prototype.toString.call(middleware) === "[object String]") {
            if (_middlewares.has(middleware)) controllerMiddlewares.push(_middlewares.get(middleware));
          } else {
            // 直接注入中间件函数
            controllerMiddlewares.push(middleware)
          }
        }

        controllerMiddlewares.push(
          instance[subroute.prototype].bind(instance)
        )

        const fn = compose(controllerMiddlewares);
        router[subroute.method.toLowerCase()](path, fn)
      } else {
        router[subroute.method.toLowerCase()](path, instance[subroute.prototype].bind(instance))
      }
    })
  }

  registerStore(name, store) {
    if (_webstore.get(name) === undefined) {
      _webstore.set(name, store)
      // let vuxStore = new Vuex.Store(store, name);
      // this.$store = vuxStore;
      // this.ctx.$store = vuxStore;
    } else {
      throw new Error(`Store [${name}] has been declared`)
    }

  }

  registerMiddleware(filename, middleware) {
    if (_middlewares.has(filename) === false) {
      _middlewares.set(filename, middleware);
    } else {
      throw new Error(`Middleware [${filename}] has been declared`)
    }
  }

  registerComponent(filename, component) {
    if (!(component instanceof Object)) {
      throw new TypeError('Component must be Vue instance')
    }

    // Vue.component(component.name || filename, component);
  }

  beforeStart() {
    this.use(router.routes())
  }

  registerMainClient(mainClient) {
    console.info("挂载根插件")
    mainClient(this);
    this.emit("did-mainclient")
  }

  watch(requireContext) {
    console.info("分析收集插件目录")
    return requireContext.keys().map(key => {
      console.log(key)
      let m = requireContext(key);
      let c = m.default || m;
      let filename = key.replace(/(.*\/)*([^.]+).*/ig, "$2");
      if (key.match(/\/component\/.*\.vue$/) != null) {
        _componentHashMap.set(filename, c)
      } else if (key.match(/\/filter\/.*\.js$/) != null) {
        _filterHashMap.set(filename, c)
      } else if (key.match(/\/middleware\/.*\.js$/)) {
        _middlewareHashMap.set(filename, c)
      } else if (key.match(/\/controller.*\.js$/)) {
        _controllerHashMap.set(filename, c)
      } else if (key.match(/\/service\/.*\.js$/) != null) {
        _serviceHashMap.set(filename, m)
      } else if (key.match(/\/mock\/.*\.js$/) != null) {
        _mockHashMap.set(filename, m)
      } else if (key.match(/\/plugin\.config\.js$/) != null) {
        c.forEach(item => {
          if (item.enable === true) _modules.push(item);
        })
      } else if (key.match(/\/development\.config\.js$/) != null) {
        if (process.env.NODE_ENV !== 'production') {
          this.$config = Object.assign(this.$config, c)
          this.$config.env = 'development';
        }
      } else if (key.match(/\/production\.config\.js$/) != null) {
        if (process.env.NODE_ENV === 'production') {
          this.$config = Object.assign(this.$config, c)
          this.$config.env = 'production';
        }
      } else if (key.match(/\/app\.config\.js$/) != null) {
        this.$config = Object.assign(this.$config, c)
      }
    })
  }

  config(config) {
    this.$config = Object.assign(this.$config, config)
  }

  start(client, port = 1029) {

    this.registerMainClient(client)

    console.info("挂载其它插件")
    _modules.forEach(m => {
      console.info("插件-", m.name)
      m.module(this, m)
    })
    this.emit('AppDidSetup')
    console.info("配置分析完成")
    console.info("注册所有全局组件")
    _componentHashMap.forEach((m, filename) => {
      this.registerComponent(filename, m);
    })
    console.info("注册所有过滤器")
    _filterHashMap.forEach((m, filename) => {
      this.registerFilter(filename, m);
    })
    console.info("注册所有存储服务")
    _webstoreHashMap.forEach((m, filename) => {
      this.registerStore(filename, m)
    })
    console.info("注册所有中间件")
    _middlewareHashMap.forEach((m, filename) => {
      this.registerMiddleware(filename, m);
    })
    console.info("注册所有实际请求服务")
    if (this.$config && this.$config.mock !== true) {
      _serviceHashMap.forEach((m, filename) => {
        this.registerService(filename, m);
      })
    } else {
      _mockHashMap.forEach((m, filename) => {
        this.registerService(filename, m)
      })
    }
    console.info("注册所有请求路由控制器")
    this.emit("ControllerWillMount")
    _controllerHashMap.forEach((m, filename) => {
      this.registerController(filename, m)
    })
    this.emit("ControllerMounted")
    this.beforeStart()
    this.emit('ready');
    console.info("启动监听服务")
    this.listen(port, () => {
      console.log(`server is running at http://localhost:${port}`)
    });

    return this;
  }

}

export * from "bitorjs-decorators";

