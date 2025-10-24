import { currentInstance, setCurrentInstance, unsetCurrentInstance } from "./component"

export const enum LifeCycle {
  BEFORE_MOUNT = "bm",
  MOUNTED = "m",
  BEFORE_UPDAATE = "bu",
  UPDATED = "u"
}


function createHook(type) {
  //将当前的实例存到了此钩子上
  return (hook, target = currentInstance) => {

    if(target) {
      //当前钩子是在组件中运行的
      //看当前钩子是否存放, 发布订阅
  
      const hooks = 
      (target[type] || (target[type] = []))
    
      //让currentInstance 存到这个函数中
      const wrapHook = () => {
        //在钩子执行前, 对实例进行校准
        setCurrentInstance(target)
        hook.call(target)
        unsetCurrentInstance()
      }
      //在执行函数内部保证实例时正确的
      hooks.push(wrapHook) 
      //setup执行完后, 会将instance清空
    }
  }
}

export const onBeforeMount = 
createHook(LifeCycle.BEFORE_MOUNT)

export const onMounted = 
createHook(LifeCycle.MOUNTED)

export const onBeforeUpdate = 
createHook(LifeCycle.BEFORE_UPDAATE)

export const onUpdated = 
createHook(LifeCycle.UPDATED)

export function invokeArray(fns) {

  for (let i = 0; i < fns.length; ++i) {
    fns[i]()
  }
}





