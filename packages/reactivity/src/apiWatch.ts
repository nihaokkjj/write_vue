import { isFunction, isObject } from "@vue/shared"
import { isReactive } from "./reactive"
import { ReactiveEffect } from './effect'
import { isRef } from "./ref"

export function watch
(source, cb, options = {} as any) {
  // debugger
  //watchEffect也是基于doWtch实现的
  return doWatch(source, cb, options)
}

export function watchEffect(source, options = {} as any) {
  return doWatch(source , null, options)
}

//控制 currentDepth 已经遍历到了哪一层
function traverse
(source, depth, currentDepth = 0, seen = new Set()) {
  if (!isObject(source)) {
    return
  }
  if (depth) {
    if (depth <= currentDepth) {
      return source
    }
    currentDepth++ //根据deep属性来看深度
  }
  if(seen.has(source)) {
    return source
  }

  for (let key in source) {
    traverse(source[key], depth, currentDepth, seen)
  }
  return source
}

function doWatch(source, cb, { deep, immediate }) {

  //将source队形中的数转成getter可以拿到的形式
  const reactiveGetter = (source) => 
    traverse(source, deep === false ? 1 : undefined)
  //产生一个可以给ReactiveEffect 来使用的getter
  //需要对这个对象进行取值操作, 会关联当前的reactiveEffect
  let getter 
  if(isReactive(source)) {
    // console.log('reactive')
    getter = () => reactiveGetter(source)
  } else if (isRef(source)) {
    // console.log('ref')
    getter = () => source.value
  } else if (isFunction(source)) {
    // console.log('function')
    getter = source
  }

  let oldValue

  const job = () => {
    const newValue = effect.run()
    cb(newValue, oldValue)
    oldValue = newValue
  }

  const effect = new ReactiveEffect(getter, job)

  if (cb) {
    if (immediate) { //先执行一次回调, 传递新值和老值
      job()
    } else {
      oldValue =  effect.run()
    }
  } else { //watchEffect
    effect.run()
  }
}




