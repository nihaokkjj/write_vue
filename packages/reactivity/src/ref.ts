import { toReactive } from "./reactive"
import { 
  activeEffect, 
  trackEffect,
  triggerEffects } from "./effect"
import {createDep} from './reactiveEffect'


export function ref(value) {
  return createRef(value)
}

function createRef(value) {
  return new RefImpl(value)
}


class RefImpl {
  public __v_isRef = true //增加ref标识
  public _value //用来保存本次ref的值
  public dep //收集对应的effect

  constructor(public rawValue) {
    this._value = toReactive(rawValue)
  }
  get value() {
    trackRefValue(this) //依赖收集
    return this._value
  }
  set value(newValue) {
    if (newValue !== this.rawValue) {
      this.rawValue = newValue 
      this._value = newValue

      triggerRefValue(this)//触发更新
    }
  }
}

export function trackRefValue(ref) {
  if (activeEffect) {
    trackEffect(
      activeEffect,
      ref.dep = createDep(()=>ref.dep = undefined, 'undefined')
    )
  }
}

export function triggerRefValue(ref) {
  let dep = ref.dep
  if (dep) {
   triggerEffects(dep)//触发依赖更新
  }
}

class ObjectRefImp{
  public __v_isRef = true //增加ref标识
  constructor(public _object, public _key) {

  }
  get value() {
    return this._object[this._key]
  }
  set value(newValue) {
    this._object[this._key] = newValue
  }
}

export function toRef(object, key) {

  return new ObjectRefImp(object, key)
}

export function toRefs(object) {
  const res = {}
  for (let key in object) { //挨个属性调用toRef
    res[key] = toRef(object, key)
  }
  return res
}
export function proxyRefs(objectWithRef) {
    return new Proxy(objectWithRef, {
      get(target, key , recevier) {
        let r = Reflect.get(target, key, recevier)
        //自动脱ref
        return r.__v_isRef ? r.value : r
      },
      set(target, key , value, recevier) {
        const oldValue = target[key]
        if (oldValue.__v_isRef) { //如果
          oldValue.value = value
          return true
        } else {
          return Reflect.set(target, key , value, recevier)
        }
      }
    })
}