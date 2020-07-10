const Application = require('./src');
const Inspect = require('./inspect');
Object.assign(Application.prototype, Inspect);
module.exports = Application;