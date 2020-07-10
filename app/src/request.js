const loc = window.location;

function Request(app) {
  this.app = app;
}

Request.prototype = {
  constructor: Request,

  get protocol() {
    return loc.protocol;
  },

  get host() {
    return loc.host;
  },

  get hostname() {
    return loc.hostname;
  },

  get port() {
    return loc.port;
  },

  get href() {
    return loc.href;
  },

  get origin() {
    return loc.origin;
  },

  get pathname() {
    return loc.pathname;
  },

  get search() {
    return loc.search;
  },

  get url() {
    let hash = loc.hash.slice(1);
    return `/${hash}`;
  }
}

module.exports = Request;