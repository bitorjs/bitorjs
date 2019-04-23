import Vue from 'vue';
import Vuex from 'vuex'
import Qs from 'qs';
import VuexPersistence from 'vuex-persist'

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


class Store extends Vuex.Store {
  constructor(options = {}, namespace) {
    options = generOption(options)
    if (Storeinstance == null) {
      const instance = super(generOption({
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

  setItem(key, value) {
    commit(`${_namespace}STORE:SET`, {
      key,
      value
    })
    _namespace = ''
  }

  assign(payload) {
    commit(`${_namespace}STORE:ASSIGN`, payload)
    _namespace = ''
  }

  qs(payload) {
    commit(`${_namespace}STORE:QS`, payload)
    _namespace = ''
  }
}

Vuex.Store = Store;
Vue.use(Vuex);
export default Vuex;