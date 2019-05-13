
import compose from 'koa-compose';
import decorators from 'bitorjs-decorators';
import HashMap from './hashmap';


const _modules = [];
const _filters = new Map();
const _services = new Map();
const _webstore = new Map();
const _middlewares = new Map();

const _configHashMap = new HashMap();
const _componentHashMap = new HashMap();
const _filterHashMap = new HashMap();
const _webstoreHashMap = new HashMap();

const _controllerHashMap = new HashMap();
const _middlewareHashMap = new HashMap();
const _serviceHashMap = new HashMap();
const _mockHashMap = new HashMap();


export default {

  registerFilter(filename, filter) {
    if (_filters.get(filename) === undefined) {
      _filters.set(filename, filter)
      // Vue.filter(filename, filter)
      this._registerFilter && this._registerFilter(filename, filter)
    } else {
      throw new Error(`Fliter [${filename}] has been declared`)
    }
  },

  registerService(filename, allService) {
    let serviceName = undefined;
    const defaultService = allService.default;
    this.context.$service = this.context.$service || {};
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
      this.context.$service[serviceName] = instance;
    }

    // delete allService.default;
    let extraServices = Object.keys(allService).filter(k => k !== "default");
    if (extraServices.length > 0) {
      if (serviceName !== undefined) {
        this.context.$service[serviceName] = {};
      }
      extraServices.forEach(key => {
        let extraService = allService[key];
        this.context.$service[serviceName][key] = extraService.bind(this.context);
      })
    }
  },


  registerController(filename, controller) {
    const instance = new controller(this.context)
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
      prefix.path = prefix.path[0] === '/' ? prefix.path[0] : `/${prefix.path}`;
      subroute.path = subroute.path[0] === '/' ? subroute.path[0] : `/${subroute.path}`;

      let path;
      if (prefix.path && prefix.path.length > 1) {
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
          async (ctx, next) => {
            ctx.body = undefined;
            await instance[subroute.prototype].call(instance, ctx, next);
            return ctx.body;
          }
        )

        const fn = compose(controllerMiddlewares);
        this._registerRouter(path, subroute.method.toLowerCase(), fn)
      } else {
        this._registerRouter(path, subroute.method.toLowerCase(), async (ctx, next) => {
          ctx.body = undefined;
          await instance[subroute.prototype].call(instance, ctx, next);
          return ctx.body;
        })
      }
    })
  },

  registerStore(name, store) {
    if (_webstore.get(name) === undefined) {
      _webstore.set(name, store)
      this._registerStore && this._registerStore(name, store)
    } else {
      throw new Error(`Store [${name}] has been declared`)
    }

  },

  registerComponent(filename, component) {
    if (!(component instanceof Object)) {
      throw new TypeError('Component must be Vue instance')
    }
    this._registerComponent && this._registerComponent(filename, component)
    // Vue.component(component.name || filename, component);
  },



  registerMiddleware(filename, middleware) {
    if (_middlewares.get(filename) === undefined) {
      _middlewares.set(filename, middleware);
    } else {
      throw new Error(`Middleware [${filename}] has been declared`)
    }
  },

  registerMainClient(mainClient) {
    console.info("挂载根插件")
    mainClient(this);
    this.emit("did-mainclient")
  },

  watch(requireContext, isConfig = false) {
    console.info("分析收集插件目录")
    return requireContext.keys().map(key => {
      console.log(key)
      let m = requireContext(key);
      let c = m.default || m;
      let filename = key.replace(/(.*\/)*([^.]+).*/ig, "$2");
      if (key.match(/\/components?\/.*\.vue$/) != null) {
        _componentHashMap.set(filename, c)
      } else if (key.match(/\/filters?\/.*\.jsx?$/) != null) {
        _filterHashMap.set(filename, c)
      } else if (key.match(/\/middlewares?\/.*\.jsx?$/) != null) {
        _middlewareHashMap.set(filename, c)
      } else if (key.match(/\/controllers?\/.*\.jsx?$/) != null || key.match(/\/routes?\/.*\.jsx?$/) != null || key.match(/\/routers?\/.*\.jsx?$/) != null) {
        _controllerHashMap.set(filename, c)
      } else if (key.match(/\/services?\/.*\.jsx?$/) != null) {
        _serviceHashMap.set(filename, m)
      } else if (key.match(/\/mocks?\/.*\.jsx?$/) != null) {
        _mockHashMap.set(filename, m)
      } else if (key.match(/\/stores?\/.*\.jsx?$/) != null) {
        _webstoreHashMap.set(filename, c)
      } else if (key.match(/\/plugins?\.env\.jsx?$/) != null) {
        c.forEach(item => {
          if (item.enable === true) _modules.push(item);
        })
      } else if (key.match(/\/dev\.env\.jsx?$/) != null) {
        _configHashMap.set(filename, c)
        // if (process.env.NODE_ENV !== 'production') {
        //   this.$config = Object.assign(this.$config, c)
        //   this.$config.env = 'development';
        // }
      } else if (key.match(/\/prod\.env\.jsx?$/) != null) {
        _configHashMap.set(filename, c)
        // if (process.env.NODE_ENV === 'production') {
        //   this.$config = Object.assign(this.$config, c)
        //   this.$config.env = 'production';
        // }
      } else if (key.match(/\/index\.env\.jsx?$/) != null) {
        this.$config = Object.assign(this.$config, c)
      } else if (key.match(/\/index\.jsx?$/) != null && isConfig) {
        this.$config = Object.assign(this.$config, c);
      }
    })
  },

  config(requireContext) {
    this.watch(requireContext, true);
  },

  start(client, port = 1030) {

    this.registerMainClient(client)

    let devConifg = _configHashMap.get('dev');
    let prodConfig = _configHashMap.get('prod');
    if (devConifg || prodConfig) {
      if (this.$config.env == 'production') {
        if (prodConfig) {
          this.$config = Object.assign(this.$config, prodConfig[0])
        }
      } else {
        this.$config.env = 'development';
        if (devConifg) {
          this.$config = Object.assign(this.$config, devConifg[0])
        }
      }
    }

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
        this.registerService(filename, m)
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
    this.emit('ready');
    this.beforeStart(port);
    console.info("启动监听服务")
    return this;
  }
}