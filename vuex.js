let Vue = require('vue');
const Vuex = require('vuex')
const Qs = require('qs');
const { VuexPersistence } = require('vuex-persist')
const extend = require('./extends')

Vue = Vue.default || Vue;
let _namespace = '',
  storeProxy = null,
  commit = null,
  dispatch = null,
  Storeinstance = null;

const vuexLocal = new VuexPersistence({
  storage: window.localStorage
})

function generOption(options) {
  options['mutations'] = options['mutations'] || {}
  options['mutations']['STORE:SET'] = function (state, payload) {
    Vue.set(state, payload.key, payload.value);
  }
  options['mutations']['STORE:ASSIGN'] = function (state, payload) {
    Object.assign(state, payload)
  }
  options['mutations']['STORE:QS'] = function (state, payload) {
    payload = Qs.parse(payload, {
      depth: 10,
      allowDots: true
    });
    Object.assign(state, payload)
  }

  return options;
}

function overrideMethod(instance) {
  commit = instance.commit;
  instance.commit = function (type, payload, options) {
    type = type.split('/').pop()
    commit.call(instance, `${_namespace}${type}`, payload, options) //
  }

  dispatch = instance.dispatch;
  instance.dispatch = function (type, payload) {
    dispatch.call(instance, `${_namespace}${type}`, payload)
  }
}

function genGetterProxy(getters) {
  return new Proxy(getters, {
    get: function (obj, prop) {
      return obj[`${_namespace}${prop}`];
    }
  })
}

function genProxy(instance) {
  const proxy = new Proxy(instance, {
    get: function (obj, prop) {
      if (prop in obj) {
        return prop === 'getters' ? genGetterProxy(obj[prop]) : obj[prop];
      } else {
        _namespace = prop === 'root' ? '' : `${prop}/`;
        return proxy;
      }
    }
  })

  return proxy;
}

function Store(options = {}, namespace) {
  options = generOption(options)
  if (Storeinstance == null) {
    const instance = new Vuex.Store(generOption({
      plugins: [vuexLocal.plugin]
    }))

    overrideMethod(instance)
    storeProxy = genProxy(instance);

    // Vue.prototype.$store = instance;
    Storeinstance = instance;
  }

  options.namespaced = true;
  Storeinstance.registerModule(namespace, options);

  return storeProxy;
}

extend(Vuex.Store, Store);
// class Store extends Vuex.Store {
//   constructor() {

//   }

Store.prototype.setItem = function (key, value) {
  commit(`${_namespace}STORE:SET`, {
    key,
    value
  })
  _namespace = ''
}

Store.prototype.assign = function (payload) {
  commit(`${_namespace}STORE:ASSIGN`, payload)
  _namespace = ''
}

Store.prototype.qs = function (payload) {
  commit(`${_namespace}STORE:QS`, payload)
  _namespace = ''
}
// }

Object.assign(Vuex.Store, Store)

Vuex.NewStore = Store;
Vue.use(Vuex);
module.exports = Vuex;