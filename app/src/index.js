const EventEmitter = require('events');
const compose = require('koa-compose');
const HashHistory = require('@bitores/hashhistory');
const Context = require('./context');
const Request = require('./request');
const extend = require('../../extends');

function Application(option) {
  EventEmitter.call(this);
  option = option || {}
  this.beforeRouteMiddleware = [];
  this.afterRouteMiddleware = [];
  this.middleware = [];
  this.req = new Request(this);
  this.context = new Context(this, this.req)
  this.mode = option.mode || "hash";
  this.hashHistory = new HashHistory(this.mode);
}

extend(EventEmitter, Application);


// class Application extends EventEmitter {

//   constructor(option) {
//     super()

//   }

Application.prototype.startServer = function () {
  this.hashHistory.listen(this.callback())
}

Application.prototype.callback = function () {
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

Application.prototype.handle_request = function (context, fnMiddleware) {
  return fnMiddleware(context).then(() => {
    this.emit('request-end');
    console.log('request end')
  });
}

// for middleware
Application.prototype.use = function (fn) {
  if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
  this.middleware.push(fn);
  return this;
}

Application.prototype.beforeEach = function (fn) {
  if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
  this.beforeRouteMiddleware.push(fn);
  return this;
}

Application.prototype.afterEach = function (fn) {
  if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
  this.afterRouteMiddleware.push(fn);
  return this;
}

Application.prototype.filter = function (callback, to) {
  const beFn = compose(this.beforeRouteMiddleware.concat([callback]));
  this.context.from = this.hashHistory.url;
  this.context.to = to;
  this.context.url = to;
  return beFn(this.context).then(() => {
    console.log('beforefilter end')
  })
}

// for history
Application.prototype.back = function () {
  let his = this.hashHistory.history,
    pointer = this.hashHistory.pagePointer;
  this.filter(() => {
    this.hashHistory.back();
  }, his[pointer - 1]);
}

Application.prototype.forward = function () {
  let his = this.hashHistory.history,
    pointer = this.hashHistory.pagePointer;
  this.filter(() => {
    this.hashHistory.forward()
  }, his[pointer + 1])
}

Application.prototype.go = function (step) {
  this.filter(() => {
    this.hashHistory.go(step)
  })
}

Application.prototype.reload = function () {
  this.filter(() => {
    this.hashHistory.reload()
  }, this.context.url)
}

Application.prototype.replace = function (...args) {
  this.filter(() => {
    this.hashHistory.replace(...args);
  }, ...args)
}

Application.prototype.redirect = function (...args) {
  this.filter(() => {
    this.hashHistory.redirect(...args);
  }, ...args)
}
// }

// export default Application;

module.exports = Application;