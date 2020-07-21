const qs = require("qs");
const KoaRouter = require('koa-router');
const decorators = require('bitorjs-decorators');
const Application = require('./app');


const router = new KoaRouter();

class KoaApplication extends Application {

  constructor() {
    super()
    console.log("挂载 App 至 global对象")
    global.context = this.context;
    console.info("App 应用实例化")
    this.ctx = this.context;
    this.context.$config = {}
    this.$config = this.context.$config;

    // node 是发起的内部请求 未验证bug
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
    this.$filter = this.$filter || Object.create(null);
    this.ctx.$filter = this.ctx.$filter || Object.create(null);
    this.$filter[filename] = filter;
    this.ctx.$filter[filename] = filter;
  }

  _registerComponent(filename, component) {

  }

  _registerStore(name, store) {
    if (this.$config.redis && this.$config.redis.enable) {

      if (Object.prototype.toString.call(this.$store) !== '[object Object]') {
        let redis = require("redis"),
          client = redis.createClient();
        client.on("error", function (err) {
          console.log("Error " + err);
        });
        this.$store = this.$store || {
          client: client
        };
        this.context.$store = this.$store;



      }
      let client = this.$store.client;
      this.$store[name] = new Proxy(client, {
        get: (target, key, re) => {
          return new Promise((resolve, reject) => {
            target.get(`${name}-${key}`, (err, replay) => {
              if (err) {
                reject(err);
              } else {
                resolve(replay);
              }
            })
          })
        },
        set: (target, key, value) => {
          return new Promise((resolve, reject) => {
            target.set(`${name}-${key}`, value, (err, replay) => {
              if (err) {
                reject(err);
              } else {
                resolve(replay);
              }
            })
          })
        },
      })

      // this.$store[name] = {
      //   set: (key, value) => {
      //     return new Promise((resolve, reject) => {
      //       client.set(`${name}-${key}`, value, (err, replay) => {
      //         if (err) {
      //           reject(err);
      //         } else {
      //           resolve(replay);
      //         }
      //       })
      //     })
      //   },
      //   get: (key) => {
      //     return new Promise((resolve, reject) => {
      //       client.get(`${name}-${key}`, (err, replay) => {
      //         if (err) {
      //           reject(err);
      //         } else {
      //           resolve(replay);
      //         }
      //       })
      //     })
      //   }
      // }

      Object.keys(store).map(key => {
        // this.$store[name].set(key, store[key]);
        this.$store[name][key] = store[key];
      })
    }

  }

  beforeStart(port = 1030, enListen = true) {
    this.use(router.routes())
    if(enListen) {
      this.listen(port, () => {
        console.log(`server is running at http://localhost:${port}`)
      });
    }
    
  }

}

module.exports = KoaApplication;