
const person = {
  name: 'l',
  get aliasName() {
    return this.name + 'handsome'
  }
}

let proxyPerson = new Proxy(person, {
  get(target, key, recevier) { //recevier是代理对象
    console.log(key)
    //若直接返回target[key], 则此时的
    // return target[key]
  // return recevier[key] 
  // 如果返回代理对象, 则触发死循环
    return Reflect.get(target, key, recevier)
  }
})

console.log(proxyPerson.aliasName)

