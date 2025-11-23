
import { track, trigger } from "./reactiveEffect"
import { isObject } from "@vue/shared"
import { reactive } from "./reactive"
import { ReactiveFlags } from './constants'

//proxy需要搭配reflect使用, 将this指向代理对象

//ProxyHandler是JavaScript中一个专门用于
//定义 Proxy 行为的 接口（或类型）
export const mutableHandlers: ProxyHandler<any> = {
  get(target, key, recevier) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    } 
    //收集这个对象上的这个属性, 和effect关联在一起

    //当取值的时候, 应该让响应式属性 和 effect 映射起来
    let res = Reflect.get(target, key, recevier)
    track(target, key)
    
    //当取值为对象时, 需要再对这个对象进行代理
    if (isObject(res)) {
      return reactive(res)
    }
    return res
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