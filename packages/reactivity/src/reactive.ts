import { isObject } from "@vue/shared"
import { mutableHandlers, ReactiveFlags } from "./baseHandlert"

//用于记录我们的代理后的结果 , 可以复用
const reactiveMap = new WeakMap()

export function reactive(target) {

  return createReactiveObject(target)
}

export function shallowReactive(target) {
  return createReactiveObject(target,)
}

function createReactiveObject(target) {
  //统一判断, 响应式对象必须是对象
  if (!isObject(target)) {
    return target
  }

  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target
  }

  //如果有直接取缓存
  const existProxy = reactiveMap.get(target)
  if(existProxy) {
    return existProxy
  }

  const proxy = new Proxy(target, mutableHandlers)
  //根据对象 缓存代理后的结果
  reactiveMap.set(target, proxy)
  return proxy
}


