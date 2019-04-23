export default  class {
  constructor(){
    this._cache = {}
  }
  set(key, value){
    this._cache[Symbol("key")] = {
      k: key,
      v: value
    }
  }

  get(key){
    const ret = [];
    let _cache = this._cache;
    const arr = Object.getOwnPropertySymbols(_cache);
    for (let index = 0; index < arr.length; index++) {
      const k = arr[index];
      if(_cache[k]['k']===key) ret.push(_cache[k]['v'])
    }
    if(ret.length) {
      return ret;
    }
    return undefined;
  }

  has(key){
    let _cache = this._cache;
    const arr = Object.getOwnPropertySymbols(_cache);
    for (let index = 0; index < arr.length; index++) {
      const k = arr[index];
      console.log(k, _cache[k] )
      if(_cache[k]['k']===key) return true;
    }
    return false;
  }

  remove(){
    return 1;
  }

  get size(){
    
    return Object.getOwnPropertySymbols(this._cache).length;
  }

  forEach(callback){
    let _cache = this._cache;
    Object.getOwnPropertySymbols(_cache).forEach((key, index, arr)=>{
      const value = _cache[key];
      callback(value['v'], value['k'], arr)
    })
  }
}