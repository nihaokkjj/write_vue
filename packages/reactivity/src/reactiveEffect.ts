import { 
    activeEffect, 
    trackEffect,
    triggerEffects 
  } from "./effect";

const targetMap = new WeakMap()//存放依赖收集的关系

export const createDep = (cleanup, key) => {
  const dep = new Map() as any
  dep.cleanup = cleanup
  dep.name = key
  return dep
}

export function track(target, key) {

//activeEffect有这个属性说明这个key实在effect中访问的
//没有则说明在effect之外访问的不用进行收集
  if (activeEffect) {
 
    let depsMap = targetMap.get(target)

    if(!depsMap) { //新增的
      targetMap.set(target, depsMap = new Map())
    }

    let dep = depsMap.get(key)

    if (!dep) { //清理不需要的属性
      depsMap.set(
        key,
        dep = createDep(() => {depsMap.delete(key)}, key)
      )
    }
    //将当前的effect放入到dep(映射表)中,
    // 后续可以根据值的变化触发此dep中存放的effect
    trackEffect(activeEffect, dep)
  }
}


export function trigger 
  (target, key, newValue, oldValue) {
  //是否存放有关依赖
  const despMap = targetMap.get(target)

  // console.log('despMap', despMap)
  if(!despMap) { //找不到对象, 直接return
    // console.log('ok')
    return
  }
  let dep = despMap.get(key)
  if (dep) {
    //修改的属性对应了effect
    triggerEffects(dep)
  }
}

