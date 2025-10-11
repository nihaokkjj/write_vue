import { activeEffect } from "./effect"
import { track, trigger } from "./reactiveEffect"

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
    // debugger
    track(target, key) 
    //收集这个对象上的这个属性, 和effect关联在一起

    //当取值的时候, 应该让响应式属性 和 effect 映射起来
    return Reflect.get(target, key, recevier)
  },
  set(target, key, value, recevier) {
    //找到属性, 让effect重新执行
    let oldValue = target[key]

    let result = Reflect.set(target, key,value, recevier)
   
    if (oldValue !== value) {
      //需要触发更新
      trigger(target, key, value, oldValue)
    }
    return result
  }
}