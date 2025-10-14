import { isFunction } from "@vue/shared";
import { ReactiveEffect } from "./effect";
import {trackRefValue, triggerRefValue} from './ref'


export function computed(getterOroptions) {
    let onlyGetter = isFunction(getterOroptions) 

    let getter 
    let setter
    if (onlyGetter) {
      getter = getterOroptions
      setter = () => {}
    } else {
      getter = getterOroptions.get
      setter = getterOroptions.set
    }
    return new ComputedRefImpl(getter, setter)
}

class ComputedRefImpl {
  public _value
  public effect
  public dep

  constructor(getter, public setter) {
    //创建一个effect来关联当前计算属性的dirty属性

    this.effect = new ReactiveEffect(
      () => getter(this._value),  //用户的fn
      () => {
        //计算属性触发后, 重新渲染
        triggerRefValue(this)
    })
  }
  get value() {//让计算属性收集对应的effect
    // debugger
    if (this.effect.dirty) { //默认取值, 一直是脏的, 但执行一次run后不脏了
      this._value = this.effect.run()
    
      trackRefValue(this)
      //如果当前在effect中访问了计算属性, 计算属性可以收集这个effect
    } 
    return this._value
  }
  set value(v) {
    this.setter(v)
  }
}



