module.exports = function (app, request) {
  this.app = app;
  this.req = request;
  this.to = undefined;
  this.from = undefined;
  this.url = undefined;
}