module.exports = function inheritProperty(sup, child) {
  function F() { };
  F.prototype = sup.prototype;
  var inner = new F();
  inner.constructor = child;
  child.prototype = inner;
  Object.defineProperty(child.prototype, 'constructor', {
    enumerable: false
  });
}