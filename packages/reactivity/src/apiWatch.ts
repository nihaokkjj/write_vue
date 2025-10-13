import { isObject } from "@vue/shared"
import { ReactiveEffect } from "vue"



export function watch
(source, cb, options = {} as any) {

  //watchEffect也是基于doWtch实现的
  return doWatch(source, cb, options)

}

//控制 currentDepth 已经遍历到了哪一层
function traverse
(source, depth, currentDepth = 0, seen = new Set()) {
  if (!isObject(source)) {
    return
  }
  if (depth) {
    if (depth > currentDepth) {
      return source
    }
  }

}

function doWatch(source, cb, {deep}) {

  //将source队形中的数转成getter可以拿到的形式
  const reactiveGetter = (source) => traverse(source, deep === false ? 1 : undefined)
  //长生一个可以给ReactiveEffect 来使用的getter
  //需要对这个对象进行取值操作, 会关联当前的reactiveEffect
  let getter = () => reactiveGetter(source)

  new ReactiveEffect(getter, () => {
    cd(1, 2)
  })
}




