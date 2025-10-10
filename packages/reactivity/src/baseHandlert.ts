import { activeEffect } from "./effect"

export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',//基本上唯一
}
//proxy需要搭配reflect使用, 将this指向代理对象

//ProxyHandler是JavaScript中一个专门用于
//定义 Proxy 行为的 接口（或类型）
export const mutableHandlers: ProxyHandler<any> = {
  get(target, key, recevier) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }
    console.log(activeEffect, key)
    //当取值的时候, 应该让响应式属性 和 effect 映射起来
    return Reflect.get(target, key, recevier)
  },
  set(target, key, value, recevier) {
    //找到属性, 让effect重新执行
    return Reflect.set(target, key,value, recevier)
  }
}