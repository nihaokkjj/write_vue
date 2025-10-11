export function effect(fn, options? ) {
  //创建一个响应式effect, 数据变化后可以重新执行

  //创建一个effect, 只要依赖的属性变化, 就要执行回调
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run()
  })
  _effect.run()

  return _effect
}

export let activeEffect

function proCleanEffect(effect) {
  effect._depsLength = 0
  effect._trackedId++//每次执行, id都是+1
  //如果在同一个effect中, 同一种数据多次调用, id就是相同的
}

class ReactiveEffect{
  _trackId = 0 //用于记录当前effect执行了几次
  deps = [] // 数组，用来存储这个 effect 所依赖的所有 dep (Map)
  _depsLenhth = 0

  public active = true //创建的effect是响应式的
  //fn : 用户编写的函数
  //如果fn中依赖的数据发生变化后, 需要重新调用 run()
  constructor(public fn, public scheduler) { }

  run() {// 让fn执行
    if (!this.active) { //不是激活的
      return this.fn()
    }
    let lastEffect = activeEffect
    try {
      activeEffect = this

      //effect重新执行前, 需要将上一次的依赖情况删除
      proCleanEffect(this)

      return this.fn()
    } finally {
      activeEffect = lastEffect
    }
  }
  stop() { //关闭响应式
    this.active = false
  }
}

function cleanDepEffect(dep, effect) {
  dep.delete(effect)
  if (dep.size === 0) {
    dep.cleanup() //map为空, 删除
  }
}

//双向记忆
export function trackEffect(effect, dep) {
  // debugger
  //需要重新收集依赖, 将不需要的移除

  //如果这个数之前没有被监测, 或在之前的effect检测过
  //更新id值
  //如果是同一个effect里面重复出现的值, id值相同
  if (dep.get(effect) !== effect._trackId) {
    dep.set(effect, effect._trackedId)
  } 
  //efect与dep关联
  let oldDep = effect.deps[effect._depsLength]

  if (oldDep !== dep) {//没存过
    //删除老的换新的
    if (oldDep) {
      cleanDepEffect(oldDep, effect)
    }
   effect.deps[effect._depsLength++] = dep
  } else {
    effect._depsLength++
  }
}

export function trackEffects(dep) {
  for (const effect of dep.keys()) {
    if (effect.scheduler) {
      effect.scheduler()
    }
  }
}