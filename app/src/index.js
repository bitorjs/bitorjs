import EventEmitter from 'events';
import compose from 'koa-compose';
import HashHistory from '@bitores/hashhistory';
import Context from './context';
import Request from './request';

class Application extends EventEmitter {

  constructor(option) {
    super()
    option = option || {}
    this.beforeRouteMiddleware = [];
    this.afterRouteMiddleware = [];
    this.middleware = [];
    this.req = new Request(this);
    this.context = new Context(this, this.req)
    this.mode = option.mode || "hash";
    this.hashHistory = new HashHistory(this.mode);
  }

  startServer() {
    this.hashHistory.listen(this.callback())
  }

  callback() {
    const fn = compose([].concat(this.beforeRouteMiddleware, this.middleware, this.afterRouteMiddleware));
    return (url) => {
      let to = url;
      let from = this.context.url;
      this.context.from = from;
      this.context.to = to;
      this.context.url = to;
      return this.handle_request(this.context, fn);
    }
  }

  handle_request(context, fnMiddleware) {
    return fnMiddleware(context).then(() => {
      this.emit('request-end');
      console.log('request end')
    });
  }

  // for middleware
  use(fn) {
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
    this.middleware.push(fn);
    return this;
  }

  beforeEach(fn) {
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
    this.beforeRouteMiddleware.push(fn);
    return this;
  }

  afterEach(fn) {
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
    this.afterRouteMiddleware.push(fn);
    return this;
  }

  filter(callback, to) {
    const beFn = compose(this.beforeRouteMiddleware.concat([callback]));
    this.context.from = this.hashHistory.url;
    this.context.to = to;
    this.context.url = to;
    return beFn(this.context).then(() => {
      console.log('beforefilter end')
    })
  }

  // for history
  back() {
    let his = this.hashHistory.history,
      pointer = this.hashHistory.pagePointer;
    this.filter(() => {
      this.hashHistory.back();
    }, his[pointer - 1]);
  }

  forward() {
    let his = this.hashHistory.history,
      pointer = this.hashHistory.pagePointer;
    this.filter(() => {
      this.hashHistory.forward()
    }, his[pointer + 1])
  }

  go(step) {
    this.filter(() => {
      this.hashHistory.go(step)
    })
  }

  reload() {
    this.filter(() => {
      this.hashHistory.reload()
    }, this.context.url)
  }

  replace(...args) {
    this.filter(() => {
      this.hashHistory.replace(...args);
    }, ...args)
  }

  redirect(...args) {
    this.filter(() => {
      this.hashHistory.redirect(...args);
    }, ...args)
  }
}

export default Application;