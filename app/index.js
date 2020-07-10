const Application = require('koa');
const Inspect = require('./inspect');
Object.assign(Application.prototype, Inspect);
module.exports = Application;